import { v } from "convex/values";
import { action } from "./_generated/server";

const BASE_CURRENCY = "INR";

type FrankfurterResponse = {
  amount: number;
  base: string;
  date: string;
  rates: Record<string, number>;
};

export const getExchangeRate = action({
  args: {
    from: v.string(),
    to: v.optional(v.string()),
    /** YYYY-MM-DD — uses historical ECB rate when provided */
    date: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const from = args.from.toUpperCase();
    const to = (args.to ?? BASE_CURRENCY).toUpperCase();

    if (from === to) {
      return { rate: 1, date: args.date ?? new Date().toISOString().slice(0, 10) };
    }

    const path = args.date ? args.date : "latest";
    const url = `https://api.frankfurter.app/${path}?from=${from}&to=${to}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Could not fetch exchange rate. Try again in a moment.");
    }

    const data = (await response.json()) as FrankfurterResponse;
    const rate = data.rates[to];
    if (!rate) {
      throw new Error(`Exchange rate unavailable for ${from} → ${to}.`);
    }

    return { rate, date: data.date };
  },
});
