"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Landmark, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { EmptyState, Skeleton } from "@/components/ui/misc";
import {
  FormBody,
  FormField,
  FormFooter,
  FormHint,
  FormRow,
  FormSection,
  Input,
  MoneyInput,
  Select,
  Textarea,
} from "@/components/ui/form";
import { DatePicker } from "@/components/ui/date-picker";
import {
  LoanDetailsFields,
  emptyLoanDetails,
  type LoanDetailsValues,
} from "@/components/loan-details-fields";
import { calculateEmi, inferPastLoanSchedule } from "@/lib/emi";
import { formatCurrency, formatDate, formatPercent, toISODate } from "@/lib/format";
import { cn } from "@/lib/utils";

const FORM_ID = "emi-form";
const todayIso = () => toISODate(new Date());

interface EditingEmi {
  _id: Id<"emis">;
  name: string;
  amount: number;
  lender?: string;
  categoryId?: Id<"categories">;
  accountId?: Id<"accounts">;
  nextDebitDate?: string;
  totalInstallments?: number;
  tenureMonths?: number;
  paidInstallments?: number;
  principalAmount?: number;
  interestRate?: number;
  loanDate?: string;
  expectedEmiAmount?: number;
  extraPaidTotal?: number;
  notes?: string;
  isActive: boolean;
}

export type EmisSectionHandle = {
  openNew: () => void;
};

