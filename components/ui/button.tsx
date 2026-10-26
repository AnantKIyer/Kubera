import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "destructive";
type Size = "sm" | "md" | "lg" | "icon";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-primary text-primary-foreground shadow-soft hover:opacity-90 active:opacity-80",
  secondary:
    "bg-secondary text-secondary-foreground hover:bg-secondary/80 active:bg-secondary/70",
  ghost: "text-foreground hover:bg-muted/80 active:bg-muted",
  outline:
    "border border-border/80 bg-transparent hover:bg-muted/60 active:bg-muted",
  destructive:
    "bg-[hsl(var(--expense))] text-white hover:opacity-90 active:opacity-80",
};

const sizes: Record<Size, string> = {
  /* Prefer md/lg for primary actions; sm only for dense secondary chrome */
  sm: "min-h-9 h-9 px-3 text-[13px] gap-1.5 rounded-lg",
  md: "min-h-11 h-11 px-4 text-[15px] gap-2 rounded-xl",
  lg: "min-h-12 h-12 px-5 text-[15px] gap-2 rounded-xl",
  icon: "min-h-11 min-w-11 h-11 w-11 rounded-xl",
};

const base =
  "inline-flex items-center justify-center font-semibold tracking-tight transition-[opacity,background-color,transform] duration-200 ease-spring active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-40";

/** Shared classes for `<button>` and `<Link>` that should look like buttons. */
export function buttonClassName({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: Variant;
  size?: Size;
  className?: string;
} = {}) {
  return cn(base, variants[variant], sizes[size], className);
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={buttonClassName({ variant, size, className })}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
