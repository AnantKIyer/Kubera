"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { CreditCard, Landmark, Pencil, Plus, Trash2, Wallet } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { EmptyState, Skeleton } from "@/components/ui/misc";
import {
  ColorPicker,
  FormBody,
  FormError,
  FormField,
  FormFooter,
  FormRow,
  FormSection,
  Input,
  MoneyInput,
  PreviewBadge,
  SegmentedField,
  Select,
} from "@/components/ui/form";
import { EmisSection, type EmisSectionHandle } from "@/components/accounts/emis-section";
import { COLOR_OPTIONS } from "@/lib/icons";
import { formatCurrency, formatPercent, currentMonth } from "@/lib/format";
import { parseUserError } from "@/lib/errors";
import { cn } from "@/lib/utils";

const FORM_ID = "account-form";

type AccountType = "bank" | "credit" | "debit" | "wallet";

const TYPE_LABELS: Record<AccountType, string> = {
  bank: "Bank account",
  credit: "Credit card",
  debit: "Debit card",
  wallet: "Wallet / UPI",
};

function TypeIcon({ type, size = 18 }: { type: AccountType; size?: number }) {
  if (type === "bank") return <Landmark size={size} />;
  if (type === "wallet") return <Wallet size={size} />;
  return <CreditCard size={size} />;
}

function AccountTypePicker({
  value,
  onChange,
}: {
  value: AccountType;
  onChange: (t: AccountType) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {(Object.keys(TYPE_LABELS) as AccountType[]).map((t) => {
        const active = value === t;
        return (
          <button
            key={t}
            type="button"
            onClick={() => onChange(t)}
            className={cn(
              "flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-sm transition-all",
              active
                ? "border-primary/40 bg-primary/8 text-foreground ring-1 ring-primary/20"
                : "border-border/50 bg-muted/20 text-muted-foreground hover:border-border hover:bg-muted/35",
            )}
          >
            <TypeIcon type={t} size={16} />
            <span className="text-xs font-medium leading-tight">{TYPE_LABELS[t]}</span>
          </button>
        );
      })}
    </div>
  );
}

interface EditingAccount {
  _id: Id<"accounts">;
  name: string;
  type: AccountType;
  institution?: string;
  lastFour?: string;
  color: string;
  creditLimit?: number;
  currentBalance?: number;
  linkedBankAccountId?: Id<"accounts">;
  initialUtilized?: number;
}

