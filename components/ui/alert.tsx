"use client";

import { cn } from "@/lib/utils";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
  type LucideIcon,
} from "lucide-react";

export type AlertVariant = "error" | "warning" | "success" | "info";

const VARIANTS: Record<
  AlertVariant,
  {
    icon: LucideIcon;
    box: string;
    iconWrap: string;
    title: string;
    message: string;
  }
> = {
  error: {
    icon: AlertCircle,
    box: "border-[hsl(var(--expense))]/25 bg-[hsl(var(--expense))]/[0.07]",
    iconWrap: "bg-[hsl(var(--expense))]/12 text-[hsl(var(--expense))]",
    title: "text-[hsl(var(--expense))]",
    message: "text-[hsl(var(--expense))]/90",
  },
  warning: {
    icon: AlertTriangle,
    box: "border-amber-500/25 bg-amber-500/[0.07]",
    iconWrap: "bg-amber-500/12 text-amber-700 dark:text-amber-400",
    title: "text-amber-800 dark:text-amber-300",
    message: "text-amber-800/90 dark:text-amber-300/90",
  },
  success: {
    icon: CheckCircle2,
    box: "border-[hsl(var(--income))]/25 bg-[hsl(var(--income))]/[0.07]",
    iconWrap: "bg-[hsl(var(--income))]/12 text-[hsl(var(--income))]",
    title: "text-[hsl(var(--income))]",
    message: "text-[hsl(var(--income))]/90",
  },
  info: {
    icon: Info,
    box: "border-primary/20 bg-primary/[0.06]",
    iconWrap: "bg-primary/10 text-primary",
    title: "text-foreground",
    message: "text-muted-foreground",
  },
};

export function Alert({
  variant = "error",
  title,
  message,
  onDismiss,
  className,
}: {
  variant?: AlertVariant;
  title?: string;
  message: string;
  onDismiss?: () => void;
  className?: string;
}) {
  const styles = VARIANTS[variant];
  const Icon = styles.icon;

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        "flex gap-3 rounded-xl border px-3.5 py-3 animate-fade-in",
        styles.box,
        className,
      )}
    >
      <div
        className={cn(
          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
          styles.iconWrap,
        )}
      >
        <Icon size={16} strokeWidth={2.25} />
      </div>

      <div className="min-w-0 flex-1 pt-0.5">
        {title && (
          <p className={cn("text-sm font-semibold leading-snug", styles.title)}>{title}</p>
        )}
        <p
          className={cn(
            "text-sm leading-relaxed",
            title ? "mt-0.5" : "",
            styles.message,
          )}
        >
          {message}
        </p>
      </div>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className={cn(
            "mt-0.5 shrink-0 rounded-md p-1 opacity-60 transition-opacity hover:opacity-100",
            styles.title,
          )}
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
