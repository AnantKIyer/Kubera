"use client";

import Link from "next/link";
import { Plus, TrendingDown, TrendingUp, Minus, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatCurrency,
  formatDelta,
  formatPercent,
  formatPercentChange,
  formatRateDelta,
} from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { INVESTMENT_TYPE_LABELS, type InvestmentType } from "@/lib/investments";

type Delta = {
  current: number;
  previous: number;
  change: number;
  changePercent: number | null;
};

interface Insights {
  comparison: {
    verdict: "better" | "worse" | "mixed" | "neutral";
    income: Delta;
    expenses: Delta;
    balance: Delta;
    savingsRate: Delta;
    investmentOutflow: Delta;
  };
  projections: {
    daysElapsed: number;
    daysInMonth: number;
    projectedIncome: number;
    projectedExpenses: number;
    projectedBalance: number;
    projectedSavingsRate: number;
    vsLastMonth: {
      income: Delta;
      expenses: Delta;
      balance: Delta;
    };
  };
  investment: {
    current: { invested: number; returns: number; net: number };
    previous: { invested: number; returns: number; net: number };
  };
  subscriptions: {
    count: number;
    monthlyBurn: number;
    yearlyBurn: number;
  };
  emis: {
    count: number;
    monthlyBurn: number;
    yearlyBurn: number;
  };
  creditCards: {
    count: number;
    totalLimit: number;
    totalUtilized: number;
    totalAvailable: number | null;
    utilizationPct: number | null;
    cards: {
      id: string;
      name: string;
      institution: string | null;
      lastFour: string | null;
      color: string;
      creditLimit: number | null;
      utilized: number;
      available: number | null;
      utilizationPct: number | null;
    }[];
  };
  accountBalances: {
    totalBankBalance: number;
    bankCount: number;
    banksWithBalance: number;
    banks: {
      id: string;
      name: string;
      institution: string | null;
      color: string;
      currentBalance: number | null;
    }[];
  };
  portfolio: {
    count: number;
    totalInvested: number;
    totalCurrentValue: number;
    totalGain: number;
    monthlyContribution: number;
    items: {
      id: string;
      name: string;
      investmentType: string;
      investedAmount: number;
      currentValue: number | null;
      portfolioValue: number;
      gain: number;
      monthlyAmount: number | null;
    }[];
  };
}

const verdictCopy = {
  better: { label: "Doing better", tone: "text-[hsl(var(--income))]", bg: "bg-[hsl(var(--income))]/10" },
  worse: { label: "Needs attention", tone: "text-[hsl(var(--expense))]", bg: "bg-[hsl(var(--expense))]/10" },
  mixed: { label: "Mixed signals", tone: "text-amber-600", bg: "bg-amber-500/10" },
  neutral: { label: "Steady", tone: "text-muted-foreground", bg: "bg-muted" },
};

function DeltaRow({
  label,
  delta,
  invert = false,
  isRate = false,
}: {
  label: string;
  delta: Delta;
  invert?: boolean;
  isRate?: boolean;
}) {
  const rawPositive = delta.change > 0;
  const positive = invert ? !rawPositive : rawPositive;
  const Icon = delta.change === 0 ? Minus : positive ? TrendingUp : TrendingDown;

  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="text-right">
        <p className="text-sm font-semibold tabular-nums">
          {isRate ? formatPercent(delta.current) : formatCurrency(delta.current)}
        </p>
        <p
          className={cn(
            "flex items-center justify-end gap-1 text-xs font-medium tabular-nums",
            delta.change === 0
              ? "text-muted-foreground"
              : positive
                ? "text-[hsl(var(--income))]"
                : "text-[hsl(var(--expense))]",
          )}
        >
          <Icon size={12} />
          {isRate
            ? formatRateDelta(delta.current, delta.previous)
            : `${formatDelta(delta.change)} (${formatPercentChange(delta.changePercent)})`}
        </p>
      </div>
    </div>
  );
}

