/**
 * Typed access to Convex deployment environment variables.
 * Values are set in the Convex dashboard (or via `npx convex env set`).
 */
export function envOptional(name: keyof NodeJS.ProcessEnv): string | undefined {
  const value = process.env[name];
  return value === "" ? undefined : value;
}

export function getResendConfig():
  | { apiKey: string; fromEmail: string }
  | null {
  const apiKey = envOptional("RESEND_API_KEY");
  if (!apiKey) return null;
  return {
    apiKey,
    fromEmail:
      envOptional("RESEND_FROM_EMAIL") ?? "Classly <onboarding@resend.dev>",
  };
}
