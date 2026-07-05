import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { billingCycle } from "./schema";
import { requireUserId } from "./lib/user";
import { addBillingPeriod, type BillingCycle } from "./lib/subscriptionDates";

export function monthlyEquivalent(
  amount: number,
  cycle: BillingCycle,
): number {
  switch (cycle) {
    case "monthly":
      return amount;
    case "quarterly":
      return amount / 3;
    case "half-yearly":
      return amount / 6;
    case "yearly":
      return amount / 12;
  }
}

export const list = query({
  args: { activeOnly: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    let rows = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    if (args.activeOnly) rows = rows.filter((s) => s.isActive);

    const categories = new Map(
      (await ctx.db
        .query("categories")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect()
      ).map((c) => [c._id, c]),
    );
    const accounts = new Map(
      (await ctx.db
        .query("accounts")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect()
      ).map((a) => [a._id, a]),
    );

    return rows
      .map((s) => {
        const category = s.categoryId ? categories.get(s.categoryId) : undefined;
        const account = s.accountId ? accounts.get(s.accountId) : undefined;
        const monthly = monthlyEquivalent(s.amount, s.billingCycle);
        return {
          ...s,
          monthlyEquivalent: monthly,
          yearlyEquivalent: monthly * 12,
          categoryName: category?.name ?? null,
          categoryColor: category?.color ?? null,
          accountName: account?.name ?? null,
          accountColor: account?.color ?? null,
        };
      })
      .sort((a, b) => b.monthlyEquivalent - a.monthlyEquivalent);
  },
});

export const summary = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const active = (
      await ctx.db
        .query("subscriptions")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect()
    ).filter((s) => s.isActive);

    let monthlyTotal = 0;
    for (const s of active) {
      monthlyTotal += monthlyEquivalent(s.amount, s.billingCycle);
    }
    return {
      count: active.length,
      monthlyTotal,
      yearlyTotal: monthlyTotal * 12,
    };
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    amount: v.number(),
    billingCycle: billingCycle,
    categoryId: v.optional(v.id("categories")),
    accountId: v.optional(v.id("accounts")),
    nextRenewalDate: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    if (!(args.amount > 0)) throw new Error("Amount must be greater than 0");
    return await ctx.db.insert("subscriptions", {
      userId,
      name: args.name.trim(),
      amount: args.amount,
      billingCycle: args.billingCycle,
      categoryId: args.categoryId,
      accountId: args.accountId,
      nextRenewalDate: args.nextRenewalDate,
      isActive: true,
      notes: args.notes?.trim() || undefined,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("subscriptions"),
    name: v.optional(v.string()),
    amount: v.optional(v.number()),
    billingCycle: v.optional(billingCycle),
    categoryId: v.optional(v.union(v.id("categories"), v.null())),
    accountId: v.optional(v.union(v.id("accounts"), v.null())),
    nextRenewalDate: v.optional(v.union(v.string(), v.null())),
    isActive: v.optional(v.boolean()),
    notes: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const current = await ctx.db.get(args.id);
    if (!current || current.userId !== userId) throw new Error("Subscription not found");

    const { id, ...rest } = args;
    const patch: Record<string, unknown> = {};
    if (rest.name !== undefined) patch.name = rest.name.trim();
    if (rest.amount !== undefined) {
      if (!(rest.amount > 0)) throw new Error("Amount must be greater than 0");
      patch.amount = rest.amount;
    }
    if (rest.billingCycle !== undefined) patch.billingCycle = rest.billingCycle;
    if (rest.categoryId !== undefined) patch.categoryId = rest.categoryId ?? undefined;
    if (rest.accountId !== undefined) patch.accountId = rest.accountId ?? undefined;
    if (rest.nextRenewalDate !== undefined) {
      patch.nextRenewalDate = rest.nextRenewalDate ?? undefined;
    }
    if (rest.isActive !== undefined) patch.isActive = rest.isActive;
    if (rest.notes !== undefined) patch.notes = rest.notes?.trim() || undefined;
    await ctx.db.patch(id, patch);
  },
});

export const remove = mutation({
  args: { id: v.id("subscriptions") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const current = await ctx.db.get(args.id);
    if (!current || current.userId !== userId) throw new Error("Subscription not found");
    await ctx.db.delete(args.id);
  },
});

/** Advance renewal from a recorded payment date */
export const recordPayment = mutation({
  args: {
    id: v.id("subscriptions"),
    paymentDate: v.string(),
    amount: v.optional(v.number()),
    accountId: v.optional(v.union(v.id("accounts"), v.null())),
    categoryId: v.optional(v.union(v.id("categories"), v.null())),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const sub = await ctx.db.get(args.id);
    if (!sub || sub.userId !== userId) throw new Error("Subscription not found");

    const patch: Record<string, unknown> = {
      nextRenewalDate: addBillingPeriod(args.paymentDate, sub.billingCycle),
      isActive: true,
    };
    if (args.amount !== undefined && args.amount > 0) patch.amount = args.amount;
    if (args.accountId !== undefined) patch.accountId = args.accountId ?? undefined;
    if (args.categoryId !== undefined) patch.categoryId = args.categoryId ?? undefined;

    await ctx.db.patch(args.id, patch);
    return { nextRenewalDate: patch.nextRenewalDate as string };
  },
});
