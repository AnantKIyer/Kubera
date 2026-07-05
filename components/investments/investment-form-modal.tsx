"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Bitcoin,
  Building2,
  Coins,
  Gem,
  Landmark,
  LineChart,
  PiggyBank,
  Repeat,
  Shield,
  TrendingUp,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import {
  FormBody,
  FormError,
  FormField,
  FormFooter,
  FormRow,
  FormSection,
  Input,
  MoneyInput,
  Select,
  Textarea,
} from "@/components/ui/form";
import { DatePicker } from "@/components/ui/date-picker";
import {
  INVESTMENT_TYPE_LABELS,
  INVESTMENT_TYPE_OPTIONS,
  type InvestmentType,
  showsInterestRate,
  showsMaturityDate,
  showsMonthlyAmount,
  showsStartDate,
} from "@/lib/investments";
import { cn } from "@/lib/utils";

const FORM_ID = "investment-form";

export interface EditingInvestment {
  _id: Id<"investments">;
  name: string;
  investmentType: InvestmentType;
  investedAmount: number;
  currentValue?: number;
  accountId?: Id<"accounts">;
  monthlyAmount?: number;
  startDate?: string;
  maturityDate?: string;
  interestRate?: number;
  notes?: string;
  isActive: boolean;
}

function TypeIcon({ type, size = 16 }: { type: InvestmentType; size?: number }) {
  switch (type) {
    case "sip":
      return <Repeat size={size} />;
    case "mutual_fund":
      return <TrendingUp size={size} />;
    case "stocks":
      return <LineChart size={size} />;
    case "gold":
      return <Coins size={size} />;
    case "silver":
      return <Gem size={size} />;
    case "lic":
      return <Shield size={size} />;
    case "crypto":
      return <Bitcoin size={size} />;
    case "rd":
      return <PiggyBank size={size} />;
    case "fd":
      return <Landmark size={size} />;
  }
}

