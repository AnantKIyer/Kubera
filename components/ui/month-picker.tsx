"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatMonth, shiftMonth } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Accessible month stepper — 44pt chevrons for touch and pointer. */
export function MonthPicker({
  month,
  onChange,
  disableNext,
  className,
}: {
  month: string;
  onChange: (month: string) => void;
  /** Usually true when viewing the current month */
  disableNext?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-xl border border-border/70 bg-card p-1",
        className,
      )}
      role="group"
      aria-label="Select month"
    >
      <button
        type="button"
        onClick={() => onChange(shiftMonth(month, -1))}
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label="Previous month"
      >
        <ChevronLeft size={18} aria-hidden />
      </button>
      <span className="min-w-[8.5rem] px-2 text-center text-sm font-semibold tabular-nums tracking-tight">
        {formatMonth(month)}
      </span>
      <button
        type="button"
        onClick={() => !disableNext && onChange(shiftMonth(month, 1))}
        disabled={disableNext}
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
        aria-label="Next month"
      >
        <ChevronRight size={18} aria-hidden />
      </button>
    </div>
  );
}
