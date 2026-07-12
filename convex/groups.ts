import { v } from "convex/values";
import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { requireUserId } from "./lib/user";
import {
  amountSplitShares,
  computeGroupSpendAnalytics,
  computeMemberBalances,
  computePairwiseDebtsWithUser,
  equalSplitShares,
  percentSplitShares,
  simplifyDebts,
} from "./lib/groupBalances";
import {
  decryptGroup,
  decryptGroupExpense,
  encryptGroupExpenseFields,
  encryptGroupFields,
} from "./lib/sensitiveFields";
import { normalizeUsername } from "../lib/auth/normalize";
import {
  formatShareId,
  generateShareId,
  isValidShareId,
  normalizeShareId,
} from "./lib/shareId";

const GROUP_COLORS = [
  "#367a56",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#f59e0b",
  "#14b8a6",
  "#ef4444",
  "#6366f1",
];

type DbCtx = QueryCtx | MutationCtx;

async function getMembership(
  ctx: DbCtx,
  groupId: Id<"expenseGroups">,
  userId: Id<"users">,
) {
  return ctx.db
    .query("expenseGroupMembers")
    .withIndex("by_group_user", (q) => q.eq("groupId", groupId).eq("userId", userId))
    .unique();
}

async function requireMembership(
  ctx: DbCtx,
  groupId: Id<"expenseGroups">,
  userId: Id<"users">,
) {
  const membership = await getMembership(ctx, groupId, userId);
  if (!membership) throw new Error("You are not a member of this group");
  return membership;
}

async function getGroupMembers(ctx: DbCtx, groupId: Id<"expenseGroups">) {
  return ctx.db
    .query("expenseGroupMembers")
    .withIndex("by_group", (q) => q.eq("groupId", groupId))
    .collect();
}

async function userProfile(ctx: QueryCtx, userId: Id<"users">) {
  const user = await ctx.db.get(userId);
  if (!user) return null;
  const storageId = user.image as Id<"_storage"> | undefined;
  const imageUrl = storageId ? await ctx.storage.getUrl(storageId) : null;
  return {
    userId: user._id,
    name: user.name ?? null,
    username: user.username ?? null,
    imageUrl,
  };
}

async function allocateUniqueShareId(ctx: DbCtx): Promise<string> {
  for (let attempt = 0; attempt < 12; attempt++) {
    const shareId = generateShareId();
    const existing = await ctx.db
      .query("expenseGroups")
      .withIndex("by_shareId", (q) => q.eq("shareId", shareId))
      .unique();
    if (!existing) return shareId;
  }
  throw new Error("Could not generate a unique share ID. Please try again.");
}

async function findGroupByShareId(ctx: DbCtx, rawInput: string) {
  const shareId = normalizeShareId(rawInput);
  if (!isValidShareId(shareId)) return null;
  return ctx.db
    .query("expenseGroups")
    .withIndex("by_shareId", (q) => q.eq("shareId", shareId))
    .unique();
}

async function getPendingJoinRequest(
  ctx: DbCtx,
  groupId: Id<"expenseGroups">,
  userId: Id<"users">,
) {
  return ctx.db
    .query("expenseGroupJoinRequests")
    .withIndex("by_group_user", (q) => q.eq("groupId", groupId).eq("userId", userId))
    .filter((q) => q.eq(q.field("status"), "pending"))
    .first();
}

async function getGroupSettlements(ctx: DbCtx, groupId: Id<"expenseGroups">) {
  return ctx.db
    .query("groupSettlements")
    .withIndex("by_group", (q) => q.eq("groupId", groupId))
    .collect();
}

async function getGroupExpensesAndSplits(ctx: DbCtx, groupId: Id<"expenseGroups">) {
  const expenses = await ctx.db
    .query("groupExpenses")
    .withIndex("by_group", (q) => q.eq("groupId", groupId))
    .collect();
  // Single index scan — avoid N+1 per-expense split queries.
  const splits = await ctx.db
    .query("groupExpenseSplits")
    .withIndex("by_group", (q) => q.eq("groupId", groupId))
    .collect();
  return { expenses, splits };
}

