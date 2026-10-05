import { Password } from "@convex-dev/auth/providers/Password";
import { Email } from "@convex-dev/auth/providers/Email";
import { convexAuth } from "@convex-dev/auth/server";
import type { GenericActionCtxWithAuthConfig } from "@convex-dev/auth/server";
import { Resend } from "resend";
import type { Value } from "convex/values";
import type { DataModel } from "./_generated/dataModel";
import { getResendConfig } from "./lib/env";

function passwordProfile(
  params: Record<string, Value | undefined>,
  _ctx: GenericActionCtxWithAuthConfig<DataModel>,
) {
  const email = String(params.email ?? "")
    .trim()
    .toLowerCase();
  const name = String(params.name ?? email.split("@")[0] ?? "User").trim();
  return { email, name };
}

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password<DataModel>({
      id: "password",
      profile: passwordProfile,
    }),
    Email({
      id: "email-otp",
      maxAge: 60 * 15,
      async sendVerificationRequest({ identifier: email, token }) {
        const resendConfig = getResendConfig();
        if (!resendConfig) {
          console.warn(
            `[Classly] RESEND_API_KEY is not set on this Convex deployment. Login code for ${email}: ${token}`,
          );
          throw new Error(
            "Email service is not configured (RESEND_API_KEY is missing in Convex environment variables). Please sign in with password or set RESEND_API_KEY.",
          );
        }
        try {
          const resend = new Resend(resendConfig.apiKey);
          const { error } = await resend.emails.send({
            from: resendConfig.fromEmail,
            to: email,
            subject: "Your Classly login code",
            text: `Your login code is: ${token}\n\nIt expires in 15 minutes.`,
          });
          if (error) {
            console.error("[Classly] Resend email send error:", error);
            throw new Error(`Email delivery failed: ${error.message}`);
          }
        } catch (err: any) {
          console.error("[Classly] Failed to send login email:", err);
          throw new Error(
            err?.message ?? "Failed to send login code email. Please sign in with password.",
          );
        }
      },
    }),
  ],
});
