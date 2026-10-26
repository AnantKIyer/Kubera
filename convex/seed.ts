import { v } from "convex/values";
import { internalMutation, mutation, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { calculateEmi } from "./lib/emi";
import { generateShareId } from "./lib/shareId";
import { requireUserId } from "./lib/user";

const DEFAULT_CATEGORIES: {
  name: string;
  type: "income" | "expense";
  color: string;
  icon: string;
  kind?: "regular" | "investment" | "subscription" | "emi";
}[] = [
  { name: "Salary", type: "income", color: "#6b9080", icon: "briefcase" },
  { name: "Freelance", type: "income", color: "#7d9d85", icon: "laptop" },
  { name: "Investments", type: "income", color: "#84a98c", icon: "trending-up", kind: "investment" },
  { name: "Gifts", type: "income", color: "#a4c3b2", icon: "gift" },
  { name: "Other Income", type: "income", color: "#b5c9bc", icon: "plus-circle" },
  { name: "Food & Dining", type: "expense", color: "#c9a88a", icon: "utensils" },
  { name: "Groceries", type: "expense", color: "#d4b896", icon: "shopping-cart" },
  { name: "Shopping", type: "expense", color: "#c4a4a4", icon: "shopping-bag" },
  { name: "Transport", type: "expense", color: "#9bb5c4", icon: "car" },
  { name: "Housing & Rent", type: "expense", color: "#a8a4c4", icon: "home" },
  { name: "Bills & Utilities", type: "expense", color: "#94a7b8", icon: "receipt" },
  { name: "Subscriptions", type: "expense", color: "#b0a4c4", icon: "wifi", kind: "subscription" },
  { name: "Loans & EMI", type: "expense", color: "#9a94b8", icon: "landmark", kind: "emi" },
  { name: "Investments", type: "expense", color: "#7a9e8e", icon: "piggy-bank", kind: "investment" },
  { name: "Entertainment", type: "expense", color: "#c49a9a", icon: "clapperboard" },
  { name: "Health", type: "expense", color: "#c4a0a0", icon: "heart-pulse" },
  { name: "Education", type: "expense", color: "#94a3b8", icon: "graduation-cap" },
  { name: "Travel", type: "expense", color: "#8fb3c4", icon: "plane" },
  { name: "Other Expense", type: "expense", color: "#b8c0c8", icon: "circle-dashed" },
];

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}

