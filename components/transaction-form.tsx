"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ChevronRight, Landmark, Repeat } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import {
  CategoryGrid,
  FormBody,
  FormError,
  FormField,
  FormFooter,
  FormHint,
  FormRow,
  FormRows,
  FormSection,
  Input,
  SegmentedField,
  Select,
  SelectRow,
  TextRow,
} from "@/components/ui/form";
import { DatePicker } from "@/components/ui/date-picker";
import {
  SubscriptionPickerModal,
  type SelectedSubscription,
} from "@/components/subscription-picker-modal";
import {
  EmiPickerModal,
  type SelectedEmi,
} from "@/components/emi-picker-modal";
import {
  ExtraPaymentBanner,
  EmiPaymentPreview,
} from "@/components/emi-payment-feedback";
import {
  LoanDetailsFields,
  emptyLoanDetails,
  type LoanDetailsValues,
} from "@/components/loan-details-fields";
import { analyzeEmiPayment, calculateEmi, resolveLoanTerms } from "@/lib/emi";
import { formatCurrency, formatDate, toISODate } from "@/lib/format";
import { parseUserError } from "@/lib/errors";
import { getCategoryIcon } from "@/lib/icons";
import {
  addBillingPeriod,
  BILLING_CYCLE_LABELS,
  BILLING_CYCLE_OPTIONS,
  type BillingCycle,
} from "@/lib/subscription-dates";
import { Button } from "@/components/ui/button";
import {
  CurrencyMoneyInput,
  getConvertedAmount,
} from "@/components/currency-money-input";
import { BASE_CURRENCY, isBaseCurrency } from "@/lib/currency";

const FORM_ID = "transaction-form";

type ExpenseKind = "regular" | "subscription" | "emi";
type LinkMode = "existing" | "new";
type TxnType = "income" | "expense" | "transfer";

const TYPE_NOUN: Record<TxnType, string> = {
  expense: "expense",
  income: "income",
  transfer: "transfer",
};

const EXPENSE_KIND_OPTIONS: { value: ExpenseKind; label: string }[] = [
  { value: "regular", label: "Regular" },
  { value: "subscription", label: "Subscription" },
  { value: "emi", label: "Loan EMI" },
];

function editingAmountText(editing: EditableTransaction): string {
  return editing.originalCurrency && editing.originalAmount != null
    ? String(editing.originalAmount)
    : String(editing.amount);
}

export interface EditableTransaction {
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
}

interface Props {
  open: boolean;
  onClose: () => void;
  initialType?: "income" | "expense" | "transfer";
  editing?: EditableTransaction | null;
}

