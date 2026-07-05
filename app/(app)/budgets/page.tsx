"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Target,
  Trash2,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { EmptyState, Skeleton } from "@/components/ui/misc";
import {
  FormBody,
  FormField,
  FormFooter,
  FormHint,
  MoneyInput,
  Select,
} from "@/components/ui/form";
import { getCategoryIcon } from "@/lib/icons";
import { cn } from "@/lib/utils";
import {
  currentMonth,
  formatCurrency,
  formatMonth,
  formatPercent,
  shiftMonth,
} from "@/lib/format";

const FORM_ID = "budget-form";

export default function BudgetsPage() {
  const [month, setMonth] = useState(currentMonth());
  const [modalOpen, setModalOpen] = useState(false);

  const budgets = useQuery(api.budgets.listByMonth, { month });
  const categories = useQuery(api.categories.list, { type: "expense" });
  const setBudget = useMutation(api.budgets.set);
  const removeBudget = useMutation(api.budgets.remove);

  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");

  const usedCategoryIds = useMemo(
    () => new Set((budgets ?? []).map((b) => b.categoryId as string)),
    [budgets],
  );
  const availableCategories = (categories ?? []).filter(
    (c) => !usedCategoryIds.has(c._id),
  );

  const totals = useMemo(() => {
    const list = budgets ?? [];
    const budgeted = list.reduce((s, b) => s + b.amount, 0);
    const spent = list.reduce((s, b) => s + b.spent, 0);
    return { budgeted, spent, remaining: budgeted - spent };
  }, [budgets]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (!categoryId || !parsed || parsed <= 0) return;
    await setBudget({
      categoryId: categoryId as Id<"categories">,
      month,
      amount: parsed,
    });
    setCategoryId("");
    setAmount("");
    setModalOpen(false);
  };

  return (
    <>
      <PageHeader
        title="Budgets"
        description="Set monthly limits and track your spending against them."
        action={
          <div className="flex items-center gap-2">
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
                onClick={() => setMonth(shiftMonth(month, 1))}
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <ChevronRight size={18} />
              </button>
            </div>
            <Button onClick={() => setModalOpen(true)}>
              <Plus size={16} /> Budget
            </Button>
          </div>
        }
      />

      {/* Overview */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Budgeted</p>
          <p className="mt-1 text-lg font-bold tabular-nums">{formatCurrency(totals.budgeted)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Spent</p>
          <p className="mt-1 text-lg font-bold tabular-nums text-[hsl(var(--expense))]">
            {formatCurrency(totals.spent)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Remaining</p>
          <p
            className={cn(
              "mt-1 text-lg font-bold tabular-nums",
              totals.remaining < 0 ? "text-[hsl(var(--expense))]" : "text-[hsl(var(--income))]",
            )}
          >
            {formatCurrency(totals.remaining)}
          </p>
        </Card>
      </div>

      <div className="mt-4">
        {!budgets ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
        ) : budgets.length === 0 ? (
          <Card>
            <CardContent className="pt-5">
              <EmptyState
                icon={<Target size={22} />}
                title="No budgets set for this month"
                description="Create a budget to keep your spending in check."
                action={<Button onClick={() => setModalOpen(true)}>Add budget</Button>}
              />
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {budgets.map((b) => {
              const Icon = getCategoryIcon(b.categoryIcon);
              const over = b.spent > b.amount;
              const pct = Math.min(b.progress, 1);
              return (
                <Card key={b._id} className="p-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `${b.categoryColor}24`, color: b.categoryColor }}
                    >
                      <Icon size={17} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{b.categoryName}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(b.spent)} of {formatCurrency(b.amount)}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        if (confirm("Remove this budget?")) removeBudget({ id: b._id });
                      }}
                      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-[hsl(var(--expense))]/10 hover:text-[hsl(var(--expense))]"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.max(pct * 100, 3)}%`,
                        backgroundColor: over ? "hsl(var(--expense))" : b.categoryColor,
                      }}
                    />
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-xs">
                    <span className={cn(over ? "font-medium text-[hsl(var(--expense))]" : "text-muted-foreground")}>
                      {over
                        ? `${formatCurrency(-b.remaining)} over`
                        : `${formatCurrency(b.remaining)} left`}
                    </span>
                    <span className="text-muted-foreground">{formatPercent(b.progress)}</span>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Set a budget"
        description={`Monthly spending limit · ${formatMonth(month)}`}
        footer={
          <FormFooter
            formId={FORM_ID}
            onCancel={() => setModalOpen(false)}
            submitLabel="Save budget"
            disabled={availableCategories.length === 0}
          />
        }
      >
        <form id={FORM_ID} onSubmit={handleAdd}>
          <FormBody>
            <FormField label="Category">
              <Select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
              >
                <option value="">Select a category</option>
                {availableCategories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </Select>
              {availableCategories.length === 0 && (
                <FormHint>All expense categories already have a budget this month.</FormHint>
              )}
            </FormField>

            <MoneyInput
              value={amount}
              onChange={setAmount}
              label="Monthly limit"
              size="md"
              required
            />
          </FormBody>
        </form>
      </Modal>
    </>
  );
}
