"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings, X } from "lucide-react";
import { MOBILE_MORE_NAV, isNavActive } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useSheetDrag } from "@/components/ui/use-sheet-drag";

interface MobileMoreSheetProps {
  open: boolean;
  onClose: () => void;
}

export function MobileMoreSheet({ open, onClose }: MobileMoreSheetProps) {
  const pathname = usePathname();
  const drag = useSheetDrag(onClose);
  const resetDrag = drag.reset;

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) resetDrag();
  }, [open, resetDrag]);

  if (!open || typeof document === "undefined") return null;

  const items = [
    ...MOBILE_MORE_NAV,
    { href: "/settings", label: "Account", icon: Settings },
  ];

  return createPortal(
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        aria-label="Close menu"
        className="absolute inset-0 bg-background/80 animate-fade-in"
        onClick={onClose}
      />
      <div className="absolute inset-x-0 bottom-0 animate-slide-up">
        <div
          role="dialog"
          aria-modal="true"
          aria-label="More navigation"
          style={drag.style}
          className={cn(
            "rounded-t-[24px] border border-border/60 bg-card pb-safe shadow-sheet",
            !drag.dragging && "transition-transform duration-200 ease-spring motion-reduce:transition-none",
          )}
        >
          <div
            className="cursor-grab touch-none select-none active:cursor-grabbing"
            {...drag.handlers}
          >
            <div className="flex justify-center pt-2" aria-hidden>
              <span className="h-[5px] w-9 rounded-full bg-muted-foreground/30" />
            </div>
            <div className="flex items-center justify-between border-b border-border/60 py-1.5 pl-5 pr-3">
              <h2 className="text-base font-semibold">More</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X size={18} aria-hidden />
              </button>
            </div>
          </div>
          <nav className="grid gap-1 px-3 py-3">
            {items.map((item) => {
              const active = isNavActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:bg-muted/60",
                  )}
                >
                  <Icon size={18} className="shrink-0 opacity-80" aria-hidden />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>,
    document.body,
  );
}
