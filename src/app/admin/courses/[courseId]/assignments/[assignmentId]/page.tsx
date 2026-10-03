"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/lib/convex";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { MarkdownMath } from "@/components/math/markdown-math";
import { ImageUploadInput } from "@/components/ui/image-upload-input";
import { toast } from "sonner";
import type { Id } from "@/lib/convex";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  ImageIcon,
  Plus,
  Trash2,
} from "lucide-react";

type QuestionType =
  | "mcq_single"
  | "mcq_multi"
  | "numeric"
  | "expression"
  | "short_text"
  | "file";

type QuestionDraft = {
  _id?: Id<"questions">;
  type: QuestionType;
  body: string;
  imageUrl?: string;
  options?: Array<{ id: string; text: string }>;
  answerSpec: any;
  marks: number;
  hint?: string;
  solution?: string;
  order: number;
};

function createDefaultQuestion(order: number): QuestionDraft {
  const opt1Id = `opt_${Date.now()}_1`;
  const opt2Id = `opt_${Date.now()}_2`;
  return {
    type: "mcq_single",
    body: "",
    imageUrl: undefined,
    options: [
      { id: opt1Id, text: "" },
      { id: opt2Id, text: "" },
    ],
    answerSpec: { correctOptionId: opt1Id },
    marks: 1,
    hint: "",
    solution: "",
    order,
  };
}