async function assertMemberNetSettled(
  ctx: DbCtx,
  groupId: Id<"expenseGroups">,
  memberUserId: Id<"users">,
) {
  const members = await getGroupMembers(ctx, groupId);
  const { expenses, splits } = await getGroupExpensesAndSplits(ctx, groupId);
  const settlements = await getGroupSettlements(ctx, groupId);
  const balances = computeMemberBalances(
    expenses,
    splits,
    members.map((m) => m.userId),
    settlements,
  );
  const net = balances.find((b) => b.userId === memberUserId)?.net ?? 0;
  if (Math.abs(net) > 0.009) {
    throw new Error(
      "Settle outstanding balances for this member before removing them from the group.",
    );
  }
}

export const listMyGroups = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const memberships = await ctx.db
      .query("expenseGroupMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const groups = await Promise.all(
      memberships.map(async (m) => {
        const raw = await ctx.db.get(m.groupId);
        if (!raw) return null;
        const group = await decryptGroup(raw);
        const members = await getGroupMembers(ctx, m.groupId);
        const { expenses, splits } = await getGroupExpensesAndSplits(ctx, m.groupId);
        const settlements = await getGroupSettlements(ctx, m.groupId);

        const memberIds = members.map((mb) => mb.userId);
        const balances = computeMemberBalances(expenses, splits, memberIds, settlements);
        const myBalance = balances.find((b) => b.userId === userId)?.net ?? 0;

        return {
          _id: group._id,
          name: group.name,
          description: group.description ?? null,
          color: group.color,
          shareId: group.shareId ?? null,
          shareIdLabel: group.shareId ? formatShareId(group.shareId) : null,
          role: m.role,
          memberCount: members.length,
          expenseCount: expenses.length,
          myNetBalance: myBalance,
        };
      }),
    );

    return groups.filter(Boolean).sort((a, b) => a!.name.localeCompare(b!.name)) as NonNullable<
      (typeof groups)[number]
    >[];
  },
});

export const listSummary = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const memberships = await ctx.db
      .query("expenseGroupMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    let totalOwedToMe = 0;
    let totalIOwe = 0;

    for (const m of memberships) {
      const { expenses, splits } = await getGroupExpensesAndSplits(ctx, m.groupId);
      const settlements = await getGroupSettlements(ctx, m.groupId);
      const members = await getGroupMembers(ctx, m.groupId);
      const balances = computeMemberBalances(
        expenses,
        splits,
        members.map((mb) => mb.userId),
        settlements,
      );
      const myBalance = balances.find((b) => b.userId === userId)?.net ?? 0;
      if (myBalance > 0.005) totalOwedToMe += myBalance;
      if (myBalance < -0.005) totalIOwe += -myBalance;
    }

    return {
      totalOwedToMe: Math.round(totalOwedToMe * 100) / 100,
      totalIOwe: Math.round(totalIOwe * 100) / 100,
      groupCount: memberships.length,
    };
  },
});

export const previewByShareId = query({
  args: { shareId: v.string() },
  handler: async (ctx, { shareId: raw }) => {
    await requireUserId(ctx);
    const group = await findGroupByShareId(ctx, raw);
    if (!group) return null;
    const decrypted = await decryptGroup(group);
    const members = await getGroupMembers(ctx, group._id);
    return {
      groupId: group._id,
      name: decrypted.name,
      color: decrypted.color,
      memberCount: members.length,
      shareIdLabel: formatShareId(group.shareId!),
    };
  },
});

export const myPendingJoinRequests = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const requests = await ctx.db
      .query("expenseGroupJoinRequests")
      .withIndex("by_user_status", (q) => q.eq("userId", userId).eq("status", "pending"))
      .collect();

    return Promise.all(
      requests.map(async (req) => {
        const raw = await ctx.db.get(req.groupId);
        if (!raw) return null;
        const group = await decryptGroup(raw);
        return {
          _id: req._id,
          groupId: req.groupId,
          groupName: group.name,
          color: group.color,
          shareIdLabel: raw.shareId ? formatShareId(raw.shareId) : null,
        };
      }),
    ).then((rows) => rows.filter(Boolean));
  },
});

export const lookupUser = query({
  args: { username: v.string() },
  handler: async (ctx, { username }) => {
    await requireUserId(ctx);
    const normalized = normalizeUsername(username);
    const user = await ctx.db
      .query("users")
      .withIndex("username", (q) => q.eq("username", normalized))
      .unique();
    if (!user) return null;
    return await userProfile(ctx, user._id);
  },
});

