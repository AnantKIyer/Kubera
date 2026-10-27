import { Id } from "../_generated/dataModel";
import {
  creditAvailable,
  creditUtilizationPct,
  creditUtilized,
} from "./credit";

export type LedgerTx = {
  type: string;
  amount: number;
  accountId?: Id<"accounts">;
  transferToAccountId?: Id<"accounts">;
  date: string;
};

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/** True when this account is the source of the tx (including transfer-out). */
function touchesAsSource(tx: LedgerTx, accountId: string): boolean {
  return tx.accountId === accountId;
}

/** True when this account is the transfer destination. */
function touchesAsDest(tx: LedgerTx, accountId: string): boolean {
  return tx.type === "transfer" && tx.transferToAccountId === accountId;
}

/**
 * Net cash movement for a single account from one transaction.
 * Income/expense on the account; transfers out/in; ignores unrelated txs.
 */
export function accountDelta(tx: LedgerTx, accountId: string): number {
  if (tx.type === "transfer") {
    if (touchesAsSource(tx, accountId)) return -tx.amount;
    if (touchesAsDest(tx, accountId)) return tx.amount;
    return 0;
  }
  if (!touchesAsSource(tx, accountId)) return 0;
  if (tx.type === "income") return tx.amount;
  if (tx.type === "expense") return -tx.amount;
  return 0;
}

/**
 * Bank displayed balance = opening + ledger of the bank itself
 * + ledger of linked debit/wallet accounts (spend draws from the bank).
 */
export function bankLedgerBalance(
  opening: number | undefined,
  txs: LedgerTx[],
  bankAccountId: string,
  linkedDebitOrWalletIds: string[],
): number {
  let balance = opening ?? 0;
  for (const tx of txs) {
    balance += accountDelta(tx, bankAccountId);
    for (const linkedId of linkedDebitOrWalletIds) {
      // Spend / transfers on linked debit or wallet draw from (or return to) the bank.
      balance += accountDelta(tx, linkedId);
    }
  }
  return roundMoney(balance);
}

export type AccountUsage = {
  totalExpense: number;
  totalIncome: number;
  monthExpense: number;
  monthIncome: number;
  net?: number;
  monthNet?: number;
  utilized?: number;
  available?: number | null;
  creditLimit?: number | null;
  utilizationPct?: number | null;
  ledgerBalance?: number | null;
  openingBalance?: number | null;
};

/**
 * Income/expense totals exclude transfers. Credit utilization treats
 * transfer-in like a payment (income) and transfer-out like a spend (expense).
 */
export function computeAccountUsage(
  accountId: string,
  accountType: string,
  creditLimit: number | undefined,
  initialUtilized: number | undefined,
  openingBalance: number | undefined,
  transactions: LedgerTx[],
  month: string,
  linkedDebitOrWalletIds: string[] = [],
): AccountUsage {
  let totalExpense = 0;
  let totalIncome = 0;
  let monthExpense = 0;
  let monthIncome = 0;
  let creditExpense = 0;
  let creditIncome = 0;

  for (const tx of transactions) {
    const inMonth = tx.date.slice(0, 7) === month;

    if (accountType === "credit") {
      if (tx.type === "transfer") {
        if (touchesAsDest(tx, accountId)) {
          creditIncome += tx.amount;
        } else if (touchesAsSource(tx, accountId)) {
          creditExpense += tx.amount;
        }
      } else if (touchesAsSource(tx, accountId)) {
        if (tx.type === "expense") {
          totalExpense += tx.amount;
          creditExpense += tx.amount;
          if (inMonth) monthExpense += tx.amount;
        } else if (tx.type === "income") {
          totalIncome += tx.amount;
          creditIncome += tx.amount;
          if (inMonth) monthIncome += tx.amount;
        }
      }
      continue;
    }

    // Bank / debit / wallet cash-flow stats (exclude transfers from income/expense)
    if (tx.type === "transfer") continue;
    if (!touchesAsSource(tx, accountId)) continue;
    if (tx.type === "expense") {
      totalExpense += tx.amount;
      if (inMonth) monthExpense += tx.amount;
    } else if (tx.type === "income") {
      totalIncome += tx.amount;
      if (inMonth) monthIncome += tx.amount;
    }
  }

  if (accountType === "credit") {
    const utilized = creditUtilized(initialUtilized, creditExpense, creditIncome);
    return {
      totalExpense,
      totalIncome,
      monthExpense,
      monthIncome,
      utilized,
      available: creditAvailable(creditLimit, utilized),
      creditLimit: creditLimit ?? null,
      utilizationPct: creditUtilizationPct(creditLimit, utilized),
      ledgerBalance: null,
      openingBalance: null,
    };
  }

  if (accountType === "bank") {
    const ledger = bankLedgerBalance(
      openingBalance,
      transactions,
      accountId,
      linkedDebitOrWalletIds,
    );
    return {
      totalExpense,
      totalIncome,
      monthExpense,
      monthIncome,
      net: totalIncome - totalExpense,
      monthNet: monthIncome - monthExpense,
      ledgerBalance: ledger,
      openingBalance: openingBalance ?? null,
    };
  }

  return {
    totalExpense,
    totalIncome,
    monthExpense,
    monthIncome,
    net: totalIncome - totalExpense,
    monthNet: monthIncome - monthExpense,
    ledgerBalance: null,
    openingBalance: null,
  };
}
