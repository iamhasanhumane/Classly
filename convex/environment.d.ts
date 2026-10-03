/** Convex deployment environment variables used by this app. */
declare namespace NodeJS {
  interface ProcessEnv {
    RESEND_API_KEY?: string;
    RESEND_FROM_EMAIL?: string;
    SETUP_SECRET?: string;
    JWT_PRIVATE_KEY?: string;
    JWKS?: string;
    SITE_URL?: string;
    CONVEX_SITE_URL?: string;
  }
}

export {};
