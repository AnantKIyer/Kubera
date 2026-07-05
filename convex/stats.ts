import { v } from "convex/values";
import { query } from "./_generated/server";
import { Doc } from "./_generated/dataModel";
import { monthlyEquivalent } from "./subscriptions";
import { requireUserId } from "./lib/user";
import {
  creditAvailable,
  creditUtilizationPct,
  creditUtilized,
} from "./lib/credit";

function portfolioValue(investedAmount: number, currentValue?: number | null): number {
  return currentValue ?? investedAmount;
}

type CategoryTotal = {
  id: string;
  name: string;
  color: string;
  icon: string;
  total: number;
};

function monthLabel(month: string): string {
  const [year, m] = month.split("-").map(Number);
  return new Date(year, m - 1, 1).toLocaleDateString("en-US", { month: "short" });
}

function shiftMonthKey(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function sumInMonth(
  txs: Doc<"transactions">[],
  month: string,
): { income: number; expense: number; count: number } {
  let income = 0;
  let expense = 0;
  let count = 0;
  for (const tx of txs) {
    if (tx.date.slice(0, 7) !== month) continue;
    count++;
    if (tx.type === "income") income += tx.amount;
    else expense += tx.amount;
  }
  return { income, expense, count };
}

function investmentTotals(
  txs: Doc<"transactions">[],
  categories: Map<string, Doc<"categories">>,
  month?: string,
) {
  let invested = 0; // outflows to investments
  let returns = 0; // inflows from investments
  for (const tx of txs) {
    if (month && tx.date.slice(0, 7) !== month) continue;
    const cat = tx.categoryId ? categories.get(tx.categoryId) : undefined;
    if (cat?.kind !== "investment") continue;
    if (tx.type === "expense") invested += tx.amount;
    else returns += tx.amount;
  }
  return { invested, returns, net: returns - invested };
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return (current - previous) / Math.abs(previous);
}

function delta(current: number, previous: number) {
  const change = current - previous;
  const changePercent = pctChange(current, previous);
  return { current, previous, change, changePercent };
}

function healthVerdict(
  balanceChange: number,
  savingsRateChange: number | null,
): "better" | "worse" | "mixed" | "neutral" {
  if (balanceChange > 0 && (savingsRateChange === null || savingsRateChange >= 0)) return "better";
  if (balanceChange < 0 && (savingsRateChange === null || savingsRateChange <= 0)) return "worse";
  if (balanceChange === 0 && savingsRateChange === 0) return "neutral";
  return "mixed";
}

export const overview = query({
  args: {
    start: v.optional(v.string()),
    end: v.optional(v.string()),
    months: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const all = await ctx.db
      .query("transactions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const categories = new Map(
      (await ctx.db
        .query("categories")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect()
      ).map((c) => [c._id, c]),
    );

    const inRange = all.filter((tx) => {
      if (args.start && tx.date < args.start) return false;
      if (args.end && tx.date > args.end) return false;
      return true;
    });

    let totalIncome = 0;
    let totalExpenses = 0;
    const expenseByCat = new Map<string, number>();
    const incomeByCat = new Map<string, number>();

    for (const tx of inRange) {
      if (tx.type === "income") {
        totalIncome += tx.amount;
        if (tx.categoryId) {
          incomeByCat.set(tx.categoryId, (incomeByCat.get(tx.categoryId) ?? 0) + tx.amount);
        }
      } else {
        totalExpenses += tx.amount;
        if (tx.categoryId) {
          expenseByCat.set(tx.categoryId, (expenseByCat.get(tx.categoryId) ?? 0) + tx.amount);
        }
      }
    }

    const toCategoryTotals = (map: Map<string, number>): CategoryTotal[] =>
      Array.from(map.entries())
        .map(([id, total]) => {
          const c = categories.get(id as Doc<"categories">["_id"]);
          return {
            id,
            name: c?.name ?? "Uncategorized",
            color: c?.color ?? "#94a3b8",
            icon: c?.icon ?? "circle",
            total,
          };
        })
        .sort((a, b) => b.total - a.total);

    const months = args.months ?? 6;
    const now = new Date();
    const buckets: { key: string; label: string; income: number; expense: number }[] = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      buckets.push({ key, label: monthLabel(key), income: 0, expense: 0 });
    }
    const bucketIndex = new Map(buckets.map((b, i) => [b.key, i]));
    for (const tx of all) {
      const key = tx.date.slice(0, 7);
      const idx = bucketIndex.get(key);
      if (idx === undefined) continue;
      if (tx.type === "income") buckets[idx].income += tx.amount;
      else buckets[idx].expense += tx.amount;
    }

    const savingsRate = totalIncome > 0 ? (totalIncome - totalExpenses) / totalIncome : 0;
    const investment = investmentTotals(inRange, categories);

    return {
      totalIncome,
      totalExpenses,
      balance: totalIncome - totalExpenses,
      savingsRate,
      transactionCount: inRange.length,
      expensesByCategory: toCategoryTotals(expenseByCat),
      incomeByCategory: toCategoryTotals(incomeByCat),
      monthlyTrend: buckets.map((b) => ({
        month: b.label,
        income: b.income,
        expense: b.expense,
        net: b.income - b.expense,
      })),
      investment,
    };
  },
});

