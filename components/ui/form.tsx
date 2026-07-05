import { cn } from "@/lib/utils";
import { Alert } from "@/components/ui/alert";
import {
  ComponentType,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
  forwardRef,
} from "react";
import { ChevronDown, type LucideIcon } from "lucide-react";

/* ── Labels & layout ─────────────────────────────────────────────── */

export function FieldLabel({
  children,
  htmlFor,
  hint,
  className,
}: {
  children: ReactNode;
  htmlFor?: string;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={cn("mb-2", className)}>
      <label
        htmlFor={htmlFor}
        className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground"
      >
        {children}
      </label>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground/80">{hint}</p>}
    </div>
  );
}

export function FormSection({
  title,
  children,
  className,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-3", className)}>
      {title && (
        <h4 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
          {title}
        </h4>
      )}
      {children}
    </section>
  );
}

export function FormRow({
  children,
  cols = 2,
  className,
}: {
  children: ReactNode;
  cols?: 1 | 2;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid gap-3",
        cols === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function FormField({
  label,
  hint,
  htmlFor,
  children,
  className,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <FieldLabel htmlFor={htmlFor} hint={hint}>
        {label}
      </FieldLabel>
      {children}
    </div>
  );
}

export function FormError({
  message,
  title,
  onDismiss,
}: {
  message: string;
  title?: string;
  onDismiss?: () => void;
}) {
  return (
    <Alert
      variant="error"
      title={title}
      message={message}
      onDismiss={onDismiss}
    />
  );
}

export function FormWarning({
  message,
  title,
}: {
  message: string;
  title?: string;
}) {
  return <Alert variant="warning" title={title} message={message} />;
}

export function FormSuccess({
  message,
  title,
}: {
  message: string;
  title?: string;
}) {
  return <Alert variant="success" title={title} message={message} />;
}

export function FormHint({ children }: { children: ReactNode }) {
  return <p className="text-xs leading-relaxed text-muted-foreground">{children}</p>;
}

/* ── Inputs ──────────────────────────────────────────────────────── */

const controlBase =
  "w-full rounded-xl border border-border/50 bg-muted/25 px-3.5 py-2.5 text-sm text-foreground transition-[border-color,background-color,box-shadow] placeholder:text-muted-foreground/50 hover:border-border focus-visible:border-primary/30 focus-visible:bg-card focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-50";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(controlBase, className)} {...props} />
  ),
);
Input.displayName = "Input";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(controlBase, "min-h-[88px] resize-none leading-relaxed", className)}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        className={cn(controlBase, "cursor-pointer appearance-none pr-10", className)}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        size={16}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  ),
);
Select.displayName = "Select";

/** Hero-style currency input for amounts. */
export function MoneyInput({
  value,
  onChange,
  label = "Amount",
  autoFocus,
  required,
  size = "lg",
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  autoFocus?: boolean;
  required?: boolean;
  size?: "md" | "lg";
}) {
  return (
    <div className="rounded-2xl border border-border/40 bg-muted/15 p-5">
      <p className="text-center text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </p>
      <div className="mt-2 flex items-baseline justify-center gap-1">
        <span
          className={cn(
            "font-medium text-muted-foreground",
            size === "lg" ? "text-2xl" : "text-xl",
          )}
        >
          ₹
        </span>
        <input
          type="number"
          step="0.01"
          min="0.01"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          autoFocus={autoFocus}
          placeholder="0"
          className={cn(
            "w-full max-w-[220px] bg-transparent text-center font-bold tabular-nums tracking-tight text-foreground outline-none placeholder:text-muted-foreground/30",
            size === "lg" ? "text-4xl" : "text-2xl",
          )}
        />
      </div>
    </div>
  );
}

/* ── Toggles & pickers ───────────────────────────────────────────── */

