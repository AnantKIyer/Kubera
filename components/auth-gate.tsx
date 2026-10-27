"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { useAuth, useClerk } from "@clerk/nextjs";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";

function LoadingSpace({ label = "Loading your space…" }: { label?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-pulse rounded-full bg-primary/20" />
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function AuthProblem({
  title,
  message,
  onRetry,
  showTokenHint = false,
}: {
  title: string;
  message: string;
  onRetry?: () => void;
  showTokenHint?: boolean;
}) {
  const { signOut } = useClerk();
  const { getToken } = useAuth();
  const router = useRouter();
  const [tokenHint, setTokenHint] = useState<string | null>(null);

  useEffect(() => {
    if (!showTokenHint) return;
    let cancelled = false;
    void (async () => {
      try {
        const token = await getToken({ template: "convex", skipCache: true });
        if (cancelled) return;
        if (!token) {
          setTokenHint(
            "Clerk returned no token for the “convex” JWT template. Confirm the template exists in the Clerk Dashboard.",
          );
          return;
        }
        const payload = decodeJwtPayload(token);
        const aud = payload?.aud;
        const iss = payload?.iss;
        setTokenHint(
          `Token ok · aud=${JSON.stringify(aud)} · iss=${String(iss ?? "missing")}`,
        );
      } catch (err) {
        if (cancelled) return;
        setTokenHint(
          err instanceof Error
            ? `Clerk token error: ${err.message}`
            : "Clerk token error",
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showTokenHint, getToken]);

  return (
    <div className="flex min-h-screen items-center justify-center p-6 text-center">
      <div className="max-w-md space-y-4">
        <div className="space-y-2">
          <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">{message}</p>
          {tokenHint && (
            <p className="rounded-xl bg-muted/50 px-3 py-2 text-left text-xs leading-relaxed text-muted-foreground">
              {tokenHint}
            </p>
          )}
        </div>
        <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
          {onRetry && (
            <button
              type="button"
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
              onClick={onRetry}
            >
              Try again
            </button>
          )}
          <button
            type="button"
            className="inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-medium text-muted-foreground hover:text-foreground"
            onClick={async () => {
              await signOut({ redirectUrl: "/sign-in" });
              router.replace("/sign-in");
            }}
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

/** Seed default categories after Convex user exists — never blocks the app. */
function SeedDefaults() {
  const seed = useMutation(api.seed.seedDefaults);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    void seed({}).catch(() => {
      ran.current = false;
    });
  }, [seed]);

  return null;
}

/**
 * Wait for Clerk→Convex JWT, ensure the users row exists, then render the app.
 * Never bounce Clerk-signed-in users back to /sign-in (that caused the
 * “Taking you to Kubera…” loop).
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { isSignedIn, isLoaded: clerkLoaded } = useAuth();
  const { isAuthenticated, isLoading: convexLoading } = useConvexAuth();
  const router = useRouter();
  const ensureUser = useMutation(api.users.ensureCurrentUser);
  const me = useQuery(api.users.me, isAuthenticated ? {} : "skip");
  const ensureStarted = useRef(false);
  const [ensureError, setEnsureError] = useState<string | null>(null);
  const [ensureDone, setEnsureDone] = useState(false);
  const [retryToken, setRetryToken] = useState(0);
  const [convexWaitTimedOut, setConvexWaitTimedOut] = useState(false);

  // Only leave the app when Clerk itself says signed out.
  useEffect(() => {
    if (!clerkLoaded) return;
    if (!isSignedIn) {
      router.replace("/sign-in");
    }
  }, [clerkLoaded, isSignedIn, router]);

  // If Clerk is in but Convex JWT never arrives, surface an error instead of looping.
  useEffect(() => {
    if (!clerkLoaded || !isSignedIn || isAuthenticated || convexLoading) {
      setConvexWaitTimedOut(false);
      return;
    }
    const t = window.setTimeout(() => setConvexWaitTimedOut(true), 12_000);
    return () => window.clearTimeout(t);
  }, [clerkLoaded, isSignedIn, isAuthenticated, convexLoading, retryToken]);

  useEffect(() => {
    if (!isAuthenticated || ensureStarted.current) return;
    ensureStarted.current = true;
    setEnsureError(null);
    void (async () => {
      try {
        await ensureUser({});
        setEnsureDone(true);
      } catch (err) {
        ensureStarted.current = false;
        setEnsureDone(false);
        setEnsureError(
          err instanceof Error ? err.message : "Could not set up your account.",
        );
      }
    })();
  }, [isAuthenticated, ensureUser, retryToken]);

  if (!clerkLoaded || (isSignedIn && convexLoading)) {
    return <LoadingSpace />;
  }

  if (!isSignedIn) {
    return <LoadingSpace label="Redirecting to sign in…" />;
  }

  if (!isAuthenticated) {
    if (convexWaitTimedOut) {
      return (
        <AuthProblem
          title="Couldn’t connect to Kubera"
          message="You’re signed in with Clerk, but Convex didn’t accept the session token. Check that the Clerk Convex integration and CLERK_JWT_ISSUER_DOMAIN are set, then try again."
          showTokenHint
          onRetry={() => {
            setConvexWaitTimedOut(false);
            setRetryToken((n) => n + 1);
            window.location.assign("/");
          }}
        />
      );
    }
    return <LoadingSpace label="Connecting to your workspace…" />;
  }

  if (isAuthenticated && me === undefined && !ensureError) {
    return <LoadingSpace />;
  }

  if (ensureError) {
    return (
      <AuthProblem
        title="Account setup failed"
        message={ensureError}
        onRetry={() => {
          ensureStarted.current = false;
          setEnsureError(null);
          setEnsureDone(false);
          setRetryToken((n) => n + 1);
        }}
      />
    );
  }

  if (me === null && !ensureDone) {
    return <LoadingSpace />;
  }

  if (me === null && ensureDone) {
    return (
      <AuthProblem
        title="Account still syncing"
        message="Your profile hasn’t appeared yet. Retry, or sign out and back in."
        onRetry={() => {
          ensureStarted.current = false;
          setEnsureDone(false);
          setRetryToken((n) => n + 1);
        }}
      />
    );
  }

  if (!me) return <LoadingSpace />;

  return (
    <>
      <SeedDefaults />
      {children}
    </>
  );
}

/**
 * Auth pages only. Clerk session decides redirect — never mount <SignIn>
 * while already signed in. Hard-navigate once so we don’t stick on this screen.
 */
export function GuestGate({ children }: { children: ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth();
  const redirected = useRef(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || redirected.current) return;
    redirected.current = true;
    // Hard navigation breaks soft-router ping-pong with AuthGate
    window.location.replace("/");
  }, [isLoaded, isSignedIn]);

  if (!isLoaded || isSignedIn) {
    return (
      <LoadingSpace
        label={isSignedIn ? "Taking you to Kubera…" : "Loading…"}
      />
    );
  }

  return <>{children}</>;
}
