import type { MetadataRoute } from "next";
import { cookies } from "next/headers";
import { resolveHomeCurrency } from "@/lib/currency";
import { HOME_CURRENCY_COOKIE, iconPath } from "@/lib/pwa-icons";

export default function manifest(): MetadataRoute.Manifest {
  const cookieStore = cookies();
  const homeCurrency = resolveHomeCurrency(
    cookieStore.get(HOME_CURRENCY_COOKIE)?.value,
  );

  return {
    name: "Kubera — Personal Finance",
    short_name: "Kubera",
    description: "A calm, personal finance workspace for tracking money with clarity.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#e8e0d4",
    theme_color: "#367a56",
    categories: ["finance", "productivity"],
    icons: [
      {
        src: iconPath(homeCurrency, 192),
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: iconPath(homeCurrency, 512),
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: iconPath(homeCurrency, 512),
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
