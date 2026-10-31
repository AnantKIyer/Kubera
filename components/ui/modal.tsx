"use client";

import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { ReactNode, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSheetDrag } from "./use-sheet-drag";

const DESKTOP_DIALOG_QUERY = "(min-width: 640px)";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  /** Sticky footer — typically FormFooter or action buttons */
  footer?: ReactNode;
  className?: string;
  size?: "md" | "lg";
  /**
   * When true, dismissing (close button, backdrop, Escape, swipe) asks before
   * discarding. Pass true only while the user has unsaved input.
   */
  confirmDiscard?: boolean;
  discardTitle?: string;
  discardMessage?: string;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
  size = "md",
  confirmDiscard = false,
  discardTitle = "Discard changes?",
  discardMessage = "What you entered will be lost.",
}: ModalProps) {
  const [confirming, setConfirming] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const discardTitleId = useId();
  const discardMessageId = useId();

  const requestClose = () => {
    if (confirmDiscard) {
      setConfirming(true);
      return;
    }
    onClose();
  };

  const drag = useSheetDrag(requestClose, { disabledQuery: DESKTOP_DIALOG_QUERY });
  const resetDrag = drag.reset;

  useEffect(() => {
    if (!open) {
      setConfirming(false);
      resetDrag();
    }
  }, [open, resetDrag]);

  useEffect(() => {
    if (open && !rootRef.current?.contains(document.activeElement)) {
      dialogRef.current?.focus({ preventScroll: true });
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // A stacked modal (e.g. a picker opened from this form) handles its own Escape.
      const target = e.target instanceof Element ? e.target : null;
      if (target?.closest('[role="dialog"]') && !rootRef.current?.contains(target)) return;
      if (confirming) setConfirming(false);
      else if (confirmDiscard) setConfirming(true);
      else onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose, confirming, confirmDiscard]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={rootRef}
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-5"
    >
      <div
        className="absolute inset-0 bg-foreground/20 backdrop-blur-sm animate-fade-in dark:bg-black/50"
        onClick={requestClose}
        aria-hidden
      />
      <div
        className={cn(
          "relative z-10 w-full animate-scale-in",
          size === "lg" ? "max-w-xl" : "max-w-md",
        )}
      >
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          style={drag.style}
          className={cn(
            "relative flex w-full flex-col overflow-hidden outline-none",
            "rounded-t-[1.35rem] bg-card shadow-sheet sm:rounded-[1.25rem] sm:shadow-soft",
            "max-h-[min(92vh,720px)] supports-[height:100dvh]:max-h-[min(92dvh,720px)]",
            !drag.dragging &&
              "transition-transform duration-200 ease-spring motion-reduce:transition-none",
            className,
          )}
        >
          {/* Header — drag region on phones */}
          <div
            className="shrink-0 touch-none select-none border-b border-border/50 sm:touch-auto sm:select-auto"
            {...drag.handlers}
          >
            <div className="flex justify-center pt-2 sm:hidden" aria-hidden>
              <span className="h-[5px] w-9 rounded-full bg-muted-foreground/30" />
            </div>
            <div className="flex items-start justify-between gap-4 px-5 pb-4 pt-2 sm:pt-4">
              <div className="min-w-0 pr-2">
                <h2 id={titleId} className="text-base font-semibold tracking-tight">
                  {title}
                </h2>
                {description && (
                  <p className="mt-0.5 text-sm leading-snug text-muted-foreground">
                    {description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={requestClose}
                aria-label="Close"
                className="-mr-2 -mt-1 inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X size={18} aria-hidden />
              </button>
            </div>
          </div>

          {/* Body — scrollable */}
          <div
            className={cn(
              "flex-1 overflow-y-auto overscroll-contain px-5 py-5",
              !footer && "pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] sm:pb-5",
            )}
          >
            {children}
          </div>

          {/* Footer — sticky, clears the home indicator on phones */}
          {footer && (
            <div className="shrink-0 border-t border-border/60 bg-card px-5 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] pt-4 sm:pb-4">
              {footer}
            </div>
          )}

          {confirming && (
            <div className="absolute inset-0 z-20 flex items-end bg-foreground/10 p-3 animate-fade-in sm:items-center sm:justify-center sm:p-6 dark:bg-black/40">
              <div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby={discardTitleId}
                aria-describedby={discardMessageId}
                className="w-full rounded-2xl bg-card p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] shadow-sheet ring-1 ring-border/70 sm:max-w-sm sm:pb-4"
              >
                <p id={discardTitleId} className="text-center text-[15px] font-semibold">
                  {discardTitle}
                </p>
                <p
                  id={discardMessageId}
                  className="mt-1 text-center text-sm text-muted-foreground"
                >
                  {discardMessage}
                </p>
                <div className="mt-4 grid gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="min-h-11 rounded-xl bg-muted/70 px-4 text-sm font-semibold text-[hsl(var(--expense))] transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    Discard
                  </button>
                  <button
                    type="button"
                    autoFocus
                    onClick={() => setConfirming(false)}
                    className="min-h-11 rounded-xl bg-muted/70 px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    Keep editing
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