export default function AdminAssignmentEditorPage() {
  const params = useParams();
  const assignmentId = params.assignmentId as Id<"assignments">;
  const data = useQuery(api.assignments.getForAdmin, { assignmentId });
  const updateSettings = useMutation(api.assignments.updateSettings);
  const upsertQuestion = useMutation(api.assignments.upsertQuestion);
  const deleteQuestion = useMutation(api.assignments.deleteQuestion);

  const [questions, setQuestions] = useState<QuestionDraft[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [previewingIds, setPreviewingIds] = useState<Record<number, boolean>>({});
  const [expandedDetails, setExpandedDetails] = useState<Record<number, boolean>>({});

  // Sync from Convex to local state when data loads
  useEffect(() => {
    if (data?.questions) {
      setQuestions(
        data.questions.map((q) => ({
          _id: q._id,
          type: q.type as QuestionType,
          body: q.body,
          imageUrl: q.imageUrl,
          options: q.options,
          answerSpec: q.answerSpec,
          marks: q.marks,
          hint: q.hint ?? "",
          solution: q.solution ?? "",
          order: q.order,
        })),
      );
    }
  }, [data?.questions?.length]);

  if (!data) {
    return <p className="text-muted-foreground p-8">Loading assignment…</p>;
  }

  const { assignment } = data;

  function addQuestion() {
    const nextOrder =
      questions.length > 0 ? Math.max(...questions.map((q) => q.order)) + 1 : 1;
    setQuestions((prev) => [...prev, createDefaultQuestion(nextOrder)]);
  }

  function removeQuestion(idx: number) {
    setQuestions((prev) => prev.filter((_, i) => i !== idx).map((q, i) => ({ ...q, order: i + 1 })));
  }

  function moveQuestion(idx: number, direction: "up" | "down") {
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= questions.length) return;
    const next = [...questions];
    [next[idx], next[targetIdx]] = [next[targetIdx], next[idx]];
    setQuestions(next.map((q, i) => ({ ...q, order: i + 1 })));
  }

  function updateQuestion(
    idx: number,
    updater: (prev: QuestionDraft) => QuestionDraft,
  ) {
    setQuestions((prev) => {
      const next = [...prev];
      next[idx] = updater(next[idx]);
      return next;
    });
  }

  function validateQuestions(qs: QuestionDraft[]): string | null {
    for (let i = 0; i < qs.length; i++) {
      const q = qs[i];
      const n = i + 1;
      if (!q.body.trim()) return `Q${n}: Please enter the question text`;
      if (!q.marks || q.marks <= 0) return `Q${n}: Marks must be greater than 0`;
      if (q.type === "mcq_single") {
        if (!q.options || q.options.length < 2) return `Q${n}: Add at least 2 options`;
        if (q.options.some((o) => !o.text.trim())) return `Q${n}: All options need text`;
        if (!q.answerSpec?.correctOptionId) return `Q${n}: Select a correct option`;
      }
      if (q.type === "mcq_multi") {
        if (!q.options || q.options.length < 2) return `Q${n}: Add at least 2 options`;
        if (q.options.some((o) => !o.text.trim())) return `Q${n}: All options need text`;
        if (!Array.isArray(q.answerSpec?.correctOptionIds) || q.answerSpec.correctOptionIds.length === 0)
          return `Q${n}: Select at least one correct option`;
      }
      if (q.type === "numeric") {
        if (q.answerSpec?.value === undefined || isNaN(Number(q.answerSpec.value)))
          return `Q${n}: Enter a valid correct numeric value`;
      }
      if (q.type === "short_text") {
        const accepted = q.answerSpec?.accepted;
        if (!Array.isArray(accepted) || !accepted[0]?.trim())
          return `Q${n}: Enter at least one accepted answer`;
      }
    }
    return null;
  }

  async function handleSaveAllQuestions() {
    const err = validateQuestions(questions);
    if (err) {
      toast.error(err);
      return;
    }
    setIsSaving(true);
    try {
      // We use upsertQuestion which handles both create and update
      for (const q of questions) {
        await upsertQuestion({
          assignmentId,
          questionId: q._id,
          type: q.type,
          body: q.body,
          imageUrl: q.imageUrl || undefined,
          options: q.options,
          answerSpec: q.answerSpec,
          marks: q.marks,
          hint: q.hint || undefined,
          solution: q.solution || undefined,
          order: q.order,
        });
      }
      toast.success(
        `${questions.length} question${questions.length === 1 ? "" : "s"} saved`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save questions");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteQuestion(idx: number) {
    const q = questions[idx];
    if (q._id) {
      if (!confirm("Delete this question permanently?")) return;
      try {
        await deleteQuestion({ questionId: q._id });
        toast.success("Question deleted");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to delete");
        return;
      }
    }
    removeQuestion(idx);
  }

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">{assignment.title}</h1>
        <p className="text-sm text-muted-foreground capitalize">
          {assignment.kind} assignment
        </p>
      </div>

      {/* Settings Section */}
      <section className="rounded-lg border p-4 space-y-4">
        <h2 className="font-medium">Settings</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              defaultValue={assignment.status}
              onValueChange={(v) =>
                void updateSettings({
                  assignmentId,
                  status: v as "draft" | "published",
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {assignment.kind === "graded" ? (
            <>
              <div className="space-y-2">
                <Label>Due (local datetime → stored UTC)</Label>
                <Input
                  type="datetime-local"
                  defaultValue={
                    assignment.dueAt
                      ? new Date(assignment.dueAt).toISOString().slice(0, 16)
                      : ""
                  }
                  onBlur={(e) => {
                    const ms = e.target.value
                      ? new Date(e.target.value).getTime()
                      : null;
                    void updateSettings({ assignmentId, dueAt: ms });
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Scoring policy</Label>
                <Select
                  defaultValue={assignment.scoringPolicy}
                  onValueChange={(v) =>
                    void updateSettings({
                      assignmentId,
                      scoringPolicy: v as "best" | "latest" | "average",
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="best">Best attempt</SelectItem>
                    <SelectItem value="latest">Latest attempt</SelectItem>
                    <SelectItem value="average">Average</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label>Instructions</Label>
          <Textarea
            defaultValue={assignment.instructions ?? ""}
            onBlur={(e) =>
              void updateSettings({
                assignmentId,
                instructions: e.target.value,
              })
            }
          />
        </div>
      </section>

      {/* Questions Editor */}
      <section className="space-y-5">
        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              Questions
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Add questions with optional images, hints, and solutions.
              Supported types: MCQ (single/multi-choice), Numerical, Expression, Short Text, and File upload.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {questions.length > 0 && (
              <Badge variant="outline" className="text-xs">
                {questions.length} {questions.length === 1 ? "question" : "questions"}
              </Badge>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addQuestion}
              className="gap-1.5"
            >
              <Plus className="size-3.5" />
              Add Question
            </Button>
          </div>
        </div>

        {questions.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground space-y-2">
            <ImageIcon className="size-8 mx-auto opacity-40" />
            <p className="font-medium">No questions added yet</p>
            <p className="text-xs max-w-sm mx-auto">
              Click &ldquo;Add Question&rdquo; to start building this assignment.
              You can add images to questions like graphs, diagrams, or formula sheets.
            </p>
            <Button variant="secondary" size="sm" onClick={addQuestion} className="gap-1.5 mt-1">
              <Plus className="size-3.5" /> Add First Question
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {questions.map((q, idx) => (
                <div
                  key={q._id ?? `draft_${idx}`}
                  className="rounded-xl border bg-card p-4 sm:p-5 space-y-4 shadow-xs"
                >
                  {/* Question Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="font-mono">
                        Q{idx + 1}
                      </Badge>
                      <div className="w-44">
                        <Select
                          value={q.type}
                          onValueChange={(val) => {
                            if (!val) return;
                            updateQuestion(idx, (prev) => {
                              const now = Date.now();
                              if (val === "mcq_single") {
                                const opts =
                                  prev.options && prev.options.length >= 2
                                    ? prev.options
                                    : [
                                        { id: `opt_${now}_1`, text: "" },
                                        { id: `opt_${now}_2`, text: "" },
                                      ];
                                return {
                                  ...prev,
                                  type: "mcq_single",
                                  options: opts,
                                  answerSpec: { correctOptionId: opts[0].id },
                                };
                              }
                              if (val === "mcq_multi") {
                                const opts =
                                  prev.options && prev.options.length >= 2
                                    ? prev.options
                                    : [
                                        { id: `opt_${now}_1`, text: "" },
                                        { id: `opt_${now}_2`, text: "" },
                                      ];
                                return {
                                  ...prev,
                                  type: "mcq_multi",
                                  options: opts,
                                  answerSpec: { correctOptionIds: [opts[0].id], partialCredit: false },
                                };
                              }
                              if (val === "numeric") {
                                return { ...prev, type: "numeric", options: undefined, answerSpec: { value: 0, tolerance: 0.01 } };
                              }
                              if (val === "expression") {
                                return { ...prev, type: "expression", options: undefined, answerSpec: { expression: "", variable: "x" } };
                              }
                              if (val === "short_text") {
                                return { ...prev, type: "short_text", options: undefined, answerSpec: { accepted: [""] } };
                              }
                              return { ...prev, type: val as QuestionType, options: undefined, answerSpec: {} };
                            });
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mcq_single">Single Choice MCQ</SelectItem>
                            <SelectItem value="mcq_multi">Multi Choice MCQ</SelectItem>
                            <SelectItem value="numeric">Numerical</SelectItem>
                            <SelectItem value="expression">Expression</SelectItem>
                            <SelectItem value="short_text">Short Text</SelectItem>
                            <SelectItem value="file">File Upload</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Marks */}
                      <div className="flex items-center gap-1.5">
                        <Label className="text-xs text-muted-foreground">Marks:</Label>
                        <Input
                          type="number"
                          min="1"
                          step="1"
                          value={q.marks}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 1;
                            updateQuestion(idx, (prev) => ({ ...prev, marks: val }));
                          }}
                          className="h-8 w-16 text-xs"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        disabled={idx === 0}
                        onClick={() => moveQuestion(idx, "up")}
                        title="Move up"
                      >
                        <ArrowUp className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        disabled={idx === questions.length - 1}
                        onClick={() => moveQuestion(idx, "down")}
                        title="Move down"
                      >
                        <ArrowDown className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7 text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteQuestion(idx)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Question Body */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium">
                        Question Text (Markdown + LaTeX like $x^2$)
                      </Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs gap-1 text-muted-foreground"
                        onClick={() =>
                          setPreviewingIds((prev) => ({ ...prev, [idx]: !prev[idx] }))
                        }
                      >
                        {previewingIds[idx] ? (
                          <><EyeOff className="size-3" /> Hide Preview</>
                        ) : (
                          <><Eye className="size-3" /> Live Preview</>
                        )}
                      </Button>
                    </div>
                    <Textarea
                      value={q.body}
                      onChange={(e) =>
                        updateQuestion(idx, (prev) => ({ ...prev, body: e.target.value }))
                      }
                      placeholder="Enter question text. LaTeX supported: $\lim_{x\to 0} \frac{\sin x}{x}$"
                      rows={2}
                    />

                    {/* Image Upload */}
                    <ImageUploadInput
                      value={q.imageUrl}
                      onChange={(url) =>
                        updateQuestion(idx, (prev) => ({ ...prev, imageUrl: url }))
                      }
                      label="Question Image / Graph (Optional)"
                      description="Upload a graph, diagram, formula image or paste an image URL."
                    />

                    {previewingIds[idx] && (q.body.trim() || q.imageUrl) && (
                      <div className="rounded-md border p-3 bg-muted/40 text-sm space-y-3">
                        <p className="text-[10px] uppercase font-semibold text-muted-foreground">
                          Rendered Preview:
                        </p>
                        {q.body.trim() && <MarkdownMath content={q.body} />}
                        {q.imageUrl && (
                          <div className="max-h-60 w-full overflow-hidden rounded-md border bg-black/5 flex items-center justify-center">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={q.imageUrl}
                              alt="Question preview"
                              className="max-h-60 w-auto object-contain"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* MCQ Single */}
                  {q.type === "mcq_single" && (
                    <div className="space-y-3 rounded-md bg-muted/20 p-3 border">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium">
                          Options (radio = correct answer)
                        </Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-6 px-2 text-xs gap-1"
                          onClick={() => {
                            const newId = `opt_${Date.now()}_${(q.options?.length ?? 0) + 1}`;
                            updateQuestion(idx, (prev) => ({
                              ...prev,
                              options: [...(prev.options ?? []), { id: newId, text: "" }],
                            }));
                          }}
                        >
                          <Plus className="size-3" /> Add Option
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {q.options?.map((opt, optIdx) => {
                          const isCorrect = q.answerSpec?.correctOptionId === opt.id;
                          return (
                            <div key={opt.id} className="flex items-center gap-2">
                              <input
                                type="radio"
                                name={`correct_${idx}`}
                                checked={isCorrect}
                                onChange={() =>
                                  updateQuestion(idx, (prev) => ({
                                    ...prev,
                                    answerSpec: { ...prev.answerSpec, correctOptionId: opt.id },
                                  }))
                                }
                                className="size-4 cursor-pointer text-primary"
                              />
                              <Input
                                value={opt.text}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  updateQuestion(idx, (prev) => ({
                                    ...prev,
                                    options: prev.options?.map((o, i) =>
                                      i === optIdx ? { ...o, text: val } : o,
                                    ),
                                  }));
                                }}
                                placeholder={`Option ${optIdx + 1}`}
                                className="h-8 text-sm"
                              />
                              {q.options && q.options.length > 2 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="size-7 text-muted-foreground hover:text-destructive"
                                  onClick={() => {
                                    updateQuestion(idx, (prev) => {
                                      const nextOpts = prev.options?.filter((_, i) => i !== optIdx);
                                      let nextCorrect = prev.answerSpec?.correctOptionId;
                                      if (nextCorrect === opt.id && nextOpts?.[0]) {
                                        nextCorrect = nextOpts[0].id;
                                      }
                                      return {
                                        ...prev,
                                        options: nextOpts,
                                        answerSpec: { ...prev.answerSpec, correctOptionId: nextCorrect },
                                      };
                                    });
                                  }}
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* MCQ Multi */}
                  {q.type === "mcq_multi" && (
                    <div className="space-y-3 rounded-md bg-muted/20 p-3 border">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium">
                          Options (checkboxes = correct answers)
                        </Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-6 px-2 text-xs gap-1"
                          onClick={() => {
                            const newId = `opt_${Date.now()}_${(q.options?.length ?? 0) + 1}`;
                            updateQuestion(idx, (prev) => ({
                              ...prev,
                              options: [...(prev.options ?? []), { id: newId, text: "" }],
                            }));
                          }}
                        >
                          <Plus className="size-3" /> Add Option
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {q.options?.map((opt, optIdx) => {
                          const selectedIds = new Set<string>(
                            Array.isArray(q.answerSpec?.correctOptionIds)
                              ? q.answerSpec.correctOptionIds
                              : [],
                          );
                          const isChecked = selectedIds.has(opt.id);
                          return (
                            <div key={opt.id} className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  updateQuestion(idx, (prev) => {
                                    const cur = new Set<string>(
                                      Array.isArray(prev.answerSpec?.correctOptionIds)
                                        ? prev.answerSpec.correctOptionIds
                                        : [],
                                    );
                                    if (cur.has(opt.id)) cur.delete(opt.id);
                                    else cur.add(opt.id);
                                    return {
                                      ...prev,
                                      answerSpec: { ...prev.answerSpec, correctOptionIds: [...cur] },
                                    };
                                  });
                                }}
                                className="size-4 cursor-pointer rounded"
                              />
                              <Input
                                value={opt.text}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  updateQuestion(idx, (prev) => ({
                                    ...prev,
                                    options: prev.options?.map((o, i) =>
                                      i === optIdx ? { ...o, text: val } : o,
                                    ),
                                  }));
                                }}
                                placeholder={`Option ${optIdx + 1}`}
                                className="h-8 text-sm"
                              />
                              {q.options && q.options.length > 2 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="size-7 text-muted-foreground hover:text-destructive"
                                  onClick={() => {
                                    updateQuestion(idx, (prev) => {
                                      const nextOpts = prev.options?.filter((_, i) => i !== optIdx);
                                      const cur = new Set<string>(
                                        Array.isArray(prev.answerSpec?.correctOptionIds)
                                          ? prev.answerSpec.correctOptionIds
                                          : [],
                                      );
                                      cur.delete(opt.id);
                                      return {
                                        ...prev,
                                        options: nextOpts,
                                        answerSpec: { ...prev.answerSpec, correctOptionIds: [...cur] },
                                      };
                                    });
                                  }}
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Numeric */}
                  {q.type === "numeric" && (
                    <div className="grid gap-3 sm:grid-cols-2 rounded-md bg-muted/20 p-3 border">
                      <div className="space-y-1">
                        <Label className="text-xs font-medium">Correct Value</Label>
                        <Input
                          type="number"
                          step="any"
                          value={q.answerSpec?.value ?? 0}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            updateQuestion(idx, (prev) => ({
                              ...prev,
                              answerSpec: { ...prev.answerSpec, value: val },
                            }));
                          }}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-medium">Tolerance (±)</Label>
                        <Input
                          type="number"
                          step="any"
                          value={q.answerSpec?.tolerance ?? 0.01}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            updateQuestion(idx, (prev) => ({
                              ...prev,
                              answerSpec: { ...prev.answerSpec, tolerance: val },
                            }));
                          }}
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                  )}

                  {/* Expression */}
                  {q.type === "expression" && (
                    <div className="grid gap-3 sm:grid-cols-3 rounded-md bg-muted/20 p-3 border">
                      <div className="space-y-1 sm:col-span-2">
                        <Label className="text-xs font-medium">Reference Expression</Label>
                        <Input
                          value={q.answerSpec?.expression ?? ""}
                          onChange={(e) =>
                            updateQuestion(idx, (prev) => ({
                              ...prev,
                              answerSpec: { ...prev.answerSpec, expression: e.target.value },
                            }))
                          }
                          placeholder="e.g. x^2 + 2*x + 1"
                          className="h-8 text-sm font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-medium">Variable</Label>
                        <Input
                          value={q.answerSpec?.variable ?? "x"}
                          onChange={(e) =>
                            updateQuestion(idx, (prev) => ({
                              ...prev,
                              answerSpec: { ...prev.answerSpec, variable: e.target.value },
                            }))
                          }
                          placeholder="x"
                          className="h-8 text-sm font-mono"
                        />
                      </div>
                    </div>
                  )}

                  {/* Short Text */}
                  {q.type === "short_text" && (
                    <div className="space-y-1 rounded-md bg-muted/20 p-3 border">
                      <Label className="text-xs font-medium">
                        Accepted Answers (comma-separated)
                      </Label>
                      <Input
                        value={
                          Array.isArray(q.answerSpec?.accepted)
                            ? q.answerSpec.accepted.join(", ")
                            : ""
                        }
                        onChange={(e) => {
                          const list = e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean);
                          updateQuestion(idx, (prev) => ({
                            ...prev,
                            answerSpec: { ...prev.answerSpec, accepted: list },
                          }));
                        }}
                        placeholder="e.g. 2pi, 2*pi, 6.28"
                        className="h-8 text-sm"
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Matches case-insensitively.
                      </p>
                    </div>
                  )}

                  {/* File */}
                  {q.type === "file" && (
                    <div className="rounded-md bg-muted/20 p-3 border text-xs text-muted-foreground">
                      Students will upload a file. Graded manually.
                    </div>
                  )}

                  {/* Hint & Solution (collapsible) */}
                  <div className="border-t pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs gap-1 text-muted-foreground w-full justify-between"
                      onClick={() =>
                        setExpandedDetails((prev) => ({ ...prev, [idx]: !prev[idx] }))
                      }
                    >
                      <span>
                        Hint &amp; Solution{" "}
                        {(q.hint || q.solution) && (
                          <span className="text-primary font-medium">✓ configured</span>
                        )}
                      </span>
                      {expandedDetails[idx] ? (
                        <ChevronUp className="size-3" />
                      ) : (
                        <ChevronDown className="size-3" />
                      )}
                    </Button>
                    {expandedDetails[idx] && (
                      <div className="space-y-3 mt-2 pt-2 border-t">
                        <div className="space-y-1">
                          <Label className="text-xs">Hint (optional)</Label>
                          <Input
                            value={q.hint ?? ""}
                            onChange={(e) =>
                              updateQuestion(idx, (prev) => ({ ...prev, hint: e.target.value }))
                            }
                            placeholder="Hint shown after wrong attempt or on request..."
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Solution / Explanation (optional)</Label>
                          <Textarea
                            value={q.solution ?? ""}
                            onChange={(e) =>
                              updateQuestion(idx, (prev) => ({
                                ...prev,
                                solution: e.target.value,
                              }))
                            }
                            placeholder="Detailed solution shown after submission / deadline..."
                            rows={2}
                            className="text-xs"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Save all button */}
            <div className="flex items-center gap-3 pt-2">
              <Button
                disabled={isSaving || questions.length === 0}
                onClick={handleSaveAllQuestions}
                className="gap-1.5"
              >
                {isSaving ? "Saving…" : `Save All ${questions.length} Question${questions.length === 1 ? "" : "s"}`}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addQuestion}
                className="gap-1.5"
              >
                <Plus className="size-3.5" /> Add Question
              </Button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