export const getDetail = query({
  args: { groupId: v.id("expenseGroups") },
  handler: async (ctx, { groupId }) => {
    const userId = await requireUserId(ctx);
    const membership = await getMembership(ctx, groupId, userId);
    if (!membership) return null;

    const rawGroup = await ctx.db.get(groupId);
    if (!rawGroup) return null;
    const group = await decryptGroup(rawGroup);

    const memberRows = await getGroupMembers(ctx, groupId);
    const memberProfiles = await Promise.all(
      memberRows.map(async (m) => ({
        ...(await userProfile(ctx, m.userId))!,
        role: m.role,
        membershipId: m._id,
      })),
    );

    const rawExpenses = await ctx.db
      .query("groupExpenses")
      .withIndex("by_group", (q) => q.eq("groupId", groupId))
      .collect();
    rawExpenses.sort((a, b) => (a.date === b.date ? b._creationTime - a._creationTime : b.date.localeCompare(a.date)));

    const allSplits = await ctx.db
      .query("groupExpenseSplits")
      .withIndex("by_group", (q) => q.eq("groupId", groupId))
      .collect();

    const rawSettlements = await getGroupSettlements(ctx, groupId);
    rawSettlements.sort((a, b) =>
      a.date === b.date ? b._creationTime - a._creationTime : b.date.localeCompare(a.date),
    );

    const memberIds = memberRows.map((m) => m.userId);
    const balances = computeMemberBalances(rawExpenses, allSplits, memberIds, rawSettlements);
    const debts = simplifyDebts(balances);
    const otherMemberIds = memberIds.filter((id) => id !== userId);
    const pairwiseWithMe = computePairwiseDebtsWithUser(
      userId,
      rawExpenses,
      allSplits,
      otherMemberIds,
      rawSettlements,
    );

    const profileById = new Map(memberProfiles.map((p) => [p.userId, p]));

    const expenses = await Promise.all(
      rawExpenses.map(async (raw) => {
        const expense = await decryptGroupExpense(raw);
        const splits = allSplits.filter((s) => s.expenseId === expense._id);
        const payer = profileById.get(expense.paidByUserId);
        const mySplit = splits.find((s) => s.userId === userId)?.shareAmount ?? 0;
        const othersShare = splits
          .filter((s) => s.userId !== userId)
          .reduce((sum, s) => sum + s.shareAmount, 0);

        let myLent = 0;
        let myBorrowed = 0;
        if (expense.paidByUserId === userId) {
          myLent = Math.round(othersShare * 100) / 100;
        } else if (mySplit > 0) {
          myBorrowed = mySplit;
        }

        return {
          _id: expense._id,
          description: expense.description,
          amount: expense.amount,
          date: expense.date,
          paidByUserId: expense.paidByUserId,
          createdBy: expense.createdBy,
          splitType: expense.splitType ?? "equal",
          paidByName: payer?.name ?? payer?.username ?? "Someone",
          myLent,
          myBorrowed,
          splits: splits.map((s) => {
            const member = profileById.get(s.userId);
            return {
              userId: s.userId,
              shareAmount: s.shareAmount,
              sharePercent: s.sharePercent ?? null,
              name: member?.name ?? member?.username ?? "Member",
            };
          }),
        };
      }),
    );

    const membersWithBalance = memberProfiles.map((p) => {
      const bal = balances.find((b) => b.userId === p.userId);
      return {
        ...p,
        netBalance: bal?.net ?? 0,
        paid: bal?.paid ?? 0,
        owed: bal?.owed ?? 0,
      };
    });

    const debtsEnriched = debts.map((d) => ({
      ...d,
      fromName:
        profileById.get(d.fromUserId)?.name ??
        profileById.get(d.fromUserId)?.username ??
        "Member",
      toName:
        profileById.get(d.toUserId)?.name ??
        profileById.get(d.toUserId)?.username ??
        "Member",
    }));

    const mySimplifiedSettlements = debtsEnriched
      .filter((d) => d.fromUserId === userId || d.toUserId === userId)
      .map((d) => {
        if (d.fromUserId === userId) {
          return {
            otherUserId: d.toUserId,
            otherName: d.toName,
            amount: d.amount,
            direction: "owe" as const,
          };
        }
        return {
          otherUserId: d.fromUserId,
          otherName: d.fromName,
          amount: d.amount,
          direction: "owed" as const,
        };
      });

    const myPairwiseSettlements = pairwiseWithMe.map((d) => ({
      otherUserId: d.otherUserId,
      otherName:
        profileById.get(d.otherUserId)?.name ??
        profileById.get(d.otherUserId)?.username ??
        "Member",
      amount: Math.abs(d.amount),
      direction: d.amount > 0 ? ("owed" as const) : ("owe" as const),
    }));

    const myMemberBalance = balances.find((b) => b.userId === userId);
    const totalSpent = rawExpenses.reduce((s, e) => s + e.amount, 0);
    const myBalance = myMemberBalance?.net ?? 0;
    const analytics = computeGroupSpendAnalytics(rawExpenses);

    const settlements = rawSettlements.map((s) => ({
      _id: s._id,
      fromUserId: s.fromUserId,
      toUserId: s.toUserId,
      amount: s.amount,
      date: s.date,
      note: s.note ?? null,
      createdBy: s.createdBy,
      fromName:
        profileById.get(s.fromUserId)?.name ??
        profileById.get(s.fromUserId)?.username ??
        "Member",
      toName:
        profileById.get(s.toUserId)?.name ??
        profileById.get(s.toUserId)?.username ??
        "Member",
      canDelete:
        s.createdBy === userId ||
        s.fromUserId === userId ||
        s.toUserId === userId ||
        membership.role === "owner",
    }));

    let pendingJoinRequests: {
      _id: Id<"expenseGroupJoinRequests">;
      userId: Id<"users">;
      name: string | null;
      username: string | null;
      imageUrl: string | null;
    }[] = [];

    if (membership.role === "owner") {
      const pending = await ctx.db
        .query("expenseGroupJoinRequests")
        .withIndex("by_group_status", (q) =>
          q.eq("groupId", groupId).eq("status", "pending"),
        )
        .collect();
      pendingJoinRequests = (
        await Promise.all(
          pending.map(async (req) => {
            const profile = await userProfile(ctx, req.userId);
            if (!profile) return null;
            return {
              _id: req._id,
              userId: req.userId,
              name: profile.name,
              username: profile.username,
              imageUrl: profile.imageUrl,
            };
          }),
        )
      ).filter(Boolean) as typeof pendingJoinRequests;
    }

    return {
      group: {
        _id: group._id,
        name: group.name,
        description: group.description ?? null,
        color: group.color,
        createdBy: group.createdBy,
        shareId: group.shareId ?? null,
        shareIdLabel: group.shareId ? formatShareId(group.shareId) : null,
      },
      myRole: membership.role,
      myNetBalance: myBalance,
      myPaid: myMemberBalance?.paid ?? 0,
      myOwed: myMemberBalance?.owed ?? 0,
      mySimplifiedSettlements,
      myPairwiseSettlements,
      pendingJoinRequests,
      members: membersWithBalance,
      balances: membersWithBalance.map((m) => ({
        userId: m.userId,
        name: m.name ?? m.username ?? "Member",
        netBalance: m.netBalance,
      })),
      debts: debtsEnriched,
      expenses,
      settlements,
      summary: {
        totalSpent,
        expenseCount: expenses.length,
        memberCount: memberProfiles.length,
        settlementCount: settlements.length,
      },
      analytics,
    };
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
    memberUsernames: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const name = args.name.trim();
    if (!name) throw new Error("Group name is required");

    const sensitive = await encryptGroupFields({
      name,
      description: args.description?.trim() || null,
    });

    const color =
      args.color && GROUP_COLORS.includes(args.color)
        ? args.color
        : GROUP_COLORS[Math.floor(Math.random() * GROUP_COLORS.length)];

    const shareId = await allocateUniqueShareId(ctx);

    const groupId = await ctx.db.insert("expenseGroups", {
      name: sensitive.name!,
      description: sensitive.description,
      color,
      createdBy: userId,
      shareId,
    });

    await ctx.db.insert("expenseGroupMembers", {
      groupId,
      userId,
      role: "owner",
    });

    const usernames = args.memberUsernames ?? [];
    for (const raw of usernames) {
      const normalized = normalizeUsername(raw);
      const user = await ctx.db
        .query("users")
        .withIndex("username", (q) => q.eq("username", normalized))
        .unique();
      if (!user || user._id === userId) continue;

      const existing = await getMembership(ctx, groupId, user._id);
      if (existing) continue;

      await ctx.db.insert("expenseGroupMembers", {
        groupId,
        userId: user._id,
        role: "member",
      });
    }

    return groupId;
  },
});

