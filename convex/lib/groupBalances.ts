import { Id } from "../_generated/dataModel";

export type MemberBalance = {
  userId: Id<"users">;
  paid: number;
  owed: number;
  net: number;
};

export type SplitShare = {
  userId: Id<"users">;
  shareAmount: number;
  sharePercent?: number;
};

export type SettlementTransfer = {
  fromUserId: Id<"users">;
  toUserId: Id<"users">;
  amount: number;
};

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function assertSharesSumToAmount(
  amount: number,
  shares: { shareAmount: number }[],
  label = "Shares",
) {
  const sum = roundMoney(shares.reduce((s, row) => s + row.shareAmount, 0));
  const target = roundMoney(amount);
  if (Math.abs(sum - target) > 0.009) {
    throw new Error(`${label} must sum to ${target.toFixed(2)} (got ${sum.toFixed(2)})`);
  }
}

/** Equal split with paise remainder distributed to first members. */
export function equalSplitShares(
  amount: number,
  memberIds: Id<"users">[],
): SplitShare[] {
  if (memberIds.length === 0) return [];
  const n = memberIds.length;
  const totalPaise = Math.round(amount * 100);
  const basePaise = Math.floor(totalPaise / n);
  let remainder = totalPaise - basePaise * n;

  return memberIds.map((userId) => {
    let paise = basePaise;
    if (remainder > 0) {
      paise += 1;
      remainder -= 1;
    }
    return { userId, shareAmount: paise / 100 };
  });
}

/** Exact custom amounts — must sum to expense total. */
export function amountSplitShares(
  amount: number,
  shares: { userId: Id<"users">; shareAmount: number }[],
): SplitShare[] {
  if (shares.length === 0) throw new Error("Select at least one person to split with");
  for (const share of shares) {
    if (!(share.shareAmount >= 0)) throw new Error("Share amounts must be zero or greater");
  }
  const normalized = shares.map((s) => ({
    userId: s.userId,
    shareAmount: roundMoney(s.shareAmount),
  }));
  assertSharesSumToAmount(amount, normalized, "Custom amounts");
  return normalized;
}

/** Percent splits — percents must sum to 100; remainder paise go to first members. */
export function percentSplitShares(
  amount: number,
  shares: { userId: Id<"users">; sharePercent: number }[],
): SplitShare[] {
  if (shares.length === 0) throw new Error("Select at least one person to split with");
  for (const share of shares) {
    if (!(share.sharePercent >= 0)) throw new Error("Percents must be zero or greater");
  }

  const percentSum = roundMoney(shares.reduce((s, row) => s + row.sharePercent, 0));
  if (Math.abs(percentSum - 100) > 0.05) {
    throw new Error(`Percents must sum to 100 (got ${percentSum})`);
  }

  const totalPaise = Math.round(amount * 100);
  const provisional = shares.map((share) => {
    const raw = (share.sharePercent / 100) * totalPaise;
    const floorPaise = Math.floor(raw);
    return {
      userId: share.userId,
      sharePercent: roundMoney(share.sharePercent),
      floorPaise,
      frac: raw - floorPaise,
    };
  });

  let assigned = provisional.reduce((s, row) => s + row.floorPaise, 0);
  let remainder = totalPaise - assigned;
  const byFrac = [...provisional].sort((a, b) => b.frac - a.frac);
  const bonus = new Set<string>();
  for (const row of byFrac) {
    if (remainder <= 0) break;
    bonus.add(row.userId as string);
    remainder -= 1;
  }

  const result = provisional.map((row) => ({
    userId: row.userId,
    sharePercent: row.sharePercent,
    shareAmount: (row.floorPaise + (bonus.has(row.userId as string) ? 1 : 0)) / 100,
  }));
  assertSharesSumToAmount(amount, result, "Percent shares");
  return result;
}

export function computeMemberBalances(
  expenses: { paidByUserId: Id<"users">; amount: number }[],
  splits: { userId: Id<"users">; shareAmount: number }[],
  memberIds: Id<"users">[],
  settlements: SettlementTransfer[] = [],
): MemberBalance[] {
  const paid = new Map<string, number>();
  const owed = new Map<string, number>();

  for (const id of memberIds) {
    paid.set(id, 0);
    owed.set(id, 0);
  }

  for (const expense of expenses) {
    paid.set(expense.paidByUserId, (paid.get(expense.paidByUserId) ?? 0) + expense.amount);
  }

  for (const split of splits) {
    owed.set(split.userId, (owed.get(split.userId) ?? 0) + split.shareAmount);
  }

  const balances = memberIds.map((userId) => {
    const p = paid.get(userId) ?? 0;
    const o = owed.get(userId) ?? 0;
    return { userId, paid: p, owed: o, net: roundMoney(p - o) };
  });

  return applySettlements(balances, settlements);
}

