"use client";

import { useEffect } from "react";
import { useConvexAuth, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

/** Seeds default categories once per user after sign-in. */
export function UserSeeder() {
  const { isAuthenticated } = useConvexAuth();
  const seed = useMutation(api.seed.seedDefaults);

  useEffect(() => {
    if (isAuthenticated) {
      seed().catch(() => {});
    }
  }, [isAuthenticated, seed]);

  return null;
}
