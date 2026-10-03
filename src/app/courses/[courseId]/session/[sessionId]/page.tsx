"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/lib/convex";
import { googleDriveOpenUrl, googleDrivePreviewUrl } from "@/lib/drive";
import { Button, buttonVariants } from "@/components/ui/button";
import { MarkdownMath } from "@/components/math/markdown-math";

import type { Id } from "@/lib/convex";

export default function SessionPage() {
  const params = useParams();
  const courseId = params.courseId as Id<"courses">;
  const sessionId = params.sessionId as Id<"sessions">;

  const session = useQuery(api.sessions.get, { courseId, sessionId });
  const structure = useQuery(api.courses.getStructure, { courseId });
  const markComplete = useMutation(api.progress.markSessionComplete);
  const touch = useMutation(api.progress.touchSession);
  const setLastViewed = useMutation(api.courses.setLastViewed);

  useEffect(() => {
    void touch({ courseId, sessionId });
    void setLastViewed({
      courseId,
      path: `/courses/${courseId}/session/${sessionId}`,
    });
  }, [courseId, sessionId, touch, setLastViewed]);

  const progress = structure?.sections
    .flatMap((s: { sessions: { _id: string; completed?: boolean }[] }) => s.sessions)
    .find((s: { _id: string }) => s._id === sessionId);

  if (session === undefined) {
    return <div className="p-8 text-muted-foreground">Loading session…</div>;
  }
  if (session === null) {
    return <div className="p-8">Session not found.</div>;
  }

  const preview = googleDrivePreviewUrl(session.videoRef);

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{session.title}</h1>
        {session.description ? (
          <div className="mt-3 prose prose-sm dark:prose-invert max-w-none">
            <MarkdownMath content={session.description} />
          </div>
        ) : null}
      </div>

      <div className="aspect-video w-full overflow-hidden rounded-xl border bg-black/5">
        <iframe
          src={preview}
          className="h-full w-full"
          allow="autoplay; encrypted-media"
          allowFullScreen
          title={session.title}
        />
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <Button
          variant={progress?.completed ? "secondary" : "default"}
          onClick={() =>
            void markComplete({
              courseId,
              sessionId,
              completed: !progress?.completed,
            })
          }
        >
          {progress?.completed ? "Completed ✓" : "Mark as complete"}
        </Button>
        <a
          href={googleDriveOpenUrl(session.videoRef)}
          target="_blank"
          rel="noreferrer"
          className={buttonVariants({ variant: "outline" })}
        >
          Open in Google Drive
        </a>
      </div>


    </div>
  );
}
