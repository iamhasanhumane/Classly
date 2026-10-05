import { v } from "convex/values";
import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  query,
  type ActionCtx,
} from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import { ConvexError } from "convex/values";
import { Scrypt } from "lucia";

async function assertAdminAction(ctx: ActionCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new ConvexError("Not authenticated");
  const ok = await ctx.runQuery(internal.adminUsers.isAdmin, { userId });
  if (!ok) throw new ConvexError("Admin access required");
}

export const isAdmin = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    return user?.role === "admin" && user.status !== "inactive";
  },
});

export const getByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    return await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .unique();
  },
});

/**
 * List all users with their roles, status, password state, and course enrollments.
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const me = await ctx.db.get(userId);
    if (me?.role !== "admin") return [];

    const users = await ctx.db.query("users").collect();
    const enrollments = await ctx.db.query("enrollments").collect();
    const authAccounts = await ctx.db.query("authAccounts").collect();

    return users.map((u) => {
      const userAccounts = authAccounts.filter((a) => a.userId === u._id);
      const hasPassword = userAccounts.some(
        (a) => a.provider === "password" && Boolean(a.secret),
      );
      const hasEmailOtp = userAccounts.some((a) => a.provider === "email-otp");
      const userEnrollments = enrollments.filter((e) => e.userId === u._id);

      return {
        ...u,
        hasPassword,
        hasEmailOtp,
        enrollments: userEnrollments.map((e) => ({
          courseId: e.courseId,
          status: e.status,
        })),
      };
    });
  },
});

/**
 * Create a new student (or admin) with password and email-otp accounts.
 */
export const createStudent = action({
  args: {
    name: v.string(),
    email: v.string(),
    password: v.optional(v.string()),
    role: v.optional(v.union(v.literal("student"), v.literal("admin"))),
    timezone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertAdminAction(ctx);
    const email = args.email.trim().toLowerCase();
    if (!email) throw new ConvexError("Email is required");

    const existing = await ctx.runQuery(internal.adminUsers.getByEmail, {
      email,
    });
    if (existing) {
      throw new ConvexError("A user with this email already exists");
    }

    let hashedPassword: string | undefined;
    if (args.password && args.password.trim()) {
      if (args.password.length < 8) {
        throw new ConvexError("Password must be at least 8 characters long");
      }
      const scrypt = new Scrypt();
      hashedPassword = await scrypt.hash(args.password);
    }

    await ctx.runMutation(internal.adminUsers.insertUserWithAuth, {
      name: args.name.trim(),
      email,
      role: args.role ?? "student",
      timezone: args.timezone ?? "Asia/Kolkata",
      hashedPassword,
    });
  },
});

export const insertUserWithAuth = internalMutation({
  args: {
    name: v.string(),
    email: v.string(),
    role: v.union(v.literal("student"), v.literal("admin")),
    timezone: v.string(),
    hashedPassword: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await ctx.db.insert("users", {
      name: args.name,
      email: args.email,
      role: args.role,
      status: "active",
      timezone: args.timezone,
    });

    // Create email-otp account so email login is possible
    await ctx.db.insert("authAccounts", {
      userId,
      provider: "email-otp",
      providerAccountId: args.email,
    });

    // If password provided, create password account
    if (args.hashedPassword) {
      await ctx.db.insert("authAccounts", {
        userId,
        provider: "password",
        providerAccountId: args.email,
        secret: args.hashedPassword,
      });
    }

    return userId;
  },
});

/**
 * Set or reset a user's password directly as an admin.
 */
export const setUserPassword = action({
  args: {
    userId: v.id("users"),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    await assertAdminAction(ctx);
    if (!args.password || args.password.length < 8) {
      throw new ConvexError("Password must be at least 8 characters long");
    }

    const scrypt = new Scrypt();
    const hashedPassword = await scrypt.hash(args.password);

    await ctx.runMutation(internal.adminUsers.updateUserPasswordRecord, {
      userId: args.userId,
      hashedPassword,
    });
  },
});

export const updateUserPasswordRecord = internalMutation({
  args: {
    userId: v.id("users"),
    hashedPassword: v.string(),
  },
  handler: async (ctx, { userId, hashedPassword }) => {
    const user = await ctx.db.get(userId);
    if (!user || !user.email) throw new ConvexError("User not found");
    const email = user.email.toLowerCase().trim();

    const existingAccount = await ctx.db
      .query("authAccounts")
      .withIndex("providerAndAccountId", (q) =>
        q.eq("provider", "password").eq("providerAccountId", email),
      )
      .unique();

    if (existingAccount) {
      await ctx.db.patch(existingAccount._id, {
        userId: user._id,
        secret: hashedPassword,
      });
    } else {
      await ctx.db.insert("authAccounts", {
        userId: user._id,
        provider: "password",
        providerAccountId: email,
        secret: hashedPassword,
      });
    }
  },
});

