import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const userFields = {
  name: v.optional(v.string()),
  image: v.optional(v.string()),
  email: v.optional(v.string()),
  emailVerificationTime: v.optional(v.number()),
  phone: v.optional(v.string()),
  phoneVerificationTime: v.optional(v.number()),
  isAnonymous: v.optional(v.boolean()),
  role: v.optional(v.union(v.literal("admin"), v.literal("student"))),
  status: v.optional(
    v.union(v.literal("active"), v.literal("inactive")),
  ),
  timezone: v.optional(v.string()),
};

export default defineSchema({
  ...authTables,
  users: defineTable(userFields)
    .index("email", ["email"])
    .index("by_role", ["role"]),

  courses: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    coverImage: v.optional(v.string()),
    status: v.union(v.literal("draft"), v.literal("published")),
  }),

  enrollments: defineTable({
    userId: v.id("users"),
    courseId: v.id("courses"),
    status: v.union(v.literal("active"), v.literal("inactive")),
    lastViewedPath: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_course", ["courseId"])
    .index("by_user_course", ["userId", "courseId"]),

  sections: defineTable({
    courseId: v.id("courses"),
    title: v.string(),
    type: v.union(v.literal("prerequisites"), v.literal("week")),
    order: v.number(),
    unlockAt: v.optional(v.number()),
    isHidden: v.boolean(),
  }).index("by_course", ["courseId", "order"]),

  sessions: defineTable({
    sectionId: v.id("sections"),
    title: v.string(),
    description: v.optional(v.string()),
    videoProvider: v.literal("gdrive"),
    videoRef: v.string(),
    durationSec: v.optional(v.number()),
    order: v.number(),
    status: v.union(v.literal("draft"), v.literal("published")),
    recordedAt: v.optional(v.number()),
  }).index("by_section", ["sectionId", "order"]),

  sessionProgress: defineTable({
    userId: v.id("users"),
    sessionId: v.id("sessions"),
    completed: v.boolean(),
    lastViewedAt: v.number(),
  }).index("by_user_session", ["userId", "sessionId"]),

  activityQuestions: defineTable({
    sessionId: v.id("sessions"),
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
  }).index("by_session", ["sessionId", "order"]),

  activityAnswers: defineTable({
    userId: v.id("users"),
    sessionId: v.id("sessions"),
    questionId: v.id("activityQuestions"),
    response: v.any(),
    isCorrect: v.boolean(),
    answeredAt: v.number(),
  })
    .index("by_user_session", ["userId", "sessionId"])
    .index("by_user_question", ["userId", "questionId"])
    .index("by_session", ["sessionId"]),

  assignments: defineTable({
    sectionId: v.id("sections"),
    kind: v.union(v.literal("practice"), v.literal("graded")),
    title: v.string(),
    instructions: v.optional(v.string()),
    opensAt: v.optional(v.number()),
    dueAt: v.optional(v.number()),
    maxAttempts: v.optional(v.number()),
    scoringPolicy: v.union(
      v.literal("best"),
      v.literal("latest"),
      v.literal("average"),
    ),
    feedbackMode: v.union(
      v.literal("score_only"),
      v.literal("per_question"),
      v.literal("full"),
    ),
    solutionsRelease: v.union(
      v.literal("immediate"),
      v.literal("after_deadline"),
      v.literal("manual"),
    ),
    timeLimitMin: v.optional(v.number()),
    latePolicy: v.union(
      v.literal("strict"),
      v.literal("grace"),
      v.literal("open"),
    ),
    latePenaltyPercent: v.optional(v.number()),
    lateCutoffAt: v.optional(v.number()),
    shuffleQuestions: v.optional(v.boolean()),
    shuffleOptions: v.optional(v.boolean()),
    status: v.union(v.literal("draft"), v.literal("published")),
  })
    .index("by_section", ["sectionId"])
    .index("by_section_kind", ["sectionId", "kind"]),

  questions: defineTable({
    assignmentId: v.id("assignments"),
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
    order: v.number(),
  }).index("by_assignment", ["assignmentId", "order"]),

  deadlineOverrides: defineTable({
    assignmentId: v.id("assignments"),
    userId: v.id("users"),
    dueAt: v.number(),
    reason: v.optional(v.string()),
  }).index("by_assignment_user", ["assignmentId", "userId"]),

  attempts: defineTable({
    assignmentId: v.id("assignments"),
    userId: v.id("users"),
    attemptNo: v.number(),
    status: v.union(
      v.literal("in_progress"),
      v.literal("submitted"),
      v.literal("needs_review"),
      v.literal("graded"),
    ),
    startedAt: v.number(),
    submittedAt: v.optional(v.number()),
    score: v.optional(v.number()),
    maxScore: v.optional(v.number()),
    isLate: v.boolean(),
    answers: v.array(
      v.object({
        questionId: v.id("questions"),
        response: v.any(),
        isCorrect: v.optional(v.boolean()),
        marksAwarded: v.optional(v.number()),
        feedback: v.optional(v.string()),
      }),
    ),
    questionOrder: v.optional(v.array(v.id("questions"))),
  })
    .index("by_user_assignment", ["userId", "assignmentId"])
    .index("by_assignment", ["assignmentId"]),

  auditLog: defineTable({
    actorId: v.id("users"),
    action: v.string(),
    entityType: v.string(),
    entityId: v.string(),
    before: v.optional(v.string()),
    after: v.optional(v.string()),
    at: v.number(),
  }).index("by_at", ["at"]),
});