export const EmisSection = forwardRef<EmisSectionHandle>(function EmisSection(_props, ref) {
  const emis = useQuery(api.emis.list, {});
  const summary = useQuery(api.emis.summary, {});
  const categories = useQuery(api.categories.list, { type: "expense" });
  const accounts = useQuery(api.accounts.list, { activeOnly: true });
  const create = useMutation(api.emis.create);
  const update = useMutation(api.emis.update);
  const remove = useMutation(api.emis.remove);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EditingEmi | null>(null);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [lender, setLender] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [nextDebitDate, setNextDebitDate] = useState("");
  const [loanDetails, setLoanDetails] = useState<LoanDetailsValues>(emptyLoanDetails());
  const [notes, setNotes] = useState("");
  const [pastHint, setPastHint] = useState<string | null>(null);

  const tenure = loanDetails.tenureMonths ? parseInt(loanDetails.tenureMonths, 10) : undefined;

  const calculatedEmi = useMemo(() => {
    const principal = parseFloat(loanDetails.principalAmount);
    const rate = parseFloat(loanDetails.interestRate);
    if (!principal || !tenure || !loanDetails.interestRate.trim()) return null;
    if (Number.isNaN(rate)) return null;
    return calculateEmi(principal, rate, tenure);
  }, [loanDetails, tenure]);

  useEffect(() => {
    if (calculatedEmi != null && !editing && loanDetails.interestRate.trim()) {
      setAmount(String(calculatedEmi));
    }
  }, [calculatedEmi, editing, loanDetails.interestRate]);

  useEffect(() => {
    if (!loanDetails.loanDate || editing) {
      setPastHint(null);
      return;
    }
    const past = inferPastLoanSchedule(loanDetails.loanDate, tenure);
    if (past && past.paidInstallments > 0) {
      setPastHint(
        `${past.paidInstallments} installment${past.paidInstallments !== 1 ? "s" : ""} already paid based on loan date`,
      );
      if (past.nextDebitDate) setNextDebitDate(past.nextDebitDate);
    } else {
      setPastHint(null);
    }
  }, [loanDetails.loanDate, tenure, editing]);

  const openNew = useCallback(() => {
    setEditing(null);
    setName("");
    setAmount("");
    setLender("");
    setCategoryId("");
    setAccountId("");
    setNextDebitDate("");
    setLoanDetails(emptyLoanDetails());
    setNotes("");
    setPastHint(null);
    setOpen(true);
  }, []);

  useImperativeHandle(ref, () => ({ openNew }), [openNew]);

  const openEdit = (e: EditingEmi) => {
    setEditing(e);
    setName(e.name);
    setAmount(String(e.expectedEmiAmount ?? e.amount));
    setLender(e.lender ?? "");
    setCategoryId(e.categoryId ?? "");
    setAccountId(e.accountId ?? "");
    setNextDebitDate(e.nextDebitDate ?? "");
    setLoanDetails({
      principalAmount: e.principalAmount != null ? String(e.principalAmount) : "",
      interestRate: e.interestRate != null ? String(e.interestRate) : "",
      tenureMonths:
        e.tenureMonths != null
          ? String(e.tenureMonths)
          : e.totalInstallments != null
            ? String(e.totalInstallments)
            : "",
      loanDate: e.loanDate ?? "",
    });
    setNotes(e.notes ?? "");
    setPastHint(null);
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) return;

    const principal = loanDetails.principalAmount
      ? parseFloat(loanDetails.principalAmount)
      : undefined;
    const rate = loanDetails.interestRate ? parseFloat(loanDetails.interestRate) : undefined;
    const safeNext =
      nextDebitDate && nextDebitDate >= todayIso() ? nextDebitDate : undefined;

    if (editing) {
      await update({
        id: editing._id,
        name,
        amount: parsed,
        lender: lender.trim() || null,
        categoryId: (categoryId as Id<"categories">) || null,
        accountId: (accountId as Id<"accounts">) || null,
        nextDebitDate: safeNext || null,
        tenureMonths: tenure ?? null,
        totalInstallments: tenure ?? null,
        principalAmount: principal ?? null,
        interestRate: rate ?? null,
        loanDate: loanDetails.loanDate || null,
        notes: notes.trim() || null,
      });
    } else {
      await create({
        name,
        amount: parsed,
        lender: lender.trim() || undefined,
        categoryId: (categoryId as Id<"categories">) || undefined,
        accountId: (accountId as Id<"accounts">) || undefined,
        nextDebitDate: safeNext,
        tenureMonths: tenure,
        totalInstallments: tenure,
        principalAmount: principal,
        interestRate: rate,
        loanDate: loanDetails.loanDate || undefined,
        notes: notes.trim() || undefined,
      });
    }
    setOpen(false);
  };

  const toggleActive = async (e: EditingEmi) => {
    await update({ id: e._id, isActive: !e.isActive });
  };

  return (
    <>
      {summary && (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Active</p>
            <p className="mt-1 text-xl font-bold">{summary.count}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Monthly burn</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-[hsl(var(--expense))]">
              {formatCurrency(summary.monthlyTotal)}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Yearly burn</p>
            <p className="mt-1 text-xl font-bold tabular-nums">
              {formatCurrency(summary.yearlyTotal)}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Extra paid</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-[hsl(var(--income))]">
              {formatCurrency(summary.extraPaidTotal)}
            </p>
          </Card>
        </div>
      )}

      <Card>
        <CardContent className="pt-5">
          {!emis ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : emis.length === 0 ? (
            <EmptyState
              icon={<Landmark size={22} />}
              title="No loans tracked"
              description="Add education loans, bike EMIs, or any monthly loan debit."
              action={<Button onClick={openNew}>Add loan</Button>}
            />
          ) : (
            <div className="space-y-2">
              {emis.map((e) => (
                <div
                  key={e._id}
                  className={cn(
                    "rounded-xl border border-border px-4 py-3 transition-colors",
                    !e.isActive && "opacity-50",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Landmark size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">{e.name}</p>
                        {!e.isActive && (
                          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase">
                            Closed
                          </span>
                        )}
                        {(e.extraPaidTotal ?? 0) > 0 && (
                          <span className="rounded bg-[hsl(var(--income))]/12 px-1.5 py-0.5 text-[10px] font-medium text-[hsl(var(--income))]">
                            +{formatCurrency(e.extraPaidTotal ?? 0)} extra
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(e.expectedEmi)}/mo
                        {e.lender ? ` · ${e.lender}` : ""}
                        {e.interestRate != null ? ` · ${e.interestRate}% p.a.` : ""}
                        {e.loanDate ? ` · Taken ${formatDate(e.loanDate)}` : ""}
                        {e.nextDebitDate ? ` · Next ${formatDate(e.nextDebitDate)}` : ""}
                      </p>
                      {e.principalAmount != null && (
                        <div className="mt-2">
                          <div className="mb-1 flex justify-between text-[10px] text-muted-foreground">
                            <span>
                              Paid {formatCurrency(e.totalPaid)} of{" "}
                              {formatCurrency(e.principalAmount)}
                            </span>
                            {e.progress != null && <span>{formatPercent(e.progress)}</span>}
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary transition-all"
                              style={{ width: `${(e.progress ?? 0) * 100}%` }}
                            />
                          </div>
                        </div>
                      )}
                      <p className="mt-1.5 text-[11px] text-muted-foreground">
                        {e.tenureMonths != null
                          ? `${e.paidInstallments ?? 0}/${e.tenureMonths} installments`
                          : null}
                        {e.principalAmount != null
                          ? ` · Principal ${formatCurrency(e.principalAmount)}`
                          : null}
                      </p>
                    </div>
                    <div className="flex gap-0.5">
                      <button
                        onClick={() => toggleActive(e as EditingEmi)}
                        className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
                      >
                        {e.isActive ? "Pause" : "Resume"}
                      </button>
                      <button
                        onClick={() => openEdit(e as EditingEmi)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm("Delete this loan?")) remove({ id: e._id });
                        }}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-[hsl(var(--expense))]/10 hover:text-[hsl(var(--expense))]"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit loan" : "New loan"}
        description="Enter loan details to calculate EMI and track progress."
        size="lg"
        footer={
          <FormFooter
            formId={FORM_ID}
            onCancel={() => setOpen(false)}
            submitLabel={editing ? "Save changes" : "Add loan"}
          />
        }
      >
        <form id={FORM_ID} onSubmit={handleSubmit}>
          <FormBody>
            <FormField label="Loan name">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Education loan, Bike EMI…"
                required
                autoFocus
              />
            </FormField>

            <LoanDetailsFields
              values={loanDetails}
              onChange={(patch) => setLoanDetails((prev) => ({ ...prev, ...patch }))}
              emiAmount={amount}
            />

            {pastHint && <FormHint>{pastHint}</FormHint>}

            <MoneyInput
              value={amount}
              onChange={setAmount}
              label="Monthly EMI amount"
              size="md"
              required
            />

            <FormField label="Lender" hint="Optional">
              <Input
                value={lender}
                onChange={(e) => setLender(e.target.value)}
                placeholder="HDFC, Bajaj Finance…"
              />
            </FormField>

            <FormSection title="Link to">
              <FormRow>
                <FormField label="Category">
                  <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                    <option value="">None</option>
                    {(categories ?? []).map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Debited from">
                  <Select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                    <option value="">None</option>
                    {(accounts ?? []).map((a) => (
                      <option key={a._id} value={a._id}>
                        {a.name}
                      </option>
                    ))}
                  </Select>
                </FormField>
              </FormRow>
            </FormSection>

            <FormField label="Next installment date" hint="Cannot be before today">
              <DatePicker
                value={nextDebitDate}
                onChange={setNextDebitDate}
                placeholder="Select next due date"
                minDate={todayIso()}
              />
            </FormField>

            <FormField label="Notes" hint="Optional">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Co-borrower, collateral…"
                rows={2}
              />
            </FormField>
          </FormBody>
        </form>
      </Modal>
    </>
  );
});
