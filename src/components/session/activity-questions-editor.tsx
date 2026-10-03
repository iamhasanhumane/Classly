"use client";

import { useState } from "react";
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
import type { Id } from "@/lib/convex";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  HelpCircle,
  Plus,
  Trash2,
} from "lucide-react";

import { ImageUploadInput } from "@/components/ui/image-upload-input";

export type ActivityQuestionType =
  | "mcq_single"
  | "mcq_multi"
  | "numeric"
  | "short_text";

export type ActivityQuestionDraft = {
  _id?: Id<"activityQuestions">;
  type: ActivityQuestionType;
  body: string;
  imageUrl?: string;
  options?: Array<{ id: string; text: string }>;
  answerSpec: any;
  hint?: string;
  explanation?: string;
  order: number;
};

export function createDefaultActivityQuestion(
  order: number,
): ActivityQuestionDraft {
  const opt1Id = `opt_${Date.now()}_1`;
  const opt2Id = `opt_${Date.now()}_2`;
  return {
    type: "mcq_single",
    body: "",
    options: [
      { id: opt1Id, text: "" },
      { id: opt2Id, text: "" },
    ],
    answerSpec: { correctOptionId: opt1Id },
    hint: "",
    explanation: "",
    order,
  };
}

interface ActivityQuestionsEditorProps {
  questions: ActivityQuestionDraft[];
  onChange: (questions: ActivityQuestionDraft[]) => void;
}

