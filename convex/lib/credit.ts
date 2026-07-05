/** Outstanding on a credit card: opening balance + net spends minus payments. */
export function creditUtilized(
  initialUtilized: number | undefined,
  expense: number,
  income: number,
): number {
  return Math.max(0, (initialUtilized ?? 0) + expense - income);
}

export function creditAvailable(
  creditLimit: number | undefined,
  utilized: number,
): number | null {
  if (creditLimit == null || !(creditLimit > 0)) return null;
  return Math.max(0, creditLimit - utilized);
}

export function creditUtilizationPct(
  creditLimit: number | undefined,
  utilized: number,
): number | null {
  if (creditLimit == null || !(creditLimit > 0)) return null;
  return utilized / creditLimit;
}
