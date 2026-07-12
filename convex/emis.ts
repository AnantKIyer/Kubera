import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc } from "./_generated/dataModel";
import { requireUserId } from "./lib/user";
import {
  analyzeEmiPayment,
  assertInstallmentDateNotPast,
  buildEmiPaymentPatch,
  clampInstallmentDate,
  expectedEmiForLoan,
  getExtraPaymentMessage,
  inferPastLoanSchedule,
  resolveLoanTerms,
} from "./lib/emi";
import {
  decryptAccounts,
  decryptEmis,
  encryptEmiFields,
} from "./lib/sensitiveFields";

function enrichEmi(
  emi: Doc<"emis">,
  totalPaid: number,
  category?: Doc<"categories">,
  account?: Doc<"accounts">,
) {
  const expectedEmi = expectedEmiForLoan(emi);
  const tenure = emi.tenureMonths ?? emi.totalInstallments ?? null;
  const estimatedPaid = Math.max(
    totalPaid,
    (emi.paidInstallments ?? 0) * expectedEmi,
  );
  const progress =
    emi.principalAmount != null && emi.principalAmount > 0
      ? Math.min(1, estimatedPaid / emi.principalAmount)
      : null;

  return {
    ...emi,
    categoryName: category?.name ?? null,
    categoryColor: category?.color ?? null,
    accountName: account?.name ?? null,
    accountColor: account?.color ?? null,
    expectedEmi,
    totalPaid: estimatedPaid,
    progress,
    remainingPrincipal:
      emi.principalAmount != null ? Math.max(0, emi.principalAmount - estimatedPaid) : null,
    tenureMonths: tenure,
  };
}

export const list = query({
  args: { activeOnly: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    let rows = await ctx.db
      .query("emis")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    if (args.activeOnly) rows = rows.filter((e) => e.isActive);

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

    // Prefer denormalized EMI payment fields — avoid full transaction history scans.
    const decryptedRows = await decryptEmis(rows);

    return decryptedRows
      .map((e) => {
        const category = e.categoryId ? categories.get(e.categoryId) : undefined;
        const account = e.accountId ? accounts.get(e.accountId) : undefined;
        const expected = expectedEmiForLoan(e);
        const totalPaid =
          (e.paidInstallments ?? 0) * expected + (e.extraPaidTotal ?? 0);
        return enrichEmi(e, totalPaid, category, account);
      })
      .sort((a, b) => b.amount - a.amount);
  },
});

export const summary = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const active = (
      await ctx.db
        .query("emis")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect()
    ).filter((e) => e.isActive);

    const monthlyTotal = active.reduce((s, e) => s + expectedEmiForLoan(e), 0);
    const extraPaidTotal = active.reduce((s, e) => s + (e.extraPaidTotal ?? 0), 0);
    return {
      count: active.length,
      monthlyTotal,
      yearlyTotal: monthlyTotal * 12,
      extraPaidTotal,
    };
  },
});

function resolveExpectedEmi(args: {
  amount: number;
  principalAmount?: number;
  interestRate?: number;
  tenureMonths?: number;
  totalInstallments?: number;
}) {
  return resolveLoanTerms(args);
}

