import { getAuthUserId } from "@convex-dev/auth/server";
import type { GenericQueryCtx, GenericMutationCtx } from "convex/server";
import type { DataModel, Id } from "../_generated/dataModel";
import { ConvexError } from "convex/values";

type Ctx = GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>;

export async function requireUser(ctx: Ctx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new ConvexError("Not authenticated");
  }
  const user = await ctx.db.get(userId);
  if (!user || user.status === "inactive") {
    throw new ConvexError("Account inactive or not found");
  }
  return { userId, user };
}

export async function requireAdmin(ctx: Ctx) {
  const { userId, user } = await requireUser(ctx);
  if (user.role !== "admin") {
    throw new ConvexError("Admin access required");
  }
  return { userId, user };
}

export async function requireEnrollment(
  ctx: Ctx,
  courseId: Id<"courses">,
  userId: Id<"users">,
) {
  const enrollment = await ctx.db
    .query("enrollments")
    .withIndex("by_user_course", (q) =>
      q.eq("userId", userId).eq("courseId", courseId),
    )
    .unique();
  if (!enrollment || enrollment.status !== "active") {
    throw new ConvexError("Not enrolled in this course");
  }
  return enrollment;
}

export async function requireStudentCourse(
  ctx: Ctx,
  courseId: Id<"courses">,
) {
  const { userId, user } = await requireUser(ctx);
  if (user.role === "admin") {
    return { userId, user, enrollment: null };
  }
  const enrollment = await requireEnrollment(ctx, courseId, userId);
  return { userId, user, enrollment };
}
