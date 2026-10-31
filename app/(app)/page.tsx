"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronDown,
  PiggyBank,
  Plus,
  Wallet,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton, EmptyState } from "@/components/ui/misc";
import { TrendChart } from "@/components/charts/trend-chart";
import { CategoryDonut } from "@/components/charts/category-donut";
import { TransactionList } from "@/components/transaction-list";
import {
  TransactionForm,
  EditableTransaction,
} from "@/components/transaction-form";
import {
  currentMonth,
  formatCurrency,
  formatCurrencyWhole,
  formatMonth,
  formatPercent,
  monthRange,
} from "@/lib/format";
import {
  MonthComparisonPanel,
  InvestmentPortfolioCard,
  SubscriptionBurnCard,
  EmiBurnCard,
  CreditUtilizationCard,
  AccountFlowsCard,
  BankBalancesCard,
} from "@/components/insights-panels";
import {
  InvestmentFormModal,
  type EditingInvestment,
} from "@/components/investments/investment-form-modal";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const month = currentMonth();
  const { start, end } = monthRange(month);

  const stats = useQuery(api.stats.overview, { start, end, months: 6 });
  const insights = useQuery(api.stats.insights, { month });
  const recent = useQuery(api.transactions.list, { limit: 6 });

  const [formOpen, setFormOpen] = useState(false);
  const [formType, setFormType] = useState<"income" | "expense" | undefined>();
  const [editing, setEditing] = useState<EditableTransaction | null>(null);
  const [investmentModalOpen, setInvestmentModalOpen] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<EditingInvestment | null>(null);
  const [insightsOpen, setInsightsOpen] = useState(false);

  const openInvestmentModal = () => {
    setEditingInvestment(null);
    setInvestmentModalOpen(true);
  };

  const openNew = (type?: "income" | "expense") => {
    setEditing(null);
    setFormType(type);
    setFormOpen(true);
  };
  const openEdit = (t: EditableTransaction) => {
    setEditing(t);
    setFormType(undefined);
    setFormOpen(true);
  };

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`Your money at a glance · ${formatMonth(month)}`}
        actionOnDesktopOnly
        action={
          <>
            <Button variant="outline" size="md" onClick={() => openNew("income")}>
              <ArrowDownLeft size={16} aria-hidden /> Income
            </Button>
            <Button size="md" onClick={() => openNew("expense")}>
              <Plus size={16} aria-hidden /> Add expense
            </Button>
          </>
        }
      />

      {/* Primary KPIs — one glance */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {!stats || !insights ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[116px]" />
          ))
        ) : (
          <>
            <StatCard
              title="Balance"
              value={formatCurrencyWhole(insights.accountBalances.totalBankBalance)}
              icon={Wallet}
              tone="balance"
              highlight
              hint={
                insights.accountBalances.bankCount > 0
                  ? `${insights.accountBalances.banksWithBalance} of ${insights.accountBalances.bankCount} banks · ${formatCurrency(stats.balance)} net this month`
                  : `${formatCurrency(stats.balance)} net this month · add bank accounts`
              }
            />
            <StatCard
              title="Income"
              value={formatCurrencyWhole(stats.totalIncome)}
              icon={ArrowUpRight}
              tone="income"
              signed
              hint={`${stats.transactionCount} transactions`}
            />
            <StatCard
              title="Expenses"
              value={formatCurrencyWhole(stats.totalExpenses)}
              icon={ArrowDownLeft}
              tone="expense"
              signed
              hint="Spent this month"
            />
            <StatCard
              title="Savings rate"
              value={formatPercent(stats.savingsRate)}
              icon={PiggyBank}
              tone="neutral"
              hint={stats.savingsRate >= 0.2 ? "On track" : "Room to improve"}
            />
          </>
        )}
      </div>

      {/* Charts — secondary focus */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Cash flow</CardTitle>
            <span className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[hsl(var(--income))]" aria-hidden />
                <span>Income (+)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[hsl(var(--expense))]" aria-hidden />
                <span>Expense (−)</span>
              </span>
            </span>
          </CardHeader>
          <CardContent>
            {!stats ? (
              <Skeleton className="h-[260px]" />
            ) : (
              <TrendChart data={stats.monthlyTrend} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Spending by category</CardTitle>
          </CardHeader>
          <CardContent>
            {!stats ? (
              <Skeleton className="h-[200px]" />
            ) : stats.expensesByCategory.length === 0 ? (
              <EmptyState
                icon={<Sparkles size={22} />}
                title="No spending yet"
                description="Add an expense to see your category breakdown."
              />
            ) : (
              <CategoryDonut
                data={stats.expensesByCategory}
                centerLabel="Spent"
                centerValue={formatCurrency(stats.totalExpenses)}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent activity */}
      <Card className="mt-4">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Recent activity</CardTitle>
          <Link
            href="/transactions"
            className="inline-flex min-h-11 items-center gap-1 px-1 text-sm font-medium text-primary hover:underline"
          >
            View all <ArrowRight size={14} aria-hidden />
          </Link>
        </CardHeader>
        <CardContent>
          {!recent ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          ) : recent.length === 0 ? (
            <EmptyState
              icon={<Wallet size={22} />}
              title="No transactions yet"
              description="Start by adding your first income or expense."
              action={<Button onClick={() => openNew("expense")}>Add transaction</Button>}
            />
          ) : (
            <TransactionList transactions={recent} onEdit={openEdit} />
          )}
        </CardContent>
      </Card>

      {/* Deeper insights — progressive disclosure */}
      <div className="mt-4">
        <button
          type="button"
          onClick={() => setInsightsOpen((o) => !o)}
          aria-expanded={insightsOpen}
          className="flex min-h-11 w-full items-center justify-between rounded-xl border border-border/60 bg-card px-4 py-3 text-left transition-colors hover:bg-muted/40"
        >
          <div>
            <p className="text-[15px] font-semibold tracking-tight">More insights</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Month comparison, investments, subscriptions, EMIs, and account flows
            </p>
          </div>
          <ChevronDown
            size={20}
            className={cn(
              "shrink-0 text-muted-foreground transition-transform duration-200",
              insightsOpen && "rotate-180",
            )}
            aria-hidden
          />
        </button>

        {insightsOpen && (
          <div className="mt-3 space-y-4 animate-fade-in">
            {insights ? (
              <>
                <MonthComparisonPanel insights={insights} />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <InvestmentPortfolioCard
                    investment={insights.investment}
                    portfolio={insights.portfolio}
                    onAdd={openInvestmentModal}
                  />
                  <SubscriptionBurnCard subscriptions={insights.subscriptions} />
                  <EmiBurnCard emis={insights.emis} />
                  <CreditUtilizationCard creditCards={insights.creditCards} />
                  <BankBalancesCard balances={insights.accountBalances} />
                  {insights.accountFlows.some((a) => a.income > 0 || a.expense > 0) && (
                    <AccountFlowsCard
                      flows={insights.accountFlows.filter(
                        (a) => a.income > 0 || a.expense > 0,
                      )}
                    />
                  )}
                </div>
              </>
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Skeleton className="h-64" />
                <Skeleton className="h-64" />
              </div>
            )}
          </div>
        )}
      </div>

      <TransactionForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        initialType={formType}
        editing={editing}
      />

      <InvestmentFormModal
        open={investmentModalOpen}
        onClose={() => setInvestmentModalOpen(false)}
        editing={editingInvestment}
      />
    </>
  );
}
