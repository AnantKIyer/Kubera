"use client";

import { ReactNode, useEffect, useMemo } from "react";
import { ClerkProvider } from "@clerk/nextjs";
import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import { ThemeProvider } from "@/components/theme-provider";
import { useAuthForConvex } from "@/lib/convex-clerk-auth";

function normalizeConvexUrl(raw: string | undefined): string | undefined {
  if (!raw) return undefined;

  let value = raw.trim();
  if (!value) return undefined;

  const keyPrefix = "NEXT_PUBLIC_CONVEX_URL=";
  if (value.startsWith(keyPrefix)) {
    value = value.slice(keyPrefix.length).trim();
  }

  return value || undefined;
}

const convexUrl = normalizeConvexUrl(process.env.NEXT_PUBLIC_CONVEX_URL);
const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export function Providers({ children }: { children: ReactNode }) {
  const client = useMemo(
    () => (convexUrl ? new ConvexReactClient(convexUrl) : null),
    [],
  );

  // next-pwa only skips *registering* in dev; a worker left over from a production
  // build keeps serving cache-first copies of the unhashed dev chunks.
  useEffect(() => {
    if (process.env.NODE_ENV !== "development" || !("serviceWorker" in navigator)) return;
    void (async () => {
      const registrations = await navigator.serviceWorker.getRegistrations();
      if (registrations.length === 0) return;
      await Promise.all(registrations.map((r) => r.unregister()));
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      window.location.reload();
    })();
  }, []);

  if (!client) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8 text-center">
        <div className="max-w-md space-y-3">
          <h1 className="text-xl font-semibold">Convex is not configured</h1>
          <p className="text-sm text-muted-foreground">
            Set <code className="rounded bg-muted px-1.5 py-0.5">NEXT_PUBLIC_CONVEX_URL</code> in{" "}
            <code className="rounded bg-muted px-1.5 py-0.5">.env.local</code>.
          </p>
        </div>
      </div>
    );
  }

  if (!clerkPublishableKey) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8 text-center">
        <div className="max-w-md space-y-3">
          <h1 className="text-xl font-semibold">Clerk is not configured</h1>
          <p className="text-sm text-muted-foreground">
            Set{" "}
            <code className="rounded bg-muted px-1.5 py-0.5">
              NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
            </code>{" "}
            in <code className="rounded bg-muted px-1.5 py-0.5">.env.local</code>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ClerkProvider
      publishableKey={clerkPublishableKey}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      afterSignOutUrl="/sign-in"
    >
      <ConvexProviderWithAuth client={client} useAuth={useAuthForConvex}>
        <ThemeProvider>{children}</ThemeProvider>
      </ConvexProviderWithAuth>
    </ClerkProvider>
  );
}
