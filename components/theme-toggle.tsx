"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme, type AppearancePreference } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

const OPTIONS: {
  value: AppearancePreference;
  label: string;
  icon: typeof Sun;
}[] = [
  { value: "system", label: "Match system", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

/** Segmented appearance control for Settings — defaults to Match system. */
export function AppearanceControl({ className }: { className?: string }) {
  const { preference, setPreference } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Appearance"
      className={cn(
        "grid grid-cols-3 gap-1 rounded-xl border border-border/70 bg-muted/40 p-1",
        className,
      )}
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const selected = preference === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => setPreference(value)}
            className={cn(
              "inline-flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-2 text-xs font-medium transition-colors",
              selected
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon size={18} strokeWidth={1.75} aria-hidden />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
