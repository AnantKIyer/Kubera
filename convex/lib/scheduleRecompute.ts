import { MutationCtx } from "../_generated/server";
import { Doc, Id } from "../_generated/dataModel";
import { addBillingPeriod, type BillingCycle } from "./subscriptionDates";
import {
  addMonthsToIso,
  analyzeEmiPayment,
  expectedEmiForLoan,
  getExtraPaymentMessage,
  remainingPrincipalAfterPayments,
} from "./emi";

async function paymentsForSubscription(
  ctx: MutationCtx,
  userId: Id<"users">,
  subscriptionId: Id<"subscriptions">,
) {
  const rows = await ctx.db
    .query("transactions")
    .withIndex("by_user_subscription", (q) =>
      q.eq("userId", userId).eq("subscriptionId", subscriptionId),
    )
    .collect();
  return rows
    .filter((tx) => tx.type === "expense")
    .sort((a, b) =>
      a.date === b.date ? a._creationTime - b._creationTime : a.date < b.date ? -1 : 1,
    );
}

async function paymentsForEmi(
  ctx: MutationCtx,
  userId: Id<"users">,
  emiId: Id<"emis">,
) {
  const rows = await ctx.db
    .query("transactions")
    .withIndex("by_user_emi", (q) => q.eq("userId", userId).eq("emiId", emiId))
    .collect();
  return rows
    .filter((tx) => tx.type === "expense")
    .sort((a, b) =>
      a.date === b.date ? a._creationTime - b._creationTime : a.date < b.date ? -1 : 1,
    );
}

/**
 * Recompute subscription nextRenewalDate from payment history.
 * Each payment clears one billing period from the first payment date as anchor.
 */
export async function recomputeSubscriptionSchedule(
  ctx: MutationCtx,
  userId: Id<"users">,
  subscriptionId: Id<"subscriptions">,
) {
  const sub = await ctx.db.get(subscriptionId);
  if (!sub || sub.userId !== userId) return;

  const payments = await paymentsForSubscription(ctx, userId, subscriptionId);
  if (payments.length === 0) {
    return;
  }

  const cycle = sub.billingCycle as BillingCycle;
  let next = payments[0].date;
  for (let i = 0; i < payments.length; i++) {
    next = addBillingPeriod(next, cycle);
  }

  const lastAmount = payments[payments.length - 1].amount;
  await ctx.db.patch(subscriptionId, {
    nextRenewalDate: next,
    amount: lastAmount,
    isActive: true,
  });
}

export type EmiRecomputeFeedback = {
  extraAmount: number;
  message: string;
  installmentsCovered: number;
} | null;

/**
 * Rebuild EMI schedule fields from all linked expense transactions.
 */
export async function recomputeEmiSchedule(
  ctx: MutationCtx,
  userId: Id<"users">,
  emiId: Id<"emis">,
  options?: { feedbackForPaymentAmount?: number },
): Promise<EmiRecomputeFeedback> {
  const emi = await ctx.db.get(emiId);
  if (!emi || emi.userId !== userId) return null;

  const payments = await paymentsForEmi(ctx, userId, emiId);
  const expected = expectedEmiForLoan(emi);
  let paidInstallments = 0;
  let extraPaidTotal = 0;

  for (const payment of payments) {
    const analysis = analyzeEmiPayment(payment.amount, expected);
    paidInstallments += analysis.installmentsCovered;
    extraPaidTotal += analysis.extraAmount;
  }

  const tenure = emi.tenureMonths ?? emi.totalInstallments;
  const firstDue = emi.loanDate
    ? addMonthsToIso(emi.loanDate, 1)
    : payments[0]?.date;

  let nextDebitDate: string | undefined;
  let isActive = true;
  if (tenure != null && paidInstallments >= tenure) {
    isActive = false;
    nextDebitDate = undefined;
  } else if (firstDue) {
    nextDebitDate = addMonthsToIso(firstDue, paidInstallments);
  } else {
    nextDebitDate = emi.nextDebitDate;
  }

  await ctx.db.patch(emiId, {
    amount: expected,
    expectedEmiAmount: expected,
    paidInstallments,
    extraPaidTotal: Math.round(extraPaidTotal * 100) / 100,
    nextDebitDate,
    isActive,
  });

  if (options?.feedbackForPaymentAmount != null) {
    const analysis = analyzeEmiPayment(options.feedbackForPaymentAmount, expected);
    if (analysis.isExtra && analysis.extraAmount > 0) {
      return {
        extraAmount: analysis.extraAmount,
        message: getExtraPaymentMessage(analysis.extraAmount),
        installmentsCovered: analysis.installmentsCovered,
      };
    }
  }

  return null;
}

export function enrichRemainingPrincipal(
  emi: Doc<"emis">,
  payments: { amount: number }[],
): { remainingPrincipal: number | null; totalPaid: number; progress: number | null } {
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const principal = emi.principalAmount;
  if (principal == null || !(principal > 0)) {
    return { remainingPrincipal: null, totalPaid, progress: null };
  }

  const rate = emi.interestRate ?? 0;
  const remaining =
    rate > 0 || payments.length > 0
      ? remainingPrincipalAfterPayments(principal, rate, payments)
      : Math.max(0, principal - totalPaid);

  return {
    remainingPrincipal: remaining,
    totalPaid,
    progress: Math.min(1, (principal - remaining) / principal),
  };
}
