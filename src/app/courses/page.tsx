"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/lib/convex";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDueDate } from "@/lib/format";
import { richTextPreview } from "@/lib/html";

export default function MyCoursesPage() {
  const courses = useQuery(api.courses.listForStudent);

  return (
    <AppShell title="My Courses">
      <div className="mx-auto max-w-7xl p-4 md:p-8">
        <h1 className="text-2xl font-semibold tracking-tight mb-6">My Courses</h1>
        {courses === undefined ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : courses.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No courses yet</CardTitle>
              <CardDescription>
                You&apos;re not enrolled in any course yet — contact your instructor.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course: {
              _id: string;
              title: string;
              description?: string;
              progress: number;
              nextDeadline: number | null;
              lastViewedPath?: string;
            }) => (
              <Link key={course._id} href={`/courses/${course._id}`}>
                <Card className="h-full transition-colors hover:border-primary/40">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg">{course.title}</CardTitle>
                      <Badge variant="secondary">{course.progress}%</Badge>
                    </div>
                    {course.description ? (
                      <CardDescription className="line-clamp-3">
                        {richTextPreview(course.description, 200)}
                      </CardDescription>
                    ) : null}
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground space-y-1">
                    {course.nextDeadline ? (
                      <p>
                        Next deadline:{" "}
                        {formatDueDate(course.nextDeadline)}
                      </p>
                    ) : (
                      <p>No upcoming graded deadlines</p>
                    )}
                    {course.lastViewedPath ? (
                      <p className="text-primary">Continue where you left off →</p>
                    ) : null}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
