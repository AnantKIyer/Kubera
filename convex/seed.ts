import { mutation } from "./_generated/server";
import { requireUserId } from "./lib/user";

const DEFAULT_CATEGORIES: {
  name: string;
  type: "income" | "expense";
  color: string;
  icon: string;
  kind?: "regular" | "investment" | "subscription" | "emi";
}[] = [
  { name: "Salary", type: "income", color: "#6b9080", icon: "briefcase" },
  { name: "Freelance", type: "income", color: "#7d9d85", icon: "laptop" },
  { name: "Investments", type: "income", color: "#84a98c", icon: "trending-up", kind: "investment" },
  { name: "Gifts", type: "income", color: "#a4c3b2", icon: "gift" },
  { name: "Other Income", type: "income", color: "#b5c9bc", icon: "plus-circle" },
  { name: "Food & Dining", type: "expense", color: "#c9a88a", icon: "utensils" },
  { name: "Groceries", type: "expense", color: "#d4b896", icon: "shopping-cart" },
  { name: "Shopping", type: "expense", color: "#c4a4a4", icon: "shopping-bag" },
  { name: "Transport", type: "expense", color: "#9bb5c4", icon: "car" },
  { name: "Housing & Rent", type: "expense", color: "#a8a4c4", icon: "home" },
  { name: "Bills & Utilities", type: "expense", color: "#94a7b8", icon: "receipt" },
  { name: "Subscriptions", type: "expense", color: "#b0a4c4", icon: "wifi", kind: "subscription" },
  { name: "Loans & EMI", type: "expense", color: "#9a94b8", icon: "landmark", kind: "emi" },
  { name: "Investments", type: "expense", color: "#7a9e8e", icon: "piggy-bank", kind: "investment" },
  { name: "Entertainment", type: "expense", color: "#c49a9a", icon: "clapperboard" },
  { name: "Health", type: "expense", color: "#c4a0a0", icon: "heart-pulse" },
  { name: "Education", type: "expense", color: "#94a3b8", icon: "graduation-cap" },
  { name: "Travel", type: "expense", color: "#8fb3c4", icon: "plane" },
  { name: "Other Expense", type: "expense", color: "#b8c0c8", icon: "circle-dashed" },
];

/** Seed default categories for the signed-in user (idempotent). */
export const seedDefaults = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const existing = await ctx.db
      .query("categories")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    if (existing.length === 0) {
      for (const category of DEFAULT_CATEGORIES) {
        await ctx.db.insert("categories", { userId, ...category, isDefault: true });
      }
      return { seeded: true, added: DEFAULT_CATEGORIES.length };
    }

    const names = new Set(existing.map((c) => `${c.type}:${c.name.toLowerCase()}`));
    let added = 0;
    for (const category of DEFAULT_CATEGORIES) {
      const key = `${category.type}:${category.name.toLowerCase()}`;
      if (names.has(key)) continue;
      await ctx.db.insert("categories", { userId, ...category, isDefault: true });
      added++;
    }
    return { seeded: false, added };
  },
});
