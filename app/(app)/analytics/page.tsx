"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ChevronLeft, ChevronRight, TrendingUp, PieChart } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  shiftMonth,
} from "@/lib/format";
import {
  MonthComparisonPanel,
  InvestmentPortfolioCard,
  AccountFlowsCard,
} from "@/components/insights-panels";

export default function AnalyticsPage() {
  const [month, setMonth] = useState(currentMonth());
  const { start, end } = monthRange(month);
  const stats = useQuery(api.stats.overview, { start, end, months: 6 });
  const insights = useQuery(api.stats.insights, { month });

  const isCurrent = month >= currentMonth();

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Understand where your money goes over time."
        action={
          <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
            <button
              onClick={() => setMonth(shiftMonth(month, -1))}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="min-w-[120px] text-center text-sm font-semibold">
              {formatMonth(month)}
            </span>
            <button
              onClick={() => !isCurrent && setMonth(shiftMonth(month, 1))}
              disabled={isCurrent}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {!stats ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)
        ) : (
          <>
            <MiniStat label="Income" value={formatCurrency(stats.totalIncome)} className="text-[hsl(var(--income))]" />
            <MiniStat label="Expenses" value={formatCurrency(stats.totalExpenses)} className="text-[hsl(var(--expense))]" />
            <MiniStat label="Net saved" value={formatCurrency(stats.balance)} />
            <MiniStat label="Savings rate" value={formatPercent(stats.savingsRate)} />
          </>
        )}
      </div>

      {insights && <MonthComparisonPanel insights={insights} />}

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {insights && (
          <InvestmentPortfolioCard
            investment={insights.investment}
            portfolio={insights.portfolio}
          />
        )}
        {insights && insights.accountFlows.some((a) => a.income > 0 || a.expense > 0) && (
          <AccountFlowsCard flows={insights.accountFlows.filter((a) => a.income > 0 || a.expense > 0)} />
        )}
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>6-month cash flow</CardTitle>
        </CardHeader>
        <CardContent>
          {!stats ? <Skeleton className="h-[260px]" /> : <TrendChart data={stats.monthlyTrend} />}
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
              <EmptyState icon={<PieChart size={22} />} title="No expenses this month" />
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
              <EmptyState icon={<TrendingUp size={22} />} title="No income this month" />
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

      {/* Top spending list */}
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
                      style={{ width: `${Math.max(pct * 100, 2)}%`, backgroundColor: c.color }}
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
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <Card className="p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${className ?? ""}`}>{value}</p>
    </Card>
  );
}
