"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/lib/convex";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDueDate } from "@/lib/format";
import { richTextPreview } from "@/lib/html";
import { BookOpen, CheckCircle, ArrowRight, GraduationCap, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import type { Id } from "@/lib/convex";

export default function MyCoursesPage() {
  const courses = useQuery(api.courses.listForStudent);
  const enrollSelf = useMutation(api.enrollments.enrollSelf);
  const router = useRouter();
  const [enrollingId, setEnrollingId] = useState<string | null>(null);

  async function handleEnroll(courseId: Id<"courses">, title: string) {
    setEnrollingId(courseId);
    try {
      await enrollSelf({ courseId });
      toast.success(`Enrolled in ${title}!`);
      router.push(`/courses/${courseId}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to enroll");
    } finally {
      setEnrollingId(null);
    }
  }

  const enrolledCourses = courses?.filter((c) => c.isEnrolled) ?? [];
  const availableCourses = courses?.filter((c) => !c.isEnrolled) ?? [];

  return (
    <AppShell title="Courses">
      <div className="mx-auto max-w-7xl p-4 md:p-8 space-y-10">
        {/* Welcome / Header Banner */}
        <div className="rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 md:p-8 border space-y-2">
          <div className="flex items-center gap-2 text-primary font-medium text-sm">
            <GraduationCap className="size-5" />
            <span>Learning Portal</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Courses & Curriculum</h1>
          <p className="text-sm md:text-base text-muted-foreground max-w-2xl">
            Browse through calculus modules, watch video lectures, and test your knowledge with interactive activity questions and assignments.
          </p>
        </div>

        {courses === undefined ? (
          <div className="py-12 text-center text-muted-foreground">Loading courses…</div>
        ) : courses.length === 0 ? (
          <Card>
            <CardHeader className="text-center py-12">
              <BookOpen className="size-10 mx-auto text-muted-foreground/50 mb-3" />
              <CardTitle>No courses published yet</CardTitle>
              <CardDescription>
                Check back soon! New courses and lessons are being prepared.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <>
            {/* Enrolled Courses */}
            {enrolledCourses.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="size-5 text-emerald-500" />
                  <h2 className="text-xl font-bold tracking-tight">My Courses</h2>
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {enrolledCourses.length} {enrolledCourses.length === 1 ? "course" : "courses"}
                  </Badge>
                </div>

                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {enrolledCourses.map((course) => (
                    <Card
                      key={course._id}
                      className="h-full flex flex-col transition-all hover:shadow-md hover:border-primary/40 group"
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-lg group-hover:text-primary transition-colors">
                            {course.title}
                          </CardTitle>
                          <Badge variant="secondary" className="shrink-0 font-medium">
                            {course.progress}%
                          </Badge>
                        </div>
                        {course.description ? (
                          <CardDescription className="line-clamp-2 text-xs">
                            {richTextPreview(course.description, 160)}
                          </CardDescription>
                        ) : null}
                      </CardHeader>

                      <CardContent className="text-xs text-muted-foreground space-y-2 flex-1">
                        {/* Progress Bar */}
                        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-primary h-full transition-all duration-300"
                            style={{ width: `${course.progress}%` }}
                          />
                        </div>

                        {course.nextDeadline ? (
                          <p className="pt-1">
                            Next deadline: <strong>{formatDueDate(course.nextDeadline)}</strong>
                          </p>
                        ) : (
                          <p className="pt-1 text-muted-foreground/80">No upcoming graded deadlines</p>
                        )}
                      </CardContent>

                      <CardFooter className="pt-0 border-t mt-3 p-4">
                        <Link href={`/courses/${course._id}`} className="w-full">
                          <Button className="w-full gap-2">
                            Continue Course
                            <ArrowRight className="size-4" />
                          </Button>
                        </Link>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {/* Available to Enroll Courses */}
            {availableCourses.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-5 text-primary" />
                  <h2 className="text-xl font-bold tracking-tight">
                    {enrolledCourses.length > 0 ? "Explore More Courses" : "Available Courses"}
                  </h2>
                </div>

                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {availableCourses.map((course) => (
                    <Card
                      key={course._id}
                      className="h-full flex flex-col transition-all hover:shadow-md border-dashed hover:border-solid hover:border-primary/50"
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-lg">{course.title}</CardTitle>
                          <Badge variant="outline" className="text-xs">
                            Available
                          </Badge>
                        </div>
                        {course.description ? (
                          <CardDescription className="line-clamp-3 text-xs">
                            {richTextPreview(course.description, 200)}
                          </CardDescription>
                        ) : (
                          <CardDescription className="text-xs italic">
                            Comprehensive calculus lectures, interactive activities, and graded problem sets.
                          </CardDescription>
                        )}
                      </CardHeader>

                      <CardContent className="flex-1 text-xs text-muted-foreground">
                        <p>Enroll today to gain full access to sessions and assignments.</p>
                      </CardContent>

                      <CardFooter className="pt-0 border-t mt-3 p-4">
                        <Button
                          variant="default"
                          className="w-full gap-2"
                          disabled={enrollingId === course._id}
                          onClick={() => handleEnroll(course._id as Id<"courses">, course.title)}
                        >
                          {enrollingId === course._id ? "Enrolling…" : "Enroll in Course"}
                          <ArrowRight className="size-4" />
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
