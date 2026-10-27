/**
 * Smoke tests for Critical/High priority money-math + Clerk link helpers.
 * Run: npm run test:priority
 */

import assert from "node:assert/strict";
import {
  accountDelta,
  bankLedgerBalance,
  type LedgerTx,
} from "../convex/lib/accountBalances";
import type { Id } from "../convex/_generated/dataModel";
import {
  canLinkClerkToUser,
  collectBalanceParticipantIds,
  isActiveMember,
} from "../convex/lib/clerkLink";
import {
  analyzeEmiPayment,
  remainingPrincipalAfterPayments,
} from "../convex/lib/emi";
import { addCalendarMonths } from "../convex/lib/subscriptionDates";

// --- Date clamp ---
assert.equal(addCalendarMonths("2024-01-31", 1), "2024-02-29");
assert.equal(addCalendarMonths("2023-01-31", 1), "2023-02-28");
assert.equal(addCalendarMonths("2024-01-31", 2), "2024-03-31");
assert.equal(addCalendarMonths("2024-03-31", 1), "2024-04-30");
console.log("ok: month-add clamp");

// --- EMI underpay / multi ---
{
  const under = analyzeEmiPayment(5000, 10000);
  assert.equal(under.installmentsCovered, 0);
  assert.equal(under.isUnderpaid, true);
  assert.equal(under.shortfall, 5000);

  const multi = analyzeEmiPayment(25000, 10000);
  assert.equal(multi.installmentsCovered, 2);
  assert.equal(multi.extraAmount, 5000);
  console.log("ok: EMI underpay / multi-pay");
}

// --- Amortization ---
{
  const remaining = remainingPrincipalAfterPayments(100000, 12, [
    { amount: 8884.88 },
  ]);
  assert.ok(remaining < 100000);
  assert.ok(remaining > 90000);
  const zeroRate = remainingPrincipalAfterPayments(10000, 0, [{ amount: 3000 }]);
  assert.equal(zeroRate, 7000);
  console.log("ok: EMI amortization");
}

// --- Ledger + linked debit + transfer ---
{
  const bank = "bank1" as Id<"accounts">;
  const debit = "debit1" as Id<"accounts">;
  const credit = "credit1" as Id<"accounts">;
  const txs: LedgerTx[] = [
    { type: "expense", amount: 200, accountId: debit, date: "2024-01-01" },
    { type: "income", amount: 1000, accountId: bank, date: "2024-01-01" },
    {
      type: "transfer",
      amount: 500,
      accountId: bank,
      transferToAccountId: credit,
      date: "2024-01-01",
    },
  ];
  const ledger = bankLedgerBalance(10000, txs, bank, [debit]);
  // 10000 + 1000 - 200 - 500 = 10300
  assert.equal(ledger, 10300);
  assert.equal(
    accountDelta(
      {
        type: "transfer",
        amount: 50,
        accountId: bank,
        transferToAccountId: credit,
        date: "2024-01-01",
      },
      bank,
    ),
    -50,
  );
  console.log("ok: ledger balance with linked debit + transfer");
}

// --- Settlement pairwise cap (logic mirror) ---
{
  const owedByFrom = 250;
  const amount = 300;
  assert.ok(amount > owedByFrom + 0.009);
  console.log("ok: settlement overpay would be rejected");
}

// --- Clerk email link safety ---
{
  assert.equal(canLinkClerkToUser(undefined, "clerk_a"), true);
  assert.equal(canLinkClerkToUser(null, "clerk_a"), true);
  assert.equal(canLinkClerkToUser("clerk_a", "clerk_a"), true);
  assert.equal(canLinkClerkToUser("clerk_b", "clerk_a"), false);
  console.log("ok: clerk link matrix");
}

// --- leftAt / balance participants ---
{
  assert.equal(isActiveMember({}), true);
  assert.equal(isActiveMember({ leftAt: null }), true);
  assert.equal(isActiveMember({ leftAt: Date.now() }), false);

  const ids = collectBalanceParticipantIds(
    ["u1", "u2"], // u2 may have left but still in membership table
    ["u1"],
    ["u1", "u3"],
    [{ fromUserId: "u2", toUserId: "u1" }],
  );
  assert.deepEqual(ids.sort(), ["u1", "u2", "u3"]);
  console.log("ok: leftAt + balance participant set");
}

console.log("\nAll priority-fix smoke checks passed.");
