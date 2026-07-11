import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { investmentType } from "./schema";
import { requireUserId } from "./lib/user";
import {
  decryptAccounts,
  decryptInvestments,
  encryptInvestmentFields,
} from "./lib/sensitiveFields";

function portfolioValue(investedAmount: number, currentValue?: number | null): number {
  return currentValue ?? investedAmount;
}

export const list = query({
  args: {
    activeOnly: v.optional(v.boolean()),
    type: v.optional(investmentType),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    let rows = args.type
      ? await ctx.db
          .query("investments")
          .withIndex("by_user_type", (q) =>
            q.eq("userId", userId).eq("investmentType", args.type!),
          )
          .collect()
      : await ctx.db
          .query("investments")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .collect();

    if (args.activeOnly) rows = rows.filter((row) => row.isActive);

    const accounts = new Map(
      (await decryptAccounts(
        await ctx.db
          .query("accounts")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .collect(),
      )).map((a) => [a._id, a]),
    );

    const decryptedRows = await decryptInvestments(rows);

    return decryptedRows
      .map((row) => {
        const account = row.accountId ? accounts.get(row.accountId) : undefined;
        const value = portfolioValue(row.investedAmount, row.currentValue);
        return {
          ...row,
          portfolioValue: value,
          gain: value - row.investedAmount,
          accountName: account?.name ?? null,
          accountColor: account?.color ?? null,
        };
      })
      .sort((a, b) => b.portfolioValue - a.portfolioValue);
  },
});

export const summary = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const active = (
      await ctx.db
        .query("investments")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect()
    ).filter((row) => row.isActive);

    let totalInvested = 0;
    let totalCurrentValue = 0;
    let monthlyContribution = 0;
    const byType: Record<string, { count: number; invested: number; value: number }> = {};

    for (const row of active) {
      const value = portfolioValue(row.investedAmount, row.currentValue);
      totalInvested += row.investedAmount;
      totalCurrentValue += value;
      if (row.monthlyAmount != null) monthlyContribution += row.monthlyAmount;

      const bucket = byType[row.investmentType] ?? { count: 0, invested: 0, value: 0 };
      bucket.count += 1;
      bucket.invested += row.investedAmount;
      bucket.value += value;
      byType[row.investmentType] = bucket;
    }

    return {
      count: active.length,
      totalInvested,
      totalCurrentValue,
      totalGain: totalCurrentValue - totalInvested,
      monthlyContribution,
      byType,
    };
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    investmentType: investmentType,
    investedAmount: v.number(),
    currentValue: v.optional(v.number()),
    accountId: v.optional(v.id("accounts")),
    monthlyAmount: v.optional(v.number()),
    startDate: v.optional(v.string()),
    maturityDate: v.optional(v.string()),
    interestRate: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const name = args.name.trim();
    if (!name) throw new Error("Investment name is required");
    if (!(args.investedAmount >= 0)) throw new Error("Invested amount cannot be negative");
    if (args.currentValue != null && args.currentValue < 0) {
      throw new Error("Current value cannot be negative");
    }
    if (args.monthlyAmount != null && !(args.monthlyAmount > 0)) {
      throw new Error("Monthly amount must be greater than 0");
    }
    if (args.interestRate != null && args.interestRate < 0) {
      throw new Error("Interest rate cannot be negative");
    }

    if (args.accountId) {
      const account = await ctx.db.get(args.accountId);
      if (!account || account.userId !== userId) throw new Error("Account not found");
    }

    const sensitive = await encryptInvestmentFields({
      name,
      notes: args.notes?.trim() || null,
    });

    return await ctx.db.insert("investments", {
      userId,
      name: sensitive.name!,
      investmentType: args.investmentType,
      investedAmount: args.investedAmount,
      currentValue: args.currentValue,
      accountId: args.accountId,
      monthlyAmount: args.monthlyAmount,
      startDate: args.startDate,
      maturityDate: args.maturityDate,
      interestRate: args.interestRate,
      isActive: true,
      notes: sensitive.notes,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("investments"),
    name: v.optional(v.string()),
    investmentType: v.optional(investmentType),
    investedAmount: v.optional(v.number()),
    currentValue: v.optional(v.union(v.number(), v.null())),
    accountId: v.optional(v.union(v.id("accounts"), v.null())),
    monthlyAmount: v.optional(v.union(v.number(), v.null())),
    startDate: v.optional(v.union(v.string(), v.null())),
    maturityDate: v.optional(v.union(v.string(), v.null())),
    interestRate: v.optional(v.union(v.number(), v.null())),
    isActive: v.optional(v.boolean()),
    notes: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const current = await ctx.db.get(args.id);
    if (!current || current.userId !== userId) throw new Error("Investment not found");

    const { id, ...rest } = args;
    const patch: Record<string, unknown> = {};

    if (rest.name !== undefined) {
      const sensitive = await encryptInvestmentFields({ name: rest.name.trim() });
      patch.name = sensitive.name;
    }
    if (rest.investmentType !== undefined) patch.investmentType = rest.investmentType;
    if (rest.investedAmount !== undefined) {
      if (!(rest.investedAmount >= 0)) throw new Error("Invested amount cannot be negative");
      patch.investedAmount = rest.investedAmount;
    }
    if (rest.currentValue !== undefined) {
      if (rest.currentValue != null && rest.currentValue < 0) {
        throw new Error("Current value cannot be negative");
      }
      patch.currentValue = rest.currentValue ?? undefined;
    }
    if (rest.accountId !== undefined) {
      if (rest.accountId) {
        const account = await ctx.db.get(rest.accountId);
        if (!account || account.userId !== userId) throw new Error("Account not found");
      }
      patch.accountId = rest.accountId ?? undefined;
    }
    if (rest.monthlyAmount !== undefined) {
      if (rest.monthlyAmount != null && !(rest.monthlyAmount > 0)) {
        throw new Error("Monthly amount must be greater than 0");
      }
      patch.monthlyAmount = rest.monthlyAmount ?? undefined;
    }
    if (rest.startDate !== undefined) patch.startDate = rest.startDate ?? undefined;
    if (rest.maturityDate !== undefined) patch.maturityDate = rest.maturityDate ?? undefined;
    if (rest.interestRate !== undefined) {
      if (rest.interestRate != null && rest.interestRate < 0) {
        throw new Error("Interest rate cannot be negative");
      }
      patch.interestRate = rest.interestRate ?? undefined;
    }
    if (rest.isActive !== undefined) patch.isActive = rest.isActive;
    if (rest.notes !== undefined) {
      const sensitive = await encryptInvestmentFields({ notes: rest.notes?.trim() || null });
      patch.notes = sensitive.notes;
    }

    await ctx.db.patch(id, patch);
  },
});

export const remove = mutation({
  args: { id: v.id("investments") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const current = await ctx.db.get(args.id);
    if (!current || current.userId !== userId) throw new Error("Investment not found");
    await ctx.db.delete(args.id);
  },
});
