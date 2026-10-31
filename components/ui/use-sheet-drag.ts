"use client";

import { useCallback, useRef, useState } from "react";

const DISMISS_DISTANCE_PX = 96;
const DISMISS_VELOCITY_PX_PER_MS = 0.5;

/**
 * Drag-down-to-dismiss for bottom sheets. Spread `handlers` on the grabber/header
 * region (not the scrolling body) and apply `style` to the sheet surface.
 */
export function useSheetDrag(
  onDismiss: () => void,
  { disabledQuery }: { disabledQuery?: string } = {},
) {
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ y: number; time: number } | null>(null);

  const reset = useCallback(() => {
    start.current = null;
    setDragging(false);
    setDragY(0);
  }, []);

  const onPointerDown = (event: React.PointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    if (disabledQuery && window.matchMedia(disabledQuery).matches) return;
    if ((event.target as HTMLElement).closest("button, a, input, select, textarea")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    start.current = { y: event.clientY, time: event.timeStamp };
    setDragging(true);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLElement>) => {
    if (!start.current) return;
    setDragY(Math.max(0, event.clientY - start.current.y));
  };

  const endDrag = (event: React.PointerEvent<HTMLElement>) => {
    const origin = start.current;
    if (!origin) return;
    start.current = null;
    setDragging(false);
    const distance = Math.max(0, event.clientY - origin.y);
    const velocity = distance / Math.max(1, event.timeStamp - origin.time);
    setDragY(0);
    if (distance > DISMISS_DISTANCE_PX || velocity > DISMISS_VELOCITY_PX_PER_MS) {
      onDismiss();
    }
  };

  return {
    dragging,
    reset,
    style: dragY ? { transform: `translateY(${dragY}px)` } : undefined,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
    },
  };
}
