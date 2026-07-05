export const INVESTMENT_TYPES = [
  "sip",
  "mutual_fund",
  "stocks",
  "gold",
  "silver",
  "lic",
  "crypto",
  "rd",
  "fd",
] as const;

export type InvestmentType = (typeof INVESTMENT_TYPES)[number];

export const INVESTMENT_TYPE_LABELS: Record<InvestmentType, string> = {
  sip: "SIP",
  mutual_fund: "Mutual Funds",
  stocks: "Stocks",
  gold: "Gold",
  silver: "Silver",
  lic: "LIC",
  crypto: "Cryptocurrency",
  rd: "RD",
  fd: "FD",
};

export const INVESTMENT_TYPE_OPTIONS = INVESTMENT_TYPES.map((value) => ({
  value,
  label: INVESTMENT_TYPE_LABELS[value],
}));

export function showsMonthlyAmount(type: InvestmentType): boolean {
  return type === "sip" || type === "rd" || type === "lic";
}

export function showsMaturityDate(type: InvestmentType): boolean {
  return type === "fd" || type === "rd" || type === "lic";
}

export function showsInterestRate(type: InvestmentType): boolean {
  return type === "fd" || type === "rd";
}

export function showsStartDate(type: InvestmentType): boolean {
  return type !== "stocks" && type !== "gold" && type !== "silver" && type !== "crypto";
}

export function investmentValue(investedAmount: number, currentValue?: number | null): number {
  return currentValue ?? investedAmount;
}

export function investmentGain(investedAmount: number, currentValue?: number | null): number {
  return investmentValue(investedAmount, currentValue) - investedAmount;
}
