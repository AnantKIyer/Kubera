import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { billingCycle } from "./schema";
import { requireUserId } from "./lib/user";
import { inferPastLoanSchedule, resolveLoanTerms } from "./lib/emi";
import { normalizeCurrencyFields } from "./lib/currency";
import {
  decryptAccounts,
  decryptTransactions,
  encryptEmiFields,
  encryptSubscriptionFields,
  encryptTransactionFields,
} from "./lib/sensitiveFields";
import {
  recomputeEmiSchedule,
  recomputeSubscriptionSchedule,
} from "./lib/scheduleRecompute";

const transactionType = v.union(
  v.literal("income"),
  v.literal("expense"),
  v.literal("transfer"),
);

const currencyFields = {
  originalAmount: v.optional(v.union(v.number(), v.null())),
  originalCurrency: v.optional(v.union(v.string(), v.null())),
  exchangeRate: v.optional(v.union(v.number(), v.null())),
};

export type EnrichedTransaction = Doc<"transactions"> & {
  categoryName: string | null;
  categoryColor: string | null;
  categoryIcon: string | null;
  categoryKind: string | null;
  accountName: string | null;
  accountColor: string | null;
  accountType: string | null;
  accountLastFour: string | null;
  transferToAccountName: string | null;
  transferToAccountColor: string | null;
};

function enrich(
  tx: Doc<"transactions">,
  categories: Map<string, Doc<"categories">>,
  accounts: Map<string, Doc<"accounts">>,
): EnrichedTransaction {
  const category = tx.categoryId ? categories.get(tx.categoryId) : undefined;
  const account = tx.accountId ? accounts.get(tx.accountId) : undefined;
  const toAccount = tx.transferToAccountId
    ? accounts.get(tx.transferToAccountId)
    : undefined;
  return {
    ...tx,
    categoryName: category?.name ?? null,
    categoryColor: category?.color ?? null,
    categoryIcon: category?.icon ?? null,
    categoryKind: category?.kind ?? null,
    accountName: account?.name ?? null,
    accountColor: account?.color ?? null,
    accountType: account?.type ?? null,
    accountLastFour: account?.lastFour ?? null,
    transferToAccountName: toAccount?.name ?? null,
    transferToAccountColor: toAccount?.color ?? null,
  };
}

