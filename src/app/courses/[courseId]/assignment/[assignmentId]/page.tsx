"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/lib/convex";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MarkdownMath } from "@/components/math/markdown-math";
import { formatDueDate } from "@/lib/format";
import type { Id } from "@/lib/convex";

export default function AssignmentOverviewPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as Id<"courses">;
  const assignmentId = params.assignmentId as Id<"assignments">;

  const info = useQuery(api.assignments.getForStudent, { courseId, assignmentId });
  const startAttempt = useMutation(api.attempts.start);
  const setLastViewed = useMutation(api.courses.setLastViewed);

  if (info === undefined) {
    return <div className="p-8 text-muted-foreground">Loading…</div>;
  }
  if (!info) return <div className="p-8">Assignment not found.</div>;

  const { assignment, attempts, countedScore, inProgressId, effectiveDue, pastDue } =
    info;

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-3xl">
      <div>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <Badge variant={assignment.kind === "practice" ? "secondary" : "default"}>
            {assignment.kind === "practice" ? "Practice" : "Graded"}
          </Badge>
          {pastDue && assignment.kind === "graded" ? (
            <Badge variant="outline">Past deadline</Badge>
          ) : null}
        </div>
        <h1 className="text-2xl font-semibold">{assignment.title}</h1>
        {assignment.instructions ? (
          <div className="mt-3">
            <MarkdownMath content={assignment.instructions} />
          </div>
        ) : null}
      </div>

      {assignment.kind === "graded" && effectiveDue ? (
        <p className="text-sm text-muted-foreground">
          Due {formatDueDate(effectiveDue)}
          {countedScore !== null ? (
            <>
              {" "}
              · Counted score: <strong>{countedScore.toFixed(1)}</strong> (
              {assignment.scoringPolicy} attempt)
            </>
          ) : null}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        {inProgressId ? (
          <Link
            href={`/courses/${courseId}/assignment/${assignmentId}/attempt/${inProgressId}`}
            className={buttonVariants()}
          >
            Resume attempt
          </Link>
        ) : (
          <Button
            disabled={pastDue && assignment.latePolicy === "strict"}
            onClick={async () => {
              const id = await startAttempt({ courseId, assignmentId });
              void setLastViewed({
                courseId,
                path: `/courses/${courseId}/assignment/${assignmentId}`,
              });
              router.push(
                `/courses/${courseId}/assignment/${assignmentId}/attempt/${id}`,
              );
            }}
          >
            {attempts.length ? "Start new attempt" : "Start attempt"}
          </Button>
        )}
      </div>

      {attempts.length ? (
        <section className="space-y-3">
          <h2 className="font-medium">Attempt history</h2>
          <ul className="divide-y rounded-lg border">
            {attempts.map((a: {
              _id: string;
              attemptNo: number;
              submittedAt?: number;
              isLate: boolean;
              score?: number;
              maxScore?: number;
            }) => (
              <li
                key={a._id}
                className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
              >
                <div>
                  <span className="font-medium">Attempt {a.attemptNo}</span>
                  {a.submittedAt ? (
                    <span className="text-muted-foreground ml-2">
                      {formatDueDate(a.submittedAt)}
                    </span>
                  ) : null}
                  {a.isLate ? (
                    <Badge variant="outline" className="ml-2">
                      Late
                    </Badge>
                  ) : null}
                </div>
                <div className="flex items-center gap-3">
                  {a.score !== undefined ? (
                    <span>
                      {a.score}/{a.maxScore ?? "—"}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">In progress</span>
                  )}
                  <Link
                    href={`/courses/${courseId}/assignment/${assignmentId}/attempt/${a._id}`}
                    className={buttonVariants({ variant: "ghost", size: "sm" })}
                  >
                    View
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
