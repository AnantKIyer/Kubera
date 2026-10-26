import { cn } from "@/lib/utils";
import { formatCurrency, formatDelta, formatSigned } from "@/lib/format";

/**
 * Money display with optional +/− so meaning isn’t color-only.
 */
export function MoneyValue({
  amount,
  variant = "plain",
  className,
}: {
  amount: number;
  variant?: "plain" | "income" | "expense" | "delta";
  className?: string;
}) {
  const display =
    variant === "income" || variant === "expense"
      ? formatSigned(Math.abs(amount), variant)
      : variant === "delta"
        ? formatDelta(amount)
        : formatCurrency(amount);

  return (
    <span
      className={cn(
        "tabular-nums",
        (variant === "income" || (variant === "delta" && amount > 0)) &&
          "text-[hsl(var(--income))]",
        className,
      )}
    >
      {display}
    </span>
  );
}
