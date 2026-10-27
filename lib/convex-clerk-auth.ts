"use client";

import { useCallback, useMemo, useRef } from "react";
import { useAuth } from "@clerk/nextjs";

/**
 * Auth bridge for Convex that always requests Clerk’s `convex` JWT template.
 *
 * `ConvexProviderWithClerk` uses the session token when `sessionClaims.aud ===
 * "convex"`. That shortcut can hand Convex a session JWT it rejects. Always
 * requesting the named template is the reliable path.
 */
export function useAuthForConvex() {
  const { isLoaded, isSignedIn, getToken, orgId, orgRole, sessionId } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      try {
        const token = await getTokenRef.current({
          template: "convex",
          skipCache: forceRefreshToken,
        });
        return token ?? null;
      } catch (err) {
        console.error(
          '[kubera] Clerk getToken({ template: "convex" }) failed',
          err,
        );
        return null;
      }
    },
    [orgId, orgRole, sessionId, isSignedIn],
  );

  return useMemo(
    () => ({
      isLoading: !isLoaded,
      isAuthenticated: isSignedIn ?? false,
      fetchAccessToken,
    }),
    [isLoaded, isSignedIn, fetchAccessToken],
  );
}
