import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const viewer = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user || user.status === "inactive") return null;
    return {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role ?? "student",
      timezone: user.timezone ?? "Asia/Kolkata",
    };
  },
});