/** Month-over-month comparison, projections, account flows, subscription burn. */
export const insights = query({
  args: {
    month: v.optional(v.string()), // YYYY-MM, defaults to current
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const now = new Date();
    const currentMonth =
      args.month ??
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const lastMonth = shiftMonthKey(currentMonth, -1);

    const all = await ctx.db
      .query("transactions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const categories = new Map(
      (await ctx.db
        .query("categories")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect()
      ).map((c) => [c._id, c]),
    );
    const accounts = await ctx.db
      .query("accounts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const cur = sumInMonth(all, currentMonth);
    const prev = sumInMonth(all, lastMonth);
    const curBalance = cur.income - cur.expense;
    const prevBalance = prev.income - prev.expense;
    const curSavingsRate = cur.income > 0 ? curBalance / cur.income : 0;
    const prevSavingsRate = prev.income > 0 ? prevBalance / prev.income : 0;

    const curInvestment = investmentTotals(all, categories, currentMonth);
    const prevInvestment = investmentTotals(all, categories, lastMonth);

    const comparison = {
      month: currentMonth,
      previousMonth: lastMonth,
      income: delta(cur.income, prev.income),
      expenses: delta(cur.expense, prev.expense),
      balance: delta(curBalance, prevBalance),
      savingsRate: delta(curSavingsRate, prevSavingsRate),
      investmentOutflow: delta(curInvestment.invested, prevInvestment.invested),
      investmentReturns: delta(curInvestment.returns, prevInvestment.returns),
      verdict: healthVerdict(curBalance - prevBalance, curSavingsRate - prevSavingsRate),
    };

    // End-of-month projection (only meaningful for the current calendar month).
    const [y, m] = currentMonth.split("-").map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const isCurrentCalendarMonth =
      currentMonth ===
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const dayOfMonth = isCurrentCalendarMonth ? now.getDate() : daysInMonth;
    const pace = dayOfMonth > 0 ? dayOfMonth / daysInMonth : 1;

    const projectedIncome = pace > 0 ? cur.income / pace : cur.income;
    const projectedExpenses = pace > 0 ? cur.expense / pace : cur.expense;
    const projectedBalance = projectedIncome - projectedExpenses;
    const projectedSavingsRate =
      projectedIncome > 0 ? projectedBalance / projectedIncome : 0;

    const projections = {
      daysElapsed: dayOfMonth,
      daysInMonth,
      pace,
      projectedIncome,
      projectedExpenses,
      projectedBalance,
      projectedSavingsRate,
      vsLastMonth: {
        income: delta(projectedIncome, prev.income),
        expenses: delta(projectedExpenses, prev.expense),
        balance: delta(projectedBalance, prevBalance),
      },
    };

    // Per-account in/out for the selected month.
    const accountFlows = accounts.map((acc) => {
      let income = 0;
      let expense = 0;
      for (const tx of all) {
        if (tx.accountId !== acc._id) continue;
        if (tx.date.slice(0, 7) !== currentMonth) continue;
        if (tx.type === "income") income += tx.amount;
        else expense += tx.amount;
      }
      return {
        id: acc._id,
        name: acc.name,
        type: acc.type,
        institution: acc.institution ?? null,
        lastFour: acc.lastFour ?? null,
        color: acc.color,
        income,
        expense,
        net: income - expense,
      };
    }).sort((a, b) => b.expense + b.income - (a.expense + a.income));

    // Subscription burn rate.
    const subs = (
      await ctx.db
        .query("subscriptions")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect()
    ).filter((s) => s.isActive);
    let subscriptionMonthly = 0;
    for (const s of subs) {
      subscriptionMonthly += monthlyEquivalent(s.amount, s.billingCycle);
    }

    const activeEmis = (
      await ctx.db
        .query("emis")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect()
    ).filter((e) => e.isActive);
    const emiMonthly = activeEmis.reduce((sum, e) => sum + e.amount, 0);

    const creditAccounts = accounts.filter((a) => a.type === "credit" && a.isActive !== false);
    let creditLimitTotal = 0;
    let creditUtilizedTotal = 0;
    const creditCardDetails = creditAccounts.map((acc) => {
      let expense = 0;
      let income = 0;
      for (const tx of all) {
        if (tx.accountId !== acc._id) continue;
        if (tx.type === "expense") expense += tx.amount;
        else income += tx.amount;
      }
      const utilized = creditUtilized(acc.initialUtilized, expense, income);
      creditUtilizedTotal += utilized;
      if (acc.creditLimit != null) creditLimitTotal += acc.creditLimit;
      return {
        id: acc._id,
        name: acc.name,
        institution: acc.institution ?? null,
        lastFour: acc.lastFour ?? null,
        color: acc.color,
        creditLimit: acc.creditLimit ?? null,
        utilized,
        available: creditAvailable(acc.creditLimit, utilized),
        utilizationPct: creditUtilizationPct(acc.creditLimit, utilized),
      };
    }).sort((a, b) => b.utilized - a.utilized);

    const activeAccounts = accounts.filter((a) => a.isActive !== false);
    const bankAccounts = activeAccounts.filter((a) => a.type === "bank");
    let totalBankBalance = 0;
    let banksWithBalance = 0;
    const banks = bankAccounts.map((acc) => {
      if (acc.currentBalance != null) {
        totalBankBalance += acc.currentBalance;
        banksWithBalance++;
      }
      return {
        id: acc._id,
        name: acc.name,
        institution: acc.institution ?? null,
        color: acc.color,
        currentBalance: acc.currentBalance ?? null,
      };
    });

    const trackedInvestments = (
      await ctx.db
        .query("investments")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect()
    ).filter((row) => row.isActive);

    let portfolioInvested = 0;
    let portfolioValueTotal = 0;
    let portfolioMonthly = 0;
    const portfolioItems = trackedInvestments.map((row) => {
      const value = portfolioValue(row.investedAmount, row.currentValue);
      portfolioInvested += row.investedAmount;
      portfolioValueTotal += value;
      if (row.monthlyAmount != null) portfolioMonthly += row.monthlyAmount;
      return {
        id: row._id,
        name: row.name,
        investmentType: row.investmentType,
        investedAmount: row.investedAmount,
        currentValue: row.currentValue ?? null,
        portfolioValue: value,
        gain: value - row.investedAmount,
        monthlyAmount: row.monthlyAmount ?? null,
      };
    }).sort((a, b) => b.portfolioValue - a.portfolioValue);

    return {
      comparison,
      projections,
      accountFlows,
      investment: {
        current: curInvestment,
        previous: prevInvestment,
      },
      subscriptions: {
        count: subs.length,
        monthlyBurn: subscriptionMonthly,
        yearlyBurn: subscriptionMonthly * 12,
        /** Share of current-month expenses that are tracked subscriptions. */
        shareOfExpenses: cur.expense > 0 ? subscriptionMonthly / cur.expense : 0,
      },
      emis: {
        count: activeEmis.length,
        monthlyBurn: emiMonthly,
        yearlyBurn: emiMonthly * 12,
        shareOfExpenses: cur.expense > 0 ? emiMonthly / cur.expense : 0,
      },
      creditCards: {
        count: creditAccounts.length,
        totalLimit: creditLimitTotal,
        totalUtilized: creditUtilizedTotal,
        totalAvailable: creditAvailable(creditLimitTotal, creditUtilizedTotal),
        utilizationPct: creditUtilizationPct(creditLimitTotal, creditUtilizedTotal),
        cards: creditCardDetails,
      },
      accountBalances: {
        totalBankBalance,
        bankCount: bankAccounts.length,
        banksWithBalance,
        banks,
      },
      portfolio: {
        count: trackedInvestments.length,
        totalInvested: portfolioInvested,
        totalCurrentValue: portfolioValueTotal,
        totalGain: portfolioValueTotal - portfolioInvested,
        monthlyContribution: portfolioMonthly,
        items: portfolioItems,
      },
      currentMonthTotals: {
        income: cur.income,
        expenses: cur.expense,
        balance: curBalance,
        savingsRate: curSavingsRate,
      },
    };
  },
});
