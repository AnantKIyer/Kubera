"use client";

import { Sparkles } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

export function ExtraPaymentBanner({
  extraAmount,
  message,
  className,
}: {
  extraAmount: number;
  message?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex gap-3 rounded-2xl border border-[hsl(var(--income))]/25 bg-[hsl(var(--income))]/10 px-4 py-3.5",
        className,
      )}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--income))]/15 text-[hsl(var(--income))]">
        <Sparkles size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[hsl(var(--income))]">
          Extra payment — {formatCurrency(extraAmount)}
        </p>
        {message && (
          <p className="mt-0.5 text-sm leading-relaxed text-foreground/80">{message}</p>
        )}
      </div>
    </div>
  );
}

export function EmiPaymentPreview({
  expectedEmi,
  paidAmount,
  extraAmount,
  isUnderpaid,
}: {
  expectedEmi: number;
  paidAmount: number;
  extraAmount: number;
  isUnderpaid: boolean;
}) {
  if (!(expectedEmi > 0) || !(paidAmount > 0)) return null;

  if (extraAmount > 0) {
    return (
      <ExtraPaymentBanner
        extraAmount={extraAmount}
        message={`Scheduled EMI is ${formatCurrency(expectedEmi)}. The extra ${formatCurrency(extraAmount)} reduces your loan faster.`}
      />
    );
  }

  if (isUnderpaid) {
    return (
      <p className="rounded-xl border border-amber-500/20 bg-amber-500/8 px-3.5 py-2.5 text-xs text-amber-700 dark:text-amber-400">
        This is below the scheduled EMI of {formatCurrency(expectedEmi)}.
      </p>
    );
  }

  return null;
}
