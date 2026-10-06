import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requireAdmin, requireStudentCourse, requireUser } from "./lib/permissions";

export const listForStudent = query({
  args: {},
  handler: async (ctx) => {
    const { userId, user } = await requireUser(ctx);
    if (user.role === "admin") {
      const all = await ctx.db.query("courses").collect();
      return all.map((c) => ({
        ...c,
        progress: 100,
        nextDeadline: null,
        isEnrolled: true,
      }));
    }

    const enrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    const enrolledMap = new Map(enrollments.map((e) => [e.courseId, e]));

    // Return all published courses so students can view catalog and self-enroll
    const allPublished = await ctx.db
      .query("courses")
      .filter((q) => q.eq(q.field("status"), "published"))
      .collect();

    const result = [];
    for (const course of allPublished) {
      const en = enrolledMap.get(course._id);
      const isEnrolled = Boolean(en);
      const progress = isEnrolled
        ? await computeCourseProgress(ctx, userId, course._id)
        : 0;
      const nextDeadline = isEnrolled
        ? await nextCourseDeadline(ctx, userId, course._id)
        : null;
      result.push({
        ...course,
        isEnrolled,
        progress,
        nextDeadline,
        lastViewedPath: en?.lastViewedPath,
      });
    }
    return result;
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("courses").collect();
  },
});

export const get = query({
  args: { courseId: v.id("courses") },
  handler: async (ctx, { courseId }) => {
    await requireStudentCourse(ctx, courseId);
    return await ctx.db.get(courseId);
  },
});

export const getStructure = query({
  args: { courseId: v.id("courses") },
  handler: async (ctx, { courseId }) => {
    const { userId, user } = await requireStudentCourse(ctx, courseId);
    const course = await ctx.db.get(courseId);
    if (!course) return null;

    const isAdmin = user.role === "admin";
    const sections = await ctx.db
      .query("sections")
      .withIndex("by_course", (q) => q.eq("courseId", courseId))
      .collect();

    const now = Date.now();
    const enriched = [];
    for (const section of sections.sort((a, b) => a.order - b.order)) {
      if (section.isHidden && !isAdmin) continue;
      if (section.unlockAt && section.unlockAt > now && !isAdmin) {
        enriched.push({ ...section, locked: true, sessions: [], assignments: [] });
        continue;
      }

      const sessions = await ctx.db
        .query("sessions")
        .withIndex("by_section", (q) => q.eq("sectionId", section._id))
        .collect();
      const visibleSessions = sessions
        .filter((s) => isAdmin || s.status === "published")
        .sort((a, b) => a.order - b.order);

      const sessionItems = [];
      for (const session of visibleSessions) {
        let completed = false;
        if (userId) {
          const prog = await ctx.db
            .query("sessionProgress")
            .withIndex("by_user_session", (q) =>
              q.eq("userId", userId).eq("sessionId", session._id),
            )
            .unique();
          completed = prog?.completed ?? false;
        }

        // Activity questions metadata
        const activityQs = await ctx.db
          .query("activityQuestions")
          .withIndex("by_session", (q) => q.eq("sessionId", session._id))
          .collect();
        const hasActivity = activityQs.length > 0;

        let activityCompleted = false;
        if (hasActivity && userId) {
          const answers = await ctx.db
            .query("activityAnswers")
            .withIndex("by_user_session", (q) =>
              q.eq("userId", userId).eq("sessionId", session._id),
            )
            .collect();
          const correctIds = new Set(
            answers.filter((a) => a.isCorrect).map((a) => a.questionId),
          );
          activityCompleted = activityQs.every((q) => correctIds.has(q._id));
        }

        sessionItems.push({ ...session, completed, hasActivity, activityCompleted });
      }

      const assignments = await ctx.db
        .query("assignments")
        .withIndex("by_section", (q) => q.eq("sectionId", section._id))
        .collect();
      const visibleAssignments = assignments
        .filter((a) => isAdmin || a.status === "published")
        .sort((a, b) => (a.kind === "practice" ? -1 : 1));

      enriched.push({
        ...section,
        locked: false,
        sessions: sessionItems,
        assignments: visibleAssignments,
      });
    }

    return { course, sections: enriched };
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const courseId = await ctx.db.insert("courses", {
      title: args.title,
      description: args.description,
      status: "draft",
    });

    await ctx.db.insert("sections", {
      courseId,
      title: "Prerequisites",
      type: "prerequisites",
      order: 0,
      isHidden: false,
    });

    for (let w = 1; w <= 8; w++) {
      const sectionId = await ctx.db.insert("sections", {
        courseId,
        title: `Week ${w}`,
        type: "week",
        order: w,
        isHidden: false,
      });
      await ctx.db.insert("assignments", {
        sectionId,
        kind: "practice",
        title: `Week ${w} · Practice Assignment`,
        scoringPolicy: "best",
        feedbackMode: "full",
        solutionsRelease: "immediate",
        latePolicy: "open",
        status: "draft",
      });
      await ctx.db.insert("assignments", {
        sectionId,
        kind: "graded",
        title: `Week ${w} · Graded Assignment`,
        scoringPolicy: "best",
        feedbackMode: "score_only",
        solutionsRelease: "after_deadline",
        latePolicy: "strict",
        status: "draft",
      });
    }

    return courseId;
  },
});

