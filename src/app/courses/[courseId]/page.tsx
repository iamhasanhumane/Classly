"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/lib/convex";
import type { Id } from "@/lib/convex";

export default function CourseIndexPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as Id<"courses">;
  const structure = useQuery(api.courses.getStructure, { courseId });

  useEffect(() => {
    if (!structure) return;
    for (const section of structure.sections) {
      if (section.locked) continue;
      if (section.sessions[0]) {
        router.replace(
          `/courses/${courseId}/session/${section.sessions[0]._id}`,
        );
        return;
      }
      if (section.assignments[0]) {
        router.replace(
          `/courses/${courseId}/assignment/${section.assignments[0]._id}`,
        );
        return;
      }
    }
  }, [structure, courseId, router]);

  return (
    <div className="p-8 text-muted-foreground">
      {structure ? "Opening your course…" : "Loading…"}
    </div>
  );
}
