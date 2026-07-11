/** Base currency for dashboards, budgets, and stored transaction amounts. */
export const BASE_CURRENCY = "INR";

export interface CurrencyOption {
  code: string;
  label: string;
  symbol: string;
}

/** Currencies users can pick when logging a transaction. */
export const LOG_CURRENCIES: CurrencyOption[] = [
  { code: "INR", label: "Indian Rupee", symbol: "₹" },
  { code: "USD", label: "US Dollar", symbol: "$" },
  { code: "EUR", label: "Euro", symbol: "€" },
  { code: "GBP", label: "British Pound", symbol: "£" },
  { code: "AED", label: "UAE Dirham", symbol: "د.إ" },
  { code: "SGD", label: "Singapore Dollar", symbol: "S$" },
  { code: "CAD", label: "Canadian Dollar", symbol: "CA$" },
  { code: "AUD", label: "Australian Dollar", symbol: "A$" },
  { code: "JPY", label: "Japanese Yen", symbol: "¥" },
  { code: "CHF", label: "Swiss Franc", symbol: "CHF" },
];

/**
 * Simplified glyphs for PWA / brand icons (legible at 180px).
 * Keep in sync with scripts/generate-pwa-icons.mjs.
 */
export const ICON_GLYPHS: Record<string, string> = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
  AED: "د",
  SGD: "S$",
  CAD: "C$",
  AUD: "A$",
  JPY: "¥",
  CHF: "Fr",
};

const symbolByCode = new Map(LOG_CURRENCIES.map((c) => [c.code, c.symbol]));
const logCurrencyCodes = new Set(LOG_CURRENCIES.map((c) => c.code));

export function getCurrencySymbol(code: string): string {
  return symbolByCode.get(code) ?? code;
}

/** Glyph used on the PWA app icon for a currency. */
export function getIconGlyph(code: string): string {
  return ICON_GLYPHS[code] ?? getCurrencySymbol(code);
}

export function isLogCurrency(code: string): boolean {
  return logCurrencyCodes.has(code);
}

/** Normalize a stored/cookie home currency; invalid values fall back to INR. */
export function resolveHomeCurrency(code: string | null | undefined): string {
  if (code && isLogCurrency(code)) return code;
  return BASE_CURRENCY;
}

export function isBaseCurrency(code: string): boolean {
  return code === BASE_CURRENCY;
}

export function formatInCurrency(value: number, code: string): string {
  const fractionDigits = code === "JPY" ? 0 : 2;
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: code,
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  }).format(value);
}

/** Convert foreign amount to base currency using rate (1 foreign = rate base). */
export function convertToBaseCurrency(amount: number, rate: number, fromCode: string): number {
  const converted = amount * rate;
  return fromCode === "JPY" ? Math.round(converted) : Math.round(converted * 100) / 100;
}

export function formatExchangeRate(from: string, to: string, rate: number): string {
  return `1 ${from} = ${formatInCurrency(rate, to)}`;
}