export const ensureShareId = mutation({
  args: { groupId: v.id("expenseGroups") },
  handler: async (ctx, { groupId }) => {
    const userId = await requireUserId(ctx);
    const membership = await requireMembership(ctx, groupId, userId);
    if (membership.role !== "owner") {
      throw new Error("Only the group owner can manage the share ID");
    }
    const group = await ctx.db.get(groupId);
    if (!group) throw new Error("Group not found");
    if (group.shareId) return { shareId: group.shareId, shareIdLabel: formatShareId(group.shareId) };

    const shareId = await allocateUniqueShareId(ctx);
    await ctx.db.patch(groupId, { shareId });
    return { shareId, shareIdLabel: formatShareId(shareId) };
  },
});

export const requestJoin = mutation({
  args: { shareId: v.string() },
  handler: async (ctx, { shareId: raw }) => {
    const userId = await requireUserId(ctx);
    const group = await findGroupByShareId(ctx, raw);
    if (!group) throw new Error("Invalid share ID — check the code and try again");

    const existingMember = await getMembership(ctx, group._id, userId);
    if (existingMember) throw new Error("You are already in this group");

    const pending = await getPendingJoinRequest(ctx, group._id, userId);
    if (pending) throw new Error("You already have a pending request for this group");

    await ctx.db.insert("expenseGroupJoinRequests", {
      groupId: group._id,
      userId,
      status: "pending",
    });

    const decrypted = await decryptGroup(group);
    return {
      groupId: group._id,
      groupName: decrypted.name,
      shareIdLabel: formatShareId(group.shareId!),
    };
  },
});

