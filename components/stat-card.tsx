import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

type Tone = "income" | "expense" | "balance" | "neutral";

const toneStyles: Record<Tone, string> = {
  income: "bg-[hsl(var(--income))]/12 text-[hsl(var(--income))]",
  expense: "bg-[hsl(var(--expense))]/12 text-[hsl(var(--expense))]",
  balance: "bg-primary/12 text-primary",
  neutral: "bg-muted text-muted-foreground",
};

/** Prefix when color alone would convey meaning (colorblind-safe). */
const tonePrefix: Partial<Record<Tone, string>> = {
  income: "+",
  expense: "−",
};

export function StatCard({
  title,
  value,
  icon: Icon,
  tone = "neutral",
  hint,
  highlight = false,
  /** When true, prepend +/− for income/expense tones */
  signed = false,
}: {
  title: string;
  value: string;
  icon: LucideIcon;
  tone?: Tone;
  hint?: string;
  highlight?: boolean;
  signed?: boolean;
}) {
  const prefix = signed ? tonePrefix[tone] : undefined;

  return (
    <Card
      className={cn(
        "relative overflow-hidden p-5 transition-colors",
        highlight && "bg-aurora",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-[13px] font-medium text-muted-foreground">
          {title}
        </span>
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]",
            toneStyles[tone],
          )}
          aria-hidden
        >
          <Icon size={16} strokeWidth={2} />
        </div>
      </div>
      <p
        className={cn(
          "mt-3 text-[26px] font-semibold tracking-tight tabular-nums sm:text-[28px]",
          tone === "income" && "text-[hsl(var(--income))]",
          tone === "expense" && "text-foreground",
        )}
      >
        {prefix ? (
          <span className="sr-only">
            {tone === "income" ? "Income " : "Expense "}
          </span>
        ) : null}
        {prefix}
        {value}
      </p>
      {hint && (
        <p className="mt-1 text-[12px] leading-snug text-muted-foreground">
          {hint}
        </p>
      )}
    </Card>
  );
}
