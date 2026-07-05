import { billingCycle } from "../schema";

export type BillingCycle = "monthly" | "quarterly" | "half-yearly" | "yearly";

/** Add one billing period to an ISO date (YYYY-MM-DD). */
export function addBillingPeriod(isoDate: string, cycle: BillingCycle): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  switch (cycle) {
    case "monthly":
      date.setMonth(date.getMonth() + 1);
      break;
    case "quarterly":
      date.setMonth(date.getMonth() + 3);
      break;
    case "half-yearly":
      date.setMonth(date.getMonth() + 6);
      break;
    case "yearly":
      date.setFullYear(date.getFullYear() + 1);
      break;
  }
  return toISODate(date);
}

function toISODate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
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
