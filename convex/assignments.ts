import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin, requireStudentCourse } from "./lib/permissions";
import {
  getEffectiveDeadlineMs,
  isPastDeadline,
} from "./lib/deadlines";
import { computeGradeFromAttempts } from "./lib/grading";
import { ConvexError } from "convex/values";

export const getForStudent = query({
  args: {
    courseId: v.id("courses"),
    assignmentId: v.id("assignments"),
  },
  handler: async (ctx, { courseId, assignmentId }) => {
    const { userId, user } = await requireStudentCourse(ctx, courseId);
    const assignment = await ctx.db.get(assignmentId);
    if (!assignment) return null;

    const section = await ctx.db.get(assignment.sectionId);
    if (!section || section.courseId !== courseId) return null;
    if (assignment.status !== "published" && user.role !== "admin") {
      return null;
    }

    const override =
      user.role === "admin"
        ? null
        : await ctx.db
            .query("deadlineOverrides")
            .withIndex("by_assignment_user", (q) =>
              q.eq("assignmentId", assignmentId).eq("userId", userId),
            )
            .unique();

    const effectiveDue = getEffectiveDeadlineMs(assignment, override);
    const pastDue = isPastDeadline(assignment, override);

    const attempts =
      user.role === "admin"
        ? []
        : await ctx.db
            .query("attempts")
            .withIndex("by_user_assignment", (q) =>
              q.eq("userId", userId).eq("assignmentId", assignmentId),
            )
            .collect();

    const gradedScores = attempts
      .filter((a) => a.status === "graded" || a.status === "needs_review")
      .map((a) => a.score ?? 0);

    const countedScore =
      gradedScores.length > 0
        ? computeGradeFromAttempts(gradedScores, assignment.scoringPolicy)
        : null;

    const inProgress = attempts.find((a) => a.status === "in_progress");

    return {
      assignment,
      effectiveDue,
      pastDue,
      attempts: attempts
        .sort((a, b) => a.attemptNo - b.attemptNo)
        .map((a) => ({
          _id: a._id,
          attemptNo: a.attemptNo,
          status: a.status,
          score: a.score,
          maxScore: a.maxScore,
          submittedAt: a.submittedAt,
          isLate: a.isLate,
        })),
      countedScore,
      inProgressId: inProgress?._id ?? null,
    };
  },
});

export const getForAdmin = query({
  args: { assignmentId: v.id("assignments") },
  handler: async (ctx, { assignmentId }) => {
    await requireAdmin(ctx);
    const assignment = await ctx.db.get(assignmentId);
    if (!assignment) return null;
    const questions = await ctx.db
      .query("questions")
      .withIndex("by_assignment", (q) => q.eq("assignmentId", assignmentId))
      .collect();
    return {
      assignment,
      questions: questions.sort((a, b) => a.order - b.order),
    };
  },
});

export const updateSettings = mutation({
  args: {
    assignmentId: v.id("assignments"),
    title: v.optional(v.string()),
    instructions: v.optional(v.string()),
    dueAt: v.optional(v.union(v.number(), v.null())),
    opensAt: v.optional(v.union(v.number(), v.null())),
    scoringPolicy: v.optional(
      v.union(v.literal("best"), v.literal("latest"), v.literal("average")),
    ),
    feedbackMode: v.optional(
      v.union(
        v.literal("score_only"),
        v.literal("per_question"),
        v.literal("full"),
      ),
    ),
    solutionsRelease: v.optional(
      v.union(
        v.literal("immediate"),
        v.literal("after_deadline"),
        v.literal("manual"),
      ),
    ),
    latePolicy: v.optional(
      v.union(v.literal("strict"), v.literal("grace"), v.literal("open")),
    ),
    status: v.optional(v.union(v.literal("draft"), v.literal("published"))),
    shuffleQuestions: v.optional(v.boolean()),
    shuffleOptions: v.optional(v.boolean()),
  },
  handler: async (ctx, { assignmentId, ...patch }) => {
    const { userId } = await requireAdmin(ctx);
    const existing = await ctx.db.get(assignmentId);
    if (!existing) throw new ConvexError("Assignment not found");

    const updates: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(patch)) {
      if (val !== undefined) {
        updates[k] = val === null ? undefined : val;
      }
    }
    await ctx.db.patch(assignmentId, updates);
    await ctx.db.insert("auditLog", {
      actorId: userId,
      action: "assignment.update",
      entityType: "assignments",
      entityId: assignmentId,
      before: JSON.stringify(existing),
      after: JSON.stringify({ ...existing, ...updates }),
      at: Date.now(),
    });
  },
});

