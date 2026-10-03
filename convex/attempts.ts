import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireStudentCourse } from "./lib/permissions";
import {
  applyLatePenalty,
  canStartNewAttempt,
  getEffectiveDeadlineMs,
  isPastDeadline,
} from "./lib/deadlines";
import {
  gradeAnswer,
  studentCanSeeSolutions,
  type QuestionForGrading,
} from "./lib/grading";
import { ConvexError } from "convex/values";
function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export const getAttempt = query({
  args: {
    courseId: v.id("courses"),
    attemptId: v.id("attempts"),
  },
  handler: async (ctx, { courseId, attemptId }) => {
    const { userId, user } = await requireStudentCourse(ctx, courseId);
    const attempt = await ctx.db.get(attemptId);
    if (!attempt) return null;
    if (user.role !== "admin" && attempt.userId !== userId) {
      throw new ConvexError("Forbidden");
    }

    const assignment = await ctx.db.get(attempt.assignmentId);
    if (!assignment) return null;
    const section = await ctx.db.get(assignment.sectionId);
    if (!section || section.courseId !== courseId) return null;

    const override =
      user.role === "admin"
        ? null
        : await ctx.db
            .query("deadlineOverrides")
            .withIndex("by_assignment_user", (q) =>
              q.eq("assignmentId", assignment._id).eq("userId", userId),
            )
            .unique();

    const pastDue = isPastDeadline(assignment, override);
    const submitted =
      attempt.status !== "in_progress" && attempt.submittedAt !== undefined;
    const showSolutions = studentCanSeeSolutions(
      assignment,
      pastDue,
      submitted,
    );

    const questions = await ctx.db
      .query("questions")
      .withIndex("by_assignment", (q) =>
        q.eq("assignmentId", assignment._id),
      )
      .collect();
    const order =
      attempt.questionOrder ??
      questions.sort((a, b) => a.order - b.order).map((q) => q._id);

    const questionMap = new Map(questions.map((q) => [q._id, q]));
    const answerMap = new Map(
      attempt.answers.map((a) => [a.questionId, a.response]),
    );

    const payload = order
      .map((qid) => questionMap.get(qid))
      .filter(Boolean)
      .map((q) => {
        const answer = attempt.answers.find((a) => a.questionId === q!._id);
        const base = {
          _id: q!._id,
          type: q!.type,
          body: q!.body,
          imageUrl: q!.imageUrl,
          options: q!.options,
          marks: q!.marks,
          hint:
            assignment.kind === "practice" && answer
              ? q!.hint
              : showSolutions
                ? q!.hint
                : undefined,
          response: answerMap.get(q!._id),
          isCorrect: showSolutions ? answer?.isCorrect : undefined,
          marksAwarded: showSolutions ? answer?.marksAwarded : undefined,
          solution: showSolutions ? q!.solution : undefined,
        };
        return base;
      });

    return {
      attempt,
      assignment,
      pastDue,
      showSolutions,
      questions: payload,
    };
  },
});

export const start = mutation({
  args: {
    courseId: v.id("courses"),
    assignmentId: v.id("assignments"),
  },
  handler: async (ctx, { courseId, assignmentId }) => {
    const { userId, user } = await requireStudentCourse(ctx, courseId);
    if (user.role === "admin") {
      throw new ConvexError("Admins cannot start attempts");
    }

    const assignment = await ctx.db.get(assignmentId);
    if (!assignment || assignment.status !== "published") {
      throw new ConvexError("Assignment not available");
    }

    const override = await ctx.db
      .query("deadlineOverrides")
      .withIndex("by_assignment_user", (q) =>
        q.eq("assignmentId", assignmentId).eq("userId", userId),
      )
      .unique();

    const attempts = await ctx.db
      .query("attempts")
      .withIndex("by_user_assignment", (q) =>
        q.eq("userId", userId).eq("assignmentId", assignmentId),
      )
      .collect();

    const inProgress = attempts.find((a) => a.status === "in_progress");
    if (inProgress) return inProgress._id;

    const submittedCount = attempts.filter(
      (a) => a.status !== "in_progress",
    ).length;
    const check = canStartNewAttempt(
      assignment,
      override,
      submittedCount,
    );
    if (!check.ok) throw new ConvexError(check.reason ?? "Cannot start attempt");

    const questions = await ctx.db
      .query("questions")
      .withIndex("by_assignment", (q) => q.eq("assignmentId", assignmentId))
      .collect();
    if (questions.length === 0) {
      throw new ConvexError("This assignment has no questions yet");
    }

    let order = questions.sort((a, b) => a.order - b.order).map((q) => q._id);
    if (assignment.shuffleQuestions) {
      order = shuffle(order);
    }

    const attemptNo =
      attempts.length > 0
        ? Math.max(...attempts.map((a) => a.attemptNo)) + 1
        : 1;

    return await ctx.db.insert("attempts", {
      assignmentId,
      userId,
      attemptNo,
      status: "in_progress",
      startedAt: Date.now(),
      isLate: false,
      answers: [],
      questionOrder: order,
    });
  },
});