function InvestmentTypePicker({
  value,
  onChange,
}: {
  value: InvestmentType;
  onChange: (type: InvestmentType) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {INVESTMENT_TYPE_OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-xl border px-2 py-2.5 text-center transition-all",
              active
                ? "border-primary/40 bg-primary/8 text-foreground ring-1 ring-primary/20"
                : "border-border/50 bg-muted/20 text-muted-foreground hover:border-border hover:bg-muted/35",
            )}
          >
            <TypeIcon type={opt.value} />
            <span className="text-[10px] font-medium leading-tight">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function InvestmentFormModal({
  open,
  onClose,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  editing: EditingInvestment | null;
}) {
  const accounts = useQuery(api.accounts.list, { activeOnly: true });
  const create = useMutation(api.investments.create);
  const update = useMutation(api.investments.update);

  const [name, setName] = useState("");
  const [investmentType, setInvestmentType] = useState<InvestmentType>("sip");
  const [investedAmount, setInvestedAmount] = useState("");
  const [currentValue, setCurrentValue] = useState("");
  const [accountId, setAccountId] = useState("");
  const [monthlyAmount, setMonthlyAmount] = useState("");
  const [startDate, setStartDate] = useState("");
  const [maturityDate, setMaturityDate] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setName(editing.name);
      setInvestmentType(editing.investmentType);
      setInvestedAmount(String(editing.investedAmount));
      setCurrentValue(editing.currentValue != null ? String(editing.currentValue) : "");
      setAccountId(editing.accountId ?? "");
      setMonthlyAmount(editing.monthlyAmount != null ? String(editing.monthlyAmount) : "");
      setStartDate(editing.startDate ?? "");
      setMaturityDate(editing.maturityDate ?? "");
      setInterestRate(editing.interestRate != null ? String(editing.interestRate) : "");
      setNotes(editing.notes ?? "");
    } else {
      setName("");
      setInvestmentType("sip");
      setInvestedAmount("");
      setCurrentValue("");
      setAccountId("");
      setMonthlyAmount("");
      setStartDate("");
      setMaturityDate("");
      setInterestRate("");
      setNotes("");
    }
    setError(null);
  }, [open, editing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedInvested = investedAmount ? parseFloat(investedAmount) : NaN;
    if (Number.isNaN(parsedInvested) || parsedInvested < 0) {
      setError("Enter a valid invested amount");
      return;
    }

    const parsedCurrent = currentValue ? parseFloat(currentValue) : undefined;
    const parsedMonthly = monthlyAmount ? parseFloat(monthlyAmount) : undefined;
    const parsedRate = interestRate ? parseFloat(interestRate) : undefined;

    try {
      const payload = {
        name,
        investmentType,
        investedAmount: parsedInvested,
        currentValue: parsedCurrent,
        accountId: (accountId as Id<"accounts">) || undefined,
        monthlyAmount: showsMonthlyAmount(investmentType) ? parsedMonthly : undefined,
        startDate: showsStartDate(investmentType) ? startDate || undefined : undefined,
        maturityDate: showsMaturityDate(investmentType) ? maturityDate || undefined : undefined,
        interestRate: showsInterestRate(investmentType) ? parsedRate : undefined,
        notes: notes.trim() || undefined,
      };

      if (editing) {
        await update({
          id: editing._id,
          ...payload,
          currentValue: parsedCurrent ?? null,
          accountId: (accountId as Id<"accounts">) || null,
          monthlyAmount:
            showsMonthlyAmount(investmentType) ? (parsedMonthly ?? null) : null,
          startDate: showsStartDate(investmentType) ? startDate || null : null,
          maturityDate: showsMaturityDate(investmentType) ? maturityDate || null : null,
          interestRate: showsInterestRate(investmentType) ? (parsedRate ?? null) : null,
          notes: notes.trim() || null,
        });
      } else {
        await create(payload);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Edit investment" : "Add investment"}
      description="Track SIP, mutual funds, stocks, gold, FD, and more."
      size="lg"
      footer={
        <FormFooter
          formId={FORM_ID}
          onCancel={onClose}
          submitLabel={editing ? "Save investment" : "Add investment"}
        />
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit}>
        <FormBody>
          <FormSection title="Type">
            <InvestmentTypePicker value={investmentType} onChange={setInvestmentType} />
          </FormSection>

          <FormSection title="Details">
            <FormField label="Name">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={
                  investmentType === "sip"
                    ? "Nifty 50 Index SIP"
                    : investmentType === "fd"
                      ? "HDFC 1-year FD"
                      : "Investment name"
                }
                required
                autoFocus
              />
            </FormField>

            <FormRow>
              <FormField
                label={investmentType === "fd" ? "Deposit amount" : "Total invested"}
                hint={
                  investmentType === "sip"
                    ? "Total contributed so far"
                    : "Principal or amount put in"
                }
              >
                <MoneyInput value={investedAmount} onChange={setInvestedAmount} size="md" />
              </FormField>
              <FormField label="Current value" hint="Leave blank to use invested amount">
                <MoneyInput value={currentValue} onChange={setCurrentValue} size="md" />
              </FormField>
            </FormRow>

            {showsMonthlyAmount(investmentType) && (
              <FormField
                label={
                  investmentType === "lic"
                    ? "Premium amount"
                    : investmentType === "rd"
                      ? "Monthly deposit"
                      : "SIP amount"
                }
              >
                <MoneyInput value={monthlyAmount} onChange={setMonthlyAmount} size="md" />
              </FormField>
            )}

            {(showsStartDate(investmentType) || showsMaturityDate(investmentType)) && (
              <FormRow>
                {showsStartDate(investmentType) && (
                  <FormField label="Start date">
                    <DatePicker
                      value={startDate}
                      onChange={setStartDate}
                      placeholder="Select start date"
                    />
                  </FormField>
                )}
                {showsMaturityDate(investmentType) && (
                  <FormField label="Maturity date">
                    <DatePicker
                      value={maturityDate}
                      onChange={setMaturityDate}
                      placeholder="Select maturity date"
                    />
                  </FormField>
                )}
              </FormRow>
            )}

            {showsInterestRate(investmentType) && (
              <FormField label="Interest rate (% p.a.)">
                <Input
                  value={interestRate}
                  onChange={(e) => setInterestRate(e.target.value.replace(/[^\d.]/g, ""))}
                  placeholder="7.5"
                  inputMode="decimal"
                  className="tabular-nums"
                />
              </FormField>
            )}
          </FormSection>

          <FormSection title="Linked account">
            <FormField label="Funded from" hint="Bank account used for this investment">
              <Select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                <option value="">Not linked</option>
                {(accounts ?? []).map((a) => (
                  <option key={a._id} value={a._id}>
                    {a.name}
                    {"linkedBankName" in a && a.linkedBankName ? ` · ${a.linkedBankName}` : ""}
                  </option>
                ))}
              </Select>
            </FormField>
          </FormSection>

          <FormField label="Notes" hint="Optional">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Folio number, broker, policy details…"
              rows={2}
            />
          </FormField>

          {error && <FormError message={error} />}
        </FormBody>
      </form>
    </Modal>
  );
}

export function investmentTypeLabel(type: InvestmentType): string {
  return INVESTMENT_TYPE_LABELS[type];
}

export { TypeIcon };
