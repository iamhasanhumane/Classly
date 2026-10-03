"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/lib/convex";
import { AppShell } from "@/components/app-shell";
import { CourseSidebar } from "@/components/course/course-sidebar";
import type { Id } from "@/lib/convex";

export default function CourseLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const courseId = params.courseId as Id<"courses">;
  const structure = useQuery(api.courses.getStructure, { courseId });
  const course = structure?.course;

  return (
    <AppShell title={course?.title ?? "Course"}>
      {/* Exact viewport height below the header — overflow-hidden stops root scroll */}
      <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
        {/* Sidebar: fixed width, scrolls independently */}
        {structure ? (
          <CourseSidebar courseId={courseId} structure={structure} />
        ) : (
          <aside className="w-72 shrink-0 border-r p-4 text-sm text-muted-foreground overflow-y-auto">
            Loading course…
          </aside>
        )}
        {/* Main content: takes all remaining space, scrolls independently */}
        <div className="flex-1 min-w-0 overflow-y-auto">{children}</div>
      </div>
    </AppShell>
  );
}