export const upsertQuestion = mutation({
  args: {
    assignmentId: v.id("assignments"),
    questionId: v.optional(v.id("questions")),
    type: v.union(
      v.literal("mcq_single"),
      v.literal("mcq_multi"),
      v.literal("numeric"),
      v.literal("expression"),
      v.literal("short_text"),
      v.literal("file"),
    ),
    body: v.string(),
    imageUrl: v.optional(v.string()),
    options: v.optional(
      v.array(v.object({ id: v.string(), text: v.string() })),
    ),
    answerSpec: v.any(),
    marks: v.number(),
    hint: v.optional(v.string()),
    solution: v.optional(v.string()),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (args.questionId) {
      await ctx.db.patch(args.questionId, {
        type: args.type,
        body: args.body,
        imageUrl: args.imageUrl,
        options: args.options,
        answerSpec: args.answerSpec,
        marks: args.marks,
        hint: args.hint,
        solution: args.solution,
      });
      return args.questionId;
    }
    const existing = await ctx.db
      .query("questions")
      .withIndex("by_assignment", (q) => q.eq("assignmentId", args.assignmentId))
      .collect();
    const order =
      args.order ??
      (existing.length ? Math.max(...existing.map((q) => q.order)) + 1 : 1);
    return await ctx.db.insert("questions", {
      assignmentId: args.assignmentId,
      type: args.type,
      body: args.body,
      imageUrl: args.imageUrl,
      options: args.options,
      answerSpec: args.answerSpec,
      marks: args.marks,
      hint: args.hint,
      solution: args.solution,
      order,
    });
  },
});

export const deleteQuestion = mutation({
  args: { questionId: v.id("questions") },
  handler: async (ctx, { questionId }) => {
    await requireAdmin(ctx);
    await ctx.db.delete(questionId);
  },
});

export const setDeadlineOverride = mutation({
  args: {
    assignmentId: v.id("assignments"),
    userId: v.id("users"),
    dueAt: v.number(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const existing = await ctx.db
      .query("deadlineOverrides")
      .withIndex("by_assignment_user", (q) =>
        q.eq("assignmentId", args.assignmentId).eq("userId", args.userId),
      )
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        dueAt: args.dueAt,
        reason: args.reason,
      });
      return existing._id;
    }
    return await ctx.db.insert("deadlineOverrides", args);
  },
});

export const listAttemptsForAdmin = query({
  args: { assignmentId: v.id("assignments") },
  handler: async (ctx, { assignmentId }) => {
    await requireAdmin(ctx);
    const attempts = await ctx.db
      .query("attempts")
      .withIndex("by_assignment", (q) => q.eq("assignmentId", assignmentId))
      .collect();
    const enriched = [];
    for (const attempt of attempts) {
      const user = await ctx.db.get(attempt.userId);
      enriched.push({ ...attempt, userName: user?.name, userEmail: user?.email });
    }
    return enriched.sort((a, b) => b.startedAt - a.startedAt);
  },
});

export const overrideAttemptScore = mutation({
  args: {
    attemptId: v.id("attempts"),
    score: v.number(),
    comment: v.optional(v.string()),
  },
  handler: async (ctx, { attemptId, score, comment }) => {
    const { userId } = await requireAdmin(ctx);
    const attempt = await ctx.db.get(attemptId);
    if (!attempt) throw new ConvexError("Attempt not found");
    await ctx.db.patch(attemptId, {
      score,
      status: "graded",
      answers: attempt.answers.map((a, i) =>
        i === 0 && comment ? { ...a, feedback: comment } : a,
      ),
    });
    await ctx.db.insert("auditLog", {
      actorId: userId,
      action: "attempt.override_score",
      entityType: "attempts",
      entityId: attemptId,
      after: JSON.stringify({ score }),
      at: Date.now(),
    });
  },
});
