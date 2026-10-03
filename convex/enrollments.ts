import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";

export const listStudents = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");
    const me = await ctx.db.get(userId);
    if (me?.role !== "admin") throw new ConvexError("Admin access required");
    const users = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "student"))
      .collect();

    const enrollments = await ctx.db.query("enrollments").collect();
    return users.map((u) => ({
      ...u,
      enrollments: enrollments.filter((e) => e.userId === u._id),
    }));
  },
});

export const setEnrollment = mutation({
  args: {
    userId: v.id("users"),
    courseId: v.id("courses"),
    active: v.boolean(),
  },
  handler: async (ctx, { userId, courseId, active }) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new ConvexError("Not authenticated");
    const me = await ctx.db.get(authId);
    if (me?.role !== "admin") throw new ConvexError("Admin access required");
    const existing = await ctx.db
      .query("enrollments")
      .withIndex("by_user_course", (q) =>
        q.eq("userId", userId).eq("courseId", courseId),
      )
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        status: active ? "active" : "inactive",
      });
      return existing._id;
    }
    if (!active) return null;
    return await ctx.db.insert("enrollments", {
      userId,
      courseId,
      status: "active",
    });
  },
});
