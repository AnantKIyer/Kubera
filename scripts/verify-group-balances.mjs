/**
 * Smoke-tests group split + settlement balance math.
 * Run: node scripts/verify-group-balances.mjs
 */

function roundMoney(value) {
  return Math.round(value * 100) / 100;
}

function equalSplitShares(amount, memberIds) {
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

function amountSplitShares(amount, shares) {
  const sum = roundMoney(shares.reduce((s, row) => s + row.shareAmount, 0));
  if (Math.abs(sum - roundMoney(amount)) > 0.009) {
    throw new Error(`Custom amounts must sum to total (got ${sum})`);
  }
  return shares.map((s) => ({ ...s, shareAmount: roundMoney(s.shareAmount) }));
}

function percentSplitShares(amount, shares) {
  const percentSum = roundMoney(shares.reduce((s, row) => s + row.sharePercent, 0));
  if (Math.abs(percentSum - 100) > 0.05) throw new Error(`Percents must sum to 100 (got ${percentSum})`);
  const totalPaise = Math.round(amount * 100);
  const provisional = shares.map((share) => {
    const raw = (share.sharePercent / 100) * totalPaise;
    return { userId: share.userId, sharePercent: share.sharePercent, floorPaise: Math.floor(raw), frac: raw - Math.floor(raw) };
  });
  let remainder = totalPaise - provisional.reduce((s, row) => s + row.floorPaise, 0);
  const byFrac = [...provisional].sort((a, b) => b.frac - a.frac);
  const bonus = new Set();
  for (const row of byFrac) {
    if (remainder <= 0) break;
    bonus.add(row.userId);
    remainder -= 1;
  }
  return provisional.map((row) => ({
    userId: row.userId,
    sharePercent: row.sharePercent,
    shareAmount: (row.floorPaise + (bonus.has(row.userId) ? 1 : 0)) / 100,
  }));
}

function computeMemberBalances(expenses, splits, memberIds, settlements = []) {
  const paid = new Map(memberIds.map((id) => [id, 0]));
  const owed = new Map(memberIds.map((id) => [id, 0]));
  for (const expense of expenses) paid.set(expense.paidByUserId, (paid.get(expense.paidByUserId) ?? 0) + expense.amount);
  for (const split of splits) owed.set(split.userId, (owed.get(split.userId) ?? 0) + split.shareAmount);
  const balances = memberIds.map((userId) => ({
    userId,
    paid: paid.get(userId) ?? 0,
    owed: owed.get(userId) ?? 0,
    net: roundMoney((paid.get(userId) ?? 0) - (owed.get(userId) ?? 0)),
  }));
  for (const s of settlements) {
    const from = balances.find((b) => b.userId === s.fromUserId);
    const to = balances.find((b) => b.userId === s.toUserId);
    if (from) from.net = roundMoney(from.net + s.amount);
    if (to) to.net = roundMoney(to.net - s.amount);
  }
  return balances;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function expectReject(fn, includes) {
  try {
    fn();
    throw new Error(`Expected rejection including "${includes}"`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("Expected rejection")) throw err;
    assert(msg.includes(includes), `Expected "${includes}", got: ${msg}`);
  }
}

const A = "alice";
const B = "bob";
const C = "cara";

// Equal 100/3 remainder
const equal = equalSplitShares(100, [A, B, C]);
assert(equal.map((s) => s.shareAmount).join(",") === "33.34,33.33,33.33", "equal remainder");

// Exact amounts
const exact = amountSplitShares(100, [
  { userId: A, shareAmount: 60 },
  { userId: B, shareAmount: 40 },
]);
assert(exact[0].shareAmount === 60 && exact[1].shareAmount === 40, "exact amounts");
expectReject(
  () => amountSplitShares(100, [{ userId: A, shareAmount: 60 }, { userId: B, shareAmount: 30 }]),
  "sum",
);

// Percent
const pct = percentSplitShares(100, [
  { userId: A, sharePercent: 70 },
  { userId: B, sharePercent: 30 },
]);
assert(pct[0].shareAmount === 70 && pct[1].shareAmount === 30, "percent amounts");
expectReject(
  () => percentSplitShares(100, [{ userId: A, sharePercent: 50 }, { userId: B, sharePercent: 40 }]),
  "100",
);

// Balances + settlement
const expenses = [{ paidByUserId: A, amount: 100 }];
const splits = [
  { userId: A, shareAmount: 50 },
  { userId: B, shareAmount: 50 },
];
let balances = computeMemberBalances(expenses, splits, [A, B]);
assert(balances.find((b) => b.userId === A).net === 50, "A net before settle");
assert(balances.find((b) => b.userId === B).net === -50, "B net before settle");

balances = computeMemberBalances(expenses, splits, [A, B], [
  { fromUserId: B, toUserId: A, amount: 50 },
]);
assert(balances.find((b) => b.userId === A).net === 0, "A settled");
assert(balances.find((b) => b.userId === B).net === 0, "B settled");

console.log("✓ group balance verification passed");
console.log("  - equal / amount / percent splits");
console.log("  - share sum validation");
console.log("  - settlements clear outstanding nets");
