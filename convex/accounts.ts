import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { accountType } from "./schema";
import { requireUserId } from "./lib/user";
import {
  creditAvailable,
  creditUtilizationPct,
  creditUtilized,
} from "./lib/credit";

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function computeUsage(
  accountId: string,
  accountType: string,
  creditLimit: number | undefined,
  initialUtilized: number | undefined,
  transactions: { accountId?: string; type: string; amount: number; date: string }[],
  month: string,
) {
  let totalExpense = 0;
  let totalIncome = 0;
  let monthExpense = 0;
  let monthIncome = 0;

  for (const tx of transactions) {
    if (tx.accountId !== accountId) continue;
    if (tx.type === "expense") {
      totalExpense += tx.amount;
      if (tx.date.slice(0, 7) === month) monthExpense += tx.amount;
    } else {
      totalIncome += tx.amount;
      if (tx.date.slice(0, 7) === month) monthIncome += tx.amount;
    }
  }

  if (accountType === "credit") {
    const utilized = creditUtilized(initialUtilized, totalExpense, totalIncome);
    const available = creditAvailable(creditLimit, utilized);
    return {
      totalExpense,
      totalIncome,
      monthExpense,
      monthIncome,
      utilized,
      available,
      creditLimit: creditLimit ?? null,
      utilizationPct: creditUtilizationPct(creditLimit, utilized),
    };
  }

  return {
    totalExpense,
    totalIncome,
    monthExpense,
    monthIncome,
    net: totalIncome - totalExpense,
    monthNet: monthIncome - monthExpense,
  };
}

function enrichAccount(
  acc: Doc<"accounts">,
  banksById: Map<string, Doc<"accounts">>,
) {
  const linkedBank = acc.linkedBankAccountId
    ? banksById.get(acc.linkedBankAccountId)
    : undefined;
  return {
    ...acc,
    linkedBankName: linkedBank?.name ?? null,
    linkedBankColor: linkedBank?.color ?? null,
  };
}

async function validateLinkedBank(
  ctx: { db: { get: (id: Id<"accounts">) => Promise<Doc<"accounts"> | null> } },
  userId: Id<"users">,
  linkedBankAccountId: Id<"accounts"> | undefined | null,
  type: string,
  selfId?: Id<"accounts">,
) {
  if (linkedBankAccountId == null) return;
  if (type !== "debit" && type !== "wallet") {
    throw new Error("Only debit cards and UPI wallets can link to a bank");
  }
  if (selfId && linkedBankAccountId === selfId) {
    throw new Error("An account cannot link to itself");
  }
  const bank = await ctx.db.get(linkedBankAccountId);
  if (!bank || bank.userId !== userId || bank.type !== "bank") {
    throw new Error("Choose a valid bank account to link");
  }
}

function normalizeAccountFields(type: string, fields: {
  creditLimit?: number;
  currentBalance?: number;
  linkedBankAccountId?: Id<"accounts">;
  initialUtilized?: number;
}) {
  if (type === "bank") {
    return {
      creditLimit: undefined,
      linkedBankAccountId: undefined,
      currentBalance: fields.currentBalance,
      initialUtilized: undefined,
    };
  }
  if (type === "credit") {
    return {
      currentBalance: undefined,
      linkedBankAccountId: undefined,
      creditLimit: fields.creditLimit,
      initialUtilized: fields.initialUtilized,
    };
  }
  if (type === "debit" || type === "wallet") {
    return {
      creditLimit: undefined,
      currentBalance: undefined,
      linkedBankAccountId: fields.linkedBankAccountId,
      initialUtilized: undefined,
    };
  }
  return fields;
}