export function ActivityQuestionsEditor({
  questions,
  onChange,
}: ActivityQuestionsEditorProps) {
  const [previewingIds, setPreviewingIds] = useState<Record<number, boolean>>({});
  const [expandedDetails, setExpandedDetails] = useState<
    Record<number, boolean>
  >({});

  function addQuestion() {
    const nextOrder =
      questions.length > 0
        ? Math.max(...questions.map((q) => q.order)) + 1
        : 1;
    onChange([...questions, createDefaultActivityQuestion(nextOrder)]);
  }

  function removeQuestion(index: number) {
    const next = questions.filter((_, i) => i !== index);
    // re-index order
    onChange(next.map((q, i) => ({ ...q, order: i + 1 })));
  }

  function moveQuestion(index: number, direction: "up" | "down") {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= questions.length) return;
    const next = [...questions];
    const temp = next[index];
    next[index] = next[targetIndex];
    next[targetIndex] = temp;
    onChange(next.map((q, i) => ({ ...q, order: i + 1 })));
  }

  function updateQuestion(
    index: number,
    updater: (prev: ActivityQuestionDraft) => ActivityQuestionDraft,
  ) {
    const next = [...questions];
    next[index] = updater(next[index]);
    onChange(next);
  }

  function togglePreview(index: number) {
    setPreviewingIds((prev) => ({ ...prev, [index]: !prev[index] }));
  }

  function toggleDetails(index: number) {
    setExpandedDetails((prev) => ({ ...prev, [index]: !prev[index] }));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold tracking-tight">
              Activity Questions
            </h3>
            <Badge variant="secondary" className="text-xs">
              {questions.length} {questions.length === 1 ? "question" : "questions"}
            </Badge>
            <span className="text-xs text-muted-foreground">(Optional)</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Add check-your-understanding questions for students to answer below the video.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addQuestion}
          className="gap-1.5"
        >
          <Plus className="size-3.5" />
          Add Activity Question
        </Button>
      </div>

      {questions.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center bg-muted/20">
          <HelpCircle className="size-8 mx-auto text-muted-foreground/60 mb-2" />
          <p className="text-sm font-medium">No activity questions added</p>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-3">
            Activity questions test students understanding right after watching this lecture.
            You can add multiple-choice, numerical, or short-answer questions.
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={addQuestion}
            className="gap-1.5"
          >
            <Plus className="size-3.5" />
            Add First Question
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((q, idx) => (
            <div
              key={q._id ?? `draft_${idx}`}
              className="rounded-lg border bg-card p-4 space-y-4 shadow-xs"
            >
              {/* Question Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="font-mono">
                    Q{idx + 1}
                  </Badge>
                  <div className="w-48">
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
                              type: val,
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
                              type: val,
                              options: opts,
                              answerSpec: {
                                correctOptionIds: [opts[0].id],
                                partialCredit: false,
                              },
                            };
                          }
                          if (val === "numeric") {
                            return {
                              ...prev,
                              type: val,
                              options: undefined,
                              answerSpec: { value: 0, tolerance: 0.01 },
                            };
                          }
                          // short_text
                          return {
                            ...prev,
                            type: val,
                            options: undefined,
                            answerSpec: { accepted: [""] },
                          };
                        });
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mcq_single">
                          Single Choice MCQ
                        </SelectItem>
                        <SelectItem value="mcq_multi">
                          Multiple Choice MCQ
                        </SelectItem>
                        <SelectItem value="numeric">
                          Numerical Answer
                        </SelectItem>
                        <SelectItem value="short_text">Short Text</SelectItem>
                      </SelectContent>
                    </Select>
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
                    onClick={() => removeQuestion(idx)}
                    title="Delete question"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>

              {/* Question Body */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">
                    Question Text (Markdown + LaTeX Math like $x^2 + 1$)
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs gap-1 text-muted-foreground"
                    onClick={() => togglePreview(idx)}
                  >
                    {previewingIds[idx] ? (
                      <>
                        <EyeOff className="size-3" /> Hide Preview
                      </>
                    ) : (
                      <>
                        <Eye className="size-3" /> Live Preview
                      </>
                    )}
                  </Button>
                </div>
                <Textarea
                  value={q.body}
                  onChange={(e) =>
                    updateQuestion(idx, (prev) => ({
                      ...prev,
                      body: e.target.value,
                    }))
                  }
                  placeholder="e.g. What is the value of $\lim_{x \to 0} \frac{\sin x}{x}$?"
                  rows={2}
                  className="font-sans text-sm"
                />

                {/* Question Image (Optional) */}
                <ImageUploadInput
                  value={q.imageUrl}
                  onChange={(url) =>
                    updateQuestion(idx, (prev) => ({
                      ...prev,
                      imageUrl: url,
                    }))
                  }
                  label="Question Image / Graph (Optional)"
                  description="Upload a function graph, diagram, or formula image, or paste an image URL."
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
                          alt="Rendered question preview"
                          className="max-h-60 w-auto object-contain"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Type-Specific Answer Configuration */}
              {q.type === "mcq_single" && (
                <div className="space-y-3 rounded-md bg-muted/20 p-3 border">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">
                      Answer Options (select the radio button for the correct answer)
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
                      const isCorrect =
                        q.answerSpec?.correctOptionId === opt.id;
                      return (
                        <div
                          key={opt.id}
                          className="flex items-center gap-2"
                        >
                          <input
                            type="radio"
                            name={`correct_mcq_single_${idx}`}
                            checked={isCorrect}
                            onChange={() => {
                              updateQuestion(idx, (prev) => ({
                                ...prev,
                                answerSpec: {
                                  ...prev.answerSpec,
                                  correctOptionId: opt.id,
                                },
                              }));
                            }}
                            className="size-4 text-primary cursor-pointer"
                            title="Mark as correct answer"
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
                            placeholder={`Option ${optIdx + 1} text (LaTeX supported: $...$)`}
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
                                  const nextOpts = prev.options?.filter(
                                    (_, i) => i !== optIdx,
                                  );
                                  let nextCorrect = prev.answerSpec?.correctOptionId;
                                  if (nextCorrect === opt.id && nextOpts?.[0]) {
                                    nextCorrect = nextOpts[0].id;
                                  }
                                  return {
                                    ...prev,
                                    options: nextOpts,
                                    answerSpec: {
                                      ...prev.answerSpec,
                                      correctOptionId: nextCorrect,
                                    },
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

              {q.type === "mcq_multi" && (
                <div className="space-y-3 rounded-md bg-muted/20 p-3 border">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">
                      Answer Options (check all boxes that are correct)
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
                      const selectedIds = new Set(
                        Array.isArray(q.answerSpec?.correctOptionIds)
                          ? q.answerSpec.correctOptionIds
                          : [],
                      );
                      const isChecked = selectedIds.has(opt.id);
                      return (
                        <div
                          key={opt.id}
                          className="flex items-center gap-2"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              updateQuestion(idx, (prev) => {
                                const cur = new Set(
                                  Array.isArray(prev.answerSpec?.correctOptionIds)
                                    ? prev.answerSpec.correctOptionIds
                                    : [],
                                );
                                if (cur.has(opt.id)) {
                                  cur.delete(opt.id);
                                } else {
                                  cur.add(opt.id);
                                }
                                return {
                                  ...prev,
                                  answerSpec: {
                                    ...prev.answerSpec,
                                    correctOptionIds: [...cur],
                                  },
                                };
                              });
                            }}
                            className="size-4 rounded text-primary cursor-pointer"
                            title="Mark as correct answer"
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
                            placeholder={`Option ${optIdx + 1} text`}
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
                                  const nextOpts = prev.options?.filter(
                                    (_, i) => i !== optIdx,
                                  );
                                  const cur = new Set(
                                    Array.isArray(prev.answerSpec?.correctOptionIds)
                                      ? prev.answerSpec.correctOptionIds
                                      : [],
                                  );
                                  cur.delete(opt.id);
                                  return {
                                    ...prev,
                                    options: nextOpts,
                                    answerSpec: {
                                      ...prev.answerSpec,
                                      correctOptionIds: [...cur],
                                    },
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

              {q.type === "numeric" && (
                <div className="grid gap-3 sm:grid-cols-2 rounded-md bg-muted/20 p-3 border">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Correct Numeric Value</Label>
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
                      placeholder="e.g. 42 or 3.1415"
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
                      placeholder="e.g. 0.01"
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              )}

              {q.type === "short_text" && (
                <div className="space-y-1 rounded-md bg-muted/20 p-3 border">
                  <Label className="text-xs font-medium">
                    Accepted Answer(s) (comma-separated for multiple valid forms)
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
                    Matches case-insensitively with student responses.
                  </p>
                </div>
              )}

              {/* Collapsible Hint & Explanation */}
              <div className="border-t pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs gap-1 text-muted-foreground w-full justify-between"
                  onClick={() => toggleDetails(idx)}
                >
                  <span>
                    Hint &amp; Explanation{" "}
                    {(q.hint || q.explanation) && (
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
                  <div className="space-y-3 mt-2 pt-2 border-t text-xs">
                    <div className="space-y-1">
                      <Label className="text-xs">Hint (optional)</Label>
                      <Input
                        value={q.hint ?? ""}
                        onChange={(e) =>
                          updateQuestion(idx, (prev) => ({
                            ...prev,
                            hint: e.target.value,
                          }))
                        }
                        placeholder="Hint to display if student gets stuck..."
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Explanation / Solution (optional)</Label>
                      <Textarea
                        value={q.explanation ?? ""}
                        onChange={(e) =>
                          updateQuestion(idx, (prev) => ({
                            ...prev,
                            explanation: e.target.value,
                          }))
                        }
                        placeholder="Detailed explanation shown after student checks their answer..."
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
      )}
    </div>
  );
}
