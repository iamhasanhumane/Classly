import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./lib/permissions";

export const listByCourse = query({
  args: { courseId: v.id("courses") },
  handler: async (ctx, { courseId }) => {
    await requireAdmin(ctx);
    return await ctx.db
      .query("sections")
      .withIndex("by_course", (q) => q.eq("courseId", courseId))
      .collect();
  },
});

export const update = mutation({
  args: {
    sectionId: v.id("sections"),
    title: v.optional(v.string()),
    isHidden: v.optional(v.boolean()),
    unlockAt: v.optional(v.union(v.number(), v.null())),
  },
  handler: async (ctx, { sectionId, ...patch }) => {
    await requireAdmin(ctx);
    const updates: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(patch)) {
      if (val !== undefined) updates[k] = val === null ? undefined : val;
    }
    await ctx.db.patch(sectionId, updates);
  },
});
