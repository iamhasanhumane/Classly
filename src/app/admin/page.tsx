"use client";

import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/lib/convex";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { toast } from "sonner";
export default function AdminDashboardPage() {
  const courses = useQuery(api.courses.listAll);
  const createCourse = useMutation(api.courses.create);
  const [title, setTitle] = useState("Calculus — 8 Week Course");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold mb-2">Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          Manage courses, sessions, assignments, and students.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Create course</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-3">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          <Button
            onClick={async () => {
              const id = await createCourse({ title });
              toast.success("Course created with Weeks 1–8 + PA/GA slots");
              window.location.href = `/admin/courses/${id}`;
            }}
          >
            Create
          </Button>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="font-medium">Courses</h2>
        {!courses?.length ? (
          <p className="text-sm text-muted-foreground">No courses yet.</p>
        ) : (
          <ul className="space-y-2">
            {courses.map((c: { _id: string; title: string; status: string }) => (
              <li key={c._id}>
                <Link
                  href={`/admin/courses/${c._id}`}
                  className="flex items-center justify-between rounded-lg border px-4 py-3 hover:bg-accent"
                >
                  <span>{c.title}</span>
                  <span className="text-xs uppercase text-muted-foreground">
                    {c.status}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
