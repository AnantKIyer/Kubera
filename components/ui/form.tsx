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
    <div className={cn("mb-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className="block text-[13px] font-medium text-muted-foreground"
      >
        {children}
      </label>
      {hint && <p className="mt-0.5 text-[12px] text-muted-foreground/80">{hint}</p>}
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
        <h4 className="text-[13px] font-semibold tracking-tight text-muted-foreground">
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
  "w-full rounded-[12px] border-0 bg-muted/55 px-3.5 py-3 text-[15px] leading-snug text-foreground transition-[background-color,box-shadow] placeholder:text-muted-foreground/45 hover:bg-muted/70 focus-visible:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50";

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
      <p className="text-center text-caption font-medium text-muted-foreground">
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
      <div
        role="radiogroup"
        aria-label={label}
        className="flex gap-1 rounded-xl border border-border/60 bg-muted/40 p-1"
      >
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(opt.value)}
              className={cn(
                "min-h-11 flex-1 rounded-lg px-2 text-sm transition-all duration-200",
                active
                  ? cn(
                      "bg-card font-semibold text-foreground shadow-sm ring-1 ring-border/90",
                      opt.tone === "income" &&
                        "bg-[hsl(var(--income))]/18 text-[hsl(var(--income))] ring-[hsl(var(--income))]/35",
                      opt.tone === "expense" &&
                        "bg-[hsl(var(--expense))]/16 text-[hsl(var(--expense))] ring-[hsl(var(--expense))]/35",
                    )
                  : "font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground",
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
  allowClear = true,
}: {
  items: { id: T; name: string; color: string; icon: string }[];
  value: T | "";
  onChange: (id: T | "") => void;
  getIcon: (key: string) => LucideIcon;
  /** Show an “Uncategorized” chip that clears the selection */
  allowClear?: boolean;
}) {
  if (items.length === 0 && !allowClear) return null;
  return (
    <div className="flex flex-wrap gap-2" role="listbox" aria-label="Category">
      {allowClear && (
        <button
          type="button"
          role="option"
          aria-selected={value === ""}
          onClick={() => onChange("")}
          className={cn(
            "inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-all",
            value === ""
              ? "border-foreground/25 bg-foreground/[0.08] font-semibold text-foreground shadow-sm ring-1 ring-foreground/15"
              : "border-border/60 bg-muted/20 text-muted-foreground hover:border-border hover:text-foreground",
          )}
        >
          Uncategorized
        </button>
      )}
      {items.map((c) => {
        const Icon = getIcon(c.icon);
        const active = value === c.id;
        return (
          <button
            key={c.id}
            type="button"
            role="option"
            aria-selected={active}
            onClick={() => onChange(active && allowClear ? "" : c.id)}
            className={cn(
              "inline-flex min-h-11 items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-all",
              active
                ? "border-transparent font-semibold text-white shadow-sm ring-2 ring-foreground/20 ring-offset-1 ring-offset-background"
                : "border-border/60 bg-muted/20 text-muted-foreground hover:border-border hover:text-foreground",
            )}
            style={active ? { backgroundColor: c.color } : undefined}
          >
            <Icon size={14} className="shrink-0" aria-hidden />
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
    <div className="flex items-center gap-2.5">
      <button
        type="button"
        onClick={onCancel}
        className="min-h-11 shrink-0 rounded-xl px-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
      >
        {cancelLabel}
      </button>
      <button
        type="submit"
        form={formId}
        disabled={disabled || loading}
        className="min-h-11 flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition-all hover:brightness-110 active:brightness-95 disabled:pointer-events-none disabled:opacity-50"
      >
        {loading ? "Saving…" : submitLabel}
      </button>
    </div>
  );
}

/* Back-compat aliases */
export const Label = FieldLabel;
