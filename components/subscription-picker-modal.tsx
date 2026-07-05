"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Repeat, Search } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/form";
import { formatCurrency, formatDate } from "@/lib/format";
import { BILLING_CYCLE_LABELS } from "@/lib/subscription-dates";
import { cn } from "@/lib/utils";

export type SelectedSubscription = {
  _id: Id<"subscriptions">;
  name: string;
  amount: number;
  billingCycle: keyof typeof BILLING_CYCLE_LABELS;
  categoryId?: Id<"categories">;
  accountId?: Id<"accounts">;
  nextRenewalDate?: string | null;
};

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (sub: SelectedSubscription) => void;
}

export function SubscriptionPickerModal({ open, onClose, onSelect }: Props) {
  const subs = useQuery(api.subscriptions.list, { activeOnly: true });
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const rows = subs ?? [];
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(
      (s) =>
        s.name.toLowerCase().includes(term) ||
        s.categoryName?.toLowerCase().includes(term) ||
        s.accountName?.toLowerCase().includes(term),
    );
  }, [subs, search]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Choose subscription"
      description="Select the subscription this payment is for"
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
            placeholder="Search subscriptions…"
            className="pl-9"
            autoFocus
          />
        </div>

        <div className="max-h-[min(360px,50vh)] space-y-2 overflow-y-auto">
          {subs === undefined && (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
          )}
          {subs !== undefined && filtered.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No active subscriptions found.
            </p>
          )}
          {filtered.map((s) => (
            <button
              key={s._id}
              type="button"
              onClick={() => {
                onSelect({
                  _id: s._id,
                  name: s.name,
                  amount: s.amount,
                  billingCycle: s.billingCycle,
                  categoryId: s.categoryId,
                  accountId: s.accountId,
                  nextRenewalDate: s.nextRenewalDate,
                });
                onClose();
              }}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border border-border/60 bg-card px-3.5 py-3 text-left transition-colors",
                "hover:border-primary/30 hover:bg-primary/5",
              )}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Repeat size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{s.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(s.amount)} · {BILLING_CYCLE_LABELS[s.billingCycle]}
                  {s.nextRenewalDate ? ` · Due ${formatDate(s.nextRenewalDate)}` : ""}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
