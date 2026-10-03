"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/lib/convex";
import type { Id } from "@/lib/convex";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  ActivityQuestionsEditor,
  type ActivityQuestionDraft,
  type ActivityQuestionType,
} from "@/components/session/activity-questions-editor";
import { Sparkles, Video, HelpCircle } from "lucide-react";
import { toast } from "sonner";

type SessionDoc = {
  _id: Id<"sessions">;
  title: string;
  description?: string;
  videoRef: string;
  status: "draft" | "published";
  order: number;
  activityQuestionsCount?: number;
};

export default function AdminWeekPage() {
  const params = useParams();
  const courseId = params.courseId as Id<"courses">;
  const sectionId = params.sectionId as Id<"sections">;

  const structure = useQuery(api.courses.getStructure, { courseId });
  const sessions = useQuery(api.sessions.listBySection, { sectionId });

  const createSession = useMutation(api.sessions.upsert);
  const updateSession = useMutation(api.sessions.update);
  const removeSession = useMutation(api.sessions.remove);
  const saveQuestions = useMutation(api.activityQuestions.saveQuestionsForSession);

  const section = structure?.sections?.find(
    (s: { _id: string }) => s._id === sectionId,
  );

  // Form state
  const [editingId, setEditingId] = useState<Id<"sessions"> | null>(null);
  const [title, setTitle] = useState("");
  const [videoRef, setVideoRef] = useState("");
  const [description, setDescription] = useState("");
  const [activityQuestions, setActivityQuestions] = useState<
    ActivityQuestionDraft[]
  >([]);
  const [isSaving, setIsSaving] = useState(false);

  // Load existing questions when editing a session
  const adminQuestions = useQuery(
    api.activityQuestions.listForAdmin,
    editingId ? { sessionId: editingId } : "skip",
  );

  useEffect(() => {
    if (editingId && adminQuestions) {
      setActivityQuestions(
        adminQuestions.map((q) => ({
          _id: q._id,
          type: q.type as ActivityQuestionType,
          body: q.body,
          imageUrl: q.imageUrl,
          options: q.options,
          answerSpec: q.answerSpec,
          hint: q.hint,
          explanation: q.explanation,
          order: q.order,
        })),
      );
    }
  }, [editingId, adminQuestions]);

  function startCreate() {
    setEditingId(null);
    setTitle("");
    setVideoRef("");
    setDescription("");
    setActivityQuestions([]);
  }

  function startEdit(s: SessionDoc) {
    setEditingId(s._id);
    setTitle(s.title);
    setVideoRef(s.videoRef);
    setDescription(s.description ?? "");
    setActivityQuestions([]); // will be populated by useEffect once adminQuestions loads
  }

  function validateQuestions(questions: ActivityQuestionDraft[]): string | null {
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const qNum = i + 1;
      if (!q.body || !q.body.trim()) {
        return `Question ${qNum}: Please enter the question prompt text`;
      }
      if (q.type === "mcq_single") {
        if (!q.options || q.options.length < 2) {
          return `Question ${qNum}: Single-choice MCQ must have at least 2 options`;
        }
        if (q.options.some((opt) => !opt.text || !opt.text.trim())) {
          return `Question ${qNum}: All options must have text`;
        }
        if (!q.answerSpec?.correctOptionId) {
          return `Question ${qNum}: Please select which option is correct`;
        }
      }
      if (q.type === "mcq_multi") {
        if (!q.options || q.options.length < 2) {
          return `Question ${qNum}: Multiple-choice MCQ must have at least 2 options`;
        }
        if (q.options.some((opt) => !opt.text || !opt.text.trim())) {
          return `Question ${qNum}: All options must have text`;
        }
        if (
          !Array.isArray(q.answerSpec?.correctOptionIds) ||
          q.answerSpec.correctOptionIds.length === 0
        ) {
          return `Question ${qNum}: Please select at least one correct option`;
        }
      }
      if (q.type === "numeric") {
        if (
          q.answerSpec?.value === undefined ||
          isNaN(Number(q.answerSpec?.value))
        ) {
          return `Question ${qNum}: Please enter a valid correct numeric value`;
        }
      }
      if (q.type === "short_text") {
        const accepted = q.answerSpec?.accepted;
        if (
          !Array.isArray(accepted) ||
          accepted.length === 0 ||
          !accepted[0]?.trim()
        ) {
          return `Question ${qNum}: Please enter at least one accepted answer`;
        }
      }
    }
    return null;
  }

  async function handleSave() {
    if (!title.trim()) {
      toast.error("Please enter a session title");
      return;
    }
    if (!videoRef.trim()) {
      toast.error("Please enter a Google Drive link or file ID");
      return;
    }

    const questionError = validateQuestions(activityQuestions);
    if (questionError) {
      toast.error(questionError);
      return;
    }

    setIsSaving(true);
    try {
      if (editingId) {
        await updateSession({
          sessionId: editingId,
          title: title.trim(),
          videoRef: videoRef.trim(),
          description: description.trim() || undefined,
        });

        await saveQuestions({
          sessionId: editingId,
          questions: activityQuestions,
        });

        toast.success(
          activityQuestions.length > 0
            ? `Session and ${activityQuestions.length} activity question(s) updated`
            : "Session updated",
        );
      } else {
        await createSession({
          sectionId,
          title: title.trim(),
          driveUrl: videoRef.trim(),
          description: description.trim() || undefined,
          status: "published",
          activityQuestions:
            activityQuestions.length > 0 ? activityQuestions : undefined,
        });

        toast.success(
          activityQuestions.length > 0
            ? `Session and ${activityQuestions.length} activity question(s) added`
            : "Session added",
        );
      }
      startCreate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: Id<"sessions">) {
    if (
      !confirm(
        "Delete this session? Any activity questions for this session will also be removed. This cannot be undone.",
      )
    )
      return;
    try {
      await removeSession({ sessionId: id });
      toast.success("Session deleted");
      if (editingId === id) startCreate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    }
  }

  const loading = structure === undefined || sessions === undefined;

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={`/admin/courses/${courseId}`}
            className="text-sm text-muted-foreground hover:underline"
          >
            ← Back to course
          </Link>
          <h1 className="text-2xl font-semibold mt-1">
            {section?.title ?? (loading ? "Loading…" : "Section")}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage lectures, videos, and interactive activity questions for this week.
          </p>
        </div>
      </div>

      {/* Sessions List */}
      <section className="rounded-xl border bg-card p-5 space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Video className="size-5 text-primary" />
            <h2 className="font-semibold text-base">Sessions &amp; Lectures</h2>
          </div>
          {sessions && sessions.length > 0 && (
            <Badge variant="outline" className="text-xs">
              {sessions.length} {sessions.length === 1 ? "session" : "sessions"}
            </Badge>
          )}
        </div>

        <ul className="space-y-2.5">
          {sessions?.map((s: SessionDoc) => (
            <li
              key={s._id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border p-3.5 bg-card/60 hover:bg-muted/20 transition-colors"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-sm sm:text-base truncate">
                    {s.title}
                  </p>
                  <Badge
                    variant={s.status === "published" ? "default" : "secondary"}
                    className="text-[10px] px-1.5 py-0"
                  >
                    {s.status}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Sparkles className="size-3 text-primary" />
                    {s.activityQuestionsCount && s.activityQuestionsCount > 0 ? (
                      <span className="text-foreground font-medium">
                        {s.activityQuestionsCount} activity question
                        {s.activityQuestionsCount === 1 ? "" : "s"}
                      </span>
                    ) : (
                      <span>No activity questions</span>
                    )}
                  </span>
                  {s.description && (
                    <span className="truncate max-w-xs">• {s.description}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => startEdit(s)}
                >
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(s._id)}
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
          {sessions?.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              <Video className="size-8 mx-auto text-muted-foreground/40 mb-2" />
              <p className="font-medium">No sessions added yet</p>
              <p className="text-xs mt-1">
                Use the form below to add your first lecture video and optional activity questions.
              </p>
            </div>
          ) : null}
        </ul>
      </section>

      {/* Add / Edit Session Form */}
      <section className="space-y-5 rounded-xl border bg-card p-5 sm:p-6 shadow-xs">
        <div className="border-b pb-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              {editingId ? "Edit Session" : "Add New Lecture / Session"}
            </h2>
            <p className="text-xs text-muted-foreground">
              {editingId
                ? "Update session details and manage activity questions."
                : "Add a new session (e.g. L1.1) and optionally attach comprehension activity questions below."}
            </p>
          </div>
          {editingId && (
            <Button variant="ghost" size="sm" onClick={startCreate}>
              Cancel editing
            </Button>
          )}
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Session Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. L1.1 Limits and Continuous Functions"
            />
          </div>

          <div className="space-y-2">
            <Label>Google Drive Link or File ID</Label>
            <Input
              value={videoRef}
              onChange={(e) => setVideoRef(e.target.value)}
              placeholder="https://drive.google.com/file/d/... or Drive file ID"
            />
            <p className="text-[11px] text-muted-foreground">
              Paste the shareable Google Drive link of the lecture recording.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Description (Optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief summary of topics covered in this lecture..."
              rows={2}
            />
          </div>

          {/* Activity Questions Builder (Optional) */}
          <div className="pt-2">
            <ActivityQuestionsEditor
              questions={activityQuestions}
              onChange={setActivityQuestions}
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center gap-3 pt-4 border-t">
            <Button
              disabled={!title.trim() || !videoRef.trim() || isSaving}
              onClick={handleSave}
              className="gap-1.5"
            >
              {isSaving
                ? "Saving…"
                : editingId
                  ? "Save Changes"
                  : "Add Session"}
            </Button>
            {editingId && (
              <Button variant="ghost" onClick={startCreate}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Assignments */}
      <section className="rounded-xl border bg-card p-5 space-y-3 shadow-xs">
        <h2 className="font-semibold text-base">Assignments</h2>
        <ul className="space-y-2 text-sm">
          {section?.assignments?.map(
            (a: { _id: string; title: string; status: string }) => (
              <li
                key={a._id}
                className="flex items-center justify-between rounded-md border p-2.5 px-3 hover:bg-muted/20"
              >
                <Link
                  className="font-medium text-primary hover:underline"
                  href={`/admin/courses/${courseId}/assignments/${a._id}`}
                >
                  {a.title}
                </Link>
                <Badge variant="outline" className="text-xs capitalize">
                  {a.status}
                </Badge>
              </li>
            ),
          )}
          {(!section?.assignments || section.assignments.length === 0) && (
            <p className="text-xs text-muted-foreground">No assignments for this section.</p>
          )}
        </ul>
      </section>
    </div>
  );
}