import { toISODate } from "@/lib/format";

function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addMonthsToIso(iso: string, months: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return toISODate(new Date(y, m - 1 + months, d));
}

/** If loan started 30+ days ago, infer paid installments and next due date. */
export function inferPastLoanSchedule(loanDate: string, tenure?: number) {
  const today = toISODate(new Date());
  const daysDiff =
    (parseISODate(today).getTime() - parseISODate(loanDate).getTime()) / 86400000;
  if (daysDiff <= 30) return null;

  let paid = 0;
  let nextDue = addMonthsToIso(loanDate, 1);
  while (nextDue <= today && (tenure == null || paid < tenure)) {
    paid++;
    nextDue = addMonthsToIso(loanDate, paid + 1);
  }

  const isClosed = tenure != null && paid >= tenure;
  return {
    paidInstallments: paid,
    nextDebitDate: isClosed ? undefined : nextDue,
    isActive: !isClosed,
  };
}

export function clampInstallmentDate(iso: string | undefined): string | undefined {
  if (!iso) return undefined;
  const today = toISODate(new Date());
  return iso < today ? today : iso;
}

/** Standard reducing-balance monthly EMI (Indian loan convention). */
export function calculateEmi(
  principal: number,
  annualRatePercent: number,
  tenureMonths: number,
): number | null {
  if (!(principal > 0) || !(tenureMonths > 0)) return null;
  if (annualRatePercent <= 0) {
    return Math.round((principal / tenureMonths) * 100) / 100;
  }
  const r = annualRatePercent / 12 / 100;
  const factor = Math.pow(1 + r, tenureMonths);
  const emi = (principal * r * factor) / (factor - 1);
  return Math.round(emi * 100) / 100;
}

/**
 * Infer annual interest rate (%) from principal, tenure, and actual EMI paid.
 * Uses binary search — returns null if EMI is below the zero-interest floor.
 */
export function inferInterestRate(
  principal: number,
  tenureMonths: number,
  emiAmount: number,
): number | null {
  if (!(principal > 0) || !(tenureMonths > 0) || !(emiAmount > 0)) return null;

  const zeroRateEmi = calculateEmi(principal, 0, tenureMonths)!;
  if (Math.abs(emiAmount - zeroRateEmi) < 0.5) return 0;
  if (emiAmount < zeroRateEmi - 0.5) return null;

  let lo = 0;
  let hi = 48;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    const emi = calculateEmi(principal, mid, tenureMonths)!;
    if (Math.abs(emi - emiAmount) < 0.5) {
      return Math.round(mid * 100) / 100;
    }
    if (emi < emiAmount) lo = mid;
    else hi = mid;
  }
  return Math.round(((lo + hi) / 2) * 100) / 100;
}

export type ResolvedLoanTerms = {
  expectedEmi: number;
  interestRate?: number;
  rateInferred: boolean;
};

/** Resolve EMI amount and interest rate from loan inputs + user's stated EMI. */
export function resolveLoanTerms(args: {
  amount: number;
  principalAmount?: number;
  interestRate?: number;
  tenureMonths?: number;
  totalInstallments?: number;
}): ResolvedLoanTerms {
  const tenure = args.tenureMonths ?? args.totalInstallments;
  if (
    args.principalAmount == null ||
    !(args.principalAmount > 0) ||
    tenure == null ||
    !(tenure > 0)
  ) {
    return { expectedEmi: args.amount, rateInferred: false };
  }

  const hasRate = args.interestRate != null && args.interestRate >= 0;
  if (hasRate) {
    const fromRate = calculateEmi(args.principalAmount, args.interestRate!, tenure)!;
    if (Math.abs(fromRate - args.amount) < 1) {
      return {
        expectedEmi: fromRate,
        interestRate: args.interestRate,
        rateInferred: false,
      };
    }
  }

  const zeroEmi = calculateEmi(args.principalAmount, 0, tenure)!;
  if (Math.abs(args.amount - zeroEmi) < 1 && !hasRate) {
    return { expectedEmi: args.amount, interestRate: 0, rateInferred: false };
  }

  const inferred = inferInterestRate(args.principalAmount, tenure, args.amount);
  if (inferred != null) {
    return {
      expectedEmi: args.amount,
      interestRate: inferred,
      rateInferred: !hasRate || args.interestRate !== inferred,
    };
  }

  if (hasRate) {
    return {
      expectedEmi: calculateEmi(args.principalAmount, args.interestRate!, tenure)!,
      interestRate: args.interestRate,
      rateInferred: false,
    };
  }

  return { expectedEmi: args.amount, rateInferred: false };
}

export type EmiPaymentAnalysis = {
  expectedEmi: number;
  installmentsCovered: number;
  extraAmount: number;
  isExtra: boolean;
  isUnderpaid: boolean;
};

/** Split a payment into full EMI installments and any extra principal prepayment. */
export function analyzeEmiPayment(
  paidAmount: number,
  expectedEmi: number,
): EmiPaymentAnalysis {
  if (!(expectedEmi > 0)) {
    return {
      expectedEmi: paidAmount,
      installmentsCovered: 1,
      extraAmount: 0,
      isExtra: false,
      isUnderpaid: false,
    };
  }

  const fullBlocks = Math.floor(paidAmount / expectedEmi);
  const installmentsCovered = fullBlocks > 0 ? fullBlocks : paidAmount > 0 ? 1 : 0;
  const extraAmount =
    fullBlocks > 0
      ? Math.round((paidAmount - fullBlocks * expectedEmi) * 100) / 100
      : Math.max(0, Math.round((paidAmount - expectedEmi) * 100) / 100);

  return {
    expectedEmi,
    installmentsCovered,
    extraAmount,
    isExtra: extraAmount > 0,
    isUnderpaid: paidAmount > 0 && paidAmount < expectedEmi,
  };
}

const EXTRA_MESSAGES = [
  "Brilliant — that extra bit knocks down interest faster than you think.",
  "Love the discipline! Every extra rupee is a step toward freedom.",
  "That's the kind of payment that makes future-you smile.",
  "Smart move — prepaying even a little saves a lot over the loan life.",
  "You're ahead of schedule. Keep this momentum going!",
];

export function getExtraPaymentMessage(extraAmount: number, formattedExtra: string): string {
  const idx = Math.min(
    EXTRA_MESSAGES.length - 1,
    Math.floor(extraAmount / 500),
  );
  return `You paid ${formattedExtra} extra toward your loan. ${EXTRA_MESSAGES[idx]}`;
}

export function loanProgressPercent(
  principal: number | undefined | null,
  totalPaid: number,
): number | null {
  if (!(principal != null && principal > 0)) return null;
  return Math.min(1, totalPaid / principal);
}