export const update = mutation({
  args: {
    courseId: v.id("courses"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(v.union(v.literal("draft"), v.literal("published"))),
    coverImage: v.optional(v.string()),
  },
  handler: async (ctx, { courseId, ...patch }) => {
    await requireAdmin(ctx);
    const existing = await ctx.db.get(courseId);
    if (!existing) throw new Error("Course not found");
    await ctx.db.patch(courseId, patch);
  },
});

export const setLastViewed = mutation({
  args: {
    courseId: v.id("courses"),
    path: v.string(),
  },
  handler: async (ctx, { courseId, path }) => {
    const { userId } = await requireStudentCourse(ctx, courseId);
    if (!userId) return;
    const enrollment = await ctx.db
      .query("enrollments")
      .withIndex("by_user_course", (q) =>
        q.eq("userId", userId).eq("courseId", courseId),
      )
      .unique();
    if (enrollment) {
      await ctx.db.patch(enrollment._id, { lastViewedPath: path });
    }
  },
});

async function computeCourseProgress(
  ctx: QueryCtx,
  userId: Id<"users">,
  courseId: Id<"courses">,
) {
  const sections = await ctx.db
    .query("sections")
    .withIndex("by_course", (q) => q.eq("courseId", courseId))
    .collect();
  let total = 0;
  let done = 0;
  for (const section of sections) {
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_section", (q) => q.eq("sectionId", section._id))
      .filter((q) => q.eq(q.field("status"), "published"))
      .collect();
    for (const session of sessions) {
      total++;
      const prog = await ctx.db
        .query("sessionProgress")
        .withIndex("by_user_session", (q) =>
          q.eq("userId", userId).eq("sessionId", session._id),
        )
        .unique();
      if (prog?.completed) done++;
    }
  }
  if (total === 0) return 0;
  return Math.round((done / total) * 100);
}

async function nextCourseDeadline(
  ctx: QueryCtx,
  userId: Id<"users">,
  courseId: Id<"courses">,
) {
  const sections = await ctx.db
    .query("sections")
    .withIndex("by_course", (q) => q.eq("courseId", courseId))
    .collect();
  let nearest: number | null = null;
  const now = Date.now();
  for (const section of sections) {
    const assignments = await ctx.db
      .query("assignments")
      .withIndex("by_section", (q) => q.eq("sectionId", section._id))
      .collect();
    for (const a of assignments) {
      if (a.kind !== "graded" || !a.dueAt || a.dueAt < now) continue;
      const override = await ctx.db
        .query("deadlineOverrides")
        .withIndex("by_assignment_user", (q) =>
          q.eq("assignmentId", a._id).eq("userId", userId),
        )
        .unique();
      const due = override?.dueAt ?? a.dueAt;
      if (due >= now && (nearest === null || due < nearest)) nearest = due;
    }
  }
  return nearest;
}
