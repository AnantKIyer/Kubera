import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

type Tone = "income" | "expense" | "balance" | "neutral";

const toneStyles: Record<Tone, { icon: string; ring: string }> = {
  income: { icon: "bg-[hsl(var(--income))]/12 text-[hsl(var(--income))]", ring: "" },
  expense: { icon: "bg-[hsl(var(--expense))]/12 text-[hsl(var(--expense))]", ring: "" },
  balance: { icon: "bg-primary/12 text-primary", ring: "" },
  neutral: { icon: "bg-muted text-muted-foreground", ring: "" },
};

export function StatCard({
  title,
  value,
  icon: Icon,
  tone = "neutral",
  hint,
  highlight = false,
}: {
  title: string;
  value: string;
  icon: LucideIcon;
  tone?: Tone;
  hint?: string;
  highlight?: boolean;
}) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden p-5 transition-all hover:shadow-soft",
        highlight && "bg-aurora",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg",
            toneStyles[tone].icon,
          )}
        >
          <Icon size={18} />
        </div>
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight tabular-nums sm:text-[26px]">
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}