/** A paid B → A's net up, B's net down (outstanding shrinks). */
export function applySettlements(
  balances: MemberBalance[],
  settlements: SettlementTransfer[],
): MemberBalance[] {
  if (settlements.length === 0) return balances;

  const map = new Map(balances.map((b) => [b.userId as string, { ...b }]));
  for (const settlement of settlements) {
    const from = map.get(settlement.fromUserId as string);
    const to = map.get(settlement.toUserId as string);
    if (from) from.net = roundMoney(from.net + settlement.amount);
    if (to) to.net = roundMoney(to.net - settlement.amount);
  }
  return balances.map((b) => map.get(b.userId as string) ?? b);
}

export type SimplifiedDebt = {
  fromUserId: Id<"users">;
  toUserId: Id<"users">;
  amount: number;
};

/** Greedy debt simplification: who should pay whom. */
export function simplifyDebts(balances: MemberBalance[]): SimplifiedDebt[] {
  const creditors = balances
    .filter((b) => b.net > 0.005)
    .map((b) => ({ userId: b.userId, amount: b.net }))
    .sort((a, b) => b.amount - a.amount);

  const debtors = balances
    .filter((b) => b.net < -0.005)
    .map((b) => ({ userId: b.userId, amount: -b.net }))
    .sort((a, b) => b.amount - a.amount);

  const debts: SimplifiedDebt[] = [];
  let i = 0;
  let j = 0;

  while (i < creditors.length && j < debtors.length) {
    const pay = Math.min(creditors[i].amount, debtors[j].amount);
    const rounded = roundMoney(pay);
    if (rounded > 0) {
      debts.push({
        fromUserId: debtors[j].userId,
        toUserId: creditors[i].userId,
        amount: rounded,
      });
    }
    creditors[i].amount = roundMoney(creditors[i].amount - pay);
    debtors[j].amount = roundMoney(debtors[j].amount - pay);
    if (creditors[i].amount <= 0.005) i++;
    if (debtors[j].amount <= 0.005) j++;
  }

  return debts;
}

/** Direct pairwise net between `userId` and each other member (no chain simplification). */
export function computePairwiseDebtsWithUser(
  userId: Id<"users">,
  expenses: { _id: Id<"groupExpenses">; paidByUserId: Id<"users"> }[],
  splits: { expenseId: Id<"groupExpenses">; userId: Id<"users">; shareAmount: number }[],
  otherMemberIds: Id<"users">[],
  settlements: SettlementTransfer[] = [],
): { otherUserId: Id<"users">; amount: number }[] {
  const net = new Map<string, number>();

  for (const otherId of otherMemberIds) {
    net.set(otherId, 0);
  }

  for (const expense of expenses) {
    const expenseSplits = splits.filter((s) => s.expenseId === expense._id);
    const mySplit = expenseSplits.find((s) => s.userId === userId)?.shareAmount ?? 0;

    if (expense.paidByUserId === userId) {
      for (const split of expenseSplits) {
        if (split.userId !== userId) {
          net.set(split.userId, (net.get(split.userId) ?? 0) + split.shareAmount);
        }
      }
    } else if (mySplit > 0) {
      const payer = expense.paidByUserId;
      if (net.has(payer)) {
        net.set(payer, (net.get(payer) ?? 0) - mySplit);
      }
    }
  }

  for (const settlement of settlements) {
    if (settlement.fromUserId === userId && net.has(settlement.toUserId as string)) {
      net.set(
        settlement.toUserId as string,
        (net.get(settlement.toUserId as string) ?? 0) + settlement.amount,
      );
    } else if (settlement.toUserId === userId && net.has(settlement.fromUserId as string)) {
      net.set(
        settlement.fromUserId as string,
        (net.get(settlement.fromUserId as string) ?? 0) - settlement.amount,
      );
    }
  }

  return otherMemberIds
    .map((otherUserId) => ({
      otherUserId,
      amount: roundMoney(net.get(otherUserId as string) ?? 0),
    }))
    .filter((d) => Math.abs(d.amount) > 0.005)
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
}

export type GroupSpendAnalytics = {
  allTime: number;
  ytd: number;
  mtd: number;
  monthly: { month: string; total: number }[];
};

export function computeGroupSpendAnalytics(
  expenses: { amount: number; date: string }[],
): GroupSpendAnalytics {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const ytdStart = `${year}-01-01`;
  const mtdStart = `${year}-${month}-01`;

  let allTime = 0;
  let ytd = 0;
  let mtd = 0;
  const monthlyMap = new Map<string, number>();

  for (const expense of expenses) {
    allTime += expense.amount;
    if (expense.date >= ytdStart) ytd += expense.amount;
    if (expense.date >= mtdStart) mtd += expense.amount;
    const key = expense.date.slice(0, 7);
    monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + expense.amount);
  }

  const monthly = Array.from(monthlyMap.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([monthKey, total]) => ({ month: monthKey, total }));

  return {
    allTime: roundMoney(allTime),
    ytd: roundMoney(ytd),
    mtd: roundMoney(mtd),
    monthly,
  };
}
