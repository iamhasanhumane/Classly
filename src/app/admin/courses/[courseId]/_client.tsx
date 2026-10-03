"use client";

import { RichTextEditor } from "@/components/editor/rich-text-editor";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Id } from "@/lib/convex";
import { api } from "@/lib/convex";
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function AdminCoursePageClient() {
  const params = useParams();
  const courseId = params.courseId as Id<"courses">;
  const structure = useQuery(api.courses.getStructure, { courseId });
  const updateCourse = useMutation(api.courses.update);

  const [courseDescription, setCourseDescription] = useState("");

  const course = structure?.course;
  const sections = structure?.sections ?? [];
  const loading = structure === undefined;

  useEffect(() => {
    if (course) {
      setCourseDescription(course.description ?? "");
    }
  }, [course?._id, course?.description]);

  if (loading) {
    return (
      <div className="space-y-8">
        <p className="text-muted-foreground">Loading course…</p>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="space-y-8">
        <p className="text-muted-foreground">Course not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{course.title}</h1>
          <p className="text-sm text-muted-foreground">Course content &amp; sessions</p>
        </div>
        <Link
          href={`/courses/${courseId}`}
          className={buttonVariants({ variant: "outline" })}
        >
          View as student
        </Link>
      </div>

      {/* Course Settings */}
      <section className="rounded-lg border p-4 space-y-4 max-w-3xl">
        <h2 className="font-medium">Course settings</h2>
        <div className="space-y-2">
          <Label>Title</Label>
          <Input
            key={course._id}
            defaultValue={course.title}
            onBlur={(e) => {
              void updateCourse({ courseId, title: e.target.value });
            }}
          />
        </div>
        <div className="space-y-2">
          <Label>Description</Label>
          <p className="text-xs text-muted-foreground">
            Use the toolbar for bold, italics, and bullet lists. Saves when you
            click outside the editor.
          </p>
          <RichTextEditor
            key={course._id}
            value={courseDescription}
            onChange={setCourseDescription}
            onBlur={(html) => {
              const cleaned = html === "<p></p>" ? "" : html;
              void updateCourse({ courseId, description: cleaned });
            }}
            placeholder="Course overview, topics covered, expectations…"
            minHeight="14rem"
          />
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            key={course.status}
            defaultValue={course.status}
            onValueChange={(v) => {
              void updateCourse({
                courseId,
                status: v as "draft" | "published",
              });
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      {/* Weeks / Sections */}
      <section className="space-y-4">
        <h2 className="font-medium">Weeks / Sections</h2>
        {sections.map(
          (section: { _id: string; title: string; type: string }) => (
            <div
              key={section._id}
              className="flex items-center justify-between rounded-lg border p-4"
            >
              <div>
                <p className="font-medium">{section.title}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {section.type}
                </p>
              </div>
              <Link
                href={`/admin/courses/${courseId}/weeks/${section._id}`}
                className={buttonVariants({ variant: "outline" })}
              >
                Edit
              </Link>
            </div>
          ),
        )}
        {sections.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No weeks or sections found.
          </p>
        )}
      </section>
    </div>
  );
}
