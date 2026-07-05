import { addBillingPeriod } from "./subscriptionDates";

function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toISODate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

export function addMonthsToIso(iso: string, months: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return toISODate(new Date(y, m - 1 + months, d));
}

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

export function todayIso(): string {
  return toISODate(new Date());
}

export function assertInstallmentDateNotPast(iso: string | undefined) {
  if (!iso) return;
  if (iso < todayIso()) {
    throw new Error("Next installment date cannot be before today");
  }
}

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

export function resolveLoanTerms(args: {
  amount: number;
  principalAmount?: number;
  interestRate?: number;
  tenureMonths?: number;
  totalInstallments?: number;
}) {
  const tenure = args.tenureMonths ?? args.totalInstallments;
  if (
    args.principalAmount == null ||
    !(args.principalAmount > 0) ||
    tenure == null ||
    !(tenure > 0)
  ) {
    return { expectedEmi: args.amount, rateInferred: false as const, interestRate: undefined };
  }

  const hasRate = args.interestRate != null && args.interestRate >= 0;
  if (hasRate) {
    const fromRate = calculateEmi(args.principalAmount, args.interestRate!, tenure)!;
    if (Math.abs(fromRate - args.amount) < 1) {
      return {
        expectedEmi: fromRate,
        interestRate: args.interestRate,
        rateInferred: false as const,
      };
    }
  }

  const zeroEmi = calculateEmi(args.principalAmount, 0, tenure)!;
  if (Math.abs(args.amount - zeroEmi) < 1 && !hasRate) {
    return { expectedEmi: args.amount, interestRate: 0, rateInferred: false as const };
  }

  const inferred = inferInterestRate(args.principalAmount, tenure, args.amount);
  if (inferred != null) {
    return {
      expectedEmi: args.amount,
      interestRate: inferred,
      rateInferred: (!hasRate || Math.abs((args.interestRate ?? 0) - inferred) > 0.1) as boolean,
    };
  }

  if (hasRate) {
    return {
      expectedEmi: calculateEmi(args.principalAmount, args.interestRate!, tenure)!,
      interestRate: args.interestRate,
      rateInferred: false as const,
    };
  }

  return { expectedEmi: args.amount, rateInferred: false as const, interestRate: undefined };
}

export function analyzeEmiPayment(paidAmount: number, expectedEmi: number) {
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

export function getExtraPaymentMessage(extraAmount: number): string {
  const formatted = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(extraAmount);

  const messages = [
    "Brilliant — that extra bit knocks down interest faster than you think.",
    "Love the discipline! Every extra rupee is a step toward freedom.",
    "That's the kind of payment that makes future-you smile.",
    "Smart move — prepaying even a little saves a lot over the loan life.",
    "You're ahead of schedule. Keep this momentum going!",
  ];
  const idx = Math.min(messages.length - 1, Math.floor(extraAmount / 500));
  return `You paid ${formatted} extra toward your loan. ${messages[idx]}`;
}

export function expectedEmiForLoan(emi: {
  expectedEmiAmount?: number;
  amount: number;
  principalAmount?: number;
  interestRate?: number;
  tenureMonths?: number;
  totalInstallments?: number;
}): number {
  if (emi.expectedEmiAmount != null && emi.expectedEmiAmount > 0) {
    return emi.expectedEmiAmount;
  }
  const tenure = emi.tenureMonths ?? emi.totalInstallments;
  if (
    emi.principalAmount != null &&
    emi.principalAmount > 0 &&
    tenure != null &&
    tenure > 0
  ) {
    const calculated = calculateEmi(
      emi.principalAmount,
      emi.interestRate ?? 0,
      tenure,
    );
    if (calculated != null) return calculated;
  }
  return emi.amount;
}

export function buildEmiPaymentPatch(
  emi: {
    paidInstallments?: number;
    extraPaidTotal?: number;
    tenureMonths?: number;
    totalInstallments?: number;
    accountId?: string;
    categoryId?: string;
  },
  paymentDate: string,
  paidAmount: number,
  overrides?: {
    accountId?: string | null;
    categoryId?: string | null;
  },
) {
  const expected = expectedEmiForLoan(emi as Parameters<typeof expectedEmiForLoan>[0]);
  const analysis = analyzeEmiPayment(paidAmount, expected);
  const paid = (emi.paidInstallments ?? 0) + analysis.installmentsCovered;

  const patch: Record<string, unknown> = {
    nextDebitDate: addBillingPeriod(paymentDate, "monthly"),
    amount: expected,
    expectedEmiAmount: expected,
    isActive: true,
    paidInstallments: paid,
    extraPaidTotal: (emi.extraPaidTotal ?? 0) + analysis.extraAmount,
  };

  if (overrides?.accountId !== undefined) {
    patch.accountId = overrides.accountId ?? undefined;
  }
  if (overrides?.categoryId !== undefined) {
    patch.categoryId = overrides.categoryId ?? undefined;
  }

  const tenure = emi.tenureMonths ?? emi.totalInstallments;
  let closed = false;
  if (tenure != null && paid >= tenure) {
    patch.isActive = false;
    patch.nextDebitDate = undefined;
    closed = true;
  }

  return {
    patch,
    analysis,
    feedback:
      analysis.isExtra && analysis.extraAmount > 0
        ? {
            extraAmount: analysis.extraAmount,
            message: getExtraPaymentMessage(analysis.extraAmount),
            installmentsCovered: analysis.installmentsCovered,
          }
        : null,
    closed,
  };
}
