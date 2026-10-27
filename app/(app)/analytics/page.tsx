"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { PieChart, Plus, TrendingUp, Wallet } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { MoneyValue } from "@/components/money-value";
import { buttonClassName } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MonthPicker } from "@/components/ui/month-picker";
import { Skeleton, EmptyState } from "@/components/ui/misc";
import { TrendChart } from "@/components/charts/trend-chart";
import { CategoryDonut } from "@/components/charts/category-donut";
import { getCategoryIcon } from "@/lib/icons";
import {
  currentMonth,
  formatCurrency,
  formatMonth,
  formatPercent,
  monthRange,
} from "@/lib/format";
import {
  MonthComparisonPanel,
  InvestmentPortfolioCard,
  AccountFlowsCard,
} from "@/components/insights-panels";
import { cn } from "@/lib/utils";

export default function AnalyticsPage() {
  const [month, setMonth] = useState(currentMonth());
  const { start, end } = monthRange(month);
  const stats = useQuery(api.stats.overview, { start, end, months: 6 });
  const insights = useQuery(api.stats.insights, { month });

  const isCurrent = month >= currentMonth();
  const quietMonth =
    !!stats && stats.totalIncome === 0 && stats.totalExpenses === 0;

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Understand where your money goes over time."
        action={
          <MonthPicker
            month={month}
            onChange={setMonth}
            disableNext={isCurrent}
          />
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {!stats ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)
        ) : (
          <>
            <MiniStat
              label="Income"
              value={<MoneyValue amount={stats.totalIncome} variant="income" />}
            />
            <MiniStat
              label="Expenses"
              value={<MoneyValue amount={stats.totalExpenses} variant="expense" />}
            />
            <MiniStat
              label="Net saved"
              value={
                <MoneyValue
                  amount={stats.balance}
                  variant={stats.balance === 0 ? "plain" : "delta"}
                />
              }
            />
            <MiniStat label="Savings rate" value={formatPercent(stats.savingsRate)} />
          </>
        )}
      </div>

      {quietMonth && (
        <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-border/70 bg-card px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[15px] font-semibold tracking-tight">
              No activity in {formatMonth(month)} yet
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add an income or expense to unlock trends, projections, and category breakdowns.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/transactions" className={buttonClassName({ variant: "outline" })}>
              <Wallet size={16} aria-hidden /> View transactions
            </Link>
            <Link href="/transactions" className={buttonClassName()}>
              <Plus size={16} aria-hidden /> Add transaction
            </Link>
          </div>
        </div>
      )}

      {insights && !quietMonth && <div className="mt-4"><MonthComparisonPanel insights={insights} /></div>}

      {insights && !quietMonth && (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <InvestmentPortfolioCard
            investment={insights.investment}
            portfolio={insights.portfolio}
          />
          {insights.accountFlows.some((a) => a.income > 0 || a.expense > 0) && (
            <AccountFlowsCard
              flows={insights.accountFlows.filter((a) => a.income > 0 || a.expense > 0)}
            />
          )}
        </div>
      )}

      {quietMonth && insights && (
        <div className="mt-4">
          <InvestmentPortfolioCard
            investment={insights.investment}
            portfolio={insights.portfolio}
          />
        </div>
      )}

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>6-month cash flow</CardTitle>
        </CardHeader>
        <CardContent>
          {!stats ? (
            <Skeleton className="h-[260px]" />
          ) : (
            <TrendChart data={stats.monthlyTrend} />
          )}
        </CardContent>
      </Card>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Expenses by category</CardTitle>
          </CardHeader>
          <CardContent>
            {!stats ? (
              <Skeleton className="h-[200px]" />
            ) : stats.expensesByCategory.length === 0 ? (
              <EmptyState
                icon={<PieChart size={22} />}
                title="No expenses this month"
                description="Log a spend to see where money goes."
                action={
                  <Link href="/transactions" className={buttonClassName()}>
                    <Plus size={16} aria-hidden /> Add expense
                  </Link>
                }
              />
            ) : (
              <CategoryDonut
                data={stats.expensesByCategory}
                centerLabel="Spent"
                centerValue={formatCurrency(stats.totalExpenses)}
                layout="split"
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Income by category</CardTitle>
          </CardHeader>
          <CardContent>
            {!stats ? (
              <Skeleton className="h-[200px]" />
            ) : stats.incomeByCategory.length === 0 ? (
              <EmptyState
                icon={<TrendingUp size={22} />}
                title="No income this month"
                description="Add salary, freelance, or other income to track inflows."
                action={
                  <Link
                    href="/transactions"
                    className={buttonClassName({ variant: "outline" })}
                  >
                    <Plus size={16} aria-hidden /> Add income
                  </Link>
                }
              />
            ) : (
              <CategoryDonut
                data={stats.incomeByCategory}
                centerLabel="Earned"
                centerValue={formatCurrency(stats.totalIncome)}
                layout="split"
              />
            )}
          </CardContent>
        </Card>
      </div>

      {stats && stats.expensesByCategory.length > 0 && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Top spending</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.expensesByCategory.slice(0, 8).map((c) => {
              const Icon = getCategoryIcon(c.icon);
              const pct = stats.totalExpenses > 0 ? c.total / stats.totalExpenses : 0;
              return (
                <div key={c.id}>
                  <div className="mb-1 flex items-center gap-2.5">
                    <div
                      className="flex h-7 w-7 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `${c.color}24`, color: c.color }}
                      aria-hidden
                    >
                      <Icon size={14} />
                    </div>
                    <span className="flex-1 text-sm font-medium">{c.name}</span>
                    <span className="text-sm font-semibold tabular-nums">
                      {formatCurrency(c.total)}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(pct * 100, 2)}%`,
                        backgroundColor: c.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-xl font-bold tracking-tight")}>{value}</p>
    </Card>
  );
}