export default function AccountsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") === "loans" ? "loans" : "accounts";
  const emisRef = useRef<EmisSectionHandle>(null);

  const accounts = useQuery(api.accounts.listWithUsage, { month: currentMonth() });
  const insights = useQuery(api.stats.insights, { month: currentMonth() });
  const create = useMutation(api.accounts.create);
  const update = useMutation(api.accounts.update);
  const remove = useMutation(api.accounts.remove);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EditingAccount | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("bank");
  const [institution, setInstitution] = useState("");
  const [lastFour, setLastFour] = useState("");
  const [color, setColor] = useState(COLOR_OPTIONS[5]);
  const [creditLimit, setCreditLimit] = useState("");
  const [initialUtilized, setInitialUtilized] = useState("");
  const [currentBalance, setCurrentBalance] = useState("");
  const [linkedBankAccountId, setLinkedBankAccountId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const flows = insights?.accountFlows ?? [];
  const bankAccounts =
    accounts?.filter((a) => a.type === "bank" && a._id !== editing?._id) ?? [];

  const openNew = () => {
    setEditing(null);
    setName("");
    setType("bank");
    setInstitution("");
    setLastFour("");
    setColor(COLOR_OPTIONS[5]);
    setCreditLimit("");
    setInitialUtilized("");
    setCurrentBalance("");
    setLinkedBankAccountId("");
    setError(null);
    setOpen(true);
  };

  const openEdit = (a: EditingAccount) => {
    setEditing(a);
    setName(a.name);
    setType(a.type);
    setInstitution(a.institution ?? "");
    setLastFour(a.lastFour ?? "");
    setColor(a.color);
    setCreditLimit(a.creditLimit != null ? String(a.creditLimit) : "");
    setInitialUtilized(a.initialUtilized != null ? String(a.initialUtilized) : "");
    setCurrentBalance(a.currentBalance != null ? String(a.currentBalance) : "");
    setLinkedBankAccountId(a.linkedBankAccountId ?? "");
    setError(null);
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const parsedLimit = creditLimit ? parseFloat(creditLimit) : undefined;
      const parsedInitialUtilized = initialUtilized ? parseFloat(initialUtilized) : undefined;
      const parsedBalance = currentBalance ? parseFloat(currentBalance) : undefined;
      const linkedBank =
        linkedBankAccountId && (type === "debit" || type === "wallet")
          ? (linkedBankAccountId as Id<"accounts">)
          : undefined;

      if (editing) {
        await update({
          id: editing._id,
          name,
          type,
          institution: institution.trim() || null,
          lastFour: lastFour.trim() || null,
          color,
          creditLimit:
            type === "credit" ? (parsedLimit != null && parsedLimit > 0 ? parsedLimit : null) : null,
          initialUtilized:
            type === "credit"
              ? parsedInitialUtilized != null && !Number.isNaN(parsedInitialUtilized)
                ? parsedInitialUtilized
                : null
              : null,
          currentBalance:
            type === "bank"
              ? parsedBalance != null && !Number.isNaN(parsedBalance)
                ? parsedBalance
                : null
              : null,
          linkedBankAccountId:
            type === "debit" || type === "wallet" ? (linkedBank ?? null) : null,
        });
      } else {
        await create({
          name,
          type,
          institution: institution.trim() || undefined,
          lastFour: lastFour.trim() || undefined,
          color,
          creditLimit: type === "credit" ? parsedLimit : undefined,
          initialUtilized: type === "credit" ? parsedInitialUtilized : undefined,
          currentBalance: type === "bank" ? parsedBalance : undefined,
          linkedBankAccountId: linkedBank,
        });
      }
      setOpen(false);
    } catch (err) {
      setError(parseUserError(err, "We couldn't save this account. Please try again."));
    }
  };

  return (
    <>
      <PageHeader
        title="Accounts"
        description={
          tab === "loans"
            ? "Track loans and EMIs linked to your accounts."
            : "Track income and expenses by bank account or card."
        }
        action={
          tab === "loans" ? (
            <Button onClick={() => emisRef.current?.openNew()}>
              <Plus size={16} /> Add loan
            </Button>
          ) : (
            <Button onClick={openNew}>
              <Plus size={16} /> Add account
            </Button>
          )
        }
      />

      <div className="mb-5">
        <SegmentedField
          value={tab}
          onChange={(t) => router.push(t === "loans" ? "/accounts?tab=loans" : "/accounts")}
          options={[
            { value: "accounts", label: "Bank & cards" },
            { value: "loans", label: "Loans & EMIs" },
          ]}
        />
      </div>

      {tab === "loans" ? (
        <EmisSection ref={emisRef} />
      ) : (
        <>
          {!accounts ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-36" />
              ))}
            </div>
          ) : accounts.length === 0 ? (
            <Card>
              <CardContent className="pt-5">
                <EmptyState
                  icon={<CreditCard size={22} />}
                  title="No accounts yet"
                  description="Add your bank accounts and cards to see where money flows."
                  action={<Button onClick={openNew}>Add account</Button>}
                />
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {accounts.map((acc) => {
                const flow = flows.find((f) => f.id === acc._id);
                const usage = acc.usage;
                const isCredit = acc.type === "credit";
                const isBank = acc.type === "bank";
                const creditUsage = isCredit && "utilized" in usage ? usage : null;
                const linkedBankName =
                  "linkedBankName" in acc ? (acc.linkedBankName as string | null) : null;

                return (
                  <Card key={acc._id} className="overflow-hidden">
                    <div className="h-1.5" style={{ backgroundColor: acc.color }} />
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <div
                          className="flex h-10 w-10 items-center justify-center rounded-xl text-white"
                          style={{ backgroundColor: acc.color }}
                        >
                          <TypeIcon type={acc.type} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold">{acc.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {TYPE_LABELS[acc.type]}
                            {acc.institution ? ` · ${acc.institution}` : ""}
                            {acc.lastFour ? ` · ···· ${acc.lastFour}` : ""}
                            {linkedBankName ? ` · ${linkedBankName}` : ""}
                          </p>
                        </div>
                        <div className="flex gap-0.5">
                          <button
                            onClick={() => openEdit(acc as EditingAccount)}
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => {
                              if (
                                confirm(
                                  "Delete this account? Transactions will be kept but unlinked.",
                                )
                              )
                                remove({ id: acc._id });
                            }}
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-[hsl(var(--expense))]/10 hover:text-[hsl(var(--expense))]"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {isBank && acc.currentBalance != null && (
                        <div className="mt-4 rounded-lg bg-muted/40 p-3 text-center">
                          <p className="text-xs text-muted-foreground">Current balance</p>
                          <p className="mt-1 text-lg font-semibold tabular-nums text-[hsl(var(--income))]">
                            {formatCurrency(acc.currentBalance)}
                          </p>
                        </div>
                      )}

                      {creditUsage && (
                        <div className="mt-4 space-y-2">
                          {creditUsage.creditLimit != null && creditUsage.creditLimit > 0 ? (
                            <>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">Utilization</span>
                                <span
                                  className={cn(
                                    "font-semibold tabular-nums",
                                    (creditUsage.utilizationPct ?? 0) > 0.7
                                      ? "text-[hsl(var(--expense))]"
                                      : "text-foreground",
                                  )}
                                >
                                  {formatPercent(creditUsage.utilizationPct ?? 0)}
                                </span>
                              </div>
                              <div className="h-2 overflow-hidden rounded-full bg-muted">
                                <div
                                  className={cn(
                                    "h-full rounded-full transition-all",
                                    (creditUsage.utilizationPct ?? 0) > 0.7
                                      ? "bg-[hsl(var(--expense))]"
                                      : "bg-primary",
                                  )}
                                  style={{
                                    width: `${Math.min(100, (creditUsage.utilizationPct ?? 0) * 100)}%`,
                                  }}
                                />
                              </div>
                              <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/40 p-3 text-center text-xs">
                                <div>
                                  <p className="text-muted-foreground">Limit</p>
                                  <p className="font-semibold tabular-nums">
                                    {formatCurrency(creditUsage.creditLimit)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Used</p>
                                  <p className="font-semibold tabular-nums text-[hsl(var(--expense))]">
                                    {formatCurrency(creditUsage.utilized ?? 0)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Available</p>
                                  <p className="font-semibold tabular-nums text-[hsl(var(--income))]">
                                    {creditUsage.available != null
                                      ? formatCurrency(creditUsage.available)
                                      : "—"}
                                  </p>
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="rounded-lg bg-muted/40 p-3 text-center text-xs">
                              <p className="text-muted-foreground">Outstanding balance</p>
                              <p className="mt-1 font-semibold tabular-nums text-[hsl(var(--expense))]">
                                {formatCurrency(creditUsage.utilized ?? 0)}
                              </p>
                              <p className="mt-0.5 text-[10px] text-muted-foreground">
                                Set a credit limit to track utilization
                              </p>
                            </div>
                          )}
                          <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/40 p-3 text-center text-xs">
                            <div>
                              <p className="text-muted-foreground">Spent this month</p>
                              <p className="font-semibold tabular-nums text-[hsl(var(--expense))]">
                                {formatCurrency(creditUsage.monthExpense)}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Paid this month</p>
                              <p className="font-semibold tabular-nums text-[hsl(var(--income))]">
                                {formatCurrency(creditUsage.monthIncome)}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {!isCredit && flow && (flow.income > 0 || flow.expense > 0) && (
                        <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg bg-muted/40 p-3 text-center text-xs">
                          <div>
                            <p className="text-muted-foreground">In</p>
                            <p className="font-semibold tabular-nums text-[hsl(var(--income))]">
                              {formatCurrency(flow.income)}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Out</p>
                            <p className="font-semibold tabular-nums text-[hsl(var(--expense))]">
                              {formatCurrency(flow.expense)}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Net</p>
                            <p
                              className={cn(
                                "font-semibold tabular-nums",
                                flow.net >= 0 ? "text-[hsl(var(--income))]" : "",
                              )}
                            >
                              {formatCurrency(flow.net)}
                            </p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          <Modal
            open={open}
            onClose={() => setOpen(false)}
            title={editing ? "Edit account" : "New account"}
            description="Track money flowing through this bank or card."
            footer={
              <FormFooter
                formId={FORM_ID}
                onCancel={() => setOpen(false)}
                submitLabel={editing ? "Save account" : "Add account"}
              />
            }
          >
            <form id={FORM_ID} onSubmit={handleSubmit}>
              <FormBody>
                <PreviewBadge
                  icon={(p: { size?: number }) => <TypeIcon type={type} size={p.size} />}
                  color={color}
                  title={name || "Account name"}
                  subtitle={TYPE_LABELS[type]}
                />

                <FormSection title="Identity">
                  <FormField label="Display name">
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="HDFC Savings"
                      required
                      autoFocus
                    />
                  </FormField>

                  <FormField label="Account type">
                    <AccountTypePicker value={type} onChange={setType} />
                  </FormField>
                </FormSection>

                <FormSection title="Card / bank details">
                  <FormRow>
                    <FormField label="Institution">
                      <Input
                        value={institution}
                        onChange={(e) => setInstitution(e.target.value)}
                        placeholder="HDFC Bank"
                      />
                    </FormField>
                    <FormField label="Last 4 digits">
                      <Input
                        value={lastFour}
                        onChange={(e) =>
                          setLastFour(e.target.value.replace(/\D/g, "").slice(0, 4))
                        }
                        placeholder="1234"
                        maxLength={4}
                        inputMode="numeric"
                        className="tabular-nums tracking-widest"
                      />
                    </FormField>
                  </FormRow>
                  {type === "credit" && (
                    <>
                      <FormField
                        label="Credit limit"
                        hint="Total limit on this card — used to compute utilization"
                      >
                        <MoneyInput value={creditLimit} onChange={setCreditLimit} size="md" />
                      </FormField>
                      <FormField
                        label="Amount already used"
                        hint="Outstanding when you added this card. Leave blank if the full limit is available."
                      >
                        <MoneyInput
                          value={initialUtilized}
                          onChange={setInitialUtilized}
                          size="md"
                        />
                      </FormField>
                    </>
                  )}
                  {type === "bank" && (
                    <FormField
                      label="Current balance"
                      hint="Balance in this bank account right now"
                    >
                      <MoneyInput value={currentBalance} onChange={setCurrentBalance} size="md" />
                    </FormField>
                  )}
                  {(type === "debit" || type === "wallet") && (
                    <FormField
                      label="Linked bank account"
                      hint="Which bank this card or UPI is tied to"
                    >
                      <Select
                        value={linkedBankAccountId}
                        onChange={(e) => setLinkedBankAccountId(e.target.value)}
                      >
                        <option value="">No linked bank</option>
                        {bankAccounts.map((b) => (
                          <option key={b._id} value={b._id}>
                            {b.name}
                            {b.institution ? ` · ${b.institution}` : ""}
                          </option>
                        ))}
                      </Select>
                    </FormField>
                  )}
                </FormSection>

                <FormSection title="Accent color">
                  <ColorPicker value={color} onChange={setColor} colors={COLOR_OPTIONS} />
                </FormSection>

                {error && (
                  <FormError
                    title="Couldn't save account"
                    message={error}
                    onDismiss={() => setError(null)}
                  />
                )}
              </FormBody>
            </form>
          </Modal>
        </>
      )}
    </>
  );
}
