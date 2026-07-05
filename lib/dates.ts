import { toISODate } from "@/lib/format";

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;

export type CalendarCell = {
  date: Date;
  iso: string;
  inMonth: boolean;
};

/** Six-row calendar grid for a given month (0-indexed). */
export function buildMonthGrid(viewYear: number, viewMonth: number): CalendarCell[] {
  const first = new Date(viewYear, viewMonth, 1);
  const startDay = first.getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: CalendarCell[] = [];

  for (let i = startDay - 1; i >= 0; i--) {
    const d = new Date(viewYear, viewMonth, -i);
    cells.push({ date: d, iso: toISODate(d), inMonth: false });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(viewYear, viewMonth, day);
    cells.push({ date: d, iso: toISODate(d), inMonth: true });
  }

  let nextDay = 1;
  while (cells.length < 42) {
    const d = new Date(viewYear, viewMonth + 1, nextDay++);
    cells.push({ date: d, iso: toISODate(d), inMonth: false });
  }

  return cells;
}

export function monthKey(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

export function shiftViewMonth(year: number, month: number, delta: number) {
  const d = new Date(year, month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}