export const approveJoinRequest = mutation({
  args: { requestId: v.id("expenseGroupJoinRequests") },
  handler: async (ctx, { requestId }) => {
    const userId = await requireUserId(ctx);
    const request = await ctx.db.get(requestId);
    if (!request || request.status !== "pending") {
      throw new Error("Join request not found or already resolved");
    }

    const membership = await requireMembership(ctx, request.groupId, userId);
    if (membership.role !== "owner") {
      throw new Error("Only the group owner can approve join requests");
    }

    const existingMember = await getMembership(ctx, request.groupId, request.userId);
    if (!existingMember) {
      await ctx.db.insert("expenseGroupMembers", {
        groupId: request.groupId,
        userId: request.userId,
        role: "member",
      });
    }

    await ctx.db.patch(requestId, {
      status: "approved",
      resolvedAt: Date.now(),
      resolvedBy: userId,
    });
  },
});

export const rejectJoinRequest = mutation({
  args: { requestId: v.id("expenseGroupJoinRequests") },
  handler: async (ctx, { requestId }) => {
    const userId = await requireUserId(ctx);
    const request = await ctx.db.get(requestId);
    if (!request || request.status !== "pending") {
      throw new Error("Join request not found or already resolved");
    }

    const membership = await requireMembership(ctx, request.groupId, userId);
    if (membership.role !== "owner") {
      throw new Error("Only the group owner can reject join requests");
    }

    await ctx.db.patch(requestId, {
      status: "rejected",
      resolvedAt: Date.now(),
      resolvedBy: userId,
    });
  },
});

export const addMember = mutation({
  args: {
    groupId: v.id("expenseGroups"),
    username: v.string(),
  },
  handler: async (ctx, { groupId, username }) => {
    const userId = await requireUserId(ctx);
    const membership = await requireMembership(ctx, groupId, userId);
    if (membership.role !== "owner") {
      throw new Error("Only the group owner can add members");
    }

    const normalized = normalizeUsername(username);
    const user = await ctx.db
      .query("users")
      .withIndex("username", (q) => q.eq("username", normalized))
      .unique();
    if (!user) throw new Error("No Kubera user found with that username");
    if (user._id === userId) throw new Error("You are already in this group");

    const existing = await getMembership(ctx, groupId, user._id);
    if (existing) throw new Error("This person is already in the group");

    await ctx.db.insert("expenseGroupMembers", {
      groupId,
      userId: user._id,
      role: "member",
    });
  },
});

