"use client";

import { ReactNode, useMemo } from "react";
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
