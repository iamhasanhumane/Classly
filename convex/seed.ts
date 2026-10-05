import { action } from "./_generated/server";
import { v } from "convex/values";
import { createAccount, modifyAccountCredentials } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

/**
 * Seed or update an admin user in Convex.
 *
 * You can run this:
 * 1) Via Convex Dashboard (Production):
 *    Functions → seed:createAdminUser → Run Function
 *    (Optionally provide arguments or leave empty to use defaults)
 *
 * 2) Via CLI:
 *    npx convex run --prod seed:createAdminUser
 *    or with custom credentials:
 *    npx convex run --prod seed:createAdminUser '{"email":"your@email.com","password":"YourPassword123","name":"Your Name"}'
 */
export const createAdminUser = action({
  args: {
    email: v.optional(v.string()),
    password: v.optional(v.string()),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const email = (args.email ?? "admin@classly.com").trim().toLowerCase();
    const password = args.password ?? "Tech@classly";
    const name = args.name ?? "Admin";

    if (password.length < 8) {
      throw new Error("Password must be at least 8 characters long.");
    }

    const existingUser = await ctx.runQuery(internal.adminUsers.getByEmail, { email });

    if (!existingUser) {
      await createAccount(ctx, {
        provider: "password",
        account: { id: email, secret: password },
        profile: { email, name },
        shouldLinkViaEmail: true,
      });
    } else {
      // User exists, update password credentials or create password account if missing
      try {
        await modifyAccountCredentials(ctx, {
          provider: "password",
          account: { id: email, secret: password },
        });
      } catch {
        await createAccount(ctx, {
          provider: "password",
          account: { id: email, secret: password },
          profile: { email, name },
          shouldLinkViaEmail: true,
        });
      }
    }

    await ctx.runMutation(internal.bootstrap.markAdmin, { email, name });

    return {
      status: "success",
      email,
      password,
      message: `Admin user successfully configured! Sign in at /login with email: ${email}`,
    };
  },
});
