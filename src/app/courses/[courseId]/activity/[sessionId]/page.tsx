"use client";

import { useParams } from "next/navigation";
import type { Id } from "@/lib/convex";
import { ActivityQuestionsPlayer } from "@/components/session/activity-questions-player";

export default function ActivityPage() {
  const params = useParams();
  const courseId = params.courseId as Id<"courses">;
  const sessionId = params.sessionId as Id<"sessions">;

  return (
    <div className="p-4 md:p-8 max-w-3xl">
      <ActivityQuestionsPlayer courseId={courseId} sessionId={sessionId} />
    </div>
  );
}
