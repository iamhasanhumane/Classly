"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/lib/convex";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MarkdownMath } from "@/components/math/markdown-math";
import { cn } from "@/lib/utils";
import type { Id } from "@/lib/convex";

export type AttemptData = {
  attempt: {
    _id: Id<"attempts">;
    status: string;
    score?: number;
    maxScore?: number;
    isLate: boolean;
  };
  showSolutions: boolean;
  questions: Array<{
    _id: Id<"questions">;
    type: string;
    body: string;
    imageUrl?: string;
    marks: number;
    options?: { id: string; text: string }[];
    hint?: string;
    solution?: string;
    response?: unknown;
    isCorrect?: boolean;
    marksAwarded?: number;
  }>;
};

export function AttemptRunner({
  courseId,
  data,
}: {
  courseId: Id<"courses">;
  data: AttemptData;
}) {
  const saveAnswer = useMutation(api.attempts.saveAnswer);
  const submit = useMutation(api.attempts.submit);
  const [activeIndex, setActiveIndex] = useState(0);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const questions = data.questions;
  const active = questions[activeIndex];
  const inProgress = data.attempt.status === "in_progress";

  const answered = useMemo(
    () =>
      new Set(
        questions
          .filter((q) => q.response !== undefined && q.response !== "")
          .map((q) => q._id),
      ),
    [questions],
  );

  if (!active) {
    return <p className="p-8 text-muted-foreground">No questions in this attempt.</p>;
  }

  async function persistResponse(questionId: Id<"questions">, response: unknown) {
    await saveAnswer({ courseId, attemptId: data.attempt._id, questionId, response });
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-wrap gap-2">
        {questions.map((q, i) => (
          <button
            key={q._id}
            type="button"
            onClick={() => setActiveIndex(i)}
            className={cn(
              "size-9 rounded-md border text-sm font-medium",
              i === activeIndex && "border-primary bg-primary/10",
              answered.has(q._id) && "bg-emerald-50 dark:bg-emerald-950/30",
            )}
          >
            {i + 1}
          </button>
        ))}
      </div>

      <div className="rounded-xl border p-5 space-y-4">
        <div className="text-sm text-muted-foreground">
          Question {activeIndex + 1} · {active.marks} mark
          {active.marks === 1 ? "" : "s"}
        </div>
        <MarkdownMath content={active.body} />

        {active.imageUrl && (
          <div className="max-h-72 w-full overflow-hidden rounded-xl border bg-black/5 flex items-center justify-center p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={active.imageUrl}
              alt="Question illustration"
              className="max-h-68 w-auto object-contain rounded-lg"
            />
          </div>
        )}

        {inProgress ? (
          <QuestionInput
            question={active}
            onChange={(val) => void persistResponse(active._id, val)}
          />
        ) : (
          <ResultsBlock question={active} showSolutions={data.showSolutions} />
        )}

        {active.hint && data.showSolutions ? (
          <div className="rounded-lg bg-muted p-3 text-sm">
            <p className="font-medium mb-1">Hint</p>
            <MarkdownMath content={active.hint} />
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2 justify-between">
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={activeIndex === 0}
            onClick={() => setActiveIndex((i) => i - 1)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            disabled={activeIndex >= questions.length - 1}
            onClick={() => setActiveIndex((i) => i + 1)}
          >
            Next
          </Button>
        </div>
        {inProgress ? (
          confirmSubmit ? (
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setConfirmSubmit(false)}>
                Cancel
              </Button>
              <Button
                disabled={submitting}
                onClick={async () => {
                  setSubmitting(true);
                  await submit({ courseId, attemptId: data.attempt._id });
                  setSubmitting(false);
                  setConfirmSubmit(false);
                }}
              >
                Confirm submit
              </Button>
            </div>
          ) : (
            <Button onClick={() => setConfirmSubmit(true)}>Submit attempt</Button>
          )
        ) : (
          <div className="text-sm">
            Score:{" "}
            <strong>
              {data.attempt.score ?? 0}/{data.attempt.maxScore ?? "—"}
            </strong>
            {data.attempt.isLate ? (
              <span className="text-amber-700 ml-2">(late)</span>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

function QuestionInput({
  question,
  onChange,
}: {
  question: AttemptData["questions"][number];
  onChange: (val: unknown) => void;
}) {
  const [local, setLocal] = useState(question.response ?? "");

  useEffect(() => {
    setLocal(question.response ?? "");
  }, [question._id, question.response]);

  if (question.type === "mcq_single" && question.options) {
    return (
      <div className="space-y-2">
        {question.options.map((opt) => (
          <label
            key={opt.id}
            className="flex gap-3 items-start rounded-lg border p-3 cursor-pointer hover:bg-muted/50"
          >
            <input
              type="radio"
              name={question._id}
              checked={local === opt.id}
              onChange={() => {
                setLocal(opt.id);
                onChange(opt.id);
              }}
            />
            <MarkdownMath content={opt.text} />
          </label>
        ))}
      </div>
    );
  }

  if (question.type === "mcq_multi" && question.options) {
    const selected = new Set(Array.isArray(local) ? local : []);
    return (
      <div className="space-y-2">
        {question.options.map((opt) => (
          <label
            key={opt.id}
            className="flex gap-3 items-start rounded-lg border p-3 cursor-pointer hover:bg-muted/50"
          >
            <input
              type="checkbox"
              checked={selected.has(opt.id)}
              onChange={() => {
                const next = new Set(selected);
                if (next.has(opt.id)) next.delete(opt.id);
                else next.add(opt.id);
                const arr = [...next];
                setLocal(arr);
                onChange(arr);
              }}
            />
            <MarkdownMath content={opt.text} />
          </label>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label>Your answer</Label>
      <Input
        value={String(local ?? "")}
        onChange={(e) => {
          setLocal(e.target.value);
          onChange(e.target.value);
        }}
        className="font-mono"
        placeholder="Type your answer (LaTeX-friendly text)"
      />
    </div>
  );
}

function ResultsBlock({
  question,
  showSolutions,
}: {
  question: AttemptData["questions"][number];
  showSolutions: boolean;
}) {
  return (
    <div className="space-y-2 text-sm">
      <p>
        Your answer:{" "}
        <code className="rounded bg-muted px-1">
          {JSON.stringify(question.response) ?? "—"}
        </code>
      </p>
      {showSolutions && question.isCorrect !== undefined ? (
        <p className={question.isCorrect ? "text-emerald-700" : "text-red-700"}>
          {question.isCorrect ? "Correct" : "Incorrect"} ·{" "}
          {question.marksAwarded ?? 0}/{question.marks} marks
        </p>
      ) : null}
      {showSolutions && question.solution ? (
        <div className="rounded-lg border p-3">
          <p className="font-medium mb-1">Solution</p>
          <MarkdownMath content={question.solution} />
        </div>
      ) : null}
    </div>
  );
}
