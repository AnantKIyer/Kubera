const BASE_CURRENCY = "INR";

export function normalizeCurrencyFields(args: {
  amount: number;
  originalAmount?: number | null;
  originalCurrency?: string | null;
  exchangeRate?: number | null;
}): {
  amount: number;
  originalAmount?: number;
  originalCurrency?: string;
  exchangeRate?: number;
} {
  const currency = args.originalCurrency?.trim().toUpperCase();

  if (!currency || currency === BASE_CURRENCY) {
    return { amount: args.amount };
  }

  if (!args.originalAmount || !args.exchangeRate) {
    throw new Error("Foreign currency transactions require original amount and exchange rate");
  }

  const expected = roundMoney(args.originalAmount * args.exchangeRate);
  if (Math.abs(expected - args.amount) > 0.5) {
    throw new Error("Converted amount does not match the exchange rate");
  }

  return {
    amount: args.amount,
    originalAmount: args.originalAmount,
    originalCurrency: currency,
    exchangeRate: args.exchangeRate,
  };
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
