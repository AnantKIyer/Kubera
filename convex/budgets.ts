import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUserId } from "./lib/user";

export const listByMonth = query({
  args: { month: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const budgets = await ctx.db
      .query("budgets")
      .withIndex("by_user_month", (q) => q.eq("userId", userId).eq("month", args.month))
      .collect();

    const categories = new Map(
      (await ctx.db
        .query("categories")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect()
      ).map((c) => [c._id, c]),
    );

    const monthTx = (
      await ctx.db
        .query("transactions")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect()
    ).filter((tx) => tx.type === "expense" && tx.date.slice(0, 7) === args.month);

    const spentByCategory = new Map<string, number>();
    for (const tx of monthTx) {
      if (!tx.categoryId) continue;
      spentByCategory.set(
        tx.categoryId,
        (spentByCategory.get(tx.categoryId) ?? 0) + tx.amount,
      );
    }

    return budgets
      .map((b) => {
        const category = categories.get(b.categoryId);
        const spent = spentByCategory.get(b.categoryId) ?? 0;
        return {
          _id: b._id,
          categoryId: b.categoryId,
          month: b.month,
          amount: b.amount,
          spent,
          remaining: b.amount - spent,
          progress: b.amount > 0 ? spent / b.amount : 0,
          categoryName: category?.name ?? "Uncategorized",
          categoryColor: category?.color ?? "#94a3b8",
          categoryIcon: category?.icon ?? "circle",
        };
      })
      .sort((a, b) => b.progress - a.progress);
  },
});

export const set = mutation({
  args: {
    categoryId: v.id("categories"),
    month: v.string(),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    if (!(args.amount >= 0)) throw new Error("Budget must be zero or more");

    const category = await ctx.db.get(args.categoryId);
    if (!category || category.userId !== userId) throw new Error("Category not found");

    const existing = await ctx.db
      .query("budgets")
      .withIndex("by_user_category_month", (q) =>
        q.eq("userId", userId).eq("categoryId", args.categoryId).eq("month", args.month),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { amount: args.amount });
      return existing._id;
    }
    return await ctx.db.insert("budgets", {
      userId,
      categoryId: args.categoryId,
      month: args.month,
      amount: args.amount,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("budgets") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const current = await ctx.db.get(args.id);
    if (!current || current.userId !== userId) throw new Error("Budget not found");
    await ctx.db.delete(args.id);
  },
});
