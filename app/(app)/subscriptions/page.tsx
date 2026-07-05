"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Pencil, Plus, Repeat, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { EmptyState, Skeleton } from "@/components/ui/misc";
import {
  FormBody,
  FormField,
  FormFooter,
  FormRow,
  FormSection,
  Input,
  MoneyInput,
  SegmentedField,
  Select,
  Textarea,
} from "@/components/ui/form";
import { DatePicker } from "@/components/ui/date-picker";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  BILLING_CYCLE_LABELS,
  BILLING_CYCLE_OPTIONS,
  type BillingCycle,
} from "@/lib/subscription-dates";
import { cn } from "@/lib/utils";

const FORM_ID = "subscription-form";

interface EditingSub {
  _id: Id<"subscriptions">;
  name: string;
  amount: number;
  billingCycle: BillingCycle;
  categoryId?: Id<"categories">;
  accountId?: Id<"accounts">;
  nextRenewalDate?: string;
  notes?: string;
  isActive: boolean;
}

export default function SubscriptionsPage() {
  const subs = useQuery(api.subscriptions.list, {});
  const summary = useQuery(api.subscriptions.summary, {});
  const categories = useQuery(api.categories.list, { type: "expense" });
  const accounts = useQuery(api.accounts.list, { activeOnly: true });
  const create = useMutation(api.subscriptions.create);
  const update = useMutation(api.subscriptions.update);
  const remove = useMutation(api.subscriptions.remove);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EditingSub | null>(null);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [nextRenewalDate, setNextRenewalDate] = useState("");
  const [notes, setNotes] = useState("");

  const openNew = () => {
    setEditing(null);
    setName("");
    setAmount("");
    setBillingCycle("monthly");
    setCategoryId("");
    setAccountId("");
    setNextRenewalDate("");
    setNotes("");
    setOpen(true);
  };

  const openEdit = (s: EditingSub) => {
    setEditing(s);
    setName(s.name);
    setAmount(String(s.amount));
    setBillingCycle(s.billingCycle);
    setCategoryId(s.categoryId ?? "");
    setAccountId(s.accountId ?? "");
    setNextRenewalDate(s.nextRenewalDate ?? "");
    setNotes(s.notes ?? "");
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) return;

    if (editing) {
      await update({
        id: editing._id,
        name,
        amount: parsed,
        billingCycle,
        categoryId: (categoryId as Id<"categories">) || null,
        accountId: (accountId as Id<"accounts">) || null,
        nextRenewalDate: nextRenewalDate || null,
        notes: notes.trim() || null,
      });
    } else {
      await create({
        name,
        amount: parsed,
        billingCycle,
        categoryId: (categoryId as Id<"categories">) || undefined,
        accountId: (accountId as Id<"accounts">) || undefined,
        nextRenewalDate: nextRenewalDate || undefined,
        notes: notes.trim() || undefined,
      });
    }
    setOpen(false);
  };

  const toggleActive = async (s: EditingSub) => {
    await update({ id: s._id, isActive: !s.isActive });
  };

  return (
    <>
      <PageHeader
        title="Subscriptions"
        description="Track recurring fixed spends — monthly and yearly."
        action={
          <Button onClick={openNew}>
            <Plus size={16} /> Add subscription
          </Button>
        }
      />

      {summary && (
        <div className="mb-4 grid grid-cols-3 gap-3">
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
        </div>
      )}

      <Card>
        <CardContent className="pt-5">
          {!subs ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : subs.length === 0 ? (
            <EmptyState
              icon={<Repeat size={22} />}
              title="No subscriptions tracked"
              description="Add Netflix, gym, cloud storage, insurance — anything recurring."
              action={<Button onClick={openNew}>Add subscription</Button>}
            />
          ) : (
            <div className="space-y-2">
              {subs.map((s) => (
                <div
                  key={s._id}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border border-border px-4 py-3 transition-colors",
                    !s.isActive && "opacity-50",
                  )}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Repeat size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{s.name}</p>
                      {!s.isActive && (
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase">
                          Paused
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(s.amount)} · {BILLING_CYCLE_LABELS[s.billingCycle]}
                      {s.accountName ? ` · ${s.accountName}` : ""}
                      {s.nextRenewalDate ? ` · Renews ${formatDate(s.nextRenewalDate)}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums">
                      {formatCurrency(s.monthlyEquivalent)}/mo
                    </p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {formatCurrency(s.yearlyEquivalent)}/yr
                    </p>
                  </div>
                  <div className="flex gap-0.5">
                    <button
                      onClick={() => toggleActive(s as EditingSub)}
                      className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
                    >
                      {s.isActive ? "Pause" : "Resume"}
                    </button>
                    <button
                      onClick={() => openEdit(s as EditingSub)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("Delete this subscription?")) remove({ id: s._id });
                      }}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-[hsl(var(--expense))]/10 hover:text-[hsl(var(--expense))]"
                    >
                      <Trash2 size={14} />
                    </button>
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
        title={editing ? "Edit subscription" : "New subscription"}
        description="Track a recurring charge — monthly or yearly."
        size="lg"
        footer={
          <FormFooter
            formId={FORM_ID}
            onCancel={() => setOpen(false)}
            submitLabel={editing ? "Save changes" : "Add subscription"}
          />
        }
      >
        <form id={FORM_ID} onSubmit={handleSubmit}>
          <FormBody>
            <FormField label="Service name">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Netflix, Spotify, AWS…"
                required
                autoFocus
              />
            </FormField>

            <MoneyInput
              value={amount}
              onChange={setAmount}
              label="Charge amount"
              size="md"
              required
            />

            <SegmentedField
              label="Billing cycle"
              value={billingCycle}
              onChange={setBillingCycle}
              options={BILLING_CYCLE_OPTIONS.map((opt) => ({
                value: opt.value,
                label: opt.label,
                tone: "neutral" as const,
              }))}
            />

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
                <FormField label="Charged via">
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

            <FormRow>
              <FormField label="Next renewal">
                <DatePicker
                  value={nextRenewalDate}
                  onChange={setNextRenewalDate}
                  placeholder="Select renewal date"
                />
              </FormField>
            </FormRow>

            <FormField label="Notes" hint="Optional">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Family plan, annual discount…"
                rows={2}
              />
            </FormField>
          </FormBody>
        </form>
      </Modal>
    </>
  );
}
