import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { action, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

const BASE_CURRENCY = "INR";
const ALLOWED = new Set([
  "INR",
  "USD",
  "EUR",
  "GBP",
  "AED",
  "SGD",
  "CAD",
  "AUD",
  "JPY",
  "CHF",
]);
/** Cache TTL for "latest" quotes (historical dated quotes are immutable). */
const LATEST_TTL_MS = 60 * 60 * 1000;

type FrankfurterResponse = {
  amount: number;
  base: string;
  date: string;
  rates: Record<string, number>;
};

const dateRe = /^\d{4}-\d{2}-\d{2}$/;

function assertCurrency(code: string, label: string) {
  if (!ALLOWED.has(code)) {
    throw new Error(`Unsupported ${label} currency: ${code}`);
  }
}

export const getCachedRate = internalQuery({
  args: {
    from: v.string(),
    to: v.string(),
    requestDate: v.string(),
  },
  handler: async (ctx, { from, to, requestDate }) => {
    return ctx.db
      .query("exchangeRates")
      .withIndex("by_pair_request", (q) =>
        q.eq("from", from).eq("to", to).eq("requestDate", requestDate),
      )
      .unique();
  },
});

export const upsertCachedRate = internalMutation({
  args: {
    from: v.string(),
    to: v.string(),
    requestDate: v.string(),
    rate: v.number(),
    rateDate: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("exchangeRates")
      .withIndex("by_pair_request", (q) =>
        q.eq("from", args.from).eq("to", args.to).eq("requestDate", args.requestDate),
      )
      .unique();
    const payload = {
      from: args.from,
      to: args.to,
      requestDate: args.requestDate,
      rate: args.rate,
      rateDate: args.rateDate,
      fetchedAt: Date.now(),
    };
    if (existing) {
      await ctx.db.patch(existing._id, payload);
      return existing._id;
    }
    return await ctx.db.insert("exchangeRates", payload);
  },
});

export const getExchangeRate = action({
  args: {
    from: v.string(),
    to: v.optional(v.string()),
    /** YYYY-MM-DD — uses historical ECB rate when provided */
    date: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ rate: number; date: string }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const from = args.from.trim().toUpperCase();
    const to = (args.to ?? BASE_CURRENCY).trim().toUpperCase();
    assertCurrency(from, "from");
    assertCurrency(to, "to");

    if (args.date && !dateRe.test(args.date)) {
      throw new Error("Date must be YYYY-MM-DD");
    }

    if (from === to) {
      return { rate: 1, date: args.date ?? new Date().toISOString().slice(0, 10) };
    }

    const requestDate = args.date ?? "latest";
    const cached = (await ctx.runQuery(internal.currency.getCachedRate, {
      from,
      to,
      requestDate,
    })) as {
      rate: number;
      rateDate: string;
      fetchedAt: number;
    } | null;

    const cacheFresh =
      cached != null &&
      (requestDate !== "latest" || Date.now() - cached.fetchedAt < LATEST_TTL_MS);

    if (cacheFresh && cached) {
      return { rate: cached.rate, date: cached.rateDate };
    }

    const path = encodeURIComponent(requestDate === "latest" ? "latest" : requestDate);
    const url = `https://api.frankfurter.app/${path}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Could not fetch exchange rate. Try again in a moment.");
    }

    const data = (await response.json()) as FrankfurterResponse;
    const rate = data.rates[to];
    if (typeof rate !== "number") {
      throw new Error(`Exchange rate unavailable for ${from} → ${to}.`);
    }

    await ctx.runMutation(internal.currency.upsertCachedRate, {
      from,
      to,
      requestDate,
      rate,
      rateDate: data.date,
    });

    return { rate, date: data.date };
  },
});
