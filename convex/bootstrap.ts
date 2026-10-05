import { action, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { createAccount } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import { envOptional } from "./lib/env";

/** Run once from the Convex dashboard to create the first admin. */
export const createInitialAdmin = action({
  args: {
    setupSecret: v.optional(v.string()),
    name: v.string(),
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const expected = envOptional("SETUP_SECRET");
    if (expected && args.setupSecret !== expected) {
      throw new Error("Invalid setup secret");
    }

    const email = args.email.trim().toLowerCase();
    const existing = await ctx.runQuery(internal.adminUsers.getByEmail, {
      email,
    });
    if (existing?.role === "admin") {
      return { status: "already_exists" as const };
    }

    if (!existing) {
      await createAccount(ctx, {
        provider: "password",
        account: { id: email, secret: args.password },
        profile: { email, name: args.name },
        shouldLinkViaEmail: true,
      });
    }

    await ctx.runMutation(internal.bootstrap.markAdmin, {
      email,
      name: args.name,
    });

    return { status: "created" as const };
  },
});

export const markAdmin = internalMutation({
  args: { email: v.string(), name: v.string() },
  handler: async (ctx, { email, name }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .unique();
    if (!user) throw new Error("User not found after account creation");
    await ctx.db.patch(user._id, {
      name,
      role: "admin",
      status: "active",
      timezone: "Asia/Kolkata",
    });
  },
});
