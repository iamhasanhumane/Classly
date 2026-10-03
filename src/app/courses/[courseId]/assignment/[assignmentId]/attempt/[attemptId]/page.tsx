"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/lib/convex";
import { AttemptRunner } from "@/components/assignment/attempt-runner";
import type { Id } from "@/lib/convex";

export default function AttemptPage() {
  const params = useParams();
  const courseId = params.courseId as Id<"courses">;
  const attemptId = params.attemptId as Id<"attempts">;

  const data = useQuery(api.attempts.getAttempt, { courseId, attemptId });

  if (data === undefined) {
    return <div className="p-8 text-muted-foreground">Loading attempt…</div>;
  }
  if (!data) return <div className="p-8">Attempt not found.</div>;

  return <AttemptRunner courseId={courseId} data={data} />;
}
