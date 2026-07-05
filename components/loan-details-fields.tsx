"use client";

import { useMemo } from "react";
import { FormField, FormRow, Input } from "@/components/ui/form";
import { DatePicker } from "@/components/ui/date-picker";
import { calculateEmi, inferInterestRate, resolveLoanTerms } from "@/lib/emi";
import { formatCurrency } from "@/lib/format";

export interface LoanDetailsValues {
  principalAmount: string;
  interestRate: string;
  tenureMonths: string;
  loanDate: string;
}

interface Props {
  values: LoanDetailsValues;
  onChange: (patch: Partial<LoanDetailsValues>) => void;
  /** Current EMI amount entered by user — used to infer rate when empty */
  emiAmount?: string;
  showCalculatedEmi?: boolean;
}

export function LoanDetailsFields({
  values,
  onChange,
  emiAmount,
  showCalculatedEmi = true,
}: Props) {
  const principal = parseFloat(values.principalAmount);
  const rate = values.interestRate ? parseFloat(values.interestRate) : undefined;
  const tenure = parseInt(values.tenureMonths, 10);
  const parsedEmi = emiAmount ? parseFloat(emiAmount) : undefined;

  const calculatedFromRate = useMemo(() => {
    if (!principal || !tenure) return null;
    if (rate == null || Number.isNaN(rate)) return null;
    return calculateEmi(principal, rate, tenure);
  }, [principal, rate, tenure]);

  const resolved = useMemo(() => {
    if (!principal || !tenure || !parsedEmi) return null;
    return resolveLoanTerms({
      amount: parsedEmi,
      principalAmount: principal,
      interestRate: rate,
      tenureMonths: tenure,
    });
  }, [principal, tenure, parsedEmi, rate]);

  const zeroRateEmi = useMemo(() => {
    if (!principal || !tenure) return null;
    return calculateEmi(principal, 0, tenure);
  }, [principal, tenure]);

  const inferredRate = useMemo(() => {
    if (!principal || !tenure || !parsedEmi) return null;
    if (values.interestRate.trim()) return null;
    if (zeroRateEmi != null && Math.abs(parsedEmi - zeroRateEmi) < 1) return 0;
    return inferInterestRate(principal, tenure, parsedEmi);
  }, [principal, tenure, parsedEmi, values.interestRate, zeroRateEmi]);

  return (
    <div className="space-y-3 rounded-2xl border border-border/50 bg-muted/15 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        Loan details
      </p>

      <FormRow>
        <FormField label="Loan amount" hint="Total principal borrowed">
          <Input
            type="number"
            min={1}
            step="0.01"
            value={values.principalAmount}
            onChange={(e) => onChange({ principalAmount: e.target.value })}
            placeholder="e.g. 500000"
            className="tabular-nums"
          />
        </FormField>
        <FormField label="Interest rate" hint="Annual % — leave blank to infer from EMI">
          <Input
            type="number"
            min={0}
            step="0.01"
            value={values.interestRate}
            onChange={(e) => onChange({ interestRate: e.target.value })}
            placeholder="e.g. 10.5 or blank"
            className="tabular-nums"
          />
        </FormField>
      </FormRow>

      <FormRow>
        <FormField label="Tenure" hint="In months">
          <Input
            type="number"
            min={1}
            value={values.tenureMonths}
            onChange={(e) => onChange({ tenureMonths: e.target.value })}
            placeholder="e.g. 36"
            className="tabular-nums"
          />
        </FormField>
        <FormField label="Loan date" hint="When the loan was taken">
          <DatePicker
            value={values.loanDate}
            onChange={(loanDate) => onChange({ loanDate })}
            placeholder="Disbursement date"
          />
        </FormField>
      </FormRow>

      {showCalculatedEmi && calculatedFromRate != null && values.interestRate.trim() && (
        <div className="rounded-xl border border-primary/20 bg-primary/8 px-3.5 py-2.5 text-sm">
          <span className="text-muted-foreground">Calculated EMI: </span>
          <span className="font-semibold tabular-nums text-primary">
            {formatCurrency(calculatedFromRate)}/mo
          </span>
        </div>
      )}

      {inferredRate != null && !values.interestRate.trim() && parsedEmi != null && (
        <div className="rounded-xl border border-[hsl(var(--income))]/25 bg-[hsl(var(--income))]/8 px-3.5 py-2.5 text-sm">
          <span className="text-muted-foreground">Estimated interest rate: </span>
          <span className="font-semibold tabular-nums text-[hsl(var(--income))]">
            {inferredRate}% p.a.
          </span>
          <p className="mt-1 text-xs text-muted-foreground">
            Based on {formatCurrency(parsedEmi)}/mo vs {formatCurrency(principal)} over {tenure}{" "}
            months
            {zeroRateEmi != null && parsedEmi > zeroRateEmi + 1
              ? ` (zero-interest would be ${formatCurrency(zeroRateEmi)}/mo)`
              : ""}
          </p>
        </div>
      )}

      {resolved?.rateInferred && values.interestRate.trim() && parsedEmi != null && (
        <p className="text-xs text-muted-foreground">
          Your EMI differs from the rate-based calculation — we&apos;ll use{" "}
          {resolved.interestRate}% p.a. inferred from your payment.
        </p>
      )}
    </div>
  );
}

export const emptyLoanDetails = (): LoanDetailsValues => ({
  principalAmount: "",
  interestRate: "",
  tenureMonths: "",
  loanDate: "",
});
