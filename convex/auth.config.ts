import type { AuthConfig } from "convex/server";

/**
 * Clerk JWT validation for Convex.
 *
 * Prefer CLERK_JWT_ISSUER_DOMAIN from the Convex deployment env. Fall back to
 * the known Frontend API URL so a missing/empty env never ships a broken
 * auth config (that surfaces as “Convex didn’t accept the session token”).
 *
 * Activate the Convex JWT template named `convex` with `"aud": "convex"` in
 * the Clerk Dashboard (or via API). Token lifetime 3600s is recommended.
 */
const clerkIssuer =
  process.env.CLERK_JWT_ISSUER_DOMAIN?.replace(/\/$/, "") ||
  "https://enabling-roughy-5541.clerk.accounts.dev";

export default {
  providers: [
    {
      domain: clerkIssuer,
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;
