export type BillingCycle = "monthly" | "quarterly" | "half-yearly" | "yearly";

/** Days in month for year/month (month is 1–12). */
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Add calendar months without overflowing end-of-month dates.
 * Jan 31 + 1 month → Feb 28/29 (not March).
 */
export function addCalendarMonths(isoDate: string, months: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) throw new Error("Invalid date");
  const total = y * 12 + (m - 1) + months;
  const ty = Math.floor(total / 12);
  const tm = ((total % 12) + 12) % 12; // 0–11
  const day = Math.min(d, daysInMonth(ty, tm + 1));
  return `${ty}-${String(tm + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function monthsForCycle(cycle: BillingCycle): number {
  switch (cycle) {
    case "monthly":
      return 1;
    case "quarterly":
      return 3;
    case "half-yearly":
      return 6;
    case "yearly":
      return 12;
  }
}

/** Add one billing period to an ISO date (YYYY-MM-DD). */
export function addBillingPeriod(isoDate: string, cycle: BillingCycle): string {
  return addCalendarMonths(isoDate, monthsForCycle(cycle));
}

export function isBillingCycle(value: string): value is BillingCycle {
  return (
    value === "monthly" ||
    value === "quarterly" ||
    value === "half-yearly" ||
    value === "yearly"
  );
}

export const BILLING_CYCLE_LABELS: Record<BillingCycle, string> = {
  monthly: "Monthly",
  quarterly: "Every 3 months",
  "half-yearly": "Every 6 months",
  yearly: "Yearly",
};

/** Validate billing cycle from Convex schema union */
export function parseBillingCycle(cycle: string): BillingCycle | null {
  return isBillingCycle(cycle) ? cycle : null;
}