function monthKey(y: number, m: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}`;
}

/** Seed default categories for the signed-in user (idempotent). */
export const seedDefaults = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const existing = await ctx.db
      .query("categories")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    if (existing.length === 0) {
      for (const category of DEFAULT_CATEGORIES) {
        await ctx.db.insert("categories", { userId, ...category, isDefault: true });
      }
      return { seeded: true, added: DEFAULT_CATEGORIES.length };
    }

    const names = new Set(existing.map((c) => `${c.type}:${c.name.toLowerCase()}`));
    let added = 0;
    for (const category of DEFAULT_CATEGORIES) {
      const key = `${category.type}:${category.name.toLowerCase()}`;
      if (names.has(key)) continue;
      await ctx.db.insert("categories", { userId, ...category, isDefault: true });
      added++;
    }
    return { seeded: false, added };
  },
});

async function clearUserFinanceData(ctx: MutationCtx, userId: Id<"users">) {
  for (const table of [
    "transactions",
    "subscriptions",
    "emis",
    "investments",
    "accounts",
  ] as const) {
    const rows = await ctx.db
      .query(table)
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const row of rows) await ctx.db.delete(row._id);
  }

  // budgets only index by month — scan and filter for this user
  const allBudgets = await ctx.db.query("budgets").collect();
  for (const row of allBudgets) {
    if (row.userId === userId) await ctx.db.delete(row._id);
  }

  const memberships = await ctx.db
    .query("expenseGroupMembers")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();

  const groupIds = new Set<Id<"expenseGroups">>(
    memberships.map((m) => m.groupId),
  );

  const created = await ctx.db
    .query("expenseGroups")
    .withIndex("by_creator", (q) => q.eq("createdBy", userId))
    .collect();
  for (const g of created) groupIds.add(g._id);

  for (const groupId of Array.from(groupIds)) {
    const expenses = await ctx.db
      .query("groupExpenses")
      .withIndex("by_group", (q) => q.eq("groupId", groupId))
      .collect();
    for (const e of expenses) {
      const splits = await ctx.db
        .query("groupExpenseSplits")
        .withIndex("by_expense", (q) => q.eq("expenseId", e._id))
        .collect();
      for (const s of splits) await ctx.db.delete(s._id);
      await ctx.db.delete(e._id);
    }
    const settlements = await ctx.db
      .query("groupSettlements")
      .withIndex("by_group", (q) => q.eq("groupId", groupId))
      .collect();
    for (const s of settlements) await ctx.db.delete(s._id);
    const requests = await ctx.db
      .query("expenseGroupJoinRequests")
      .withIndex("by_group", (q) => q.eq("groupId", groupId))
      .collect();
    for (const r of requests) await ctx.db.delete(r._id);
    const members = await ctx.db
      .query("expenseGroupMembers")
      .withIndex("by_group", (q) => q.eq("groupId", groupId))
      .collect();
    for (const m of members) await ctx.db.delete(m._id);
    await ctx.db.delete(groupId);
  }
}

/**
 * One-shot rich demo dataset for a Clerk user (dev/demo only).
 * Run: npx convex run seed:seedDemoBundle '{"clerkId":"user_…","force":true}'
 */
export const seedDemoBundle = internalMutation({
  args: {
    clerkId: v.string(),
    force: v.optional(v.boolean()),
  },
  handler: async (ctx, { clerkId, force }) => {
    let user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
      .unique();

    if (!user) {
      const userId = await ctx.db.insert("users", {
        clerkId,
        name: "Demo Kubera",
        email: "kubera.demo.42397@example.com",
        username: "kubera_demo_42397",
        homeCurrency: "INR",
      });
      user = (await ctx.db.get(userId))!;
    }

    const userId = user._id;

    const existingTx = await ctx.db
      .query("transactions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .take(1);

    if (existingTx.length > 0 && !force) {
      return { ok: true, skipped: true, reason: "already has transactions — pass force:true to replace" };
    }

    if (force) {
      await clearUserFinanceData(ctx, userId);
    }

    // Categories
    const cats = await ctx.db
      .query("categories")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const byKey = new Map(cats.map((c) => [`${c.type}:${c.name}`, c._id]));
    for (const category of DEFAULT_CATEGORIES) {
      const key = `${category.type}:${category.name}`;
      if (byKey.has(key)) continue;
      const id = await ctx.db.insert("categories", {
        userId,
        ...category,
        isDefault: true,
      });
      byKey.set(key, id);
    }

    const cat = (type: "income" | "expense", name: string) => byKey.get(`${type}:${name}`)!;

    const salary = cat("income", "Salary");
    const freelance = cat("income", "Freelance");
    const investInc = cat("income", "Investments");
    const gifts = cat("income", "Gifts");
    const food = cat("expense", "Food & Dining");
    const groceries = cat("expense", "Groceries");
    const shopping = cat("expense", "Shopping");
    const transport = cat("expense", "Transport");
    const rent = cat("expense", "Housing & Rent");
    const bills = cat("expense", "Bills & Utilities");
    const subsCat = cat("expense", "Subscriptions");
    const emiCat = cat("expense", "Loans & EMI");
    const investExp = cat("expense", "Investments");
    const entertainment = cat("expense", "Entertainment");
    const health = cat("expense", "Health");
    const education = cat("expense", "Education");
    const travel = cat("expense", "Travel");

    // —— Accounts ——
    const hdfc = await ctx.db.insert("accounts", {
      userId,
      name: "HDFC Salary",
      type: "bank",
      institution: "HDFC Bank",
      lastFour: "4242",
      color: "#1B4D3E",
      isActive: true,
      currentBalance: 248500,
    });
    const sbi = await ctx.db.insert("accounts", {
      userId,
      name: "SBI Savings",
      type: "bank",
      institution: "State Bank of India",
      lastFour: "1177",
      color: "#1A5276",
      isActive: true,
      currentBalance: 62400,
    });
    const upi = await ctx.db.insert("accounts", {
      userId,
      name: "PhonePe UPI",
      type: "wallet",
      institution: "PhonePe",
      color: "#5B2C6F",
      isActive: true,
      linkedBankAccountId: hdfc,
    });
    const gpay = await ctx.db.insert("accounts", {
      userId,
      name: "Google Pay",
      type: "wallet",
      institution: "Google Pay",
      color: "#2874A6",
      isActive: true,
      linkedBankAccountId: hdfc,
    });
    const axis = await ctx.db.insert("accounts", {
      userId,
      name: "Axis Ace",
      type: "credit",
      institution: "Axis Bank",
      lastFour: "8899",
      color: "#922B21",
      isActive: true,
      creditLimit: 150000,
      initialUtilized: 28600,
    });
    const hdfcCc = await ctx.db.insert("accounts", {
      userId,
      name: "HDFC Millennia",
      type: "credit",
      institution: "HDFC Bank",
      lastFour: "5512",
      color: "#7B241C",
      isActive: true,
      creditLimit: 200000,
      initialUtilized: 9400,
    });

    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();

    // —— Loans / EMIs ——
    const carPrincipal = 480000;
    const carRate = 9.25;
    const carTenure = 48;
    const carEmi = calculateEmi(carPrincipal, carRate, carTenure) ?? 12000;
    const carLoanDate = iso(new Date(y - 1, m - 2, 5));
    const carPaid = 14;
    const carEmiId = await ctx.db.insert("emis", {
      userId,
      name: "Car loan — Creta",
      amount: carEmi,
      lender: "HDFC Bank",
      categoryId: emiCat,
      accountId: hdfc,
      nextDebitDate: iso(new Date(y, m + 1, 5)),
      totalInstallments: carTenure,
      paidInstallments: carPaid,
      principalAmount: carPrincipal,
      interestRate: carRate,
      tenureMonths: carTenure,
      loanDate: carLoanDate,
      expectedEmiAmount: carEmi,
      extraPaidTotal: 5000,
      isActive: true,
      notes: "Hyundai Creta — auto debit on 5th",
    });

    const eduPrincipal = 350000;
    const eduRate = 11.5;
    const eduTenure = 60;
    const eduEmi = calculateEmi(eduPrincipal, eduRate, eduTenure) ?? 7700;
    const eduPaid = 22;
    const eduEmiId = await ctx.db.insert("emis", {
      userId,
      name: "Education loan",
      amount: eduEmi,
      lender: "SBI",
      categoryId: emiCat,
      accountId: sbi,
      nextDebitDate: iso(new Date(y, m + 1, 12)),
      totalInstallments: eduTenure,
      paidInstallments: eduPaid,
      principalAmount: eduPrincipal,
      interestRate: eduRate,
      tenureMonths: eduTenure,
      loanDate: iso(new Date(y - 2, m, 12)),
      expectedEmiAmount: eduEmi,
      isActive: true,
      notes: "Master's degree — remaining ~3 years",
    });

    const phonePrincipal = 72000;
    const phoneRate = 0;
    const phoneTenure = 12;
    const phoneEmi = calculateEmi(phonePrincipal, phoneRate, phoneTenure) ?? 6000;
    const phonePaid = 4;
    const phoneEmiId = await ctx.db.insert("emis", {
      userId,
      name: "iPhone EMI",
      amount: phoneEmi,
      lender: "Flipkart Axis",
      categoryId: emiCat,
      accountId: axis,
      nextDebitDate: iso(new Date(y, m + 1, 18)),
      totalInstallments: phoneTenure,
      paidInstallments: phonePaid,
      principalAmount: phonePrincipal,
      interestRate: phoneRate,
      tenureMonths: phoneTenure,
      loanDate: iso(new Date(y, m - 4, 18)),
      expectedEmiAmount: phoneEmi,
      isActive: true,
    });

    // —— Subscriptions ——
    const netflixId = await ctx.db.insert("subscriptions", {
      userId,
      name: "Netflix",
      amount: 649,
      billingCycle: "monthly",
      categoryId: subsCat,
      accountId: hdfc,
      nextRenewalDate: iso(new Date(y, m + 1, 6)),
      isActive: true,
      notes: "Premium 4K",
    });
    const spotifyId = await ctx.db.insert("subscriptions", {
      userId,
      name: "Spotify Duo",
      amount: 149,
      billingCycle: "monthly",
      categoryId: subsCat,
      accountId: hdfc,
      nextRenewalDate: iso(new Date(y, m + 1, 3)),
      isActive: true,
    });
    const ytId = await ctx.db.insert("subscriptions", {
      userId,
      name: "YouTube Premium",
      amount: 129,
      billingCycle: "monthly",
      categoryId: subsCat,
      accountId: hdfcCc,
      nextRenewalDate: iso(new Date(y, m + 1, 14)),
      isActive: true,
    });
    await ctx.db.insert("subscriptions", {
      userId,
      name: "Adobe Creative Cloud",
      amount: 4225,
      billingCycle: "monthly",
      categoryId: subsCat,
      accountId: hdfc,
      nextRenewalDate: iso(new Date(y, m + 1, 22)),
      isActive: true,
      notes: "Work tool — client reimburses part",
    });
    await ctx.db.insert("subscriptions", {
      userId,
      name: "Amazon Prime",
      amount: 1499,
      billingCycle: "yearly",
      categoryId: subsCat,
      accountId: hdfc,
      nextRenewalDate: iso(new Date(y + 1, 2, 1)),
      isActive: true,
    });
    await ctx.db.insert("subscriptions", {
      userId,
      name: "iCloud+",
      amount: 75,
      billingCycle: "monthly",
      categoryId: subsCat,
      accountId: hdfcCc,
      nextRenewalDate: iso(new Date(y, m + 1, 9)),
      isActive: true,
    });
    await ctx.db.insert("subscriptions", {
      userId,
      name: "ChatGPT Plus",
      amount: 1667,
      billingCycle: "monthly",
      categoryId: subsCat,
      accountId: hdfcCc,
      nextRenewalDate: iso(new Date(y, m + 1, 11)),
      isActive: false,
      notes: "Paused — cancelled last month",
    });

    // —— Investments ——
    await ctx.db.insert("investments", {
      userId,
      name: "Nifty 50 Index SIP",
      investmentType: "sip",
      investedAmount: 180000,
      currentValue: 214600,
      accountId: hdfc,
      monthlyAmount: 10000,
      startDate: iso(new Date(y - 1, m, 7)),
      isActive: true,
      notes: "Groww — UTI Nifty 50",
    });
    await ctx.db.insert("investments", {
      userId,
      name: "Parag Parikh Flexi Cap",
      investmentType: "mutual_fund",
      investedAmount: 95000,
      currentValue: 112400,
      accountId: hdfc,
      monthlyAmount: 5000,
      startDate: iso(new Date(y - 1, 3, 15)),
      isActive: true,
    });
    await ctx.db.insert("investments", {
      userId,
      name: "HDFC Bank + Infosys",
      investmentType: "stocks",
      investedAmount: 72000,
      currentValue: 68400,
      accountId: hdfc,
      startDate: iso(new Date(y - 1, 8, 20)),
      isActive: true,
      notes: "Direct equity demat",
    });
    await ctx.db.insert("investments", {
      userId,
      name: "Digital gold",
      investmentType: "gold",
      investedAmount: 28000,
      currentValue: 31200,
      accountId: upi,
      monthlyAmount: 2000,
      startDate: iso(new Date(y - 1, 0, 1)),
      isActive: true,
    });
    await ctx.db.insert("investments", {
      userId,
      name: "SBI Tax Saver FD",
      investmentType: "fd",
      investedAmount: 150000,
      currentValue: 158200,
      accountId: sbi,
      startDate: iso(new Date(y - 1, 5, 10)),
      maturityDate: iso(new Date(y + 4, 5, 10)),
      interestRate: 7.1,
      isActive: true,
    });
    await ctx.db.insert("investments", {
      userId,
      name: "Emergency RD",
      investmentType: "rd",
      investedAmount: 36000,
      currentValue: 37800,
      accountId: sbi,
      monthlyAmount: 3000,
      startDate: iso(new Date(y - 1, m, 1)),
      maturityDate: iso(new Date(y, m + 11, 1)),
      interestRate: 6.5,
      isActive: true,
    });
    await ctx.db.insert("investments", {
      userId,
      name: "LIC Jeevan Anand",
      investmentType: "lic",
      investedAmount: 84000,
      currentValue: 84000,
      accountId: hdfc,
      monthlyAmount: 3500,
      startDate: iso(new Date(y - 2, 2, 1)),
      isActive: true,
    });

    // —— Transactions (3 months of activity) ——
    type TxRow = {
      type: "income" | "expense" | "transfer";
      amount: number;
      description: string;
      categoryId?: Id<"categories">;
      accountId: Id<"accounts">;
      transferToAccountId?: Id<"accounts">;
      subscriptionId?: Id<"subscriptions">;
      emiId?: Id<"emis">;
      date: string;
      originalAmount?: number;
      originalCurrency?: string;
      exchangeRate?: number;
    };

    const rows: TxRow[] = [];

    for (const offset of [0, -1, -2]) {
      const my = m + offset;
      const dy = my < 0 ? y - 1 : y;
      const dm = ((my % 12) + 12) % 12;

      rows.push(
        {
          type: "income",
          amount: 125000,
          description: "Monthly salary",
          categoryId: salary,
          accountId: hdfc,
          date: iso(new Date(dy, dm, 1)),
        },
        {
          type: "income",
          amount: offset === 0 ? 22000 : 15000,
          description: offset === 0 ? "Freelance — brand site" : "Freelance design",
          categoryId: freelance,
          accountId: hdfc,
          date: iso(new Date(dy, dm, 8)),
        },
        {
          type: "expense",
          amount: 32000,
          description: "Apartment rent",
          categoryId: rent,
          accountId: hdfc,
          date: iso(new Date(dy, dm, 2)),
        },
        {
          type: "expense",
          amount: carEmi,
          description: "Car EMI",
          categoryId: emiCat,
          accountId: hdfc,
          emiId: carEmiId,
          date: iso(new Date(dy, dm, 5)),
        },
        {
          type: "expense",
          amount: eduEmi,
          description: "Education loan EMI",
          categoryId: emiCat,
          accountId: sbi,
          emiId: eduEmiId,
          date: iso(new Date(dy, dm, 12)),
        },
        {
          type: "expense",
          amount: phoneEmi,
          description: "iPhone EMI",
          categoryId: emiCat,
          accountId: axis,
          emiId: phoneEmiId,
          date: iso(new Date(dy, dm, 18)),
        },
        {
          type: "expense",
          amount: 10000,
          description: "SIP — Nifty 50 index",
          categoryId: investExp,
          accountId: hdfc,
          date: iso(new Date(dy, dm, 7)),
        },
        {
          type: "expense",
          amount: 5000,
          description: "SIP — Flexi Cap",
          categoryId: investExp,
          accountId: hdfc,
          date: iso(new Date(dy, dm, 15)),
        },
        {
          type: "expense",
          amount: 649,
          description: "Netflix",
          categoryId: subsCat,
          accountId: hdfc,
          subscriptionId: netflixId,
          date: iso(new Date(dy, dm, 6)),
        },
        {
          type: "expense",
          amount: 149,
          description: "Spotify Duo",
          categoryId: subsCat,
          accountId: hdfc,
          subscriptionId: spotifyId,
          date: iso(new Date(dy, dm, 3)),
        },
        {
          type: "expense",
          amount: 129,
          description: "YouTube Premium",
          categoryId: subsCat,
          accountId: hdfcCc,
          subscriptionId: ytId,
          date: iso(new Date(dy, dm, 14)),
        },
        {
          type: "expense",
          amount: 2800 + Math.abs(offset) * 200,
          description: "Electricity + water",
          categoryId: bills,
          accountId: hdfc,
          date: iso(new Date(dy, dm, 10)),
        },
        {
          type: "expense",
          amount: 799,
          description: "Airtel broadband",
          categoryId: bills,
          accountId: hdfc,
          date: iso(new Date(dy, dm, 11)),
        },
        {
          type: "expense",
          amount: 4500 + Math.abs(offset) * 400,
          description: "BigBasket groceries",
          categoryId: groceries,
          accountId: upi,
          date: iso(new Date(dy, dm, 4)),
        },
        {
          type: "expense",
          amount: 2100,
          description: "Instamart top-up",
          categoryId: groceries,
          accountId: gpay,
          date: iso(new Date(dy, dm, 19)),
        },
        {
          type: "expense",
          amount: 1860,
          description: "Dinner at Copper Chimney",
          categoryId: food,
          accountId: upi,
          date: iso(new Date(dy, dm, 12)),
        },
        {
          type: "expense",
          amount: 640,
          description: "Cafe coffee runs",
          categoryId: food,
          accountId: gpay,
          date: iso(new Date(dy, dm, 16)),
        },
        {
          type: "expense",
          amount: 980 + Math.abs(offset) * 120,
          description: "Uber / metro",
          categoryId: transport,
          accountId: upi,
          date: iso(new Date(dy, dm, 14)),
        },
        {
          type: "expense",
          amount: 2200,
          description: "Petrol",
          categoryId: transport,
          accountId: hdfc,
          date: iso(new Date(dy, dm, 21)),
        },
        {
          type: "expense",
          amount: 3400,
          description: "Weekend shopping — H&M",
          categoryId: shopping,
          accountId: axis,
          date: iso(new Date(dy, dm, 17)),
        },
        {
          type: "expense",
          amount: 890,
          description: "Movie + snacks",
          categoryId: entertainment,
          accountId: upi,
          date: iso(new Date(dy, dm, 23)),
        },
        {
          type: "expense",
          amount: 1600,
          description: "Pharmacy / vitamins",
          categoryId: health,
          accountId: gpay,
          date: iso(new Date(dy, dm, 9)),
        },
      );
    }

    // Current-month extras for richer analytics
    rows.push(
      {
        type: "income",
        amount: 4500,
        description: "Dividend — stocks",
        categoryId: investInc,
        accountId: hdfc,
        date: iso(new Date(y, m, 20)),
      },
      {
        type: "income",
        amount: 3000,
        description: "Birthday gift from parents",
        categoryId: gifts,
        accountId: upi,
        date: iso(new Date(y, m, 13)),
      },
      {
        type: "expense",
        amount: 8500,
        description: "Weekend Goa trip deposit",
        categoryId: travel,
        accountId: hdfc,
        date: iso(new Date(y, m, 22)),
      },
      {
        type: "expense",
        amount: 4200,
        description: "Online course — design systems",
        categoryId: education,
        accountId: hdfcCc,
        date: iso(new Date(y, m, 11)),
      },
      {
        type: "expense",
        amount: 78,
        description: "Coffee in Lisbon",
        categoryId: food,
        accountId: hdfcCc,
        date: iso(new Date(y, m, 15)),
        originalAmount: 0.85,
        originalCurrency: "EUR",
        exchangeRate: 91.76,
      },
      {
        type: "transfer",
        amount: 15000,
        description: "Move to emergency fund",
        accountId: hdfc,
        transferToAccountId: sbi,
        date: iso(new Date(y, m, 3)),
      },
      {
        type: "expense",
        amount: 5600,
        description: "New headphones",
        categoryId: shopping,
        accountId: hdfcCc,
        date: iso(new Date(y, m, 24)),
      },
      {
        type: "expense",
        amount: 1200,
        description: "Dentist checkup",
        categoryId: health,
        accountId: hdfc,
        date: iso(new Date(y, m, 18)),
      },
    );

    for (const row of rows) {
      await ctx.db.insert("transactions", { userId, ...row });
    }

    // —— Budgets (current + prior month) ——
    const budgetDefs: { cat: Id<"categories">; amount: number }[] = [
      { cat: food, amount: 8000 },
      { cat: groceries, amount: 10000 },
      { cat: shopping, amount: 7000 },
      { cat: transport, amount: 5000 },
      { cat: entertainment, amount: 3000 },
      { cat: bills, amount: 5000 },
      { cat: health, amount: 4000 },
      { cat: travel, amount: 10000 },
      { cat: subsCat, amount: 8000 },
    ];
    for (const offset of [0, -1]) {
      const my = m + offset;
      const dy = my < 0 ? y - 1 : y;
      const dm = ((my % 12) + 12) % 12;
      const key = monthKey(dy, dm);
      for (const b of budgetDefs) {
        await ctx.db.insert("budgets", {
          userId,
          categoryId: b.cat,
          amount: b.amount,
          month: key,
        });
      }
    }

    // —— Expense groups with stub roommates ——
    async function ensureStubUser(name: string, username: string, email: string) {
      const existing = await ctx.db
        .query("users")
        .withIndex("username", (q) => q.eq("username", username))
        .unique();
      if (existing) return existing._id;
      return ctx.db.insert("users", {
        name,
        username,
        email,
        homeCurrency: "INR",
        clerkId: `demo_stub_${username}`,
      });
    }

    const aisha = await ensureStubUser("Aisha Khan", "aisha_k", "aisha.demo@example.com");
    const rohan = await ensureStubUser("Rohan Mehta", "rohan_m", "rohan.demo@example.com");
    const priya = await ensureStubUser("Priya Shah", "priya_s", "priya.demo@example.com");

    async function uniqueShareId() {
      for (let i = 0; i < 8; i++) {
        const shareId = generateShareId();
        const hit = await ctx.db
          .query("expenseGroups")
          .withIndex("by_shareId", (q) => q.eq("shareId", shareId))
          .unique();
        if (!hit) return shareId;
      }
      return generateShareId();
    }

    const flatShareId = await uniqueShareId();
    const flatId = await ctx.db.insert("expenseGroups", {
      name: "Koramangala flat",
      description: "Rent, groceries, Wi‑Fi — 3BHK roommates",
      color: "#367a56",
      createdBy: userId,
      shareId: flatShareId,
    });
    for (const [uid, role] of [
      [userId, "owner"],
      [aisha, "member"],
      [rohan, "member"],
    ] as const) {
      await ctx.db.insert("expenseGroupMembers", {
        groupId: flatId,
        userId: uid,
        role,
      });
    }

    async function addEqualExpense(
      groupId: Id<"expenseGroups">,
      paidBy: Id<"users">,
      amount: number,
      description: string,
      date: string,
      members: Id<"users">[],
    ) {
      const expenseId = await ctx.db.insert("groupExpenses", {
        groupId,
        paidByUserId: paidBy,
        amount,
        description,
        date,
        createdBy: userId,
        splitType: "equal",
      });
      const share = Math.round((amount / members.length) * 100) / 100;
      let allocated = 0;
      for (let i = 0; i < members.length; i++) {
        const shareAmount =
          i === members.length - 1
            ? Math.round((amount - allocated) * 100) / 100
            : share;
        allocated += shareAmount;
        await ctx.db.insert("groupExpenseSplits", {
          expenseId,
          groupId,
          userId: members[i]!,
          shareAmount,
        });
      }
      return expenseId;
    }

    const flatMembers = [userId, aisha, rohan];
    await addEqualExpense(
      flatId,
      userId,
      48000,
      "October rent",
      iso(new Date(y, m, 1)),
      flatMembers,
    );
    await addEqualExpense(
      flatId,
      aisha,
      3200,
      "BigBasket shared groceries",
      iso(new Date(y, m, 6)),
      flatMembers,
    );
    await addEqualExpense(
      flatId,
      rohan,
      1299,
      "Airtel fiber",
      iso(new Date(y, m, 8)),
      flatMembers,
    );
    await addEqualExpense(
      flatId,
      userId,
      2400,
      "Cleaning service",
      iso(new Date(y, m, 14)),
      flatMembers,
    );
    await addEqualExpense(
      flatId,
      aisha,
      1850,
      "Electricity bill",
      iso(new Date(y, m, 16)),
      flatMembers,
    );
    await ctx.db.insert("groupSettlements", {
      groupId: flatId,
      fromUserId: rohan,
      toUserId: userId,
      amount: 8000,
      date: iso(new Date(y, m, 10)),
      note: "UPI for rent share",
      createdBy: userId,
    });

    const tripShareId = await uniqueShareId();
    const tripId = await ctx.db.insert("expenseGroups", {
      name: "Goa trip",
      description: "Nov long weekend — flights, stay, food",
      color: "#3b82f6",
      createdBy: userId,
      shareId: tripShareId,
    });
    for (const [uid, role] of [
      [userId, "owner"],
      [aisha, "member"],
      [priya, "member"],
    ] as const) {
      await ctx.db.insert("expenseGroupMembers", {
        groupId: tripId,
        userId: uid,
        role,
      });
    }
    const tripMembers = [userId, aisha, priya];
    await addEqualExpense(
      tripId,
      userId,
      27000,
      "Flight tickets BLR–GOI",
      iso(new Date(y, m, 12)),
      tripMembers,
    );
    await addEqualExpense(
      tripId,
      priya,
      18000,
      "Airbnb — 3 nights",
      iso(new Date(y, m, 18)),
      tripMembers,
    );
    await addEqualExpense(
      tripId,
      aisha,
      6400,
      "Scooter rental + fuel",
      iso(new Date(y, m, 20)),
      tripMembers,
    );
    await addEqualExpense(
      tripId,
      userId,
      9200,
      "Seafood dinner + drinks",
      iso(new Date(y, m, 21)),
      tripMembers,
    );

    // Pending join request so Groups UI shows inbox activity
    const pendingUser = await ensureStubUser(
      "Vikram Rao",
      "vikram_r",
      "vikram.demo@example.com",
    );
    await ctx.db.insert("expenseGroupJoinRequests", {
      groupId: flatId,
      userId: pendingUser,
      status: "pending",
    });

    return {
      ok: true,
      skipped: false,
      forced: !!force,
      userId,
      transactions: rows.length,
      emis: 3,
      subscriptions: 7,
      investments: 7,
      budgets: budgetDefs.length * 2,
      accounts: 6,
      groups: 2,
    };
  },
});
