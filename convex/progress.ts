import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireStudentCourse } from "./lib/permissions";

export const markSessionComplete = mutation({
  args: {
    courseId: v.id("courses"),
    sessionId: v.id("sessions"),
    completed: v.boolean(),
  },
  handler: async (ctx, { courseId, sessionId, completed }) => {
    const { userId, user } = await requireStudentCourse(ctx, courseId);
    if (user.role === "admin") return;

    const existing = await ctx.db
      .query("sessionProgress")
      .withIndex("by_user_session", (q) =>
        q.eq("userId", userId).eq("sessionId", sessionId),
      )
      .unique();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { completed, lastViewedAt: now });
    } else {
      await ctx.db.insert("sessionProgress", {
        userId,
        sessionId,
        completed,
        lastViewedAt: now,
      });
    }
  },
});

export const touchSession = mutation({
  args: {
    courseId: v.id("courses"),
    sessionId: v.id("sessions"),
  },
  handler: async (ctx, { courseId, sessionId }) => {
    const { userId, user } = await requireStudentCourse(ctx, courseId);
    if (user.role === "admin") return;

    const existing = await ctx.db
      .query("sessionProgress")
      .withIndex("by_user_session", (q) =>
        q.eq("userId", userId).eq("sessionId", sessionId),
      )
      .unique();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { lastViewedAt: now });
    } else {
      await ctx.db.insert("sessionProgress", {
        userId,
        sessionId,
        completed: false,
        lastViewedAt: now,
      });
    }
  },
});