export function TransactionForm({ open, onClose, initialType, editing }: Props) {
  const [type, setType] = useState<TxnType>("expense");
  const [transferToAccountId, setTransferToAccountId] = useState("");
  const [expenseKind, setExpenseKind] = useState<ExpenseKind>("regular");
  const [subscriptionMode, setSubscriptionMode] = useState<LinkMode>("existing");
  const [emiMode, setEmiMode] = useState<LinkMode>("existing");
  const [selectedSub, setSelectedSub] = useState<SelectedSubscription | null>(null);
  const [selectedEmi, setSelectedEmi] = useState<SelectedEmi | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [emiPickerOpen, setEmiPickerOpen] = useState(false);
  const [newSubName, setNewSubName] = useState("");
  const [newSubCycle, setNewSubCycle] = useState<BillingCycle>("monthly");
  const [newEmiName, setNewEmiName] = useState("");
  const [newEmiLender, setNewEmiLender] = useState("");
  const [newEmiLoanDetails, setNewEmiLoanDetails] = useState<LoanDetailsValues>(emptyLoanDetails());
  const [emiSuccess, setEmiSuccess] = useState<{ message: string; extraAmount: number } | null>(null);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(BASE_CURRENCY);
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [accountId, setAccountId] = useState<string>("");
  const [date, setDate] = useState(toISODate(new Date()));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const categories = useQuery(
    api.categories.list,
    type === "transfer" ? "skip" : { type },
  );
  const accounts = useQuery(api.accounts.list, { activeOnly: true });
  const create = useMutation(api.transactions.create);
  const update = useMutation(api.transactions.update);

  const isEditing = Boolean(editing);
  const isTransfer = type === "transfer";
  const isSubscriptionExpense =
    type === "expense" && expenseKind === "subscription" && !isEditing;
  const isEmiExpense = type === "expense" && expenseKind === "emi" && !isEditing;
  const isLinkedExpense = isSubscriptionExpense || isEmiExpense;

  useEffect(() => {
    if (!open) return;
    setError(null);
    setEmiSuccess(null);
    setExpenseKind("regular");
    setSubscriptionMode("existing");
    setEmiMode("existing");
    setSelectedSub(null);
    setSelectedEmi(null);
    setNewSubName("");
    setNewSubCycle("monthly");
    setNewEmiName("");
    setNewEmiLender("");
    setNewEmiLoanDetails(emptyLoanDetails());
    setCurrency(BASE_CURRENCY);
    setExchangeRate(null);
    setTransferToAccountId("");
    if (editing) {
      setType(editing.type);
      setAmount(editingAmountText(editing));
      if (editing.originalCurrency && editing.originalAmount != null) {
        setCurrency(editing.originalCurrency);
        setExchangeRate(editing.exchangeRate ?? null);
      } else {
        setCurrency(BASE_CURRENCY);
        setExchangeRate(null);
      }
      setDescription(editing.description ?? "");
      setCategoryId(editing.categoryId ?? "");
      setAccountId(editing.accountId ?? "");
      setTransferToAccountId(editing.transferToAccountId ?? "");
      setDate(editing.date);
    } else {
      setType(initialType ?? "expense");
      setAmount("");
      setCurrency(BASE_CURRENCY);
      setExchangeRate(null);
      setDescription("");
      setCategoryId("");
      setAccountId("");
      setTransferToAccountId("");
      setDate(toISODate(new Date()));
    }
  }, [open, editing, initialType]);

  useEffect(() => {
    if (isLinkedExpense) {
      setCurrency(BASE_CURRENCY);
      setExchangeRate(null);
    }
  }, [isLinkedExpense]);

  const handleExchangeRateChange = (rate: number | null) => {
    setExchangeRate(rate);
  };

  useEffect(() => {
    if (type === "income" || type === "transfer") {
      setExpenseKind("regular");
      setSelectedSub(null);
      setSelectedEmi(null);
    }
  }, [type]);

  const newEmiCalculated = useMemo(() => {
    const principal = parseFloat(newEmiLoanDetails.principalAmount);
    const rate = parseFloat(newEmiLoanDetails.interestRate);
    const tenure = parseInt(newEmiLoanDetails.tenureMonths, 10);
    if (!principal || !tenure || !newEmiLoanDetails.interestRate.trim()) return null;
    if (Number.isNaN(rate)) return null;
    return calculateEmi(principal, rate, tenure);
  }, [newEmiLoanDetails]);

  useEffect(() => {
    if (isEmiExpense && emiMode === "new" && newEmiCalculated != null && newEmiLoanDetails.interestRate.trim()) {
      setAmount(String(newEmiCalculated));
    }
  }, [isEmiExpense, emiMode, newEmiCalculated, newEmiLoanDetails.interestRate]);

  const emiPaymentPreview = useMemo(() => {
    if (!isEmiExpense) return null;
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) return null;

    const expected =
      emiMode === "existing" && selectedEmi
        ? selectedEmi.expectedEmi
        : (() => {
            const principal = parseFloat(newEmiLoanDetails.principalAmount);
            const tenure = parseInt(newEmiLoanDetails.tenureMonths, 10);
            if (principal && tenure) {
              return resolveLoanTerms({
                amount: parsed,
                principalAmount: principal,
                interestRate: newEmiLoanDetails.interestRate
                  ? parseFloat(newEmiLoanDetails.interestRate)
                  : undefined,
                tenureMonths: tenure,
              }).expectedEmi;
            }
            return newEmiCalculated ?? parsed;
          })();

    return analyzeEmiPayment(parsed, expected);
  }, [isEmiExpense, amount, emiMode, selectedEmi, newEmiCalculated, newEmiLoanDetails]);

  const validCategoryIds = useMemo(
    () => new Set((categories ?? []).map((c) => c._id as string)),
    [categories],
  );
  useEffect(() => {
    if (categoryId && categories && !validCategoryIds.has(categoryId)) {
      setCategoryId("");
    }
  }, [categoryId, categories, validCategoryIds]);

  const subscriptionCategoryId = useMemo(() => {
    const subCat = (categories ?? []).find((c) => c.kind === "subscription");
    return subCat?._id as string | undefined;
  }, [categories]);

  const emiCategoryId = useMemo(() => {
    const emiCat = (categories ?? []).find((c) => c.kind === "emi");
    return emiCat?._id as string | undefined;
  }, [categories]);

  useEffect(() => {
    if (isSubscriptionExpense && subscriptionCategoryId && !categoryId) {
      setCategoryId(subscriptionCategoryId);
    }
  }, [isSubscriptionExpense, subscriptionCategoryId, categoryId]);

  useEffect(() => {
    if (isEmiExpense && emiCategoryId && !categoryId) {
      setCategoryId(emiCategoryId);
    }
  }, [isEmiExpense, emiCategoryId, categoryId]);

  const categoryItems = useMemo(
    () =>
      (categories ?? []).map((c) => ({
        id: c._id as string,
        name: c.name,
        color: c.color,
        icon: c.icon,
      })),
    [categories],
  );

  const accountOptions = useMemo(
    () =>
      (accounts ?? []).map((a) => ({
        value: a._id as string,
        label: `${a.name}${a.lastFour ? ` ···· ${a.lastFour}` : ""}${
          "linkedBankName" in a && a.linkedBankName ? ` · ${a.linkedBankName}` : ""
        }`,
      })),
    [accounts],
  );

  const hasUnsavedInput = editing
    ? type !== editing.type ||
      amount !== editingAmountText(editing) ||
      description !== (editing.description ?? "") ||
      categoryId !== (editing.categoryId ?? "") ||
      accountId !== (editing.accountId ?? "") ||
      transferToAccountId !== (editing.transferToAccountId ?? "") ||
      date !== editing.date
    : Boolean(
        amount.trim() ||
          description.trim() ||
          newSubName.trim() ||
          newEmiName.trim() ||
          selectedSub ||
          selectedEmi,
      );

  const amountValue = parseFloat(amount);
  const canSubmit =
    Number.isFinite(amountValue) &&
    amountValue > 0 &&
    (isBaseCurrency(currency) ||
      isLinkedExpense ||
      (exchangeRate != null && exchangeRate > 0));

  const projectedRenewal = useMemo(() => {
    if (!date) return null;
    if (isSubscriptionExpense) {
      const cycle =
        subscriptionMode === "existing" && selectedSub
          ? selectedSub.billingCycle
          : newSubCycle;
      return addBillingPeriod(date, cycle);
    }
    if (isEmiExpense) return addBillingPeriod(date, "monthly");
    return null;
  }, [
    isSubscriptionExpense,
    isEmiExpense,
    date,
    subscriptionMode,
    selectedSub,
    newSubCycle,
  ]);

  const handleSelectSubscription = (sub: SelectedSubscription) => {
    setSelectedSub(sub);
    setAmount(String(sub.amount));
    if (sub.categoryId) setCategoryId(sub.categoryId);
    if (sub.accountId) setAccountId(sub.accountId);
    if (!description.trim()) setDescription(sub.name);
  };

  const handleSelectEmi = (emi: SelectedEmi) => {
    setSelectedEmi(emi);
    setAmount(String(emi.expectedEmi));
    if (emi.categoryId) setCategoryId(emi.categoryId);
    if (emi.accountId) setAccountId(emi.accountId);
    if (!description.trim()) setDescription(emi.name);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) {
      setError("Enter an amount greater than 0");
      return;
    }

    const isForeign = !isBaseCurrency(currency) && !isLinkedExpense;
    const baseAmount = getConvertedAmount(amount, currency, exchangeRate);
    if (baseAmount == null || baseAmount <= 0) {
      setError(isForeign ? "Enter a valid amount and wait for the exchange rate" : "Enter an amount greater than 0");
      return;
    }
    if (isForeign && !exchangeRate) {
      setError("Exchange rate is required for foreign currency transactions");
      return;
    }

    if (isSubscriptionExpense) {
      if (subscriptionMode === "existing" && !selectedSub) {
        setError("Choose a subscription");
        setPickerOpen(true);
        return;
      }
      if (subscriptionMode === "new" && !newSubName.trim()) {
        setError("Enter a name for the new subscription");
        return;
      }
    }

    if (isEmiExpense) {
      if (emiMode === "existing" && !selectedEmi) {
        setError("Choose an EMI");
        setEmiPickerOpen(true);
        return;
      }
      if (emiMode === "new" && !newEmiName.trim()) {
        setError("Enter a name for the new EMI");
        return;
      }
    }

    if (isTransfer) {
      if (!accountId) {
        setError("Choose the account to transfer from");
        return;
      }
      if (!transferToAccountId) {
        setError("Choose the account to transfer to");
        return;
      }
      if (accountId === transferToAccountId) {
        setError("From and to accounts must be different");
        return;
      }
    }

    setSaving(true);
    try {
      const currencyPayload = isForeign
        ? {
            originalAmount: parsed,
            originalCurrency: currency,
            exchangeRate: exchangeRate!,
          }
        : {
            originalAmount: null,
            originalCurrency: null,
            exchangeRate: null,
          };

      if (editing) {
        await update({
          id: editing._id,
          type,
          amount: baseAmount,
          ...currencyPayload,
          description: description.trim() || null,
          categoryId: isTransfer ? null : (categoryId as Id<"categories">) || null,
          accountId: (accountId as Id<"accounts">) || null,
          transferToAccountId: isTransfer
            ? (transferToAccountId as Id<"accounts">) || null
            : null,
          date,
        });
      } else {
        const result = await create({
          type,
          amount: baseAmount,
          ...currencyPayload,
          description: description.trim() || undefined,
          categoryId: isTransfer
            ? undefined
            : (categoryId as Id<"categories">) || undefined,
          accountId: (accountId as Id<"accounts">) || undefined,
          transferToAccountId: isTransfer
            ? (transferToAccountId as Id<"accounts">) || undefined
            : undefined,
          date,
          subscriptionLink: isSubscriptionExpense
            ? subscriptionMode === "existing"
              ? {
                  mode: "existing" as const,
                  subscriptionId: selectedSub!._id,
                }
              : {
                  mode: "new" as const,
                  name: newSubName.trim(),
                  billingCycle: newSubCycle,
                }
            : undefined,
          emiLink: isEmiExpense
            ? emiMode === "existing"
              ? {
                  mode: "existing" as const,
                  emiId: selectedEmi!._id,
                }
              : {
                  mode: "new" as const,
                  name: newEmiName.trim(),
                  lender: newEmiLender.trim() || undefined,
                  tenureMonths: newEmiLoanDetails.tenureMonths
                    ? parseInt(newEmiLoanDetails.tenureMonths, 10)
                    : undefined,
                  principalAmount: newEmiLoanDetails.principalAmount
                    ? parseFloat(newEmiLoanDetails.principalAmount)
                    : undefined,
                  interestRate: newEmiLoanDetails.interestRate
                    ? parseFloat(newEmiLoanDetails.interestRate)
                    : undefined,
                  loanDate: newEmiLoanDetails.loanDate || undefined,
                }
            : undefined,
        });

        if (result.emiFeedback) {
          setEmiSuccess({
            extraAmount: result.emiFeedback.extraAmount,
            message: result.emiFeedback.message,
          });
          return;
        }
      }
      onClose();
    } catch (err) {
      setError(parseUserError(err, "We couldn't save this transaction. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        confirmDiscard={hasUnsavedInput && !saving && !emiSuccess}
        discardTitle={isEditing ? "Discard changes?" : `Discard this ${TYPE_NOUN[type]}?`}
        discardMessage={
          isEditing ? "Your edits won't be saved." : "What you entered won't be saved."
        }
        title={
          emiSuccess
            ? "Payment recorded"
            : `${isEditing ? "Edit" : "New"} ${TYPE_NOUN[type]}`
        }
        description={
          emiSuccess
            ? undefined
            : isTransfer
              ? "Moves money between your accounts. Not counted as income or spending."
              : isSubscriptionExpense
                ? "Records the payment and moves the renewal date forward."
                : isEmiExpense
                  ? "Records the payment and moves the next debit forward."
                  : undefined
        }
        size="lg"
        footer={
          emiSuccess ? (
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow"
              >
                Done
              </button>
            </div>
          ) : (
            <FormFooter
              formId={FORM_ID}
              submitLabel={
                isEditing
                  ? "Save changes"
                  : isTransfer
                    ? "Record transfer"
                    : `Add ${TYPE_NOUN[type]}`
              }
              loading={saving}
              disabled={!canSubmit}
            />
          )
        }
      >
        {emiSuccess ? (
          <div className="space-y-4">
            <ExtraPaymentBanner
              extraAmount={emiSuccess.extraAmount}
              message={emiSuccess.message}
            />
            <p className="text-center text-sm text-muted-foreground">
              Transaction recorded. Your loan progress has been updated.
            </p>
          </div>
        ) : (
        <form id={FORM_ID} onSubmit={handleSubmit}>
          <FormBody>
            <SegmentedField
              value={type}
              onChange={setType}
              options={[
                { value: "expense", label: "Expense", tone: "expense" },
                { value: "income", label: "Income", tone: "income" },
                { value: "transfer", label: "Transfer" },
              ]}
            />

            <CurrencyMoneyInput
              value={amount}
              onChange={setAmount}
              currency={currency}
              onCurrencyChange={setCurrency}
              exchangeRate={exchangeRate}
              onExchangeRateChange={handleExchangeRateChange}
              transactionDate={date}
              autoFocus={!isEditing}
              required
              forceBaseCurrency={isLinkedExpense}
            />

            {!isTransfer && (
              <CategoryGrid
                items={categoryItems}
                value={categoryId}
                onChange={setCategoryId}
                getIcon={getCategoryIcon}
              />
            )}

            <FormRows>
              <TextRow
                label="Note"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={
                  isTransfer
                    ? "Card payment, top-up…"
                    : type === "income"
                      ? "Where's it from?"
                      : "What was it for?"
                }
                enterKeyHint="done"
              />
              <DatePicker variant="row" label="Date" value={date} onChange={setDate} required />
              {isTransfer ? (
                <>
                  <SelectRow
                    label="From"
                    value={accountId}
                    onChange={setAccountId}
                    options={accountOptions}
                    placeholder="Choose account"
                    required
                  />
                  <SelectRow
                    label="To"
                    value={transferToAccountId}
                    onChange={setTransferToAccountId}
                    options={accountOptions.filter((a) => a.value !== accountId)}
                    placeholder="Choose account"
                    required
                  />
                </>
              ) : (
                <SelectRow
                  label="Account"
                  value={accountId}
                  onChange={setAccountId}
                  options={accountOptions}
                  placeholder="Not linked"
                />
              )}
              {type === "expense" && !isEditing && (
                <SelectRow
                  label="Payment"
                  value={expenseKind}
                  onChange={(kind) => {
                    setExpenseKind(kind as ExpenseKind);
                    setSelectedSub(null);
                    setSelectedEmi(null);
                  }}
                  options={EXPENSE_KIND_OPTIONS}
                />
              )}
            </FormRows>

            {isSubscriptionExpense && (
              <FormSection title="Subscription">
                <SegmentedField
                  value={subscriptionMode}
                  onChange={(mode) => {
                    setSubscriptionMode(mode);
                    setSelectedSub(null);
                    setNewSubName("");
                  }}
                  options={[
                    { value: "existing", label: "Existing" },
                    { value: "new", label: "New" },
                  ]}
                />

                {subscriptionMode === "existing" ? (
                  <div className="space-y-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-between"
                      onClick={() => setPickerOpen(true)}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <Repeat size={16} className="shrink-0 text-primary" />
                        {selectedSub ? selectedSub.name : "Choose subscription"}
                      </span>
                      <ChevronRight size={16} className="shrink-0 opacity-50" />
                    </Button>
                    {selectedSub && (
                      <FormHint>
                        Next renewal after this payment:{" "}
                        <span className="font-medium text-foreground">
                          {projectedRenewal ? formatDate(projectedRenewal) : "—"}
                        </span>
                      </FormHint>
                    )}
                  </div>
                ) : (
                  <FormRow>
                    <FormField label="Subscription name">
                      <Input
                        value={newSubName}
                        onChange={(e) => setNewSubName(e.target.value)}
                        placeholder="Netflix, Spotify…"
                        required
                      />
                    </FormField>
                    <FormField label="Billing cycle">
                      <Select
                        value={newSubCycle}
                        onChange={(e) => setNewSubCycle(e.target.value as BillingCycle)}
                      >
                        {BILLING_CYCLE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </Select>
                    </FormField>
                  </FormRow>
                )}

                {subscriptionMode === "new" && projectedRenewal && (
                  <FormHint>
                    First renewal scheduled for{" "}
                    <span className="font-medium text-foreground">
                      {formatDate(projectedRenewal)}
                    </span>{" "}
                    ({BILLING_CYCLE_LABELS[newSubCycle].toLowerCase()} from payment date)
                  </FormHint>
                )}
              </FormSection>
            )}

            {isEmiExpense && (
              <FormSection title="Loan EMI">
                <SegmentedField
                  value={emiMode}
                  onChange={(mode) => {
                    setEmiMode(mode);
                    setSelectedEmi(null);
                    setNewEmiName("");
                    setNewEmiLender("");
                    setNewEmiLoanDetails(emptyLoanDetails());
                  }}
                  options={[
                    { value: "existing", label: "Existing" },
                    { value: "new", label: "New" },
                  ]}
                />

                {emiMode === "existing" ? (
                  <div className="space-y-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-between"
                      onClick={() => setEmiPickerOpen(true)}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <Landmark size={16} className="shrink-0 text-primary" />
                        {selectedEmi ? selectedEmi.name : "Choose EMI"}
                      </span>
                      <ChevronRight size={16} className="shrink-0 opacity-50" />
                    </Button>
                    {selectedEmi && (
                      <>
                        <FormHint>
                          Scheduled EMI:{" "}
                          <span className="font-medium text-foreground">
                            {formatCurrency(selectedEmi.expectedEmi)}
                          </span>
                          {selectedEmi.principalAmount != null && (
                            <>
                              {" "}
                              · {formatCurrency(selectedEmi.totalPaid ?? 0)} paid of{" "}
                              {formatCurrency(selectedEmi.principalAmount)}
                            </>
                          )}
                        </FormHint>
                        {projectedRenewal && (
                          <FormHint>
                            Next debit after this payment:{" "}
                            <span className="font-medium text-foreground">
                              {formatDate(projectedRenewal)}
                            </span>
                          </FormHint>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  <>
                    <FormRow>
                      <FormField label="Loan name">
                        <Input
                          value={newEmiName}
                          onChange={(e) => setNewEmiName(e.target.value)}
                          placeholder="Education loan, Bike EMI…"
                          required
                        />
                      </FormField>
                      <FormField label="Lender" hint="Optional">
                        <Input
                          value={newEmiLender}
                          onChange={(e) => setNewEmiLender(e.target.value)}
                          placeholder="HDFC, Bajaj…"
                        />
                      </FormField>
                    </FormRow>
                    <LoanDetailsFields
                      values={newEmiLoanDetails}
                      onChange={(patch) =>
                        setNewEmiLoanDetails((prev) => ({ ...prev, ...patch }))
                      }
                      emiAmount={amount}
                    />
                  </>
                )}

                {emiMode === "new" && projectedRenewal && (
                  <FormHint>
                    Next monthly debit:{" "}
                    <span className="font-medium text-foreground">
                      {formatDate(projectedRenewal)}
                    </span>
                  </FormHint>
                )}
              </FormSection>
            )}

            {isEmiExpense && emiPaymentPreview && (
              <EmiPaymentPreview
                expectedEmi={emiPaymentPreview.expectedEmi}
                paidAmount={parseFloat(amount) || 0}
                extraAmount={emiPaymentPreview.extraAmount}
                isUnderpaid={emiPaymentPreview.isUnderpaid}
              />
            )}

            {error && (
              <FormError
                title="Couldn't save transaction"
                message={error}
                onDismiss={() => setError(null)}
              />
            )}
          </FormBody>
        </form>
        )}
      </Modal>

      <SubscriptionPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handleSelectSubscription}
      />
      <EmiPickerModal
        open={emiPickerOpen}
        onClose={() => setEmiPickerOpen(false)}
        onSelect={handleSelectEmi}
      />
    </>
  );
}