export const list = query({
  args: {
    type: v.optional(accountType),
    activeOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    let rows = args.type
      ? await ctx.db
          .query("accounts")
          .withIndex("by_user_type", (q) => q.eq("userId", userId).eq("type", args.type!))
          .collect()
      : await ctx.db
          .query("accounts")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .collect();

    if (args.activeOnly) rows = rows.filter((a) => a.isActive !== false);

    const banksById = new Map(
      rows.filter((a) => a.type === "bank").map((b) => [b._id, b]),
    );

    return rows
      .map((acc) => enrichAccount(acc, banksById))
      .sort((a, b) => a.name.localeCompare(b.name));
  },
});

/** Accounts with computed spend / credit utilization from transactions */
export const listWithUsage = query({
  args: {
    type: v.optional(accountType),
    activeOnly: v.optional(v.boolean()),
    month: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const month = args.month ?? currentMonthKey();

    let rows = args.type
      ? await ctx.db
          .query("accounts")
          .withIndex("by_user_type", (q) => q.eq("userId", userId).eq("type", args.type!))
          .collect()
      : await ctx.db
          .query("accounts")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .collect();

    if (args.activeOnly) rows = rows.filter((a) => a.isActive !== false);

    const banksById = new Map(
      rows.filter((a) => a.type === "bank").map((b) => [b._id, b]),
    );

    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    return rows
      .map((acc) => ({
        ...enrichAccount(acc, banksById),
        usage: computeUsage(
          acc._id,
          acc.type,
          acc.creditLimit,
          acc.initialUtilized,
          transactions,
          month,
        ),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    type: accountType,
    institution: v.optional(v.string()),
    lastFour: v.optional(v.string()),
    color: v.string(),
    creditLimit: v.optional(v.number()),
    currentBalance: v.optional(v.number()),
    linkedBankAccountId: v.optional(v.id("accounts")),
    initialUtilized: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const name = args.name.trim();
    if (!name) throw new Error("Account name is required");
    if (args.lastFour && !/^\d{4}$/.test(args.lastFour)) {
      throw new Error("Last four digits must be exactly 4 numbers");
    }
    if (args.type === "credit" && args.creditLimit != null && !(args.creditLimit > 0)) {
      throw new Error("Credit limit must be greater than 0");
    }
    if (args.type === "bank" && args.currentBalance != null && args.currentBalance < 0) {
      throw new Error("Current balance cannot be negative");
    }
    if (args.type === "credit" && args.initialUtilized != null && args.initialUtilized < 0) {
      throw new Error("Amount already used cannot be negative");
    }
    if (
      args.type === "credit" &&
      args.creditLimit != null &&
      args.initialUtilized != null &&
      args.initialUtilized > args.creditLimit
    ) {
      throw new Error("Amount already used cannot exceed the credit limit");
    }

    await validateLinkedBank(ctx, userId, args.linkedBankAccountId, args.type);

    const normalized = normalizeAccountFields(args.type, {
      creditLimit: args.creditLimit,
      currentBalance: args.currentBalance,
      linkedBankAccountId: args.linkedBankAccountId,
      initialUtilized: args.initialUtilized,
    });

    return await ctx.db.insert("accounts", {
      userId,
      name,
      type: args.type,
      institution: args.institution?.trim() || undefined,
      lastFour: args.lastFour || undefined,
      color: args.color,
      creditLimit: normalized.creditLimit,
      currentBalance: normalized.currentBalance,
      linkedBankAccountId: normalized.linkedBankAccountId,
      initialUtilized: normalized.initialUtilized,
      isActive: true,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("accounts"),
    name: v.optional(v.string()),
    type: v.optional(accountType),
    institution: v.optional(v.union(v.string(), v.null())),
    lastFour: v.optional(v.union(v.string(), v.null())),
    color: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    creditLimit: v.optional(v.union(v.number(), v.null())),
    currentBalance: v.optional(v.union(v.number(), v.null())),
    linkedBankAccountId: v.optional(v.union(v.id("accounts"), v.null())),
    initialUtilized: v.optional(v.union(v.number(), v.null())),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const current = await ctx.db.get(args.id);
    if (!current || current.userId !== userId) throw new Error("Account not found");

    const nextType = (args.type ?? current.type) as string;
    const { id, ...rest } = args;
    const patch: Record<string, unknown> = {};

    if (rest.name !== undefined) patch.name = rest.name.trim();
    if (rest.type !== undefined) patch.type = rest.type;
    if (rest.institution !== undefined) {
      patch.institution = rest.institution?.trim() || undefined;
    }
    if (rest.lastFour !== undefined) {
      if (rest.lastFour && !/^\d{4}$/.test(rest.lastFour)) {
        throw new Error("Last four digits must be exactly 4 numbers");
      }
      patch.lastFour = rest.lastFour || undefined;
    }
    if (rest.color !== undefined) patch.color = rest.color;
    if (rest.isActive !== undefined) patch.isActive = rest.isActive;

    const mergedCreditLimit =
      rest.creditLimit !== undefined ? rest.creditLimit : current.creditLimit;
    const mergedBalance =
      rest.currentBalance !== undefined ? rest.currentBalance : current.currentBalance;
    const mergedLinked =
      rest.linkedBankAccountId !== undefined
        ? rest.linkedBankAccountId
        : current.linkedBankAccountId;
    const mergedInitialUtilized =
      rest.initialUtilized !== undefined ? rest.initialUtilized : current.initialUtilized;

    if (rest.creditLimit !== undefined) {
      const limit = rest.creditLimit;
      if (limit != null && !(limit > 0)) throw new Error("Credit limit must be greater than 0");
    }
    if (rest.currentBalance !== undefined && rest.currentBalance != null && rest.currentBalance < 0) {
      throw new Error("Current balance cannot be negative");
    }
    if (
      rest.initialUtilized !== undefined &&
      rest.initialUtilized != null &&
      rest.initialUtilized < 0
    ) {
      throw new Error("Amount already used cannot be negative");
    }
    const nextLimit = (mergedCreditLimit ?? undefined) as number | undefined;
    const nextInitial = (mergedInitialUtilized ?? undefined) as number | undefined;
    if (
      nextType === "credit" &&
      nextLimit != null &&
      nextInitial != null &&
      nextInitial > nextLimit
    ) {
      throw new Error("Amount already used cannot exceed the credit limit");
    }

    const linkedId = mergedLinked ?? undefined;
    await validateLinkedBank(ctx, userId, linkedId, nextType, id);

    const normalized = normalizeAccountFields(nextType, {
      creditLimit: mergedCreditLimit ?? undefined,
      currentBalance: mergedBalance ?? undefined,
      linkedBankAccountId: linkedId,
      initialUtilized: mergedInitialUtilized ?? undefined,
    });

    patch.creditLimit = normalized.creditLimit;
    patch.currentBalance = normalized.currentBalance;
    patch.linkedBankAccountId = normalized.linkedBankAccountId;
    patch.initialUtilized = normalized.initialUtilized;

    await ctx.db.patch(id, patch);
  },
});

export const remove = mutation({
  args: { id: v.id("accounts") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const current = await ctx.db.get(args.id);
    if (!current || current.userId !== userId) throw new Error("Account not found");

    const allAccounts = await ctx.db
      .query("accounts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const acc of allAccounts) {
      if (acc.linkedBankAccountId === args.id) {
        await ctx.db.patch(acc._id, { linkedBankAccountId: undefined });
      }
    }

    const linked = await ctx.db
      .query("transactions")
      .withIndex("by_user_account", (q) =>
        q.eq("userId", userId).eq("accountId", args.id),
      )
      .collect();
    for (const tx of linked) {
      await ctx.db.patch(tx._id, { accountId: undefined });
    }

    const subs = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const s of subs) {
      if (s.accountId === args.id) await ctx.db.patch(s._id, { accountId: undefined });
    }

    const emis = await ctx.db
      .query("emis")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const e of emis) {
      if (e.accountId === args.id) await ctx.db.patch(e._id, { accountId: undefined });
    }

    await ctx.db.delete(args.id);
  },
});
