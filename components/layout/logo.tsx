import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/90 shadow-soft">
        <span className="text-base font-semibold text-primary-foreground">₹</span>
      </div>
      <div className="leading-none">
        <div className="text-[15px] font-semibold tracking-tight text-foreground">Kubera</div>
        <div className="text-[10px] font-medium tracking-[0.14em] text-muted-foreground">
          calm finance
        </div>
      </div>
    </div>
  );
}
