"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/lib/convex";
import type { Id } from "@/lib/convex";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MarkdownMath } from "@/components/math/markdown-math";
import {
  CheckCircle2,
  Lightbulb,
  RotateCcw,
  Sparkles,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ActivityQuestionsPlayerProps {
  courseId: Id<"courses">;
  sessionId: Id<"sessions">;
}

export function ActivityQuestionsPlayer({
  courseId,
  sessionId,
}: ActivityQuestionsPlayerProps) {
  const data = useQuery(api.activityQuestions.listForSessionStudent, {
    courseId,
    sessionId,
  });

  const submitAnswer = useMutation(api.activityQuestions.submitAnswer);
  const resetAnswer = useMutation(api.activityQuestions.resetAnswer);

  // Local selections before submission
  const [localResponses, setLocalResponses] = useState<Record<string, unknown>>({});
  // Which questions have been submitted in this session (result known)
  const [submittedIds, setSubmittedIds] = useState<Record<string, boolean>>({});
  const [submittingAll, setSubmittingAll] = useState(false);
  const [showHints, setShowHints] = useState<Record<string, boolean>>({});

  if (!data || !data.questions || data.questions.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground space-y-2">
        <Sparkles className="size-8 mx-auto opacity-30" />
        <p className="font-medium text-sm">No activity questions for this session yet.</p>
      </div>
    );
  }

  const { questions, userAnswers } = data;

  const correctCount = questions.filter(
    (q) => userAnswers[q._id]?.isCorrect === true,
  ).length;

  const allCorrect = questions.length > 0 && correctCount === questions.length;

  // Has the student already answered all questions from a previous session?
  const alreadyAllAnswered = questions.every((q) => userAnswers[q._id] !== undefined);

  // Are all current local selections filled in?
  function isResponseFilled(qId: Id<"activityQuestions">) {
    const ans = userAnswers[qId];
    // Already answered correctly → counts as done
    if (ans?.isCorrect) return true;
    const resp = localResponses[qId] !== undefined ? localResponses[qId] : ans?.response;
    if (resp === undefined || resp === "") return false;
    if (Array.isArray(resp) && resp.length === 0) return false;
    return true;
  }

  const allFilled = questions.every((q) => isResponseFilled(q._id));

  async function handleSubmitAll() {
    setSubmittingAll(true);
    try {
      let anyWrong = false;
      for (const q of questions) {
        // Skip already-correct
        if (userAnswers[q._id]?.isCorrect) continue;
        const resp =
          localResponses[q._id] !== undefined
            ? localResponses[q._id]
            : userAnswers[q._id]?.response;
        if (resp === undefined || resp === "" || (Array.isArray(resp) && resp.length === 0)) {
          continue;
        }
        const res = await submitAnswer({ courseId, sessionId, questionId: q._id, response: resp });
        setSubmittedIds((prev) => ({ ...prev, [q._id]: true }));
        if (!res.isCorrect) anyWrong = true;
      }
      if (anyWrong) {
        toast.error("Some answers are incorrect. Review and try again.");
      } else {
        toast.success("All correct! Great work.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to submit");
    } finally {
      setSubmittingAll(false);
    }
  }

  async function handleRetry(questionId: Id<"activityQuestions">) {
    setLocalResponses((prev) => ({ ...prev, [questionId]: undefined }));
    setSubmittedIds((prev) => ({ ...prev, [questionId]: false }));
    setShowHints((prev) => ({ ...prev, [questionId]: false }));
    try {
      await resetAnswer({ courseId, sessionId, questionId });
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-6 rounded-2xl border bg-card p-5 sm:p-6 shadow-xs">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Sparkles className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              Check Your Understanding
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Answer all questions then click <strong>Submit</strong> at the bottom.
            </p>
          </div>
        </div>

        <Badge
          variant={allCorrect ? "default" : "secondary"}
          className="text-xs px-3 py-1 font-medium"
        >
          {allCorrect ? (
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-3.5" /> All {questions.length} Correct
            </span>
          ) : (
            <span>
              {correctCount} / {questions.length} Correct
            </span>
          )}
        </Badge>
      </div>

      {/* All-correct celebration banner */}
      {allCorrect && (
        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 p-4 text-emerald-800 dark:text-emerald-200 flex items-center gap-3">
          <CheckCircle2 className="size-6 text-emerald-600 shrink-0" />
          <div>
            <p className="font-semibold text-sm">
              Great job! You understood all the key concepts.
            </p>
            <p className="text-xs opacity-90">
              You answered all activity questions correctly.
            </p>
          </div>
        </div>
      )}

      {/* Questions */}
      <div className="space-y-5">
        {questions.map((q, idx) => {
          const ans = userAnswers[q._id];
          const wasSubmittedThisSession = submittedIds[q._id];
          // Show feedback if we know the result (either from a previous session or just submitted now)
          const showFeedback = ans !== undefined && (wasSubmittedThisSession || alreadyAllAnswered);
          const isCorrect = ans?.isCorrect ?? false;

          const currentResponse =
            localResponses[q._id] !== undefined ? localResponses[q._id] : ans?.response;

          const isLocked = isCorrect; // Correct answers are locked

          return (
            <div
              key={q._id}
              className={cn(
                "rounded-xl border p-4 sm:p-5 space-y-4 transition-colors",
                showFeedback && isCorrect
                  ? "border-emerald-200 bg-emerald-50/20 dark:border-emerald-900 dark:bg-emerald-950/10"
                  : showFeedback && !isCorrect
                    ? "border-red-200 bg-red-50/10 dark:border-red-900 dark:bg-red-950/10"
                    : "bg-muted/10",
              )}
            >
              {/* Question label */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-mono font-semibold text-foreground/70">
                  Question {idx + 1}
                </span>
                {showFeedback && (
                  <Badge
                    variant={isCorrect ? "default" : "destructive"}
                    className="text-[10px] px-2 py-0.5"
                  >
                    {isCorrect ? "✓ Correct" : "✗ Incorrect"}
                  </Badge>
                )}
              </div>

              {/* Question body */}
              <div className="font-medium text-sm sm:text-base leading-relaxed">
                <MarkdownMath content={q.body} />
              </div>

              {/* Optional image */}
              {q.imageUrl && (
                <div className="max-h-72 w-full overflow-hidden rounded-xl border bg-black/5 flex items-center justify-center p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={q.imageUrl}
                    alt="Question illustration"
                    className="max-h-64 w-auto object-contain rounded-lg"
                  />
                </div>
              )}

              {/* Answer inputs */}
              <div className="space-y-2 pt-1">
                {q.type === "mcq_single" && q.options && (
                  <div className="space-y-2">
                    {q.options.map((opt) => {
                      const selected = currentResponse === opt.id;
                      return (
                        <label
                          key={opt.id}
                          className={cn(
                            "flex items-start gap-3 rounded-lg border p-3 cursor-pointer text-sm transition-colors",
                            isLocked ? "cursor-default opacity-80" : "cursor-pointer",
                            selected && !showFeedback
                              ? "border-primary bg-primary/5 font-medium"
                              : "",
                            selected && showFeedback && isCorrect
                              ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 font-medium"
                              : "",
                            selected && showFeedback && !isCorrect
                              ? "border-red-400 bg-red-50 dark:bg-red-950/30"
                              : "",
                            !selected && !isLocked ? "hover:bg-muted/40" : "",
                          )}
                        >
                          <input
                            type="radio"
                            name={`activity_${q._id}`}
                            checked={selected}
                            disabled={isLocked}
                            onChange={() => {
                              if (isLocked) return;
                              setLocalResponses((prev) => ({
                                ...prev,
                                [q._id]: opt.id,
                              }));
                            }}
                            className="mt-0.5 size-4 text-primary cursor-pointer shrink-0"
                          />
                          <div className="flex-1">
                            <MarkdownMath content={opt.text} />
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}

                {q.type === "mcq_multi" && q.options && (
                  <div className="space-y-2">
                    {q.options.map((opt) => {
                      const selectedSet = new Set(
                        Array.isArray(currentResponse)
                          ? (currentResponse as string[])
                          : [],
                      );
                      const isChecked = selectedSet.has(opt.id);
                      return (
                        <label
                          key={opt.id}
                          className={cn(
                            "flex items-start gap-3 rounded-lg border p-3 text-sm transition-colors",
                            isLocked ? "cursor-default opacity-80" : "cursor-pointer",
                            isChecked && !showFeedback
                              ? "border-primary bg-primary/5 font-medium"
                              : "",
                            isChecked && showFeedback && isCorrect
                              ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 font-medium"
                              : "",
                            isChecked && showFeedback && !isCorrect
                              ? "border-red-400 bg-red-50 dark:bg-red-950/30"
                              : "",
                            !isChecked && !isLocked ? "hover:bg-muted/40" : "",
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={isLocked}
                            onChange={() => {
                              if (isLocked) return;
                              const next = new Set(selectedSet);
                              if (next.has(opt.id)) next.delete(opt.id);
                              else next.add(opt.id);
                              setLocalResponses((prev) => ({
                                ...prev,
                                [q._id]: [...next],
                              }));
                            }}
                            className="mt-0.5 size-4 rounded text-primary shrink-0"
                          />
                          <div className="flex-1">
                            <MarkdownMath content={opt.text} />
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}

                {q.type === "numeric" && (
                  <div className="max-w-xs space-y-1">
                    <Input
                      type="number"
                      step="any"
                      placeholder="Enter numeric answer"
                      disabled={isLocked}
                      value={currentResponse !== undefined ? String(currentResponse) : ""}
                      onChange={(e) => {
                        if (isLocked) return;
                        setLocalResponses((prev) => ({
                          ...prev,
                          [q._id]: e.target.value,
                        }));
                      }}
                      className="font-mono text-sm"
                    />
                  </div>
                )}

                {q.type === "short_text" && (
                  <div className="max-w-md space-y-1">
                    <Input
                      type="text"
                      placeholder="Type your answer..."
                      disabled={isLocked}
                      value={currentResponse !== undefined ? String(currentResponse) : ""}
                      onChange={(e) => {
                        if (isLocked) return;
                        setLocalResponses((prev) => ({
                          ...prev,
                          [q._id]: e.target.value,
                        }));
                      }}
                      className="text-sm"
                    />
                  </div>
                )}
              </div>

              {/* Per-question feedback (shown after submission) */}
              {showFeedback && (
                <div className="space-y-3 pt-1">
                  {isCorrect ? (
                    <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 p-3 text-xs sm:text-sm text-emerald-800 dark:text-emerald-200 flex items-start gap-2">
                      <CheckCircle2 className="size-4 text-emerald-600 mt-0.5 shrink-0" />
                      <div className="space-y-1">
                        <p className="font-semibold">Correct! Well done.</p>
                        {q.explanation && (
                          <div className="pt-1 text-xs opacity-95">
                            <MarkdownMath content={q.explanation} />
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 p-3 text-xs sm:text-sm text-red-800 dark:text-red-200 flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        <XCircle className="size-4 text-red-600 mt-0.5 shrink-0" />
                        <div>
                          <p className="font-semibold">Not quite right.</p>
                          <p className="text-xs opacity-90">
                            Review the lecture or use the hint, then try again.
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleRetry(q._id)}
                        className="h-7 text-xs gap-1 shrink-0 border-red-300 text-red-700 hover:bg-red-50"
                      >
                        <RotateCcw className="size-3" /> Retry
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Hint */}
              {q.hint && !isCorrect && (
                <div>
                  <button
                    type="button"
                    onClick={() =>
                      setShowHints((prev) => ({ ...prev, [q._id]: !prev[q._id] }))
                    }
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Lightbulb className="size-3.5 text-amber-500" />
                    {showHints[q._id] ? "Hide Hint" : "Need a Hint?"}
                  </button>
                  {showHints[q._id] && (
                    <div className="mt-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 p-3 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
                      <Lightbulb className="size-4 text-amber-600 mt-0.5 shrink-0" />
                      <div className="space-y-1">
                        <p className="font-semibold">Hint:</p>
                        <MarkdownMath content={q.hint} />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Single bottom Submit button */}
      {!allCorrect && (
        <div className="pt-2 border-t flex items-center gap-3">
          <Button
            size="default"
            disabled={submittingAll || !allFilled}
            onClick={handleSubmitAll}
            className="gap-2 min-w-32"
          >
            {submittingAll ? "Submitting…" : "Submit Answers"}
          </Button>
          {!allFilled && (
            <p className="text-xs text-muted-foreground">
              Answer all questions to submit.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
