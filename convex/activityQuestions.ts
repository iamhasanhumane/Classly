import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { gradeAnswer } from "./lib/grading";
import { requireAdmin, requireStudentCourse, requireUser } from "./lib/permissions";
import { ConvexError } from "convex/values";

export const listForAdmin = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    await requireAdmin(ctx);
    const questions = await ctx.db
      .query("activityQuestions")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .collect();
    return questions.sort((a, b) => a.order - b.order);
  },
});

export const listForSessionStudent = query({
  args: {
    courseId: v.id("courses"),
    sessionId: v.id("sessions"),
  },
  handler: async (ctx, { courseId, sessionId }) => {
    const { userId, user } = await requireStudentCourse(ctx, courseId);
    const session = await ctx.db.get(sessionId);
    if (!session) return null;
    const section = await ctx.db.get(session.sectionId);
    if (!section || section.courseId !== courseId) return null;

    const questions = await ctx.db
      .query("activityQuestions")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .collect();
    const sorted = questions.sort((a, b) => a.order - b.order);

    const answers = await ctx.db
      .query("activityAnswers")
      .withIndex("by_user_session", (q) =>
        q.eq("userId", userId).eq("sessionId", sessionId),
      )
      .collect();

    const answersMap: Record<
      string,
      { response: unknown; isCorrect: boolean; answeredAt: number }
    > = {};
    for (const ans of answers) {
      answersMap[ans.questionId] = {
        response: ans.response,
        isCorrect: ans.isCorrect,
        answeredAt: ans.answeredAt,
      };
    }

    const isAdmin = user.role === "admin";

    // For students, sanitize answerSpec and reveal explanation only if answered or admin
    return {
      questions: sorted.map((q) => {
        const studentAnswer = answersMap[q._id];
        const showSolution = isAdmin || (studentAnswer && studentAnswer.isCorrect);
        return {
          _id: q._id,
          type: q.type,
          body: q.body,
          imageUrl: q.imageUrl,
          options: q.options,
          hint: q.hint,
          order: q.order,
          explanation: showSolution ? q.explanation : undefined,
        };
      }),
      userAnswers: answersMap,
    };
  },
});

export const submitAnswer = mutation({
  args: {
    courseId: v.id("courses"),
    sessionId: v.id("sessions"),
    questionId: v.id("activityQuestions"),
    response: v.any(),
  },
  handler: async (ctx, { courseId, sessionId, questionId, response }) => {
    const { userId } = await requireStudentCourse(ctx, courseId);
    const question = await ctx.db.get(questionId);
    if (!question || question.sessionId !== sessionId) {
      throw new ConvexError("Question not found for this session");
    }

    const graded = gradeAnswer(
      {
        _id: question._id,
        type: question.type,
        marks: 1,
        answerSpec: question.answerSpec,
        options: question.options,
      },
      response,
    );

    const existingAnswer = await ctx.db
      .query("activityAnswers")
      .withIndex("by_user_question", (q) =>
        q.eq("userId", userId).eq("questionId", questionId),
      )
      .unique();

    if (existingAnswer) {
      await ctx.db.patch(existingAnswer._id, {
        response,
        isCorrect: graded.isCorrect,
        answeredAt: Date.now(),
      });
    } else {
      await ctx.db.insert("activityAnswers", {
        userId,
        sessionId,
        questionId,
        response,
        isCorrect: graded.isCorrect,
        answeredAt: Date.now(),
      });
    }

    return {
      isCorrect: graded.isCorrect,
      explanation: graded.isCorrect ? question.explanation : undefined,
      hint: !graded.isCorrect ? question.hint : undefined,
    };
  },
});

export const resetAnswer = mutation({
  args: {
    courseId: v.id("courses"),
    sessionId: v.id("sessions"),
    questionId: v.id("activityQuestions"),
  },
  handler: async (ctx, { courseId, sessionId, questionId }) => {
    const { userId } = await requireStudentCourse(ctx, courseId);
    const existing = await ctx.db
      .query("activityAnswers")
      .withIndex("by_user_question", (q) =>
        q.eq("userId", userId).eq("questionId", questionId),
      )
      .unique();
    if (existing && existing.sessionId === sessionId) {
      await ctx.db.delete(existing._id);
    }
  },
});

export const saveQuestionsForSession = mutation({
  args: {
    sessionId: v.id("sessions"),
    questions: v.array(
      v.object({
        _id: v.optional(v.id("activityQuestions")),
        type: v.union(
          v.literal("mcq_single"),
          v.literal("mcq_multi"),
          v.literal("numeric"),
          v.literal("short_text"),
        ),
        body: v.string(),
        imageUrl: v.optional(v.string()),
        options: v.optional(
          v.array(v.object({ id: v.string(), text: v.string() })),
        ),
        answerSpec: v.any(),
        hint: v.optional(v.string()),
        explanation: v.optional(v.string()),
        order: v.number(),
      }),
    ),
  },
  handler: async (ctx, { sessionId, questions }) => {
    await requireAdmin(ctx);
    const session = await ctx.db.get(sessionId);
    if (!session) throw new ConvexError("Session not found");

    const existing = await ctx.db
      .query("activityQuestions")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .collect();

    const incomingIds = new Set(
      questions
        .map((q) => q._id)
        .filter((id): id is NonNullable<typeof id> => id !== undefined),
    );

    // Delete questions not in incoming list
    for (const ex of existing) {
      if (!incomingIds.has(ex._id)) {
        await ctx.db.delete(ex._id);
        const relatedAnswers = await ctx.db
          .query("activityAnswers")
          .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
          .filter((q) => q.eq(q.field("questionId"), ex._id))
          .collect();
        for (const a of relatedAnswers) {
          await ctx.db.delete(a._id);
        }
      }
    }

    // Upsert each question
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const order = q.order ?? i + 1;
      if (q._id) {
        await ctx.db.patch(q._id, {
          type: q.type,
          body: q.body,
          imageUrl: q.imageUrl,
          options: q.options,
          answerSpec: q.answerSpec,
          hint: q.hint,
          explanation: q.explanation,
          order,
        });
      } else {
        await ctx.db.insert("activityQuestions", {
          sessionId,
          type: q.type,
          body: q.body,
          imageUrl: q.imageUrl,
          options: q.options,
          answerSpec: q.answerSpec,
          hint: q.hint,
          explanation: q.explanation,
          order,
        });
      }
    }
  },
});

export const deleteQuestion = mutation({
  args: { questionId: v.id("activityQuestions") },
  handler: async (ctx, { questionId }) => {
    await requireAdmin(ctx);
    const answers = await ctx.db
      .query("activityAnswers")
      .filter((q) => q.eq(q.field("questionId"), questionId))
      .collect();
    for (const a of answers) {
      await ctx.db.delete(a._id);
    }
    await ctx.db.delete(questionId);
  },
});
