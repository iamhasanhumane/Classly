import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { extractGoogleDriveFileId } from "./lib/drive";
import { requireAdmin, requireStudentCourse } from "./lib/permissions";

export const get = query({
  args: { sessionId: v.id("sessions"), courseId: v.id("courses") },
  handler: async (ctx, { sessionId, courseId }) => {
    await requireStudentCourse(ctx, courseId);
    const session = await ctx.db.get(sessionId);
    if (!session) return null;
    const section = await ctx.db.get(session.sectionId);
    if (!section || section.courseId !== courseId) return null;
    return session;
  },
});

// Lists all the sessions/recordings by week/section, enriched with activity question count
export const listBySection = query({
  args: { sectionId: v.id("sections") },
  handler: async (ctx, { sectionId }) => {
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_section", (q) => q.eq("sectionId", sectionId))
      .order("asc")
      .collect();

    const enriched = await Promise.all(
      sessions.map(async (s) => {
        const questions = await ctx.db
          .query("activityQuestions")
          .withIndex("by_session", (q) => q.eq("sessionId", s._id))
          .collect();
        return {
          ...s,
          activityQuestionsCount: questions.length,
        };
      }),
    );

    return enriched;
  },
});

// Edits a session/recording by session id
export const update = mutation({
  args: {
    sessionId: v.id("sessions"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    videoRef: v.optional(v.string()),
    status: v.optional(v.union(v.literal("draft"), v.literal("published"))),
    order: v.optional(v.number()),
  },
  handler: async (ctx, { sessionId, ...patch }) => {
    const existing = await ctx.db.get(sessionId);
    if (!existing) throw new Error("Session not found");
    await requireAdmin(ctx);
    if (patch.videoRef) {
      const fileId = extractGoogleDriveFileId(patch.videoRef);
      if (fileId) patch.videoRef = fileId;
    }
    await ctx.db.patch(sessionId, patch);
  },
});

export const upsert = mutation({
  args: {
    sectionId: v.id("sections"),
    sessionId: v.optional(v.id("sessions")),
    title: v.string(),
    description: v.optional(v.string()),
    driveUrl: v.string(),
    order: v.optional(v.number()),
    status: v.optional(v.union(v.literal("draft"), v.literal("published"))),
    recordedAt: v.optional(v.number()),
    activityQuestions: v.optional(
      v.array(
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
    ),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const fileId = extractGoogleDriveFileId(args.driveUrl);
    if (!fileId) throw new Error("Invalid Google Drive link");

    let sessionId = args.sessionId;

    if (sessionId) {
      await ctx.db.patch(sessionId, {
        title: args.title,
        description: args.description,
        videoRef: fileId,
        status: args.status ?? "draft",
        recordedAt: args.recordedAt,
      });
    } else {
      const existing = await ctx.db
        .query("sessions")
        .withIndex("by_section", (q) => q.eq("sectionId", args.sectionId))
        .collect();
      const order =
        args.order ??
        (existing.length ? Math.max(...existing.map((s) => s.order)) + 1 : 1);

      sessionId = await ctx.db.insert("sessions", {
        sectionId: args.sectionId,
        title: args.title,
        description: args.description,
        videoProvider: "gdrive",
        videoRef: fileId,
        order,
        status: args.status ?? "draft",
        recordedAt: args.recordedAt,
      });
    }

    // Sync activity questions if provided
    if (args.activityQuestions !== undefined) {
      const existingQuestions = await ctx.db
        .query("activityQuestions")
        .withIndex("by_session", (q) => q.eq("sessionId", sessionId!))
        .collect();

      const incomingIds = new Set(
        args.activityQuestions
          .map((q) => q._id)
          .filter((id): id is NonNullable<typeof id> => id !== undefined),
      );

      for (const ex of existingQuestions) {
        if (!incomingIds.has(ex._id)) {
          await ctx.db.delete(ex._id);
          const relatedAnswers = await ctx.db
            .query("activityAnswers")
            .withIndex("by_session", (q) => q.eq("sessionId", sessionId!))
            .filter((q) => q.eq(q.field("questionId"), ex._id))
            .collect();
          for (const a of relatedAnswers) {
            await ctx.db.delete(a._id);
          }
        }
      }

      for (let i = 0; i < args.activityQuestions.length; i++) {
        const q = args.activityQuestions[i];
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
            sessionId: sessionId!,
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
    }

    return sessionId;
  },
});

export const remove = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    await requireAdmin(ctx);
    // Delete any activity questions for this session
    const questions = await ctx.db
      .query("activityQuestions")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .collect();
    for (const q of questions) {
      await ctx.db.delete(q._id);
    }
    // Delete any activity answers for this session
    const answers = await ctx.db
      .query("activityAnswers")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .collect();
    for (const a of answers) {
      await ctx.db.delete(a._id);
    }
    // Delete session progress
    const progress = await ctx.db
      .query("sessionProgress")
      .filter((q) => q.eq(q.field("sessionId"), sessionId))
      .collect();
    for (const p of progress) {
      await ctx.db.delete(p._id);
    }
    await ctx.db.delete(sessionId);
  },
});
