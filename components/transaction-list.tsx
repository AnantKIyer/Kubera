"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Pencil, Trash2 } from "lucide-react";
import { getCategoryIcon } from "@/lib/icons";
import { formatDayLabel, formatSigned } from "@/lib/format";
import { formatInCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { EditableTransaction } from "./transaction-form";

export interface TxItem {
  _id: Id<"transactions">;
  type: "income" | "expense" | "transfer";
  amount: number;
  originalAmount?: number;
  originalCurrency?: string;
  exchangeRate?: number;
  description?: string;
  categoryId?: Id<"categories">;
  accountId?: Id<"accounts">;
  transferToAccountId?: Id<"accounts">;
  date: string;
  categoryName: string | null;
  categoryColor: string | null;
  categoryIcon: string | null;
  categoryKind?: string | null;
  accountName?: string | null;
  accountColor?: string | null;
  accountLastFour?: string | null;
  transferToAccountName?: string | null;
  transferToAccountColor?: string | null;
}

function Row({
  tx,
  onEdit,
}: {
  tx: TxItem;
  onEdit?: (t: EditableTransaction) => void;
}) {
  const remove = useMutation(api.transactions.remove);
  const isTransfer = tx.type === "transfer";
  const Icon = getCategoryIcon(isTransfer ? "arrow-left-right" : tx.categoryIcon);
  const color = isTransfer
    ? (tx.accountColor ?? "#64748b")
    : (tx.categoryColor ?? "#94a3b8");
  const hasForeign =
    tx.originalCurrency && tx.originalAmount != null && tx.originalCurrency !== "INR";

  return (
    <div className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted/60">
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: `${color}1f`, color }}
      >
        <Icon size={18} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">
            {tx.description ||
              (isTransfer
                ? `${tx.accountName ?? "Account"} → ${tx.transferToAccountName ?? "Account"}`
                : tx.categoryName) ||
              "Transaction"}
          </p>
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {isTransfer
            ? `Transfer · ${tx.accountName ?? "From"} → ${tx.transferToAccountName ?? "To"}`
            : `${tx.categoryName ?? "Uncategorized"}${
                tx.categoryKind === "investment" ? " · Investment" : ""
              }${tx.accountName ? ` · ${tx.accountName}` : ""}${
                tx.accountLastFour ? ` ····${tx.accountLastFour}` : ""
              }`}
          {" · "}
          {formatDayLabel(tx.date)}
        </p>
      </div>

      <div className="text-right">
        <p
          className={cn(
            "text-sm font-semibold tabular-nums",
            tx.type === "income"
              ? "text-[hsl(var(--income))]"
              : tx.type === "transfer"
                ? "text-muted-foreground"
                : "text-foreground",
          )}
        >
          <span className="sr-only">
            {tx.type === "income"
              ? "Income "
              : tx.type === "expense"
                ? "Expense "
                : "Transfer "}
          </span>
          {formatSigned(tx.amount, tx.type)}
        </p>
        {hasForeign && (
          <p className="text-caption tabular-nums text-muted-foreground">
            {formatInCurrency(tx.originalAmount!, tx.originalCurrency!)}
          </p>
        )}
      </div>

      <div className="flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
        {onEdit && (
          <button
            type="button"
            onClick={() =>
              onEdit({
                _id: tx._id,
                type: tx.type,
                amount: tx.amount,
                originalAmount: tx.originalAmount,
                originalCurrency: tx.originalCurrency,
                exchangeRate: tx.exchangeRate,
                description: tx.description,
                categoryId: tx.categoryId,
                accountId: tx.accountId,
                transferToAccountId: tx.transferToAccountId,
                date: tx.date,
              })
            }
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="Edit"
            aria-label="Edit transaction"
          >
            <Pencil size={16} aria-hidden />
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            if (confirm("Delete this transaction?")) remove({ id: tx._id });
          }}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-[hsl(var(--expense))]/10 hover:text-[hsl(var(--expense))]"
          title="Delete"
          aria-label="Delete transaction"
        >
          <Trash2 size={16} aria-hidden />
        </button>
      </div>
    </div>
  );
}

export function TransactionList({
  transactions,
  onEdit,
  groupByDate = false,
}: {
  transactions: TxItem[];
  onEdit?: (t: EditableTransaction) => void;
  groupByDate?: boolean;
}) {
  if (!groupByDate) {
    return (
      <div className="space-y-0.5">
        {transactions.map((tx) => (
          <Row key={tx._id} tx={tx} onEdit={onEdit} />
        ))}
      </div>
    );
  }

  const groups = new Map<string, TxItem[]>();
  for (const tx of transactions) {
    if (!groups.has(tx.date)) groups.set(tx.date, []);
    groups.get(tx.date)!.push(tx);
  }

  return (
    <div className="space-y-5">
      {Array.from(groups.entries()).map(([date, items]) => {
        const dayNet = items.reduce((sum, t) => {
          if (t.type === "transfer") return sum;
          return sum + (t.type === "income" ? t.amount : -t.amount);
        }, 0);
        return (
          <div key={date}>
            <div className="mb-1 flex items-center justify-between px-3">
              <span className="text-xs font-medium text-muted-foreground">
                {formatDayLabel(date)}
              </span>
              <span
                className={cn(
                  "text-xs font-medium tabular-nums",
                  dayNet >= 0 ? "text-[hsl(var(--income))]" : "text-muted-foreground",
                )}
              >
                {formatSigned(Math.abs(dayNet), dayNet >= 0 ? "income" : "expense")}
              </span>
            </div>
            <div className="space-y-0.5">
              {items.map((tx) => (
                <Row key={tx._id} tx={tx} onEdit={onEdit} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
