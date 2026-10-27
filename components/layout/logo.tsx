import { cn } from "@/lib/utils";

export function Logo({
  className,
  compact = false,
  showTagline = true,
}: {
  className?: string;
  /** Icon + wordmark only — for cramped chrome */
  compact?: boolean;
  showTagline?: boolean;
}) {
  const withTagline = showTagline && !compact;

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-primary">
        <span className="text-[15px] font-semibold leading-none text-primary-foreground">
          ₹
        </span>
      </div>
      <div className="leading-none">
        <div className="text-[17px] font-semibold tracking-tight text-foreground">
          Kubera
        </div>
        {withTagline && (
          <div className="mt-0.5 text-caption font-medium text-muted-foreground">
            Calm finance
          </div>
        )}
      </div>
    </div>
  );
}
