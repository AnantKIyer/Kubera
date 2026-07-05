"use client";

import { forwardRef, useImperativeHandle, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Pencil, Plus, Trash2, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState, Skeleton } from "@/components/ui/misc";
import { formatCurrency, formatDate } from "@/lib/format";
import { INVESTMENT_TYPE_LABELS, type InvestmentType } from "@/lib/investments";
import { cn } from "@/lib/utils";
import {
  InvestmentFormModal,
  TypeIcon,
  type EditingInvestment,
} from "@/components/investments/investment-form-modal";

export interface InvestmentsSectionHandle {
  openNew: () => void;
}

interface InvestmentsSectionProps {
  compact?: boolean;
  showHeader?: boolean;
}

export const InvestmentsSection = forwardRef<InvestmentsSectionHandle, InvestmentsSectionProps>(
  function InvestmentsSection({ compact = false, showHeader = false }, ref) {
    const investments = useQuery(api.investments.list, {});
    const summary = useQuery(api.investments.summary, {});
    const remove = useMutation(api.investments.remove);
    const update = useMutation(api.investments.update);

    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<EditingInvestment | null>(null);

    const openNew = () => {
      setEditing(null);
      setOpen(true);
    };

    const openEdit = (row: EditingInvestment) => {
      setEditing(row);
      setOpen(true);
    };

    useImperativeHandle(ref, () => ({ openNew }));

    const toggleActive = async (row: EditingInvestment) => {
      await update({ id: row._id, isActive: !row.isActive });
    };

    const rows = compact ? (investments ?? []).slice(0, 4) : investments;

    return (
      <>
        {showHeader && (
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Portfolio</h2>
              {summary && (
                <p className="text-sm text-muted-foreground">
                  {formatCurrency(summary.totalCurrentValue)} total value
                  {summary.totalGain !== 0 && (
                    <span
                      className={cn(
                        "ml-1",
                        summary.totalGain >= 0
                          ? "text-[hsl(var(--income))]"
                          : "text-[hsl(var(--expense))]",
                      )}
                    >
                      ({summary.totalGain >= 0 ? "+" : ""}
                      {formatCurrency(summary.totalGain)})
                    </span>
                  )}
                </p>
              )}
            </div>
            <Button size="sm" onClick={openNew}>
              <Plus size={14} /> Add
            </Button>
          </div>
        )}

        {summary && !compact && (
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">Active</p>
              <p className="mt-1 text-xl font-bold">{summary.count}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">Invested</p>
              <p className="mt-1 text-xl font-bold tabular-nums">
                {formatCurrency(summary.totalInvested)}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">Current value</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-[hsl(var(--income))]">
                {formatCurrency(summary.totalCurrentValue)}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">Monthly SIP / RD</p>
              <p className="mt-1 text-xl font-bold tabular-nums">
                {formatCurrency(summary.monthlyContribution)}
              </p>
            </Card>
          </div>
        )}

        <Card>
          <CardContent className="pt-5">
            {!investments ? (
              <div className="space-y-2">
                {Array.from({ length: compact ? 2 : 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : investments.length === 0 ? (
              <EmptyState
                icon={<TrendingUp size={22} />}
                title="No investments tracked"
                description="Add SIPs, mutual funds, stocks, gold, FD, RD, LIC, or crypto."
                action={
                  <Button onClick={openNew}>
                    <Plus size={16} /> Add investment
                  </Button>
                }
              />
            ) : (
              <div className="space-y-2">
                {rows?.map((row) => (
                  <div
                    key={row._id}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border border-border px-4 py-3 transition-colors",
                      !row.isActive && "opacity-50",
                    )}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <TypeIcon type={row.investmentType as InvestmentType} size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{row.name}</p>
                        {!row.isActive && (
                          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase">
                            Paused
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {INVESTMENT_TYPE_LABELS[row.investmentType as InvestmentType]}
                        {row.accountName ? ` · ${row.accountName}` : ""}
                        {row.monthlyAmount ? ` · ${formatCurrency(row.monthlyAmount)}/mo` : ""}
                        {row.maturityDate ? ` · matures ${formatDate(row.maturityDate)}` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold tabular-nums">
                        {formatCurrency(row.portfolioValue)}
                      </p>
                      <p
                        className={cn(
                          "text-xs tabular-nums",
                          row.gain >= 0 ? "text-[hsl(var(--income))]" : "text-[hsl(var(--expense))]",
                        )}
                      >
                        {row.gain >= 0 ? "+" : ""}
                        {formatCurrency(row.gain)}
                      </p>
                    </div>
                    {!compact && (
                      <div className="flex gap-0.5">
                        <button
                          onClick={() => toggleActive(row as EditingInvestment)}
                          className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
                        >
                          {row.isActive ? "Pause" : "Resume"}
                        </button>
                        <button
                          onClick={() => openEdit(row as EditingInvestment)}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm("Delete this investment?")) remove({ id: row._id });
                          }}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-[hsl(var(--expense))]/10 hover:text-[hsl(var(--expense))]"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                {compact && investments.length > 4 && (
                  <Link
                    href="/investments"
                    className="block pt-2 text-center text-sm font-medium text-primary hover:underline"
                  >
                    View all {investments.length} investments
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <InvestmentFormModal open={open} onClose={() => setOpen(false)} editing={editing} />
      </>
    );
  },
);
