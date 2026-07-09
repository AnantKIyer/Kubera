import { Id } from "../_generated/dataModel";

export type MemberBalance = {
  userId: Id<"users">;
  paid: number;
  owed: number;
  net: number;
};

/** Equal split with paise remainder distributed to first members. */
export function equalSplitShares(
  amount: number,
  memberIds: Id<"users">[],
): { userId: Id<"users">; shareAmount: number }[] {
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

export function computeMemberBalances(
  expenses: { paidByUserId: Id<"users">; amount: number }[],
  splits: { userId: Id<"users">; shareAmount: number }[],
  memberIds: Id<"users">[],
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

  return memberIds.map((userId) => {
    const p = paid.get(userId) ?? 0;
    const o = owed.get(userId) ?? 0;
    return { userId, paid: p, owed: o, net: Math.round((p - o) * 100) / 100 };
  });
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
    const rounded = Math.round(pay * 100) / 100;
    if (rounded > 0) {
      debts.push({
        fromUserId: debtors[j].userId,
        toUserId: creditors[i].userId,
        amount: rounded,
      });
    }
    creditors[i].amount = Math.round((creditors[i].amount - pay) * 100) / 100;
    debtors[j].amount = Math.round((debtors[j].amount - pay) * 100) / 100;
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

  return otherMemberIds
    .map((otherUserId) => ({
      otherUserId,
      amount: Math.round((net.get(otherUserId) ?? 0) * 100) / 100,
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
    allTime: Math.round(allTime * 100) / 100,
    ytd: Math.round(ytd * 100) / 100,
    mtd: Math.round(mtd * 100) / 100,
    monthly,
  };
}