/**
 * Edit user profile fields (name, email, role, status, timezone).
 */
export const updateUser = mutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    email: v.string(),
    role: v.union(v.literal("student"), v.literal("admin")),
    status: v.union(v.literal("active"), v.literal("inactive")),
    timezone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new ConvexError("Not authenticated");
    const me = await ctx.db.get(authId);
    if (me?.role !== "admin") throw new ConvexError("Admin access required");

    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) throw new ConvexError("User not found");

    const newEmail = args.email.trim().toLowerCase();
    if (!newEmail) throw new ConvexError("Email cannot be empty");

    // If email is changing, check uniqueness and update authAccounts
    if (newEmail !== targetUser.email?.toLowerCase()) {
      const existing = await ctx.db
        .query("users")
        .withIndex("email", (q) => q.eq("email", newEmail))
        .unique();
      if (existing && existing._id !== args.userId) {
        throw new ConvexError("Another user already exists with this email");
      }

      // Update providerAccountId across all auth accounts for this user
      const accounts = await ctx.db
        .query("authAccounts")
        .withIndex("userIdAndProvider", (q) => q.eq("userId", args.userId))
        .collect();
      for (const account of accounts) {
        await ctx.db.patch(account._id, {
          providerAccountId: newEmail,
        });
      }
    }

    await ctx.db.patch(args.userId, {
      name: args.name.trim(),
      email: newEmail,
      role: args.role,
      status: args.status,
      timezone: args.timezone ?? targetUser.timezone ?? "Asia/Kolkata",
    });
  },
});

/**
 * Delete a user and cascade cleanup across all related tables.
 */
export const deleteUser = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, { userId }) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new ConvexError("Not authenticated");
    const me = await ctx.db.get(authId);
    if (me?.role !== "admin") throw new ConvexError("Admin access required");

    if (userId === authId) {
      throw new ConvexError("You cannot delete your own admin account");
    }

    const target = await ctx.db.get(userId);
    if (!target) throw new ConvexError("User not found");

    // 1. Delete authAccounts
    const accounts = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) => q.eq("userId", userId))
      .collect();
    for (const a of accounts) {
      await ctx.db.delete(a._id);
    }

    // 2. Delete authSessions
    const sessions = await ctx.db
      .query("authSessions")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .collect();
    for (const s of sessions) {
      await ctx.db.delete(s._id);
    }

    // 3. Delete enrollments
    const enrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const e of enrollments) {
      await ctx.db.delete(e._id);
    }

    // 4. Delete sessionProgress
    const progress = await ctx.db
      .query("sessionProgress")
      .withIndex("by_user_session", (q) => q.eq("userId", userId))
      .collect();
    for (const p of progress) {
      await ctx.db.delete(p._id);
    }

    // 5. Delete activityAnswers
    const answers = await ctx.db
      .query("activityAnswers")
      .withIndex("by_user_session", (q) => q.eq("userId", userId))
      .collect();
    for (const ans of answers) {
      await ctx.db.delete(ans._id);
    }

    // 6. Delete deadlineOverrides
    const overrides = await ctx.db.query("deadlineOverrides").collect();
    for (const o of overrides) {
      if (o.userId === userId) {
        await ctx.db.delete(o._id);
      }
    }

    // 7. Delete attempts
    const attempts = await ctx.db
      .query("attempts")
      .withIndex("by_user_assignment", (q) => q.eq("userId", userId))
      .collect();
    for (const att of attempts) {
      await ctx.db.delete(att._id);
    }

    // 8. Delete user record
    await ctx.db.delete(userId);

    return { success: true };
  },
});

/**
 * Toggle user active/inactive status.
 */
export const setStatus = mutation({
  args: {
    userId: v.id("users"),
    status: v.union(v.literal("active"), v.literal("inactive")),
  },
  handler: async (ctx, { userId, status }) => {
    const authId = await getAuthUserId(ctx);
    if (!authId) throw new ConvexError("Not authenticated");
    const me = await ctx.db.get(authId);
    if (me?.role !== "admin") throw new ConvexError("Admin access required");
    await ctx.db.patch(userId, { status });
  },
});
