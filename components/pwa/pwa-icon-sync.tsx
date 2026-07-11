"use client";

import { useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { applyPwaIconLinks, setHomeCurrencyCookie } from "@/lib/pwa-icons";

/**
 * Keeps document icon link tags and the home-currency cookie aligned with
 * the signed-in user's preference so favicons and the next manifest fetch match.
 */
export function PwaIconSync() {
  const user = useQuery(api.users.me);

  useEffect(() => {
    if (!user?.homeCurrency) return;
    setHomeCurrencyCookie(user.homeCurrency);
    applyPwaIconLinks(user.homeCurrency);
  }, [user?.homeCurrency]);

  return null;
}
