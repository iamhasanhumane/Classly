"use client";

import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/lib/convex";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";
import { toast } from "sonner";
import type { Id } from "@/lib/convex";
import {
  Pencil,
  Trash2,
  KeyRound,
  UserPlus,
  Search,
  Copy,
  Check,
  Eye,
  EyeOff,
  Shield,
  GraduationCap,
  Sparkles,
} from "lucide-react";

export default function AdminStudentsPage() {
  const users = useQuery(api.adminUsers.list);
  const courses = useQuery(api.courses.listAll);
  const viewer = useQuery(api.users.viewer);

  const createStudent = useAction(api.adminUsers.createStudent);
  const updateUser = useMutation(api.adminUsers.updateUser);
  const setUserPassword = useAction(api.adminUsers.setUserPassword);
  const deleteUser = useMutation(api.adminUsers.deleteUser);
  const setEnrollment = useMutation(api.enrollments.setEnrollment);
  const setStatus = useMutation(api.adminUsers.setStatus);

  // Filter state
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "student" | "admin">("all");

  // Create User form state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"student" | "admin">("student");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [creating, setCreating] = useState(false);

  // Edit User state
  const [editingUser, setEditingUser] = useState<{
    _id: Id<"users">;
    name?: string;
    email?: string;
    role?: "student" | "admin";
    status?: "active" | "inactive";
  } | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<"student" | "admin">("student");
  const [editStatus, setEditStatus] = useState<"active" | "inactive">("active");
  const [savingEdit, setSavingEdit] = useState(false);

  // Set / Reset Password state
  const [passwordUser, setPasswordUser] = useState<{
    _id: Id<"users">;
    name?: string;
    email?: string;
  } | null>(null);
  const [resetPasswordVal, setResetPasswordVal] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);

  // Delete User state
  const [deletingUser, setDeletingUser] = useState<{
    _id: Id<"users">;
    name?: string;
    email?: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  function generateRandomPassword() {
    const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*";
    let pwd = "";
    for (let i = 0; i < 12; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pwd;
  }

  const filteredUsers = users?.filter((u) => {
    const matchesSearch =
      (u.name?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      (u.email?.toLowerCase().includes(search.toLowerCase()) ?? false);
    const matchesRole =
      roleFilter === "all" ? true : (u.role ?? "student") === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users & Students</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage course students, administrator accounts, credentials, and enrollments.
          </p>
        </div>
        <Button onClick={() => setIsAddOpen(true)} className="gap-2">
          <UserPlus className="size-4" />
          Add User
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={roleFilter}
          onValueChange={(v) => setRoleFilter(v as "all" | "student" | "admin")}
        >
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="student">Students</SelectItem>
            <SelectItem value="admin">Admins</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Users List */}
      <section className="space-y-4">
        {!users ? (
          <div className="text-sm text-muted-foreground py-8 text-center">Loading users...</div>
        ) : !filteredUsers?.length ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              No users found matching your filters.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredUsers.map((u) => {
              const isCurrentAdmin = viewer?._id === u._id;
              return (
                <Card key={u._id} className="overflow-hidden">
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* User Info */}
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-base truncate">
                            {u.name || "Unnamed User"}
                          </span>
                          {u.role === "admin" ? (
                            <Badge variant="default" className="gap-1 bg-primary">
                              <Shield className="size-3" /> Admin
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="gap-1">
                              <GraduationCap className="size-3" /> Student
                            </Badge>
                          )}
                          <Badge
                            variant={u.status === "active" ? "outline" : "destructive"}
                            className="capitalize text-xs"
                          >
                            {u.status ?? "active"}
                          </Badge>
                          {u.hasPassword ? (
                            <Badge
                              variant="outline"
                              className="text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                            >
                              Password Set
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-xs bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-300 dark:border-amber-800"
                            >
                              No Password
                            </Badge>
                          )}
                          {isCurrentAdmin && (
                            <span className="text-xs text-muted-foreground">(You)</span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground font-mono truncate">
                          {u.email}
                        </p>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                        <Select
                          value={u.status ?? "active"}
                          onValueChange={(v) =>
                            void setStatus({
                              userId: u._id,
                              status: v as "active" | "inactive",
                            })
                          }
                        >
                          <SelectTrigger className="w-[110px] h-9 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>

                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 h-9 text-xs"
                          onClick={() => {
                            setEditingUser(u);
                            setEditName(u.name ?? "");
                            setEditEmail(u.email ?? "");
                            setEditRole((u.role as "student" | "admin") ?? "student");
                            setEditStatus((u.status as "active" | "inactive") ?? "active");
                          }}
                        >
                          <Pencil className="size-3.5" />
                          Edit
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 h-9 text-xs"
                          onClick={() => {
                            setPasswordUser(u);
                            setResetPasswordVal("");
                            setCopiedPassword(false);
                          }}
                        >
                          <KeyRound className="size-3.5" />
                          Password
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          disabled={isCurrentAdmin}
                          title={isCurrentAdmin ? "Cannot delete your own account" : "Delete user"}
                          onClick={() => setDeletingUser(u)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Course Enrollments Section */}
                    {courses && courses.length > 0 && (
                      <div className="mt-4 pt-3 border-t">
                        <p className="text-xs font-medium text-muted-foreground mb-2">
                          Course Enrollments:
                        </p>
                        <div className="flex flex-wrap gap-x-4 gap-y-2">
                          {courses.map((c) => {
                            const en = u.enrollments?.find((e) => e.courseId === c._id);
                            const active = en?.status === "active";
                            return (
                              <label
                                key={c._id}
                                className="flex items-center gap-1.5 text-xs cursor-pointer select-none bg-muted/40 hover:bg-muted px-2.5 py-1 rounded-md transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  checked={active}
                                  onChange={() =>
                                    void setEnrollment({
                                      userId: u._id,
                                      courseId: c._id,
                                      active: !active,
                                    })
                                  }
                                  className="rounded border-input text-primary focus:ring-primary size-3.5"
                                />
                                <span>{c.title}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Add User Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Create a student or instructor account. Set a password so they can log in immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="add-name">Full Name</Label>
              <Input
                id="add-name"
                placeholder="e.g. John Doe"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-email">Email Address</Label>
              <Input
                id="add-email"
                type="email"
                placeholder="e.g. student@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="add-password">Password (Optional, min 8 chars)</Label>
                <button
                  type="button"
                  onClick={() => setNewPassword(generateRandomPassword())}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <Sparkles className="size-3" /> Generate
                </button>
              </div>
              <div className="relative">
                <Input
                  id="add-password"
                  type={showNewPassword ? "text" : "password"}
                  placeholder="Set login password..."
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Setting a password allows direct password sign-in without relying on email OTP codes.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select
                value={newRole}
                onValueChange={(v) => setNewRole(v as "student" | "admin")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="admin">Administrator</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={creating || !newEmail.trim() || !newName.trim()}
              onClick={async () => {
                if (newPassword && newPassword.length < 8) {
                  toast.error("Password must be at least 8 characters long");
                  return;
                }
                setCreating(true);
                try {
                  await createStudent({
                    name: newName,
                    email: newEmail,
                    password: newPassword || undefined,
                    role: newRole,
                  });
                  toast.success("User created successfully!");
                  setIsAddOpen(false);
                  setNewName("");
                  setNewEmail("");
                  setNewPassword("");
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Failed to create user");
                } finally {
                  setCreating(false);
                }
              }}
            >
              {creating ? "Creating..." : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User Profile</DialogTitle>
            <DialogDescription>
              Update user details, system role, and access status.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name">Full Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-email">Email Address</Label>
              <Input
                id="edit-email"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select
                  value={editRole}
                  onValueChange={(v) => setEditRole(v as "student" | "admin")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="admin">Administrator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  value={editStatus}
                  onValueChange={(v) => setEditStatus(v as "active" | "inactive")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              Cancel
            </Button>
            <Button
              disabled={savingEdit || !editEmail.trim() || !editName.trim()}
              onClick={async () => {
                if (!editingUser) return;
                setSavingEdit(true);
                try {
                  await updateUser({
                    userId: editingUser._id,
                    name: editName,
                    email: editEmail,
                    role: editRole,
                    status: editStatus,
                  });
                  toast.success("User updated successfully!");
                  setEditingUser(null);
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Failed to update user");
                } finally {
                  setSavingEdit(false);
                }
              }}
            >
              {savingEdit ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Set / Reset Password Dialog */}
      <Dialog open={!!passwordUser} onOpenChange={(open) => !open && setPasswordUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set / Reset Password</DialogTitle>
            <DialogDescription>
              Assign a new password for <strong>{passwordUser?.name || passwordUser?.email}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="reset-pwd">New Password (min 8 characters)</Label>
                <button
                  type="button"
                  onClick={() => setResetPasswordVal(generateRandomPassword())}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <Sparkles className="size-3" /> Generate
                </button>
              </div>
              <div className="relative">
                <Input
                  id="reset-pwd"
                  type={showResetPassword ? "text" : "password"}
                  placeholder="Enter new password..."
                  value={resetPasswordVal}
                  onChange={(e) => setResetPasswordVal(e.target.value)}
                  className="pr-20"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {resetPasswordVal && (
                    <button
                      type="button"
                      onClick={() => {
                        void navigator.clipboard.writeText(resetPasswordVal);
                        setCopiedPassword(true);
                        setTimeout(() => setCopiedPassword(false), 2000);
                        toast.success("Password copied to clipboard");
                      }}
                      className="p-1 text-muted-foreground hover:text-foreground"
                      title="Copy password"
                    >
                      {copiedPassword ? (
                        <Check className="size-4 text-emerald-600" />
                      ) : (
                        <Copy className="size-4" />
                      )}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                    className="p-1 text-muted-foreground hover:text-foreground"
                  >
                    {showResetPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
            {copiedPassword && (
              <p className="text-xs text-emerald-600 font-medium">Copied to clipboard!</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordUser(null)}>
              Cancel
            </Button>
            <Button
              disabled={savingPassword || resetPasswordVal.length < 8}
              onClick={async () => {
                if (!passwordUser) return;
                if (resetPasswordVal.length < 8) {
                  toast.error("Password must be at least 8 characters long");
                  return;
                }
                setSavingPassword(true);
                try {
                  await setUserPassword({
                    userId: passwordUser._id,
                    password: resetPasswordVal,
                  });
                  toast.success(
                    `Password successfully updated for ${passwordUser.email}! They can now log in with it.`,
                  );
                  setPasswordUser(null);
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Failed to set password");
                } finally {
                  setSavingPassword(false);
                }
              }}
            >
              {savingPassword ? "Saving..." : "Set Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <Dialog open={!!deletingUser} onOpenChange={(open) => !open && setDeletingUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete{" "}
              <strong>{deletingUser?.name || deletingUser?.email}</strong>?
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 text-sm text-muted-foreground space-y-2">
            <p>This action cannot be undone. It will remove:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>User profile and credentials</li>
              <li>Course enrollments</li>
              <li>Assignment submissions, answers, and progress</li>
            </ul>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingUser(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={async () => {
                if (!deletingUser) return;
                setDeleting(true);
                try {
                  await deleteUser({ userId: deletingUser._id });
                  toast.success("User deleted successfully");
                  setDeletingUser(null);
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Failed to delete user");
                } finally {
                  setDeleting(false);
                }
              }}
            >
              {deleting ? "Deleting..." : "Delete User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
