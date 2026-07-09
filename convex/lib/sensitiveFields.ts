import { Doc } from "../_generated/dataModel";
import { decryptOptional, encryptOptional } from "./encryption";

export async function encryptAccountFields(fields: {
  name?: string;
  institution?: string | null;
  lastFour?: string | null;
}) {
  return {
    name: fields.name ? await encryptOptional(fields.name) : undefined,
    institution: await encryptOptional(fields.institution ?? undefined),
    lastFour: await encryptOptional(fields.lastFour ?? undefined),
  };
}

export async function decryptAccount<T extends Pick<Doc<"accounts">, "name" | "institution" | "lastFour">>(
  account: T,
): Promise<T> {
  return {
    ...account,
    name: (await decryptOptional(account.name)) ?? account.name,
    institution: await decryptOptional(account.institution),
    lastFour: await decryptOptional(account.lastFour),
  };
}

export async function decryptAccounts(
  accounts: Doc<"accounts">[],
): Promise<Doc<"accounts">[]> {
  return Promise.all(accounts.map(decryptAccount));
}

export async function encryptTransactionFields(fields: { description?: string | null }) {
  return {
    description: await encryptOptional(fields.description ?? undefined),
  };
}

export async function decryptTransaction<T extends Pick<Doc<"transactions">, "description">>(
  tx: T,
): Promise<T> {
  return {
    ...tx,
    description: await decryptOptional(tx.description),
  };
}

export async function decryptTransactions(
  rows: Doc<"transactions">[],
): Promise<Doc<"transactions">[]> {
  return Promise.all(rows.map(decryptTransaction));
}

export async function encryptSubscriptionFields(fields: {
  name?: string;
  notes?: string | null;
}) {
  return {
    name: fields.name ? await encryptOptional(fields.name) : undefined,
    notes: await encryptOptional(fields.notes ?? undefined),
  };
}

export async function decryptSubscription<T extends Pick<Doc<"subscriptions">, "name" | "notes">>(
  row: T,
): Promise<T> {
  return {
    ...row,
    name: (await decryptOptional(row.name)) ?? row.name,
    notes: await decryptOptional(row.notes),
  };
}

export async function decryptSubscriptions(
  rows: Doc<"subscriptions">[],
): Promise<Doc<"subscriptions">[]> {
  return Promise.all(rows.map(decryptSubscription));
}

export async function encryptEmiFields(fields: {
  name?: string;
  lender?: string | null;
  notes?: string | null;
}) {
  return {
    name: fields.name ? await encryptOptional(fields.name) : undefined,
    lender: await encryptOptional(fields.lender ?? undefined),
    notes: await encryptOptional(fields.notes ?? undefined),
  };
}

export async function decryptEmi<T extends Pick<Doc<"emis">, "name" | "lender" | "notes">>(
  row: T,
): Promise<T> {
  return {
    ...row,
    name: (await decryptOptional(row.name)) ?? row.name,
    lender: await decryptOptional(row.lender),
    notes: await decryptOptional(row.notes),
  };
}

export async function decryptEmis(rows: Doc<"emis">[]): Promise<Doc<"emis">[]> {
  return Promise.all(rows.map(decryptEmi));
}

export async function encryptInvestmentFields(fields: {
  name?: string;
  notes?: string | null;
}) {
  return {
    name: fields.name ? await encryptOptional(fields.name) : undefined,
    notes: await encryptOptional(fields.notes ?? undefined),
  };
}

export async function decryptInvestment<T extends Pick<Doc<"investments">, "name" | "notes">>(
  row: T,
): Promise<T> {
  return {
    ...row,
    name: (await decryptOptional(row.name)) ?? row.name,
    notes: await decryptOptional(row.notes),
  };
}

export async function decryptInvestments(
  rows: Doc<"investments">[],
): Promise<Doc<"investments">[]> {
  return Promise.all(rows.map(decryptInvestment));
}

export async function encryptGroupFields(fields: {
  name?: string;
  description?: string | null;
}) {
  return {
    name: fields.name ? await encryptOptional(fields.name) : undefined,
    description: await encryptOptional(fields.description ?? undefined),
  };
}

export async function decryptGroup<T extends Pick<Doc<"expenseGroups">, "name" | "description">>(
  row: T,
): Promise<T> {
  return {
    ...row,
    name: (await decryptOptional(row.name)) ?? row.name,
    description: await decryptOptional(row.description),
  };
}

export async function encryptGroupExpenseFields(fields: { description?: string }) {
  return {
    description: fields.description ? await encryptOptional(fields.description) : undefined,
  };
}

export async function decryptGroupExpense<
  T extends Pick<Doc<"groupExpenses">, "description">,
>(row: T): Promise<T> {
  return {
    ...row,
    description: (await decryptOptional(row.description)) ?? row.description,
  };
}