export const removeMember = mutation({
  args: {
    groupId: v.id("expenseGroups"),
    memberUserId: v.id("users"),
  },
  handler: async (ctx, { groupId, memberUserId }) => {
    const userId = await requireUserId(ctx);
    const membership = await requireMembership(ctx, groupId, userId);
    if (membership.role !== "owner") {
      throw new Error("Only the group owner can remove members");
    }
    if (memberUserId === userId) {
      throw new Error("Transfer ownership before leaving, or delete the group");
    }

    const target = await getMembership(ctx, groupId, memberUserId);
    if (!target) throw new Error("Member not found");
    await assertMemberNetSettled(ctx, groupId, memberUserId);
    await ctx.db.delete(target._id);
  },
});

export const leave = mutation({
  args: { groupId: v.id("expenseGroups") },
  handler: async (ctx, { groupId }) => {
    const userId = await requireUserId(ctx);
    const membership = await requireMembership(ctx, groupId, userId);
    if (membership.role === "owner") {
      throw new Error("Owners cannot leave — delete the group or transfer ownership first");
    }
    await assertMemberNetSettled(ctx, groupId, userId);
    await ctx.db.delete(membership._id);
  },
});

export const remove = mutation({
  args: { groupId: v.id("expenseGroups") },
  handler: async (ctx, { groupId }) => {
    const userId = await requireUserId(ctx);
    const membership = await requireMembership(ctx, groupId, userId);
    if (membership.role !== "owner") {
      throw new Error("Only the group owner can delete this group");
    }

    const expenses = await ctx.db
      .query("groupExpenses")
      .withIndex("by_group", (q) => q.eq("groupId", groupId))
      .collect();
    const splits = await ctx.db
      .query("groupExpenseSplits")
      .withIndex("by_group", (q) => q.eq("groupId", groupId))
      .collect();
    for (const split of splits) await ctx.db.delete(split._id);
    for (const expense of expenses) await ctx.db.delete(expense._id);

    const members = await getGroupMembers(ctx, groupId);
    for (const m of members) await ctx.db.delete(m._id);

    const joinRequests = await ctx.db
      .query("expenseGroupJoinRequests")
      .withIndex("by_group", (q) => q.eq("groupId", groupId))
      .collect();
    for (const req of joinRequests) await ctx.db.delete(req._id);

    const settlements = await getGroupSettlements(ctx, groupId);
    for (const settlement of settlements) await ctx.db.delete(settlement._id);

    await ctx.db.delete(groupId);
  },
});

const splitTypeValidator = v.union(
  v.literal("equal"),
  v.literal("amount"),
  v.literal("percent"),
);

