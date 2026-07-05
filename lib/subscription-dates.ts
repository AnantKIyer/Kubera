export type BillingCycle = "monthly" | "quarterly" | "half-yearly" | "yearly";

export const BILLING_CYCLE_LABELS: Record<BillingCycle, string> = {
  monthly: "Monthly",
  quarterly: "Every 3 months",
  "half-yearly": "Every 6 months",
  yearly: "Yearly",
};

export const BILLING_CYCLE_OPTIONS: { value: BillingCycle; label: string }[] = [
  { value: "monthly", label: BILLING_CYCLE_LABELS.monthly },
  { value: "quarterly", label: BILLING_CYCLE_LABELS.quarterly },
  { value: "half-yearly", label: BILLING_CYCLE_LABELS["half-yearly"] },
  { value: "yearly", label: BILLING_CYCLE_LABELS.yearly },
];

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
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}
