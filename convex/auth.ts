import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import type { GenericActionCtxWithAuthConfig } from "@convex-dev/auth/server";
import type { Value } from "convex/values";
import type { DataModel } from "./_generated/dataModel";

function passwordProfile(
  params: Record<string, Value | undefined>,
  _ctx: GenericActionCtxWithAuthConfig<DataModel>,
) {
  const email = String(params.email ?? "")
    .trim()
    .toLowerCase();
  const name = String(params.name ?? email.split("@")[0] ?? "Student").trim();
  return {
    email,
    name,
    role: "student" as const,
    status: "active" as const,
    timezone: "Asia/Kolkata",
  };
}

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password<DataModel>({
      id: "password",
      profile: passwordProfile,
    }),
  ],
});
