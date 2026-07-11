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
    /** PWA icon / display preference only — accounting stays INR. */
    homeCurrency: v.optional(v.string()),
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
    /** Amount in base currency (INR) used for stats and balances */
    amount: v.number(),
    /** Original amount when logged in a foreign currency */
    originalAmount: v.optional(v.number()),
    /** ISO 4217 code, e.g. USD, EUR */
    originalCurrency: v.optional(v.string()),
    /** Snapshot: 1 originalCurrency = exchangeRate INR */
    exchangeRate: v.optional(v.number()),
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

  /** Shared expense groups — roommates, trips, households */
  expenseGroups: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    color: v.string(),
    createdBy: v.id("users"),
    /** 8-char uppercase alphanumeric join code (displayed as #CODE) */
    shareId: v.optional(v.string()),
  })
    .index("by_creator", ["createdBy"])
    .index("by_shareId", ["shareId"]),

  expenseGroupMembers: defineTable({
    groupId: v.id("expenseGroups"),
    userId: v.id("users"),
    role: v.union(v.literal("owner"), v.literal("member")),
  })
    .index("by_group", ["groupId"])
    .index("by_user", ["userId"])
    .index("by_group_user", ["groupId", "userId"]),

  groupExpenses: defineTable({
    groupId: v.id("expenseGroups"),
    paidByUserId: v.id("users"),
    amount: v.number(),
    description: v.string(),
    date: v.string(),
    createdBy: v.id("users"),
    /** How shares were entered — omit/equal for legacy rows */
    splitType: v.optional(
      v.union(v.literal("equal"), v.literal("amount"), v.literal("percent")),
    ),
  })
    .index("by_group", ["groupId"])
    .index("by_group_date", ["groupId", "date"]),

  /** Per-member share of a group expense */
  groupExpenseSplits: defineTable({
    expenseId: v.id("groupExpenses"),
    groupId: v.id("expenseGroups"),
    userId: v.id("users"),
    shareAmount: v.number(),
    /** Original percent when splitType is percent (for display) */
    sharePercent: v.optional(v.number()),
  })
    .index("by_expense", ["expenseId"])
    .index("by_group", ["groupId"])
    .index("by_group_user", ["groupId", "userId"]),

  /** Recorded settlements (A paid B) — reduce outstanding balances */
  groupSettlements: defineTable({
    groupId: v.id("expenseGroups"),
    fromUserId: v.id("users"),
    toUserId: v.id("users"),
    amount: v.number(),
    date: v.string(),
    note: v.optional(v.string()),
    createdBy: v.id("users"),
  })
    .index("by_group", ["groupId"])
    .index("by_group_date", ["groupId", "date"]),

  /** Join requests via share ID — owner must approve */
  expenseGroupJoinRequests: defineTable({
    groupId: v.id("expenseGroups"),
    userId: v.id("users"),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
    ),
    resolvedAt: v.optional(v.number()),
    resolvedBy: v.optional(v.id("users")),
  })
    .index("by_group", ["groupId"])
    .index("by_group_status", ["groupId", "status"])
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"])
    .index("by_group_user", ["groupId", "userId"]),
});
