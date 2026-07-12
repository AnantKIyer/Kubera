"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Plus, Search, ArrowLeftRight } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/form";
import { Skeleton, EmptyState, SegmentedControl } from "@/components/ui/misc";
import { TransactionList, type TxItem } from "@/components/transaction-list";
import {
  TransactionForm,
  EditableTransaction,
} from "@/components/transaction-form";
import { formatCurrency } from "@/lib/format";

type Filter = "all" | "income" | "expense";

export default function TransactionsPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<EditableTransaction | null>(null);

  const transactions = useQuery(api.transactions.list, {
    type: filter === "all" ? undefined : filter,
    search: search.trim() || undefined,
    limit: 100,
  });

  const summary = useQuery(api.transactions.summary, {
    type: filter === "all" ? undefined : filter,
  });

  const totals = useMemo(() => {
    if (summary) {
      return {
        income: summary.income,
        expense: summary.expense,
        count: summary.count,
      };
    }
    const list: TxItem[] = transactions ?? [];
    return {
      income: list.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0),
      expense: list.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0),
      count: list.length,
    };
  }, [summary, transactions]);

  const openEdit = (t: EditableTransaction) => {
    setEditing(t);
    setFormOpen(true);
  };
  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  return (
    <>
      <PageHeader
        title="Transactions"
        description="Every rupee in and out, in one place."
        action={
          <Button onClick={openNew}>
            <Plus size={16} /> Add transaction
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-xs">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by note, category, amount…"
            className="pl-9"
          />
        </div>
        <SegmentedControl<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All" },
            { value: "income", label: "Income" },
            { value: "expense", label: "Expense" },
          ]}
        />
      </div>

      {/* Summary bar */}
      <div className="mb-4 grid grid-cols-3 gap-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Income</p>
          <p className="mt-1 text-lg font-bold tabular-nums text-[hsl(var(--income))]">
            {formatCurrency(totals.income)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Expense</p>
          <p className="mt-1 text-lg font-bold tabular-nums text-[hsl(var(--expense))]">
            {formatCurrency(totals.expense)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Net</p>
          <p className="mt-1 text-lg font-bold tabular-nums">
            {formatCurrency(totals.income - totals.expense)}
          </p>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-5">
          {!transactions ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <EmptyState
              icon={<ArrowLeftRight size={22} />}
              title={search ? "No matches" : "No transactions yet"}
              description={
                search
                  ? "Try a different search term or filter."
                  : "Add your first transaction to get started."
              }
              action={!search && <Button onClick={openNew}>Add transaction</Button>}
            />
          ) : (
            <>
              <TransactionList transactions={transactions} onEdit={openEdit} groupByDate />
              {transactions.length >= 100 && !search.trim() && (
                <p className="mt-4 text-center text-xs text-muted-foreground">
                  Showing the latest 100 transactions. Use search to find older ones.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <TransactionForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        editing={editing}
      />
    </>
  );
}
