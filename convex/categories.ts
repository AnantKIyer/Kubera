import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { categoryKind } from "./schema";
import { requireUserId } from "./lib/user";

export const list = query({
  args: {
    type: v.optional(v.union(v.literal("income"), v.literal("expense"))),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const categories = args.type
      ? await ctx.db
          .query("categories")
          .withIndex("by_user_type", (q) => q.eq("userId", userId).eq("type", args.type!))
          .collect()
      : await ctx.db
          .query("categories")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .collect();

    return categories.sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    type: v.union(v.literal("income"), v.literal("expense")),
    color: v.string(),
    icon: v.string(),
    kind: v.optional(categoryKind),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const name = args.name.trim();
    if (!name) throw new Error("Category name is required");

    const existing = await ctx.db
      .query("categories")
      .withIndex("by_user_type", (q) => q.eq("userId", userId).eq("type", args.type))
      .collect();
    if (existing.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      throw new Error(`A ${args.type} category named "${name}" already exists`);
    }

    return await ctx.db.insert("categories", {
      userId,
      name,
      type: args.type,
      color: args.color,
      icon: args.icon,
      kind: args.kind ?? "regular",
      isDefault: false,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("categories"),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
    icon: v.optional(v.string()),
    kind: v.optional(categoryKind),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const current = await ctx.db.get(args.id);
    if (!current || current.userId !== userId) throw new Error("Category not found");

    const { id, ...rest } = args;
    const patch: Record<string, unknown> = {};
    if (rest.name !== undefined) patch.name = rest.name.trim();
    if (rest.color !== undefined) patch.color = rest.color;
    if (rest.icon !== undefined) patch.icon = rest.icon;
    if (rest.kind !== undefined) patch.kind = rest.kind;
    await ctx.db.patch(id, patch);
  },
});

export const remove = mutation({
  args: { id: v.id("categories") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const current = await ctx.db.get(args.id);
    if (!current || current.userId !== userId) throw new Error("Category not found");

    const linked = await ctx.db
      .query("transactions")
      .withIndex("by_user_category", (q) =>
        q.eq("userId", userId).eq("categoryId", args.id),
      )
      .collect();
    for (const tx of linked) {
      await ctx.db.patch(tx._id, { categoryId: undefined });
    }

    const budgets = await ctx.db
      .query("budgets")
      .withIndex("by_user_category_month", (q) =>
        q.eq("userId", userId).eq("categoryId", args.id),
      )
      .collect();
    for (const b of budgets) {
      await ctx.db.delete(b._id);
    }

    await ctx.db.delete(args.id);
  },
});
