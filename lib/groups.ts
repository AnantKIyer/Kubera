/** Preset colors for expense groups (matches server palette). */
export const GROUP_COLORS = [
  "#367a56",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#f59e0b",
  "#14b8a6",
  "#ef4444",
  "#6366f1",
] as const;

export function formatNetBalance(net: number): {
  label: string;
  shortLabel: string;
  tone: "positive" | "negative" | "neutral";
  amount: number;
} {
  if (Math.abs(net) < 0.01) {
    return { label: "Settled up", shortLabel: "Settled", tone: "neutral", amount: 0 };
  }
  if (net > 0) {
    return { label: "You are owed", shortLabel: "Owed to you", tone: "positive", amount: net };
  }
  return { label: "You owe", shortLabel: "You owe", tone: "negative", amount: Math.abs(net) };
}

export function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}
