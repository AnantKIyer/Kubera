// Kubera is a wealth-management app; amounts default to Indian Rupees. Change
// CURRENCY / LOCALE here to re-denominate the entire app.
export const CURRENCY = "INR";
export const LOCALE = "en-IN";

const currencyFormatter = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: CURRENCY,
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

const compactFormatter = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: CURRENCY,
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

export function formatCompactCurrency(value: number): string {
  return compactFormatter.format(value);
}

export function formatSigned(value: number, type: "income" | "expense"): string {
  const sign = type === "income" ? "+" : "-";
  return `${sign}${currencyFormatter.format(Math.abs(value))}`;
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(value >= 0.1 || value <= -0.1 ? 0 : 1)}%`;
}

/** Signed currency delta, e.g. "+₹1,200" or "−₹500". */
export function formatDelta(value: number): string {
  if (value === 0) return formatCurrency(0);
  const sign = value > 0 ? "+" : "−";
  return `${sign}${currencyFormatter.format(Math.abs(value))}`;
}

/** Percent point change between two rates (0–1 fractions). */
export function formatRateDelta(current: number, previous: number): string {
  const pts = (current - previous) * 100;
  const sign = pts > 0 ? "+" : pts < 0 ? "−" : "";
  return `${sign}${Math.abs(pts).toFixed(1)} pp`;
}

export function formatPercentChange(value: number | null): string {
  if (value === null) return "new";
  const pct = value * 100;
  const sign = pct > 0 ? "+" : pct < 0 ? "−" : "";
  return `${sign}${Math.abs(pct).toFixed(0)}%`;
}

/** `YYYY-MM-DD` -> "5 Jul 2026" */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(LOCALE, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Relative-ish day label used in transaction lists. */
export function formatDayLabel(iso: string): string {
  const today = toISODate(new Date());
  const yesterday = toISODate(new Date(Date.now() - 86400000));
  if (iso === today) return "Today";
  if (iso === yesterday) return "Yesterday";
  return formatDate(iso);
}

export function toISODate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

export function currentMonth(): string {
  return toISODate(new Date()).slice(0, 7);
}

/** "2026-07" -> "July 2026" */
export function formatMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(LOCALE, {
    month: "long",
    year: "numeric",
  });
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Inclusive first/last ISO dates for a given `YYYY-MM`. */
export function monthRange(month: string): { start: string; end: string } {
  const [y, m] = month.split("-").map(Number);
  const start = `${month}-01`;
  const end = toISODate(new Date(y, m, 0));
  return { start, end };
}
