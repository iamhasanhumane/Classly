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
import { createAccount } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import { ConvexError } from "convex/values";

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

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const me = await ctx.db.get(userId);
    if (me?.role !== "admin") return [];
    return await ctx.db.query("users").collect();
  },
});

export const createStudent = action({
  args: {
    name: v.string(),
    email: v.string(),
    password: v.optional(v.string()),
    timezone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertAdminAction(ctx);
    const email = args.email.trim().toLowerCase();

    const existing = await ctx.runQuery(internal.adminUsers.getByEmail, {
      email,
    });
    if (existing) {
      throw new ConvexError("A user with this email already exists");
    }

    if (args.password) {
      await createAccount(ctx, {
        provider: "password",
        account: { id: email, secret: args.password },
        profile: { email, name: args.name },
        shouldLinkViaEmail: true,
      });
    } else {
      await createAccount(ctx, {
        provider: "email-otp",
        account: { id: email },
        profile: { email, name: args.name },
        shouldLinkViaEmail: true,
      });
    }

    await ctx.runMutation(internal.adminUsers.finalizeStudent, {
      email,
      name: args.name,
      timezone: args.timezone ?? "Asia/Kolkata",
    });
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

export const finalizeStudent = internalMutation({
  args: {
    name: v.string(),
    email: v.string(),
    timezone: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .unique();
    if (!user) throw new ConvexError("User was not created");
    await ctx.db.patch(user._id, {
      name: args.name,
      role: "student",
      status: "active",
      timezone: args.timezone,
    });
    return user._id;
  },
});

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
