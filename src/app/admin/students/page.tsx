"use client";

import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/lib/convex";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { toast } from "sonner";
import type { Id } from "@/lib/convex";

export default function AdminStudentsPage() {
  const students = useQuery(api.enrollments.listStudents);
  const courses = useQuery(api.courses.listAll);
  const createStudent = useAction(api.adminUsers.createStudent);
  const setEnrollment = useMutation(api.enrollments.setEnrollment);
  const setStatus = useMutation(api.adminUsers.setStatus);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Students</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add student</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Optional password (otherwise email code login)</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button
            className="sm:col-span-2 w-fit"
            onClick={async () => {
              try {
                await createStudent({
                  name,
                  email,
                  password: password || undefined,
                });
                toast.success("Student created");
                setName("");
                setEmail("");
                setPassword("");
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Failed");
              }
            }}
          >
            Create student
          </Button>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <h2 className="font-medium">Enrolled students</h2>
        {!students?.length ? (
          <p className="text-sm text-muted-foreground">No students yet.</p>
        ) : (
          <ul className="space-y-4">
            {students.map((s: {
              _id: Id<"users">;
              name?: string;
              email?: string;
              status?: string;
              enrollments: Array<{ courseId: Id<"courses">; status: string }>;
            }) => (
              <li key={s._id} className="rounded-lg border p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{s.name ?? s.email}</p>
                    <p className="text-sm text-muted-foreground">{s.email}</p>
                  </div>
                  <Select
                    value={s.status ?? "active"}
                    onValueChange={(v) =>
                      void setStatus({
                        userId: s._id,
                        status: v as "active" | "inactive",
                      })
                    }
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {courses?.map((c: { _id: Id<"courses">; title: string }) => {
                  const en = s.enrollments.find(
                    (e: { courseId: Id<"courses">; status: string }) =>
                      e.courseId === c._id,
                  );
                  const active = en?.status === "active";
                  return (
                    <label
                      key={c._id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={() =>
                          void setEnrollment({
                            userId: s._id,
                            courseId: c._id as Id<"courses">,
                            active: !active,
                          })
                        }
                      />
                      {c.title}
                    </label>
                  );
                })}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
