import { BASE_CURRENCY, resolveHomeCurrency } from "@/lib/currency";

export const HOME_CURRENCY_COOKIE = "kubera-home-currency";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export function iconPath(code: string, size: 180 | 192 | 512): string {
  const currency = resolveHomeCurrency(code);
  return `/icons/${currency}/icon-${size}.png`;
}

export function defaultIconPaths() {
  return {
    icon180: iconPath(BASE_CURRENCY, 180),
    icon192: iconPath(BASE_CURRENCY, 192),
    icon512: iconPath(BASE_CURRENCY, 512),
  };
}

/** Persist home currency for manifest.ts (server) and keep client in sync. */
export function setHomeCurrencyCookie(code: string): void {
  if (typeof document === "undefined") return;
  const value = resolveHomeCurrency(code);
  document.cookie = `${HOME_CURRENCY_COOKIE}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; samesite=lax`;
}

export function readHomeCurrencyCookie(): string {
  if (typeof document === "undefined") return BASE_CURRENCY;
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${HOME_CURRENCY_COOKIE}=([^;]*)`),
  );
  return resolveHomeCurrency(match ? decodeURIComponent(match[1]) : null);
}

/** Update favicon / apple-touch-icon link tags to the given currency set. */
export function applyPwaIconLinks(code: string): void {
  if (typeof document === "undefined") return;
  const currency = resolveHomeCurrency(code);

  upsertLink("icon", "192x192", iconPath(currency, 192));
  upsertLink("icon", "512x512", iconPath(currency, 512));
  upsertLink("apple-touch-icon", "180x180", iconPath(currency, 180));
}

function upsertLink(rel: string, sizes: string, href: string): void {
  const existing = Array.from(document.querySelectorAll(`link[rel="${rel}"]`));
  let target: HTMLLinkElement | null = null;

  for (const node of existing) {
    const link = node as HTMLLinkElement;
    if (link.sizes?.toString() === sizes || link.getAttribute("sizes") === sizes) {
      target = link;
      break;
    }
  }

  if (!target && rel === "apple-touch-icon" && existing.length === 1) {
    target = existing[0] as HTMLLinkElement;
  }

  if (!target) {
    target = document.createElement("link");
    target.rel = rel;
    target.setAttribute("sizes", sizes);
    target.type = "image/png";
    document.head.appendChild(target);
  }

  target.href = href;
  target.setAttribute("sizes", sizes);
  target.type = "image/png";
}