export function SegmentedField<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label?: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; tone?: "income" | "expense" | "neutral" }[];
}) {
  return (
    <div>
      {label && <FieldLabel>{label}</FieldLabel>}
      <div className="flex gap-1 rounded-xl border border-border/60 bg-muted/25 p-1">
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={cn(
                "flex-1 rounded-lg py-2.5 text-sm font-medium transition-all duration-200",
                active
                  ? opt.tone === "income"
                    ? "bg-[hsl(var(--income))]/15 text-[hsl(var(--income))] shadow-sm ring-1 ring-[hsl(var(--income))]/25"
                    : opt.tone === "expense"
                      ? "bg-[hsl(var(--expense))]/12 text-[hsl(var(--expense))] shadow-sm ring-1 ring-[hsl(var(--expense))]/20"
                      : "bg-card text-foreground shadow-sm ring-1 ring-border/80"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ColorPicker({
  value,
  onChange,
  colors,
}: {
  value: string;
  onChange: (color: string) => void;
  colors: string[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {colors.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          aria-label={`Color ${c}`}
          className={cn(
            "relative h-9 w-9 rounded-full transition-transform hover:scale-105",
            value === c && "ring-2 ring-foreground ring-offset-2 ring-offset-background",
          )}
          style={{ backgroundColor: c }}
        >
          {value === c && (
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="h-2 w-2 rounded-full bg-white shadow-sm" />
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export function IconPicker({
  value,
  onChange,
  icons,
  getIcon,
}: {
  value: string;
  onChange: (icon: string) => void;
  icons: string[];
  getIcon: (key: string) => LucideIcon;
}) {
  return (
    <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8">
      {icons.map((key) => {
        const Icon = getIcon(key);
        const active = value === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={cn(
              "flex aspect-square items-center justify-center rounded-xl border transition-all",
              active
                ? "border-primary/50 bg-primary/10 text-primary shadow-sm"
                : "border-transparent bg-muted/30 text-muted-foreground hover:border-border hover:bg-muted/50 hover:text-foreground",
            )}
          >
            <Icon size={17} />
          </button>
        );
      })}
    </div>
  );
}

export function CategoryChips<T extends string>({
  items,
  value,
  onChange,
  getIcon,
}: {
  items: { id: T; name: string; color: string; icon: string }[];
  value: T | "";
  onChange: (id: T | "") => void;
  getIcon: (key: string) => LucideIcon;
}) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 pt-1">
      {items.map((c) => {
        const Icon = getIcon(c.icon);
        const active = value === c.id;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onChange(active ? "" : c.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all",
              active
                ? "text-white shadow-sm"
                : "border border-border/60 bg-muted/20 text-muted-foreground hover:border-border hover:text-foreground",
            )}
            style={active ? { backgroundColor: c.color } : undefined}
          >
            <Icon size={12} />
            {c.name}
          </button>
        );
      })}
    </div>
  );
}

export function PreviewBadge({
  icon: Icon,
  color,
  title,
  subtitle,
}: {
  icon: LucideIcon | ComponentType<{ size?: number }>;
  color: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-center gap-3.5 rounded-2xl border border-border/50 bg-muted/20 px-4 py-3.5">
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-sm"
        style={{ backgroundColor: `${color}22`, color }}
      >
        <Icon size={22} />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{title || "Untitled"}</p>
        {subtitle && (
          <p className="truncate text-xs capitalize text-muted-foreground">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

/* ── Form shell (used inside Modal) ──────────────────────────────── */

export function FormBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("space-y-5", className)}>{children}</div>;
}

export function FormFooter({
  onCancel,
  cancelLabel = "Cancel",
  submitLabel,
  loading,
  disabled,
  formId,
}: {
  onCancel: () => void;
  cancelLabel?: string;
  submitLabel: string;
  loading?: boolean;
  disabled?: boolean;
  /** Links the submit button to a form in the modal body */
  formId?: string;
}) {
  return (
    <div className="flex gap-2.5">
      <button
        type="button"
        onClick={onCancel}
        className="flex-1 rounded-xl border border-border/60 bg-muted/20 px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
      >
        {cancelLabel}
      </button>
      <button
        type="submit"
        form={formId}
        disabled={disabled || loading}
        className="flex-[1.2] rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition-all hover:brightness-110 active:brightness-95 disabled:pointer-events-none disabled:opacity-50"
      >
        {loading ? "Saving…" : submitLabel}
      </button>
    </div>
  );
}

/* Back-compat aliases */
export const Label = FieldLabel;
