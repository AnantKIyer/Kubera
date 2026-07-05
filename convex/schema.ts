import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

export const categoryKind = v.union(
  v.literal("regular"),
  v.literal("investment"),
  v.literal("subscription"),
  v.literal("emi"),
);

export const accountType = v.union(
  v.literal("bank"),
  v.literal("credit"),
  v.literal("debit"),
  v.literal("wallet"),
);

export const billingCycle = v.union(
  v.literal("monthly"),
  v.literal("quarterly"),
  v.literal("half-yearly"),
  v.literal("yearly"),
);

export const investmentType = v.union(
  v.literal("sip"),
  v.literal("mutual_fund"),
  v.literal("stocks"),
  v.literal("gold"),
  v.literal("silver"),
  v.literal("lic"),
  v.literal("crypto"),
  v.literal("rd"),
  v.literal("fd"),
);

export default defineSchema({
  ...authTables,

  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    username: v.optional(v.string()),
  })
    .index("email", ["email"])
    .index("phone", ["phone"])
    .index("username", ["username"]),

  /** Atomic username reservation — prevents duplicate sign-ups under concurrency */
  usernames: defineTable({
    username: v.string(),
    userId: v.optional(v.id("users")),
  }).index("by_username", ["username"]),

  categories: defineTable({
    userId: v.optional(v.id("users")),
    name: v.string(),
    type: v.union(v.literal("income"), v.literal("expense")),
    color: v.string(),
    icon: v.string(),
    isDefault: v.optional(v.boolean()),
    kind: v.optional(categoryKind),
  })
    .index("by_user", ["userId"])
    .index("by_user_type", ["userId", "type"]),

  accounts: defineTable({
    userId: v.optional(v.id("users")),
    name: v.string(),
    type: accountType,
    institution: v.optional(v.string()),
    lastFour: v.optional(v.string()),
    color: v.string(),
    isActive: v.optional(v.boolean()),
    /** Total credit limit (credit cards only) */
    creditLimit: v.optional(v.number()),
    /** Current balance (bank accounts) */
    currentBalance: v.optional(v.number()),
    /** Debit / UPI linked to a bank account */
    linkedBankAccountId: v.optional(v.id("accounts")),
    /** Outstanding balance when the card was added (credit cards only) */
    initialUtilized: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_user_type", ["userId", "type"]),

  subscriptions: defineTable({
    userId: v.optional(v.id("users")),
    name: v.string(),
    amount: v.number(),
    billingCycle: billingCycle,
    categoryId: v.optional(v.id("categories")),
    accountId: v.optional(v.id("accounts")),
    nextRenewalDate: v.optional(v.string()),
    isActive: v.boolean(),
    notes: v.optional(v.string()),
  }).index("by_user", ["userId"]),

  /** Monthly loan EMIs (education, bike, home, etc.) */
  emis: defineTable({
    userId: v.optional(v.id("users")),
    name: v.string(),
    amount: v.number(),
    lender: v.optional(v.string()),
    categoryId: v.optional(v.id("categories")),
    accountId: v.optional(v.id("accounts")),
    nextDebitDate: v.optional(v.string()),
    totalInstallments: v.optional(v.number()),
    paidInstallments: v.optional(v.number()),
    /** Original loan principal disbursed */
    principalAmount: v.optional(v.number()),
    /** Annual interest rate in percent, e.g. 10.5 */
    interestRate: v.optional(v.number()),
    /** Loan tenure in months */
    tenureMonths: v.optional(v.number()),
    /** Loan disbursement date (YYYY-MM-DD) */
    loanDate: v.optional(v.string()),
    /** EMI computed from principal / rate / tenure at setup */
    expectedEmiAmount: v.optional(v.number()),
    /** Cumulative extra paid beyond scheduled EMI */
    extraPaidTotal: v.optional(v.number()),
    isActive: v.boolean(),
    notes: v.optional(v.string()),
  }).index("by_user", ["userId"]),

  /** Tracked investments — SIP, MF, stocks, gold, FD, etc. */
  investments: defineTable({
    userId: v.optional(v.id("users")),
    name: v.string(),
    investmentType: investmentType,
    /** Total amount invested / principal */
    investedAmount: v.number(),
    /** Current market or maturity value */
    currentValue: v.optional(v.number()),
    accountId: v.optional(v.id("accounts")),
    /** Recurring contribution (SIP, RD, LIC premium) */
    monthlyAmount: v.optional(v.number()),
    startDate: v.optional(v.string()),
    maturityDate: v.optional(v.string()),
    /** Annual interest rate in percent (FD, RD) */
    interestRate: v.optional(v.number()),
    isActive: v.boolean(),
    notes: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_type", ["userId", "investmentType"]),

  transactions: defineTable({
    userId: v.optional(v.id("users")),
    type: v.union(v.literal("income"), v.literal("expense")),
    amount: v.number(),
    description: v.optional(v.string()),
    categoryId: v.optional(v.id("categories")),
    accountId: v.optional(v.id("accounts")),
    subscriptionId: v.optional(v.id("subscriptions")),
    emiId: v.optional(v.id("emis")),
    date: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_user_date", ["userId", "date"])
    .index("by_user_type", ["userId", "type"])
    .index("by_user_category", ["userId", "categoryId"])
    .index("by_user_account", ["userId", "accountId"]),

  budgets: defineTable({
    userId: v.optional(v.id("users")),
    categoryId: v.id("categories"),
    amount: v.number(),
    month: v.string(),
  })
    .index("by_user_month", ["userId", "month"])
    .index("by_user_category_month", ["userId", "categoryId", "month"]),
});
