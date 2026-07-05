"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate, formatDayLabel, toISODate } from "@/lib/format";
import { WEEKDAYS, buildMonthGrid, parseISODate, shiftViewMonth } from "@/lib/dates";

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  placeholder?: string;
  className?: string;
  /** Earliest selectable date (YYYY-MM-DD). Dates before this are disabled. */
  minDate?: string;
}

export function DatePicker({
  value,
  onChange,
  required,
  disabled,
  id: idProp,
  placeholder = "Pick a date",
  className,
  minDate,
}: DatePickerProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState<{ top: number; left: number; width: number } | null>(
    null,
  );

  const selected = value ? parseISODate(value) : null;
  const todayIso = toISODate(new Date());

  const [viewYear, setViewYear] = useState(() => selected?.getFullYear() ?? new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => selected?.getMonth() ?? new Date().getMonth());

  useEffect(() => {
    if (!value) return;
    const d = parseISODate(value);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }, [value]);

  const updatePosition = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const width = Math.max(rect.width, 300);
    const left = Math.min(rect.left, window.innerWidth - width - 12);
    setPanelStyle({
      top: rect.bottom + 8,
      left: Math.max(12, left),
      width,
    });
  };

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const cells = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);

  const monthLabel = useMemo(
    () =>
      new Date(viewYear, viewMonth, 1).toLocaleDateString("en-IN", {
        month: "long",
        year: "numeric",
      }),
    [viewYear, viewMonth],
  );

  const shiftMonth = (delta: number) => {
    const next = shiftViewMonth(viewYear, viewMonth, delta);
    setViewYear(next.year);
    setViewMonth(next.month);
  };

  const pick = (iso: string) => {
    if (minDate && iso < minDate) return;
    onChange(iso);
    setOpen(false);
  };

  const quickPick = (iso: string) => {
    const d = parseISODate(iso);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
    pick(iso);
  };

  const panel =
    open && panelStyle && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label="Choose date"
            style={{
              top: panelStyle.top,
              left: panelStyle.left,
              width: panelStyle.width,
            }}
            className="fixed z-[70] max-w-[calc(100vw-24px)] animate-scale-in overflow-hidden rounded-2xl border border-border/60 bg-card shadow-soft"
          >
            <div className="border-b border-border/50 bg-muted/20 px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  aria-label="Previous month"
                  onClick={() => shiftMonth(-1)}
                  className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <ChevronLeft size={18} />
                </button>
                <p className="text-sm font-semibold tracking-tight">{monthLabel}</p>
                <button
                  type="button"
                  aria-label="Next month"
                  onClick={() => shiftMonth(1)}
                  className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            <div className="p-3 pt-2">
              <div className="mb-1 grid grid-cols-7 gap-0.5">
                {WEEKDAYS.map((day) => (
                  <div
                    key={day}
                    className="py-1 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70"
                  >
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-0.5">
                {cells.map((cell) => {
                  const isSelected = value === cell.iso;
                  const isToday = cell.iso === todayIso;
                  const isDisabled = minDate != null && cell.iso < minDate;

                  return (
                    <button
                      key={cell.iso}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => pick(cell.iso)}
                      className={cn(
                        "relative flex aspect-square items-center justify-center rounded-lg text-sm tabular-nums transition-all",
                        isDisabled && "cursor-not-allowed opacity-30",
                        !cell.inMonth && !isDisabled && "text-muted-foreground/35",
                        cell.inMonth && !isSelected && !isDisabled && "text-foreground hover:bg-muted/60",
                        isToday && !isSelected && !isDisabled && "font-semibold text-primary ring-1 ring-primary/25",
                        isSelected &&
                          "bg-primary font-semibold text-primary-foreground shadow-glow hover:brightness-105",
                      )}
                    >
                      {cell.date.getDate()}
                      {isToday && !isSelected && (
                        <span className="absolute bottom-1 h-1 w-1 rounded-full bg-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-2 border-t border-border/50 bg-muted/15 px-3 py-2.5">
              <button
                type="button"
                onClick={() => quickPick(minDate && minDate > todayIso ? minDate : todayIso)}
                className={cn(
                  "flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors",
                  value === todayIso || value === minDate
                    ? "bg-primary/12 text-primary"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                )}
              >
                Today
              </button>
              {(!minDate || minDate <= toISODate(new Date(Date.now() - 86400000))) && (
                <button
                  type="button"
                  onClick={() => quickPick(toISODate(new Date(Date.now() - 86400000)))}
                  className="flex-1 rounded-lg px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                >
                  Yesterday
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  setViewYear(now.getFullYear());
                  setViewMonth(now.getMonth());
                }}
                className="rounded-lg px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
              >
                This month
              </button>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-xl border border-border/50 bg-muted/25 px-3.5 py-2.5 text-left text-sm transition-[border-color,background-color,box-shadow]",
          "hover:border-border focus-visible:border-primary/30 focus-visible:bg-card focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/10",
          open && "border-primary/25 bg-card ring-[3px] ring-primary/10",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Calendar size={16} strokeWidth={2} />
        </span>
        <span className="min-w-0 flex-1">
          {value ? (
            <>
              <span className="block font-medium text-foreground">{formatDayLabel(value)}</span>
              <span className="block text-xs text-muted-foreground">{formatDate(value)}</span>
            </>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </span>
        <ChevronDown
          size={16}
          className={cn(
            "shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>

      {required && (
        <input type="hidden" value={value} required={required} tabIndex={-1} aria-hidden />
      )}

      {panel}
    </div>
  );
}