export const createExpense = mutation({
  args: {
    groupId: v.id("expenseGroups"),
    description: v.string(),
    amount: v.number(),
    date: v.string(),
    paidByUserId: v.id("users"),
    splitType: v.optional(splitTypeValidator),
    splitAmongUserIds: v.optional(v.array(v.id("users"))),
    splits: v.optional(
      v.array(
        v.object({
          userId: v.id("users"),
          shareAmount: v.optional(v.number()),
          sharePercent: v.optional(v.number()),
        }),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    await requireMembership(ctx, args.groupId, userId);

    if (!(args.amount > 0)) throw new Error("Amount must be greater than 0");
    const description = args.description.trim();
    if (!description) throw new Error("Description is required");

    const members = await getGroupMembers(ctx, args.groupId);
    const memberIds = new Set(members.map((m) => m.userId));

    if (!memberIds.has(args.paidByUserId)) {
      throw new Error("Payer must be a group member");
    }

    const splitType = args.splitType ?? "equal";
    let shares: { userId: Id<"users">; shareAmount: number; sharePercent?: number }[];

    if (splitType === "equal") {
      const splitIds = uniqueUserIds(
        args.splits?.map((s) => s.userId) ??
          args.splitAmongUserIds ??
          members.map((m) => m.userId),
      );
      if (splitIds.length === 0) throw new Error("Select at least one person to split with");
      for (const id of splitIds) {
        if (!memberIds.has(id)) throw new Error("All split members must be in the group");
      }
      shares = equalSplitShares(args.amount, splitIds);
    } else if (splitType === "amount") {
      if (!args.splits || args.splits.length === 0) {
        throw new Error("Provide custom amounts for each person");
      }
      const rows = uniqueSplitRows(args.splits);
      for (const row of rows) {
        if (!memberIds.has(row.userId)) throw new Error("All split members must be in the group");
        if (row.shareAmount === undefined) throw new Error("Each split needs an amount");
      }
      shares = amountSplitShares(
        args.amount,
        rows.map((row) => ({ userId: row.userId, shareAmount: row.shareAmount! })),
      );
    } else {
      if (!args.splits || args.splits.length === 0) {
        throw new Error("Provide percents for each person");
      }
      const rows = uniqueSplitRows(args.splits);
      for (const row of rows) {
        if (!memberIds.has(row.userId)) throw new Error("All split members must be in the group");
        if (row.sharePercent === undefined) throw new Error("Each split needs a percent");
      }
      shares = percentSplitShares(
        args.amount,
        rows.map((row) => ({ userId: row.userId, sharePercent: row.sharePercent! })),
      );
    }

    const sensitive = await encryptGroupExpenseFields({ description });

    const expenseId = await ctx.db.insert("groupExpenses", {
      groupId: args.groupId,
      paidByUserId: args.paidByUserId,
      amount: args.amount,
      description: sensitive.description!,
      date: args.date,
      createdBy: userId,
      splitType,
    });

    for (const share of shares) {
      await ctx.db.insert("groupExpenseSplits", {
        expenseId,
        groupId: args.groupId,
        userId: share.userId,
        shareAmount: share.shareAmount,
        ...(share.sharePercent !== undefined ? { sharePercent: share.sharePercent } : {}),
      });
    }

    return expenseId;
  },
});

export const recordSettlement = mutation({
  args: {
    groupId: v.id("expenseGroups"),
    fromUserId: v.id("users"),
    toUserId: v.id("users"),
    amount: v.number(),
    date: v.string(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    await requireMembership(ctx, args.groupId, userId);

    if (!(args.amount > 0)) throw new Error("Amount must be greater than 0");
    if (args.fromUserId === args.toUserId) {
      throw new Error("Payer and recipient must be different people");
    }

    const members = await getGroupMembers(ctx, args.groupId);
    const memberIds = new Set(members.map((m) => m.userId));
    if (!memberIds.has(args.fromUserId) || !memberIds.has(args.toUserId)) {
      throw new Error("Both people must be group members");
    }

    const note = args.note?.trim();
    return await ctx.db.insert("groupSettlements", {
      groupId: args.groupId,
      fromUserId: args.fromUserId,
      toUserId: args.toUserId,
      amount: Math.round(args.amount * 100) / 100,
      date: args.date,
      ...(note ? { note } : {}),
      createdBy: userId,
    });
  },
});

export const removeSettlement = mutation({
  args: { settlementId: v.id("groupSettlements") },
  handler: async (ctx, { settlementId }) => {
    const userId = await requireUserId(ctx);
    const settlement = await ctx.db.get(settlementId);
    if (!settlement) throw new Error("Settlement not found");

    const membership = await requireMembership(ctx, settlement.groupId, userId);
    const allowed =
      settlement.createdBy === userId ||
      settlement.fromUserId === userId ||
      settlement.toUserId === userId ||
      membership.role === "owner";
    if (!allowed) throw new Error("You cannot delete this settlement");

    await ctx.db.delete(settlementId);
  },
});

export const removeExpense = mutation({
  args: { expenseId: v.id("groupExpenses") },
  handler: async (ctx, { expenseId }) => {
    const userId = await requireUserId(ctx);
    const expense = await ctx.db.get(expenseId);
    if (!expense) throw new Error("Expense not found");

    const membership = await requireMembership(ctx, expense.groupId, userId);
    if (expense.createdBy !== userId && expense.paidByUserId !== userId && membership.role !== "owner") {
      throw new Error("You can only delete expenses you added or paid for");
    }

    const splits = await ctx.db
      .query("groupExpenseSplits")
      .withIndex("by_expense", (q) => q.eq("expenseId", expenseId))
      .collect();
    for (const split of splits) await ctx.db.delete(split._id);
    await ctx.db.delete(expenseId);
  },
});

function uniqueUserIds(ids: Id<"users">[]): Id<"users">[] {
  const seen = new Set<string>();
  const out: Id<"users">[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

function uniqueSplitRows<T extends { userId: Id<"users"> }>(rows: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const row of rows) {
    if (seen.has(row.userId)) {
      throw new Error("Each person can only appear once in a split");
    }
    seen.add(row.userId);
    out.push(row);
  }
  return out;
}