export const list = query({
  args: {
    type: v.optional(transactionType),
    categoryId: v.optional(v.id("categories")),
    accountId: v.optional(v.id("accounts")),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    limit: v.optional(v.number()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    let rows: Doc<"transactions">[];

    if (args.type) {
      rows = await ctx.db
        .query("transactions")
        .withIndex("by_user_type", (q) => q.eq("userId", userId).eq("type", args.type!))
        .collect();
    } else {
      rows = await ctx.db
        .query("transactions")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
    }

    rows = rows.filter((tx) => {
      if (args.categoryId && tx.categoryId !== args.categoryId) return false;
      if (args.accountId) {
        if (tx.accountId !== args.accountId && tx.transferToAccountId !== args.accountId) {
          return false;
        }
      }
      if (args.startDate && tx.date < args.startDate) return false;
      if (args.endDate && tx.date > args.endDate) return false;
      return true;
    });

    rows.sort((a, b) =>
      a.date === b.date ? b._creationTime - a._creationTime : b.date < a.date ? -1 : 1,
    );

    const categories = new Map(
      (await ctx.db
        .query("categories")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect()
      ).map((c) => [c._id, c]),
    );
    const accounts = new Map(
      (await decryptAccounts(
        await ctx.db
          .query("accounts")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .collect(),
      )).map((a) => [a._id, a]),
    );

    let enriched: EnrichedTransaction[];

    if (args.search) {
      const term = args.search.toLowerCase();
      const decryptedForSearch = await decryptTransactions(rows);
      enriched = decryptedForSearch
        .map((tx) => enrich(tx, categories, accounts))
        .filter(
          (tx) =>
            tx.description?.toLowerCase().includes(term) ||
            tx.categoryName?.toLowerCase().includes(term) ||
            tx.accountName?.toLowerCase().includes(term) ||
            tx.amount.toString().includes(term),
        );
    } else {
      const decryptedRows = await decryptTransactions(rows);
      enriched = decryptedRows.map((tx) => enrich(tx, categories, accounts));
    }

    if (args.limit) enriched = enriched.slice(0, args.limit);
    return enriched;
  },
});

export const create = mutation({
  args: {
    type: transactionType,
    amount: v.number(),
    ...currencyFields,
    description: v.optional(v.string()),
    categoryId: v.optional(v.id("categories")),
    accountId: v.optional(v.id("accounts")),
    transferToAccountId: v.optional(v.id("accounts")),
    date: v.string(),
    subscriptionLink: v.optional(
      v.object({
        mode: v.union(v.literal("existing"), v.literal("new")),
        subscriptionId: v.optional(v.id("subscriptions")),
        name: v.optional(v.string()),
        billingCycle: v.optional(billingCycle),
      }),
    ),
    emiLink: v.optional(
      v.object({
        mode: v.union(v.literal("existing"), v.literal("new")),
        emiId: v.optional(v.id("emis")),
        name: v.optional(v.string()),
        lender: v.optional(v.string()),
        totalInstallments: v.optional(v.number()),
        tenureMonths: v.optional(v.number()),
        principalAmount: v.optional(v.number()),
        interestRate: v.optional(v.number()),
        loanDate: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    if (!(args.amount > 0)) throw new Error("Amount must be greater than 0");

    const isTransfer = args.type === "transfer";
    if (isTransfer) {
      if (args.subscriptionLink || args.emiLink) {
        throw new Error("Transfers cannot link to subscriptions or EMIs");
      }
      if (args.categoryId) {
        throw new Error("Transfers cannot have a category");
      }
      if (!args.accountId || !args.transferToAccountId) {
        throw new Error("Choose both from and to accounts for a transfer");
      }
      if (args.accountId === args.transferToAccountId) {
        throw new Error("From and to accounts must be different");
      }
    }

    const currency = normalizeCurrencyFields({
      amount: args.amount,
      originalAmount: args.originalAmount,
      originalCurrency: args.originalCurrency,
      exchangeRate: args.exchangeRate,
    });
    const sensitive = await encryptTransactionFields({
      description: args.description?.trim() || null,
    });

    if (args.categoryId && !isTransfer) {
      const category = await ctx.db.get(args.categoryId);
      if (!category || category.userId !== userId) throw new Error("Category not found");
      if (category.type !== args.type) {
        throw new Error("Category type must match the transaction type");
      }
    }
    if (args.accountId) {
      const account = await ctx.db.get(args.accountId);
      if (!account || account.userId !== userId) throw new Error("Account not found");
    }
    if (args.transferToAccountId) {
      const toAccount = await ctx.db.get(args.transferToAccountId);
      if (!toAccount || toAccount.userId !== userId) {
        throw new Error("Destination account not found");
      }
    }

    let subscriptionId: Id<"subscriptions"> | undefined;
    let emiId: Id<"emis"> | undefined;

    if (args.subscriptionLink && args.type === "expense") {
      const link = args.subscriptionLink;

      if (link.mode === "existing") {
        if (!link.subscriptionId) throw new Error("Choose a subscription");
        const sub = await ctx.db.get(link.subscriptionId);
        if (!sub || sub.userId !== userId) throw new Error("Subscription not found");

        subscriptionId = sub._id;
        await ctx.db.patch(sub._id, {
          isActive: true,
          accountId: args.accountId ?? sub.accountId,
          categoryId: args.categoryId ?? sub.categoryId,
        });
      } else {
        const name = link.name?.trim();
        if (!name) throw new Error("Subscription name is required");
        if (!link.billingCycle) throw new Error("Billing cycle is required");

        subscriptionId = await ctx.db.insert("subscriptions", {
          userId,
          name: (await encryptSubscriptionFields({ name })).name!,
          amount: currency.amount,
          billingCycle: link.billingCycle,
          categoryId: args.categoryId,
          accountId: args.accountId,
          isActive: true,
          notes: (
            await encryptSubscriptionFields({
              notes: args.description?.trim() || null,
            })
          ).notes,
        });
      }
    }

    if (args.emiLink && args.type === "expense") {
      const link = args.emiLink;

      if (link.mode === "existing") {
        if (!link.emiId) throw new Error("Choose an EMI");
        const emi = await ctx.db.get(link.emiId);
        if (!emi || emi.userId !== userId) throw new Error("EMI not found");

        emiId = emi._id;
        await ctx.db.patch(emi._id, {
          isActive: true,
          accountId: args.accountId ?? emi.accountId,
          categoryId: args.categoryId ?? emi.categoryId,
        });
      } else {
        const name = link.name?.trim();
        if (!name) throw new Error("EMI name is required");

        const tenure = link.tenureMonths ?? link.totalInstallments;
        const resolved = resolveLoanTerms({
          amount: currency.amount,
          principalAmount: link.principalAmount,
          interestRate: link.interestRate,
          tenureMonths: tenure,
        });
        const expectedEmi = resolved.expectedEmi;
        const past = link.loanDate ? inferPastLoanSchedule(link.loanDate, tenure) : null;

        const emiSensitive = await encryptEmiFields({
          name,
          lender: link.lender?.trim() || null,
          notes: args.description?.trim() || null,
        });

        emiId = await ctx.db.insert("emis", {
          userId,
          name: emiSensitive.name!,
          amount: expectedEmi,
          expectedEmiAmount: expectedEmi,
          lender: emiSensitive.lender,
          categoryId: args.categoryId,
          accountId: args.accountId,
          nextDebitDate: past?.nextDebitDate,
          totalInstallments: tenure,
          tenureMonths: tenure,
          paidInstallments: past?.paidInstallments ?? 0,
          principalAmount: link.principalAmount,
          interestRate: resolved.interestRate ?? link.interestRate,
          loanDate: link.loanDate,
          extraPaidTotal: 0,
          isActive: true,
          notes: emiSensitive.notes,
        });
      }
    }

    const transactionId = await ctx.db.insert("transactions", {
      userId,
      type: args.type,
      amount: currency.amount,
      originalAmount: currency.originalAmount,
      originalCurrency: currency.originalCurrency,
      exchangeRate: currency.exchangeRate,
      description: sensitive.description,
      categoryId: isTransfer ? undefined : args.categoryId,
      accountId: args.accountId,
      transferToAccountId: isTransfer ? args.transferToAccountId : undefined,
      subscriptionId,
      emiId,
      date: args.date,
    });

    let emiFeedback: {
      extraAmount: number;
      message: string;
      installmentsCovered: number;
    } | null = null;

    if (subscriptionId) {
      await recomputeSubscriptionSchedule(ctx, userId, subscriptionId);
    }
    if (emiId) {
      emiFeedback = await recomputeEmiSchedule(ctx, userId, emiId, {
        feedbackForPaymentAmount: currency.amount,
      });
    }

    return { transactionId, emiFeedback };
  },
});

export const update = mutation({
  args: {
    id: v.id("transactions"),
    type: v.optional(transactionType),
    amount: v.optional(v.number()),
    ...currencyFields,
    description: v.optional(v.union(v.string(), v.null())),
    categoryId: v.optional(v.union(v.id("categories"), v.null())),
    accountId: v.optional(v.union(v.id("accounts"), v.null())),
    transferToAccountId: v.optional(v.union(v.id("accounts"), v.null())),
    date: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const current = await ctx.db.get(args.id);
    if (!current || current.userId !== userId) throw new Error("Transaction not found");

    const nextType = args.type ?? current.type;
    const isTransfer = nextType === "transfer";
    const patch: Partial<Doc<"transactions">> = {};

    if (args.type !== undefined) patch.type = args.type;

    if (
      args.amount !== undefined ||
      args.originalAmount !== undefined ||
      args.originalCurrency !== undefined ||
      args.exchangeRate !== undefined
    ) {
      if (args.amount !== undefined && !(args.amount > 0)) {
        throw new Error("Amount must be greater than 0");
      }

      const currency = normalizeCurrencyFields({
        amount: args.amount ?? current.amount,
        originalAmount:
          args.originalAmount !== undefined ? args.originalAmount : current.originalAmount,
        originalCurrency:
          args.originalCurrency !== undefined ? args.originalCurrency : current.originalCurrency,
        exchangeRate:
          args.exchangeRate !== undefined ? args.exchangeRate : current.exchangeRate,
      });

      patch.amount = currency.amount;
      patch.originalAmount = currency.originalAmount;
      patch.originalCurrency = currency.originalCurrency;
      patch.exchangeRate = currency.exchangeRate;
    }

    if (args.date !== undefined) patch.date = args.date;
    if (args.description !== undefined) {
      const sensitive = await encryptTransactionFields({
        description: args.description?.trim() || null,
      });
      patch.description = sensitive.description;
    }

    const nextAccountId =
      args.accountId !== undefined
        ? ((args.accountId as Id<"accounts"> | null) ?? undefined)
        : current.accountId;
    const nextToAccountId =
      args.transferToAccountId !== undefined
        ? ((args.transferToAccountId as Id<"accounts"> | null) ?? undefined)
        : current.transferToAccountId;

    if (isTransfer) {
      if (!nextAccountId || !nextToAccountId) {
        throw new Error("Choose both from and to accounts for a transfer");
      }
      if (nextAccountId === nextToAccountId) {
        throw new Error("From and to accounts must be different");
      }
      patch.categoryId = undefined;
      patch.subscriptionId = undefined;
      patch.emiId = undefined;
    }

    if (args.categoryId !== undefined) {
      if (isTransfer) {
        patch.categoryId = undefined;
      } else {
        const nextCategory = args.categoryId as Id<"categories"> | null;
        if (nextCategory) {
          const category = await ctx.db.get(nextCategory);
          if (!category || category.userId !== userId) throw new Error("Category not found");
          if (nextType !== "income" && nextType !== "expense") {
            throw new Error("Category type must match the transaction type");
          }
          if (category.type !== nextType) {
            throw new Error("Category type must match the transaction type");
          }
          patch.categoryId = nextCategory;
        } else {
          patch.categoryId = undefined;
        }
      }
    }
    if (args.accountId !== undefined) {
      const nextAccount = args.accountId as Id<"accounts"> | null;
      if (nextAccount) {
        const account = await ctx.db.get(nextAccount);
        if (!account || account.userId !== userId) throw new Error("Account not found");
        patch.accountId = nextAccount;
      } else {
        patch.accountId = undefined;
      }
    }
    if (args.transferToAccountId !== undefined || isTransfer) {
      if (isTransfer) {
        if (nextToAccountId) {
          const toAccount = await ctx.db.get(nextToAccountId);
          if (!toAccount || toAccount.userId !== userId) {
            throw new Error("Destination account not found");
          }
          patch.transferToAccountId = nextToAccountId;
        }
      } else {
        patch.transferToAccountId = undefined;
      }
    }

    const prevSub = current.subscriptionId;
    const prevEmi = current.emiId;

    await ctx.db.patch(args.id, patch);

    const updated = await ctx.db.get(args.id);
    const subIds = new Set<Id<"subscriptions">>();
    const emiIds = new Set<Id<"emis">>();
    if (prevSub) subIds.add(prevSub);
    if (updated?.subscriptionId) subIds.add(updated.subscriptionId);
    if (prevEmi) emiIds.add(prevEmi);
    if (updated?.emiId) emiIds.add(updated.emiId);

    for (const id of Array.from(subIds)) {
      await recomputeSubscriptionSchedule(ctx, userId, id);
    }
    for (const id of Array.from(emiIds)) {
      await recomputeEmiSchedule(ctx, userId, id);
    }
  },
});

export const remove = mutation({
  args: { id: v.id("transactions") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const current = await ctx.db.get(args.id);
    if (!current || current.userId !== userId) throw new Error("Transaction not found");
    const subId = current.subscriptionId;
    const emiId = current.emiId;
    await ctx.db.delete(args.id);
    if (subId) await recomputeSubscriptionSchedule(ctx, userId, subId);
    if (emiId) await recomputeEmiSchedule(ctx, userId, emiId);
  },
});