export const saveAnswer = mutation({
  args: {
    courseId: v.id("courses"),
    attemptId: v.id("attempts"),
    questionId: v.id("questions"),
    response: v.any(),
  },
  handler: async (ctx, args) => {
    const { userId, user } = await requireStudentCourse(ctx, args.courseId);
    const attempt = await ctx.db.get(args.attemptId);
    if (!attempt || attempt.userId !== userId) {
      throw new ConvexError("Attempt not found");
    }
    if (attempt.status !== "in_progress") {
      throw new ConvexError("Attempt already submitted");
    }
    if (user.role === "admin") throw new ConvexError("Forbidden");

    const answers = [...attempt.answers];
    const idx = answers.findIndex((a) => a.questionId === args.questionId);
    const entry = { questionId: args.questionId, response: args.response };
    if (idx >= 0) answers[idx] = { ...answers[idx], ...entry };
    else answers.push(entry);

    await ctx.db.patch(args.attemptId, { answers });
  },
});

export const submit = mutation({
  args: {
    courseId: v.id("courses"),
    attemptId: v.id("attempts"),
  },
  handler: async (ctx, { courseId, attemptId }) => {
    const { userId, user } = await requireStudentCourse(ctx, courseId);
    if (user.role === "admin") throw new ConvexError("Forbidden");

    const attempt = await ctx.db.get(attemptId);
    if (!attempt || attempt.userId !== userId) {
      throw new ConvexError("Attempt not found");
    }
    if (attempt.status !== "in_progress") {
      throw new ConvexError("Attempt already submitted");
    }

    const assignment = await ctx.db.get(attempt.assignmentId);
    if (!assignment) throw new ConvexError("Assignment missing");

    const override = await ctx.db
      .query("deadlineOverrides")
      .withIndex("by_assignment_user", (q) =>
        q.eq("assignmentId", assignment._id).eq("userId", userId),
      )
      .unique();

    const due = getEffectiveDeadlineMs(assignment, override);
    const now = Date.now();
    const isLate = due !== null && now > due && assignment.kind === "graded";

    const questions = await ctx.db
      .query("questions")
      .withIndex("by_assignment", (q) =>
        q.eq("assignmentId", assignment._id),
      )
      .collect();

    let maxScore = 0;
    let score = 0;
    let needsReview = false;
    const gradedAnswers = attempt.answers.map((a) => {
      const q = questions.find((qq) => qq._id === a.questionId);
      if (!q) return a;
      maxScore += q.marks;
      const result = gradeAnswer(q as QuestionForGrading, a.response);
      score += result.marksAwarded;
      if (result.needsReview) needsReview = true;
      return {
        ...a,
        isCorrect: result.isCorrect,
        marksAwarded: result.marksAwarded,
      };
    });

    for (const q of questions) {
      if (!gradedAnswers.some((a) => a.questionId === q._id)) {
        maxScore += q.marks;
        gradedAnswers.push({
          questionId: q._id,
          response: null,
          isCorrect: false,
          marksAwarded: 0,
        });
      }
    }

    score = applyLatePenalty(score, assignment, isLate);

    await ctx.db.patch(attemptId, {
      answers: gradedAnswers,
      status: needsReview ? "needs_review" : "graded",
      submittedAt: now,
      score,
      maxScore,
      isLate,
    });
  },
});