export const create = mutation({
  args: {
    name: v.string(),
    amount: v.number(),
    lender: v.optional(v.string()),
    categoryId: v.optional(v.id("categories")),
    accountId: v.optional(v.id("accounts")),
    nextDebitDate: v.optional(v.string()),
    totalInstallments: v.optional(v.number()),
    paidInstallments: v.optional(v.number()),
    notes: v.optional(v.string()),
    principalAmount: v.optional(v.number()),
    interestRate: v.optional(v.number()),
    tenureMonths: v.optional(v.number()),
    loanDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    if (!(args.amount > 0)) throw new Error("EMI amount must be greater than 0");

    const tenure = args.tenureMonths ?? args.totalInstallments;
    const resolved = resolveExpectedEmi({
      amount: args.amount,
      principalAmount: args.principalAmount,
      interestRate: args.interestRate,
      tenureMonths: tenure,
      totalInstallments: args.totalInstallments,
    });

    const past =
      args.loanDate != null ? inferPastLoanSchedule(args.loanDate, tenure) : null;
    const paidInstallments =
      past?.paidInstallments ?? args.paidInstallments ?? 0;
    let nextDebitDate = clampInstallmentDate(
      past?.nextDebitDate ?? args.nextDebitDate,
    );
    assertInstallmentDateNotPast(nextDebitDate);

    const isClosed = past?.isActive === false;

    const sensitive = await encryptEmiFields({
      name: args.name.trim(),
      lender: args.lender?.trim() || null,
      notes: args.notes?.trim() || null,
    });

    return await ctx.db.insert("emis", {
      userId,
      name: sensitive.name!,
      amount: resolved.expectedEmi,
      expectedEmiAmount: resolved.expectedEmi,
      lender: sensitive.lender,
      categoryId: args.categoryId,
      accountId: args.accountId,
      nextDebitDate,
      totalInstallments: tenure ?? args.totalInstallments,
      tenureMonths: tenure,
      paidInstallments,
      principalAmount: args.principalAmount,
      interestRate: resolved.interestRate ?? args.interestRate,
      loanDate: args.loanDate,
      extraPaidTotal: 0,
      isActive: isClosed ? false : true,
      notes: sensitive.notes,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("emis"),
    name: v.optional(v.string()),
    amount: v.optional(v.number()),
    lender: v.optional(v.union(v.string(), v.null())),
    categoryId: v.optional(v.union(v.id("categories"), v.null())),
    accountId: v.optional(v.union(v.id("accounts"), v.null())),
    nextDebitDate: v.optional(v.union(v.string(), v.null())),
    totalInstallments: v.optional(v.union(v.number(), v.null())),
    paidInstallments: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
    notes: v.optional(v.union(v.string(), v.null())),
    principalAmount: v.optional(v.union(v.number(), v.null())),
    interestRate: v.optional(v.union(v.number(), v.null())),
    tenureMonths: v.optional(v.union(v.number(), v.null())),
    loanDate: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const current = await ctx.db.get(args.id);
    if (!current || current.userId !== userId) throw new Error("EMI not found");

    const { id, ...rest } = args;
    const patch: Record<string, unknown> = {};
    if (rest.name !== undefined) {
      const sensitive = await encryptEmiFields({ name: rest.name.trim() });
      patch.name = sensitive.name;
    }
    if (rest.amount !== undefined) {
      if (!(rest.amount > 0)) throw new Error("EMI amount must be greater than 0");
      patch.amount = rest.amount;
    }
    if (rest.lender !== undefined) {
      const sensitive = await encryptEmiFields({ lender: rest.lender?.trim() || null });
      patch.lender = sensitive.lender;
    }
    if (rest.categoryId !== undefined) patch.categoryId = rest.categoryId ?? undefined;
    if (rest.accountId !== undefined) patch.accountId = rest.accountId ?? undefined;
    if (rest.nextDebitDate !== undefined) {
      const next = rest.nextDebitDate ? clampInstallmentDate(rest.nextDebitDate) : undefined;
      assertInstallmentDateNotPast(next);
      patch.nextDebitDate = next;
    }
    if (rest.loanDate !== undefined) {
      patch.loanDate = rest.loanDate ?? undefined;
      if (rest.loanDate && rest.paidInstallments === undefined) {
        const tenureForPast =
          (rest.tenureMonths ?? rest.totalInstallments ?? current.tenureMonths ?? current.totalInstallments) as
            | number
            | undefined;
        const past = inferPastLoanSchedule(rest.loanDate, tenureForPast);
        if (past) {
          patch.paidInstallments = past.paidInstallments;
          if (past.nextDebitDate) {
            patch.nextDebitDate = past.nextDebitDate;
          }
          if (past.isActive === false) {
            patch.isActive = false;
            patch.nextDebitDate = undefined;
          }
        }
      }
    }
    if (rest.totalInstallments !== undefined) {
      patch.totalInstallments = rest.totalInstallments ?? undefined;
    }
    if (rest.tenureMonths !== undefined) {
      patch.tenureMonths = rest.tenureMonths ?? undefined;
      if (rest.tenureMonths != null) patch.totalInstallments = rest.tenureMonths;
    }
    if (rest.paidInstallments !== undefined) patch.paidInstallments = rest.paidInstallments;
    if (rest.isActive !== undefined) patch.isActive = rest.isActive;
    if (rest.notes !== undefined) {
      const sensitive = await encryptEmiFields({ notes: rest.notes?.trim() || null });
      patch.notes = sensitive.notes;
    }
    if (rest.principalAmount !== undefined) {
      patch.principalAmount = rest.principalAmount ?? undefined;
    }
    if (rest.interestRate !== undefined) {
      patch.interestRate = rest.interestRate ?? undefined;
    }

    const merged = { ...current, ...patch };
    const tenure = (merged.tenureMonths ?? merged.totalInstallments) as number | undefined;
    if (
      merged.principalAmount != null &&
      tenure != null &&
      tenure > 0 &&
      (rest.principalAmount !== undefined ||
        rest.interestRate !== undefined ||
        rest.tenureMonths !== undefined ||
        rest.totalInstallments !== undefined ||
        rest.amount !== undefined)
    ) {
      const resolved = resolveExpectedEmi({
        amount: (merged.amount as number) ?? current.amount,
        principalAmount: merged.principalAmount as number | undefined,
        interestRate: merged.interestRate as number | undefined,
        tenureMonths: tenure,
      });
      patch.expectedEmiAmount = resolved.expectedEmi;
      patch.amount = resolved.expectedEmi;
      if (resolved.interestRate != null) {
        patch.interestRate = resolved.interestRate;
      }
    }

    await ctx.db.patch(id, patch);
  },
});

export const remove = mutation({
  args: { id: v.id("emis") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const current = await ctx.db.get(args.id);
    if (!current || current.userId !== userId) throw new Error("EMI not found");
    await ctx.db.delete(args.id);
  },
});

/** Record an EMI payment and advance next debit date */
export const recordPayment = mutation({
  args: {
    id: v.id("emis"),
    paymentDate: v.string(),
    amount: v.optional(v.number()),
    accountId: v.optional(v.union(v.id("accounts"), v.null())),
    categoryId: v.optional(v.union(v.id("categories"), v.null())),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const emi = await ctx.db.get(args.id);
    if (!emi || emi.userId !== userId) throw new Error("EMI not found");

    const paidAmount = args.amount != null && args.amount > 0 ? args.amount : emi.amount;
    const result = buildEmiPaymentPatch(emi, args.paymentDate, paidAmount, {
      accountId: args.accountId ?? undefined,
      categoryId: args.categoryId ?? undefined,
    });

    await ctx.db.patch(args.id, result.patch);
    return {
      nextDebitDate: result.patch.nextDebitDate as string | undefined,
      paidInstallments: result.patch.paidInstallments as number,
      feedback: result.feedback,
      closed: result.closed,
    };
  },
});

export const previewPayment = query({
  args: {
    emiId: v.id("emis"),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const emi = await ctx.db.get(args.emiId);
    if (!emi || emi.userId !== userId) throw new Error("EMI not found");

    const expected = expectedEmiForLoan(emi);
    const analysis = analyzeEmiPayment(args.amount, expected);
    return {
      ...analysis,
      message:
        analysis.isExtra && analysis.extraAmount > 0
          ? getExtraPaymentMessage(analysis.extraAmount)
          : null,
    };
  },
});
