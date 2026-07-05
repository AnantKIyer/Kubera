"use client";

import { ReactNode, useMemo } from "react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { ThemeProvider } from "@/components/theme-provider";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

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

  return (
    <ConvexAuthProvider client={client}>
      <ThemeProvider>{children}</ThemeProvider>
    </ConvexAuthProvider>
  );
}
