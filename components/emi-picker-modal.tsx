"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Landmark, Search } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/form";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

export type SelectedEmi = {
  _id: Id<"emis">;
  name: string;
  amount: number;
  expectedEmi: number;
  lender?: string | null;
  categoryId?: Id<"categories">;
  accountId?: Id<"accounts">;
  nextDebitDate?: string | null;
  tenureMonths?: number | null;
  totalInstallments?: number | null;
  paidInstallments?: number | null;
  principalAmount?: number | null;
  interestRate?: number | null;
  loanDate?: string | null;
  totalPaid?: number | null;
  progress?: number | null;
};

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (emi: SelectedEmi) => void;
}

export function EmiPickerModal({ open, onClose, onSelect }: Props) {
  const emis = useQuery(api.emis.list, { activeOnly: true });
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const rows = emis ?? [];
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(
      (e) =>
        e.name.toLowerCase().includes(term) ||
        e.lender?.toLowerCase().includes(term) ||
        e.categoryName?.toLowerCase().includes(term),
    );
  }, [emis, search]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Choose EMI"
      description="Select the loan EMI this payment is for"
      size="md"
    >
      <div className="space-y-4 px-1 pb-1">
        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search loans…"
            className="pl-9"
            autoFocus
          />
        </div>

        <div className="max-h-[min(360px,50vh)] space-y-2 overflow-y-auto">
          {emis === undefined && (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
          )}
          {emis !== undefined && filtered.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No active EMIs found.
            </p>
          )}
          {filtered.map((e) => (
            <button
              key={e._id}
              type="button"
              onClick={() => {
                onSelect({
                  _id: e._id,
                  name: e.name,
                  amount: e.amount,
                  expectedEmi: e.expectedEmi,
                  lender: e.lender,
                  categoryId: e.categoryId,
                  accountId: e.accountId,
                  nextDebitDate: e.nextDebitDate,
                  tenureMonths: e.tenureMonths,
                  totalInstallments: e.totalInstallments,
                  paidInstallments: e.paidInstallments,
                  principalAmount: e.principalAmount,
                  interestRate: e.interestRate,
                  loanDate: e.loanDate,
                  totalPaid: e.totalPaid,
                  progress: e.progress,
                });
                onClose();
              }}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border border-border/60 bg-card px-3.5 py-3 text-left transition-colors",
                "hover:border-primary/30 hover:bg-primary/5",
              )}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Landmark size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{e.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(e.expectedEmi)}/mo
                  {e.interestRate != null ? ` · ${e.interestRate}%` : ""}
                  {e.lender ? ` · ${e.lender}` : ""}
                  {e.nextDebitDate ? ` · Due ${formatDate(e.nextDebitDate)}` : ""}
                </p>
                {e.principalAmount != null && e.progress != null && (
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {formatCurrency(e.totalPaid)} of {formatCurrency(e.principalAmount)} (
                    {formatPercent(e.progress)})
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