export function MonthComparisonPanel({ insights }: { insights: Insights }) {
  const v = verdictCopy[insights.comparison.verdict];

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>vs last month</CardTitle>
          <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", v.bg, v.tone)}>
            {v.label}
          </span>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          <DeltaRow label="Net balance" delta={insights.comparison.balance} />
          <DeltaRow label="Income" delta={insights.comparison.income} />
          <DeltaRow label="Expenses" delta={insights.comparison.expenses} invert />
          <DeltaRow label="Savings rate" delta={insights.comparison.savingsRate} isRate />
          <DeltaRow label="Investment outflow" delta={insights.comparison.investmentOutflow} invert />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            End-of-month projection
            <span className="text-xs font-normal text-muted-foreground">
              Day {insights.projections.daysElapsed} of {insights.projections.daysInMonth}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">Projected income</p>
              <p className="mt-1 text-lg font-bold tabular-nums text-[hsl(var(--income))]">
                {formatCurrency(insights.projections.projectedIncome)}
              </p>
              <p className="text-xs text-muted-foreground">
                vs last: {formatDelta(insights.projections.vsLastMonth.income.change)}
              </p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">Projected expenses</p>
              <p className="mt-1 text-lg font-bold tabular-nums text-[hsl(var(--expense))]">
                {formatCurrency(insights.projections.projectedExpenses)}
              </p>
              <p className="text-xs text-muted-foreground">
                vs last: {formatDelta(insights.projections.vsLastMonth.expenses.change)}
              </p>
            </div>
          </div>
          <div className="rounded-lg border border-border p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Projected net</span>
              <span className="text-lg font-bold tabular-nums">
                {formatCurrency(insights.projections.projectedBalance)}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Savings rate</span>
              <span className="font-medium">{formatPercent(insights.projections.projectedSavingsRate)}</span>
            </div>
          </div>
          {insights.projections.projectedBalance < insights.projections.vsLastMonth.balance.previous && (
            <p className="flex items-center gap-2 rounded-lg bg-[hsl(var(--expense))]/10 px-3 py-2 text-xs text-[hsl(var(--expense))]">
              <AlertTriangle size={14} />
              At current pace you may finish below last month&apos;s net savings.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function InvestmentSummaryCard({
  investment,
}: {
  investment: Insights["investment"];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Investments this month</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-xs text-muted-foreground">Deployed</p>
          <p className="mt-1 text-base font-bold tabular-nums">
            {formatCurrency(investment.current.invested)}
          </p>
          <p className="text-[11px] text-muted-foreground">
            last: {formatCurrency(investment.previous.invested)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Returns</p>
          <p className="mt-1 text-base font-bold tabular-nums text-[hsl(var(--income))]">
            {formatCurrency(investment.current.returns)}
          </p>
          <p className="text-[11px] text-muted-foreground">
            last: {formatCurrency(investment.previous.returns)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Net</p>
          <p
            className={cn(
              "mt-1 text-base font-bold tabular-nums",
              investment.current.net >= 0 ? "text-[hsl(var(--income))]" : "text-[hsl(var(--expense))]",
            )}
          >
            {formatCurrency(investment.current.net)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export function InvestmentPortfolioCard({
  investment,
  portfolio,
  onAdd,
}: {
  investment: Insights["investment"];
  portfolio: Insights["portfolio"];
  onAdd?: () => void;
}) {
  const topItems = portfolio.items.slice(0, 4);

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>Investments</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {portfolio.count > 0 ? (
              <>
                {formatCurrency(portfolio.totalCurrentValue)} portfolio
                {portfolio.totalGain !== 0 && (
                  <span
                    className={cn(
                      "ml-1",
                      portfolio.totalGain >= 0
                        ? "text-[hsl(var(--income))]"
                        : "text-[hsl(var(--expense))]",
                    )}
                  >
                    ({portfolio.totalGain >= 0 ? "+" : ""}
                    {formatCurrency(portfolio.totalGain)})
                  </span>
                )}
              </>
            ) : (
              "Track SIP, MF, stocks, gold, FD, and more"
            )}
          </p>
        </div>
        {onAdd && (
          <Button size="sm" variant="outline" onClick={onAdd}>
            <Plus size={14} /> Add
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3 rounded-lg bg-muted/40 p-3 text-center text-xs">
          <div>
            <p className="text-muted-foreground">Deployed</p>
            <p className="mt-1 font-semibold tabular-nums">
              {formatCurrency(investment.current.invested)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Returns</p>
            <p className="mt-1 font-semibold tabular-nums text-[hsl(var(--income))]">
              {formatCurrency(investment.current.returns)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Monthly SIP</p>
            <p className="mt-1 font-semibold tabular-nums">
              {formatCurrency(portfolio.monthlyContribution)}
            </p>
          </div>
        </div>

        {topItems.length > 0 ? (
          <div className="space-y-2">
            {topItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {INVESTMENT_TYPE_LABELS[item.investmentType as InvestmentType]}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-semibold tabular-nums">
                    {formatCurrency(item.portfolioValue)}
                  </p>
                  <p
                    className={cn(
                      "text-xs tabular-nums",
                      item.gain >= 0 ? "text-[hsl(var(--income))]" : "text-[hsl(var(--expense))]",
                    )}
                  >
                    {item.gain >= 0 ? "+" : ""}
                    {formatCurrency(item.gain)}
                  </p>
                </div>
              </div>
            ))}
            {portfolio.count > topItems.length && (
              <Link
                href="/investments"
                className="block pt-1 text-center text-xs font-medium text-primary hover:underline"
              >
                View all {portfolio.count} investments
              </Link>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border/70 px-4 py-5 text-center">
            <p className="text-sm text-muted-foreground">No investments tracked yet</p>
            {onAdd && (
              <Button size="sm" className="mt-3" onClick={onAdd}>
                <Plus size={14} /> Add investment
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function SubscriptionBurnCard({
  subscriptions,
}: {
  subscriptions: Insights["subscriptions"];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Fixed subscription burn</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold tabular-nums">{formatCurrency(subscriptions.monthlyBurn)}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {subscriptions.count} active · {formatCurrency(subscriptions.yearlyBurn)}/year
        </p>
      </CardContent>
    </Card>
  );
}

export function EmiBurnCard({ emis }: { emis: Insights["emis"] }) {
  if (emis.count === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Loan EMI burn</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold tabular-nums">{formatCurrency(emis.monthlyBurn)}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {emis.count} active · {formatCurrency(emis.yearlyBurn)}/year
        </p>
      </CardContent>
    </Card>
  );
}

export function CreditUtilizationCard({
  creditCards,
}: {
  creditCards: Insights["creditCards"];
}) {
  if (creditCards.count === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Credit cards</CardTitle>
      </CardHeader>
      <CardContent>
        {creditCards.totalLimit > 0 ? (
          <>
            <p className="text-2xl font-bold tabular-nums">
              {formatPercent(creditCards.utilizationPct ?? 0)} used
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatCurrency(creditCards.totalUtilized)} of {formatCurrency(creditCards.totalLimit)}
              {creditCards.totalAvailable != null
                ? ` · ${formatCurrency(creditCards.totalAvailable)} available`
                : ""}
            </p>
          </>
        ) : (
          <>
            <p className="text-2xl font-bold tabular-nums text-[hsl(var(--expense))]">
              {formatCurrency(creditCards.totalUtilized)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {creditCards.count} card{creditCards.count !== 1 ? "s" : ""} · set limits on accounts to track utilization
            </p>
          </>
        )}

        {creditCards.cards.length > 0 && (
          <div className="mt-4 space-y-2">
            {creditCards.cards.map((card) => (
              <div
                key={card.id}
                className="rounded-lg border border-border/60 px-3 py-2.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: card.color }}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{card.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {card.institution ?? "Credit card"}
                        {card.lastFour ? ` · ···· ${card.lastFour}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold tabular-nums text-[hsl(var(--expense))]">
                      {formatCurrency(card.utilized)}
                    </p>
                    {card.creditLimit != null && card.creditLimit > 0 ? (
                      <p className="text-xs tabular-nums text-muted-foreground">
                        {formatPercent(card.utilizationPct ?? 0)} of {formatCurrency(card.creditLimit)}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">used</p>
                    )}
                  </div>
                </div>
                {card.creditLimit != null && card.creditLimit > 0 && (
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        (card.utilizationPct ?? 0) > 0.7
                          ? "bg-[hsl(var(--expense))]"
                          : "bg-primary",
                      )}
                      style={{
                        width: `${Math.min(100, (card.utilizationPct ?? 0) * 100)}%`,
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function BankBalancesCard({
  balances,
}: {
  balances: Insights["accountBalances"];
}) {
  if (balances.bankCount === 0) return null;

  const tracked = balances.banks.filter((b) => b.currentBalance != null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bank balances</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold tabular-nums text-[hsl(var(--income))]">
          {formatCurrency(balances.totalBankBalance)}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {balances.banksWithBalance} of {balances.bankCount} bank
          {balances.bankCount !== 1 ? "s" : ""} with balance set
        </p>
        {tracked.length > 0 && (
          <div className="mt-4 space-y-2">
            {tracked.map((bank) => (
              <div
                key={bank.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2 text-sm"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: bank.color }}
                  />
                  <span className="truncate font-medium">{bank.name}</span>
                </div>
                <span className="shrink-0 font-semibold tabular-nums">
                  {formatCurrency(bank.currentBalance ?? 0)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function AccountFlowsCard({
  flows,
}: {
  flows: {
    id: string;
    name: string;
    type: string;
    institution: string | null;
    lastFour: string | null;
    color: string;
    income: number;
    expense: number;
    net: number;
  }[];
}) {
  if (flows.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Money by account</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {flows.map((acc) => (
          <div key={acc.id} className="rounded-lg border border-border p-3">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: acc.color }} />
              <span className="flex-1 text-sm font-semibold">{acc.name}</span>
              {acc.lastFour && (
                <span className="text-xs text-muted-foreground">···· {acc.lastFour}</span>
              )}
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <p className="text-muted-foreground">In</p>
                <p className="font-semibold tabular-nums text-[hsl(var(--income))]">
                  {formatCurrency(acc.income)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Out</p>
                <p className="font-semibold tabular-nums text-[hsl(var(--expense))]">
                  {formatCurrency(acc.expense)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Net</p>
                <p className="font-semibold tabular-nums">{formatCurrency(acc.net)}</p>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
