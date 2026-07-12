import { Doc, Id } from "../_generated/dataModel";
import { QueryCtx } from "../_generated/server";

export const DEFAULT_TX_LIMIT = 100;
export const MAX_TX_LIMIT = 500;
/** Cap for description search scans (newest-first). */
export const MAX_TX_SEARCH_SCAN = 800;

export function clampTxLimit(limit?: number): number {
  if (limit == null) return DEFAULT_TX_LIMIT;
  return Math.min(Math.max(Math.floor(limit), 1), MAX_TX_LIMIT);
}

/** First day of YYYY-MM. */
export function monthStart(month: string): string {
  return `${month}-01`;
}

/** Last calendar day of YYYY-MM as YYYY-MM-DD. */
export function monthEnd(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  return `${month}-${String(last).padStart(2, "0")}`;
}

export function shiftMonthKey(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function currentMonthKey(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/** Inclusive date-range load via by_user_date (avoids full-history collect). */
export async function loadTransactionsInDateRange(
  ctx: QueryCtx,
  userId: Id<"users">,
  startDate: string,
  endDate: string,
): Promise<Doc<"transactions">[]> {
  return ctx.db
    .query("transactions")
    .withIndex("by_user_date", (q) =>
      q.eq("userId", userId).gte("date", startDate).lte("date", endDate),
    )
    .collect();
}

/**
 * Newest-first page of transactions.
 * Prefers by_user_date; uses by_user_type_date when type is set.
 */
export async function loadRecentTransactions(
  ctx: QueryCtx,
  userId: Id<"users">,
  opts: {
    limit: number;
    type?: "income" | "expense";
    startDate?: string;
    endDate?: string;
    accountId?: Id<"accounts">;
    categoryId?: Id<"categories">;
  },
): Promise<Doc<"transactions">[]> {
  const { limit, type, startDate, endDate, accountId, categoryId } = opts;

  let rows: Doc<"transactions">[];

  if (type) {
    let q = ctx.db
      .query("transactions")
      .withIndex("by_user_type_date", (idx) => {
        const base = idx.eq("userId", userId).eq("type", type);
        if (startDate && endDate) return base.gte("date", startDate).lte("date", endDate);
        if (startDate) return base.gte("date", startDate);
        if (endDate) return base.lte("date", endDate);
        return base;
      })
      .order("desc");
    rows = await q.take(limit);
  } else if (startDate || endDate) {
    rows = await ctx.db
      .query("transactions")
      .withIndex("by_user_date", (idx) => {
        const base = idx.eq("userId", userId);
        if (startDate && endDate) return base.gte("date", startDate).lte("date", endDate);
        if (startDate) return base.gte("date", startDate);
        return base.lte("date", endDate!);
      })
      .order("desc")
      .take(limit);
  } else {
    rows = await ctx.db
      .query("transactions")
      .withIndex("by_user_date", (idx) => idx.eq("userId", userId))
      .order("desc")
      .take(limit);
  }

  if (accountId) rows = rows.filter((tx) => tx.accountId === accountId);
  if (categoryId) rows = rows.filter((tx) => tx.categoryId === categoryId);

  rows.sort((a, b) =>
    a.date === b.date ? b._creationTime - a._creationTime : b.date < a.date ? -1 : 1,
  );

  return rows.slice(0, limit);
}
