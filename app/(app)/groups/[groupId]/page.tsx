"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Users,
  Receipt,
  UserPlus,
  Copy,
  Check,
  Banknote,
  BarChart3,
  Settings,
} from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Skeleton, EmptyState } from "@/components/ui/misc";
import {
  FormBody,
  FormError,
  FormField,
  FormFooter,
  FormHint,
  FormRow,
  Input,
  Select,
} from "@/components/ui/form";
import { DatePicker } from "@/components/ui/date-picker";
import { CurrencyMoneyInput, getConvertedAmount } from "@/components/currency-money-input";
import { BASE_CURRENCY, isBaseCurrency } from "@/lib/currency";
import { formatCurrency, formatDate, toISODate } from "@/lib/format";
import { formatMonthLabel, formatNetBalance } from "@/lib/groups";
import { parseUserError } from "@/lib/errors";
import { copyShareId } from "@/lib/share-id";
import { cn } from "@/lib/utils";

const EXPENSE_FORM = "group-expense-form";
const MEMBER_FORM = "add-member-form";

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2 text-sm"
    >
      <span
        className={cn(
          "relative h-5 w-9 rounded-full transition-colors",
          checked ? "bg-primary" : "bg-muted",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-4" : "translate-x-0.5",
          )}
        />
      </span>
      <span className="text-muted-foreground">{label}</span>
    </button>
  );
}

export default function GroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.groupId as Id<"expenseGroups">;

  const [expenseOpen, setExpenseOpen] = useState(false);
  const [memberOpen, setMemberOpen] = useState(false);
  const [settleOpen, setSettleOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [simplifyDebts, setSimplifyDebts] = useState(true);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(BASE_CURRENCY);
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [date, setDate] = useState(toISODate(new Date()));
  const [paidByUserId, setPaidByUserId] = useState("");
  const [splitUserIds, setSplitUserIds] = useState<string[]>([]);
  const [splitType, setSplitType] = useState<"equal" | "amount" | "percent">("equal");
  const [shareAmounts, setShareAmounts] = useState<Record<string, string>>({});
  const [sharePercents, setSharePercents] = useState<Record<string, string>>({});
  const [settleFromUserId, setSettleFromUserId] = useState("");
  const [settleToUserId, setSettleToUserId] = useState("");
  const [settleAmount, setSettleAmount] = useState("");
  const [settleDate, setSettleDate] = useState(toISODate(new Date()));
  const [settleNote, setSettleNote] = useState("");
  const [memberUsername, setMemberUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const detail = useQuery(api.groups.getDetail, { groupId });
  const me = useQuery(api.users.me);
  const lookupUsername = memberUsername.trim().replace(/^@/, "");
  const lookup = useQuery(
    api.groups.lookupUser,
    lookupUsername ? { username: lookupUsername } : "skip",
  );

  const createExpense = useMutation(api.groups.createExpense);
  const removeExpense = useMutation(api.groups.removeExpense);
  const recordSettlement = useMutation(api.groups.recordSettlement);
  const removeSettlement = useMutation(api.groups.removeSettlement);
  const addMember = useMutation(api.groups.addMember);
  const removeMember = useMutation(api.groups.removeMember);
  const leaveGroup = useMutation(api.groups.leave);
  const deleteGroup = useMutation(api.groups.remove);
  const ensureShareId = useMutation(api.groups.ensureShareId);
  const approveJoinRequest = useMutation(api.groups.approveJoinRequest);
  const rejectJoinRequest = useMutation(api.groups.rejectJoinRequest);

  useEffect(() => {
    if (detail && detail.myRole === "owner" && !detail.group.shareId) {
      ensureShareId({ groupId }).catch(() => {});
    }
  }, [detail, ensureShareId, groupId]);

  const settlements = useMemo(() => {
    if (!detail) return [];
    return simplifyDebts ? detail.mySimplifiedSettlements : detail.myPairwiseSettlements;
  }, [detail, simplifyDebts]);

  const expenseTotals = useMemo(() => {
    if (!detail) return { lent: 0, borrowed: 0 };
    return detail.expenses.reduce(
      (acc, exp) => ({
        lent: acc.lent + exp.myLent,
        borrowed: acc.borrowed + exp.myBorrowed,
      }),
      { lent: 0, borrowed: 0 },
    );
  }, [detail]);

  const splitPreview = useMemo(() => {
    const base = getConvertedAmount(amount, currency, exchangeRate);
    if (!base || !detail) return null;
    const ids =
      splitUserIds.length > 0
        ? splitUserIds
        : detail.members.map((m) => m.userId as string);
    const n = ids.length;
    if (n === 0) return null;

    if (splitType === "equal") {
      const shares = ids.map((id, index) => {
        const totalPaise = Math.round(base * 100);
        const basePaise = Math.floor(totalPaise / n);
        const remainder = totalPaise - basePaise * n;
        const paise = basePaise + (index < remainder ? 1 : 0);
        return { id, amount: paise / 100 };
      });
      return { total: base, mode: "equal" as const, shares, count: n };
    }

    if (splitType === "amount") {
      const shares = ids.map((id) => ({
        id,
        amount: Number(shareAmounts[id] || 0),
      }));
      const sum = Math.round(shares.reduce((s, row) => s + row.amount, 0) * 100) / 100;
      return { total: base, mode: "amount" as const, shares, sum, count: n };
    }

    const shares = ids.map((id) => {
      const percent = Number(sharePercents[id] || 0);
      return {
        id,
        percent,
        amount: Math.round(((percent / 100) * base) * 100) / 100,
      };
    });
    const percentSum = Math.round(shares.reduce((s, row) => s + row.percent, 0) * 100) / 100;
    return { total: base, mode: "percent" as const, shares, percentSum, count: n };
  }, [amount, currency, exchangeRate, splitUserIds, detail, splitType, shareAmounts, sharePercents]);

  const openExpenseModal = () => {
    const memberIds = detail?.members.map((m) => m.userId as string) ?? [];
    setDescription("");
    setAmount("");
    setCurrency(BASE_CURRENCY);
    setExchangeRate(null);
    setDate(toISODate(new Date()));
    setPaidByUserId(me?._id ?? "");
    setSplitUserIds(memberIds);
    setSplitType("equal");
    setShareAmounts({});
    setSharePercents(
      Object.fromEntries(memberIds.map((id) => [id, memberIds.length ? String(Math.round((100 / memberIds.length) * 100) / 100) : "0"])),
    );
    setError(null);
    setExpenseOpen(true);
  };

  const openSettleModal = (preset?: { fromUserId?: string; toUserId?: string; amount?: number }) => {
    setSettleFromUserId(preset?.fromUserId ?? me?._id ?? "");
    setSettleToUserId(preset?.toUserId ?? "");
    setSettleAmount(preset?.amount != null ? String(preset.amount) : "");
    setSettleDate(toISODate(new Date()));
    setSettleNote("");
    setError(null);
    setSettleOpen(true);
  };

  const toggleSplitMember = (userId: string) => {
    setSplitUserIds((prev) => {
      const next = prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId];
      if (!prev.includes(userId)) {
        setShareAmounts((amounts) => ({ ...amounts, [userId]: amounts[userId] ?? "" }));
        setSharePercents((percents) => ({
          ...percents,
          [userId]: percents[userId] ?? "",
        }));
      }
      return next;
    });
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const baseAmount = getConvertedAmount(amount, currency, exchangeRate);
    if (!baseAmount || baseAmount <= 0) {
      setError("Enter a valid amount");
      return;
    }
    if (!isBaseCurrency(currency) && !exchangeRate) {
      setError("Wait for the exchange rate to load");
      return;
    }
    if (!description.trim()) {
      setError("Enter a description");
      return;
    }
    if (!paidByUserId) {
      setError("Choose who paid");
      return;
    }
    if (splitUserIds.length === 0) {
      setError("Select at least one person to split with");
      return;
    }

    setSaving(true);
    try {
      if (splitType === "equal") {
        await createExpense({
          groupId,
          description: description.trim(),
          amount: baseAmount,
          date,
          paidByUserId: paidByUserId as Id<"users">,
          splitType: "equal",
          splitAmongUserIds: splitUserIds as Id<"users">[],
        });
      } else if (splitType === "amount") {
        await createExpense({
          groupId,
          description: description.trim(),
          amount: baseAmount,
          date,
          paidByUserId: paidByUserId as Id<"users">,
          splitType: "amount",
          splits: splitUserIds.map((userId) => ({
            userId: userId as Id<"users">,
            shareAmount: Number(shareAmounts[userId] || 0),
          })),
        });
      } else {
        await createExpense({
          groupId,
          description: description.trim(),
          amount: baseAmount,
          date,
          paidByUserId: paidByUserId as Id<"users">,
          splitType: "percent",
          splits: splitUserIds.map((userId) => ({
            userId: userId as Id<"users">,
            sharePercent: Number(sharePercents[userId] || 0),
          })),
        });
      }
      setExpenseOpen(false);
    } catch (err) {
      setError(parseUserError(err, "Could not add expense."));
    } finally {
      setSaving(false);
    }
  };

  const handleRecordSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const amountValue = Number(settleAmount);
    if (!(amountValue > 0)) {
      setError("Enter a valid settlement amount");
      return;
    }
    if (!settleFromUserId || !settleToUserId) {
      setError("Choose who paid and who received");
      return;
    }
    if (settleFromUserId === settleToUserId) {
      setError("Payer and recipient must be different");
      return;
    }

    setSaving(true);
    try {
      await recordSettlement({
        groupId,
        fromUserId: settleFromUserId as Id<"users">,
        toUserId: settleToUserId as Id<"users">,
        amount: amountValue,
        date: settleDate,
        note: settleNote.trim() || undefined,
      });
      setSettleOpen(false);
    } catch (err) {
      setError(parseUserError(err, "Could not record settlement."));
    } finally {
      setSaving(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!memberUsername.trim()) {
      setError("Enter a username");
      return;
    }
    setSaving(true);
    try {
      await addMember({ groupId, username: memberUsername.trim() });
      setMemberOpen(false);
      setMemberUsername("");
    } catch (err) {
      setError(parseUserError(err, "Could not add member."));
    } finally {
      setSaving(false);
    }
  };

  const handleCopyShareId = async () => {
    if (!detail?.group.shareId) return;
    const ok = await copyShareId(detail.group.shareId);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (detail === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (detail === null) {
    return (
      <EmptyState
        icon={<Users size={22} />}
        title="Group not found"
        description="This group may have been deleted or you don't have access."
        action={
          <Link href="/groups">
            <Button variant="outline">Back to groups</Button>
          </Link>
        }
      />
    );
  }

  const myBalance = formatNetBalance(detail.myNetBalance);
  const isOwner = detail.myRole === "owner";

  return (
    <>
      <div className="mb-4">
        <Link
          href="/groups"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={16} />
          All groups
        </Link>
      </div>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {detail.group.name}
            </h1>
            {detail.group.shareIdLabel && (
              <button
                type="button"
                onClick={handleCopyShareId}
                title="Tap to copy share ID"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-muted/30 px-2.5 py-1 font-mono text-sm font-semibold tracking-wider text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
              >
                {detail.group.shareIdLabel}
                {copied ? (
                  <Check size={14} className="text-[hsl(var(--income))]" />
                ) : (
                  <Copy size={14} />
                )}
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="mt-2 inline-flex items-center gap-2 rounded-lg py-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
            title="View members & settings"
          >
            <div className="flex -space-x-2">
              {detail.members.slice(0, 4).map((m) => (
                <UserAvatar
                  key={m.userId}
                  name={m.name}
                  username={m.username}
                  imageUrl={m.imageUrl}
                  size="sm"
                  className="ring-2 ring-background"
                />
              ))}
            </div>
            <span className="inline-flex items-center gap-1">
              <Users size={14} />
              {detail.summary.memberCount} member
              {detail.summary.memberCount !== 1 ? "s" : ""}
            </span>
          </button>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
            <Settings size={16} />
            Settings
          </Button>
          <Button onClick={openExpenseModal}>
            <Plus size={16} /> Expense
          </Button>
        </div>
      </div>

      {/* Balance hero */}
      <Card className="mb-4">
        <CardContent className="pt-5">
          <p className="text-sm text-muted-foreground">{myBalance.label}</p>
          <p
            className={cn(
              "mt-1 text-3xl font-bold tabular-nums",
              myBalance.tone === "positive" && "text-[hsl(var(--income))]",
              myBalance.tone === "negative" && "text-[hsl(var(--expense))]",
              myBalance.tone === "neutral" && "text-foreground",
            )}
          >
            {myBalance.tone === "neutral"
              ? formatCurrency(0)
              : `${myBalance.tone === "positive" ? "+" : "−"}${formatCurrency(myBalance.amount)}`}
          </p>
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span>Lent {formatCurrency(expenseTotals.lent)}</span>
            <span>Borrowed {formatCurrency(expenseTotals.borrowed)}</span>
            <span>Paid {formatCurrency(detail.myPaid)}</span>
            <span>Your share {formatCurrency(detail.myOwed)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Who owes whom (my view) */}
      <Card className="mb-4">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-base">
            {settlements.length > 0 ? "Settlements" : "All settled"}
          </CardTitle>
          <Toggle
            checked={simplifyDebts}
            onChange={setSimplifyDebts}
            label="Simplify debts"
          />
        </CardHeader>
        <CardContent>
          {settlements.length === 0 ? (
            <p className="text-sm text-muted-foreground">No outstanding balances with anyone.</p>
          ) : (
            <div className="space-y-2">
              {settlements.map((s) => (
                <div
                  key={s.otherUserId}
                  className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2.5"
                >
                  <p className="text-sm">
                    {s.direction === "owe" ? (
                      <>
                        You owe <span className="font-medium">{s.otherName}</span>
                      </>
                    ) : (
                      <>
                        <span className="font-medium">{s.otherName}</span> owes you
                      </>
                    )}
                  </p>
                  <p
                    className={cn(
                      "text-sm font-semibold tabular-nums",
                      s.direction === "owed"
                        ? "text-[hsl(var(--income))]"
                        : "text-[hsl(var(--expense))]",
                    )}
                  >
                    {formatCurrency(s.amount)}
                  </p>
                </div>
              ))}
            </div>
          )}

          {settlements.length > 0 && (
            <Button className="mt-4 w-full" onClick={() => openSettleModal()}>
              <Banknote size={16} /> Settle up
            </Button>
          )}
          {settlements.length === 0 && (
            <Button className="mt-4 w-full" variant="outline" onClick={() => openSettleModal()}>
              <Banknote size={16} /> Record a settlement
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Analytics */}
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 size={16} className="text-primary" />
            Group spend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-xs text-muted-foreground">All time</p>
              <p className="mt-0.5 font-semibold tabular-nums">
                {formatCurrency(detail.analytics.allTime)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">YTD</p>
              <p className="mt-0.5 font-semibold tabular-nums">
                {formatCurrency(detail.analytics.ytd)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">MTD</p>
              <p className="mt-0.5 font-semibold tabular-nums">
                {formatCurrency(detail.analytics.mtd)}
              </p>
            </div>
          </div>

          {detail.analytics.monthly.length > 0 && (
            <div className="mt-4 space-y-1.5 border-t border-border/60 pt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Monthly
              </p>
              {detail.analytics.monthly.map((row) => (
                <div key={row.month} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{formatMonthLabel(row.month)}</span>
                  <span className="font-medium tabular-nums">{formatCurrency(row.total)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Expenses */}
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Receipt size={16} className="text-primary" />
            Expenses
            <span className="text-sm font-normal text-muted-foreground">
              ({detail.summary.expenseCount})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {detail.expenses.length === 0 ? (
            <EmptyState
              icon={<Receipt size={20} />}
              title="No expenses yet"
              description="Add a shared expense to start tracking."
              action={
                <Button size="sm" onClick={openExpenseModal}>
                  <Plus size={16} /> Add expense
                </Button>
              }
            />
          ) : (
            <div className="divide-y divide-border/60">
              {detail.expenses.map((exp) => (
                <div key={exp._id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium">{exp.description}</p>
                      <p className="shrink-0 font-semibold tabular-nums">
                        {formatCurrency(exp.amount)}
                      </p>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatDate(exp.date)} · {exp.paidByName}
                      {exp.paidByUserId === me?._id ? " (you paid)" : ""}
                      {exp.splitType === "amount"
                        ? " · exact amounts"
                        : exp.splitType === "percent"
                          ? " · percent split"
                          : ""}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-3 text-xs">
                      {exp.myLent > 0 && (
                        <span className="text-[hsl(var(--income))]">
                          Lent {formatCurrency(exp.myLent)}
                        </span>
                      )}
                      {exp.myBorrowed > 0 && (
                        <span className="text-[hsl(var(--expense))]">
                          Borrowed {formatCurrency(exp.myBorrowed)}
                        </span>
                      )}
                      {exp.myLent === 0 && exp.myBorrowed === 0 && (
                        <span className="text-muted-foreground">Not in your split</span>
                      )}
                    </div>
                  </div>
                  {(exp.createdBy === me?._id || exp.paidByUserId === me?._id) && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm("Delete this expense?")) {
                          removeExpense({ expenseId: exp._id });
                        }
                      }}
                      className="shrink-0 self-start rounded-md p-1.5 text-muted-foreground hover:bg-[hsl(var(--expense))]/10 hover:text-[hsl(var(--expense))]"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Settlement history */}
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Banknote size={16} className="text-primary" />
            Settlement history
            <span className="text-sm font-normal text-muted-foreground">
              ({detail.summary.settlementCount})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {detail.settlements.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No settlements recorded yet. Use Settle up after paying someone outside Kubera.
            </p>
          ) : (
            <div className="divide-y divide-border/60">
              {detail.settlements.map((s) => (
                <div key={s._id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      <span className="font-medium">{s.fromName}</span> paid{" "}
                      <span className="font-semibold tabular-nums">{formatCurrency(s.amount)}</span>{" "}
                      to <span className="font-medium">{s.toName}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatDate(s.date)}
                      {s.note ? ` · ${s.note}` : ""}
                    </p>
                  </div>
                  {s.canDelete && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm("Delete this settlement?")) {
                          removeSettlement({ settlementId: s._id });
                        }
                      }}
                      className="shrink-0 self-start rounded-md p-1.5 text-muted-foreground hover:bg-[hsl(var(--expense))]/10 hover:text-[hsl(var(--expense))]"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Settings — same layout for everyone; owner gets extra actions */}
      <Modal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="Group settings"
        description={
          isOwner
            ? "Manage members, share ID, and group options."
            : "View members, share ID, and leave the group."
        }
        size="lg"
        footer={
          <Button variant="outline" onClick={() => setSettingsOpen(false)}>
            Close
          </Button>
        }
      >
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2.5">
            <div>
              <p className="text-xs text-muted-foreground">Share ID</p>
              <p className="font-mono font-semibold tracking-wider">
                {detail.group.shareIdLabel ?? "—"}
              </p>
            </div>
            {detail.group.shareId && (
              <Button variant="outline" size="sm" onClick={handleCopyShareId}>
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? "Copied" : "Copy"}
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                Members ({detail.summary.memberCount})
              </p>
              {isOwner && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setError(null);
                    setMemberOpen(true);
                  }}
                >
                  <UserPlus size={14} /> Add
                </Button>
              )}
            </div>
            {detail.members.map((m) => (
              <div
                key={m.userId}
                className="flex items-center gap-2 rounded-lg border border-border/60 px-3 py-2"
              >
                <UserAvatar
                  name={m.name}
                  username={m.username}
                  imageUrl={m.imageUrl}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    {m.name ?? `@${m.username}`}
                    {m.userId === me?._id && (
                      <span className="text-muted-foreground"> (you)</span>
                    )}
                  </p>
                  <p className="text-xs capitalize text-muted-foreground">{m.role}</p>
                </div>
                {isOwner && m.userId !== me?._id && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Remove ${m.name ?? m.username}?`)) {
                        removeMember({ groupId, memberUserId: m.userId });
                      }
                    }}
                    className="rounded-md p-1 text-muted-foreground hover:text-[hsl(var(--expense))]"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {isOwner && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Join requests</p>
              {detail.pendingJoinRequests.length === 0 ? (
                <p className="text-sm text-muted-foreground">No pending requests.</p>
              ) : (
                detail.pendingJoinRequests.map((req) => (
                  <div
                    key={req._id}
                    className="flex flex-wrap items-center gap-2 rounded-lg border border-border/60 px-3 py-2"
                  >
                    <UserAvatar
                      name={req.name}
                      username={req.username}
                      imageUrl={req.imageUrl}
                      size="sm"
                    />
                    <span className="min-w-0 flex-1 text-sm">
                      {req.name ?? `@${req.username}`}
                    </span>
                    <Button size="sm" onClick={() => approveJoinRequest({ requestId: req._id })}>
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => rejectJoinRequest({ requestId: req._id })}
                    >
                      Decline
                    </Button>
                  </div>
                ))
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2 border-t border-border/60 pt-4">
            {isOwner ? (
              <Button
                variant="outline"
                size="sm"
                className="text-[hsl(var(--expense))]"
                onClick={() => {
                  if (confirm("Delete this group and all expenses?")) {
                    deleteGroup({ groupId }).then(() => router.push("/groups"));
                  }
                }}
              >
                Delete group
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (confirm("Leave this group?")) {
                    leaveGroup({ groupId }).then(() => router.push("/groups"));
                  }
                }}
              >
                Leave group
              </Button>
            )}
          </div>
        </div>
      </Modal>

      {/* Settle up modal */}
      <Modal
        open={settleOpen}
        onClose={() => setSettleOpen(false)}
        title="Record settlement"
        description="Log a payment between members to update outstanding balances."
        size="lg"
        footer={
          <FormFooter
            formId="settlement-form"
            onCancel={() => setSettleOpen(false)}
            submitLabel="Record settlement"
            loading={saving}
          />
        }
      >
        <form id="settlement-form" onSubmit={handleRecordSettlement}>
          <FormBody>
            {settlements.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Suggested</p>
                {settlements.map((s) => {
                  const fromUserId = s.direction === "owe" ? (me?._id ?? "") : s.otherUserId;
                  const toUserId = s.direction === "owe" ? s.otherUserId : (me?._id ?? "");
                  return (
                    <button
                      key={`${s.otherUserId}-${s.direction}`}
                      type="button"
                      onClick={() => {
                        setSettleFromUserId(fromUserId);
                        setSettleToUserId(toUserId);
                        setSettleAmount(String(s.amount));
                      }}
                      className="flex w-full items-center justify-between rounded-xl border border-border px-3 py-2.5 text-left text-sm hover:border-primary/40"
                    >
                      <span>
                        {s.direction === "owe" ? (
                          <>
                            You pay <span className="font-medium">{s.otherName}</span>
                          </>
                        ) : (
                          <>
                            <span className="font-medium">{s.otherName}</span> pays you
                          </>
                        )}
                      </span>
                      <span className="font-semibold tabular-nums">{formatCurrency(s.amount)}</span>
                    </button>
                  );
                })}
              </div>
            )}

            <FormRow>
              <FormField label="Paid by">
                <Select
                  value={settleFromUserId}
                  onChange={(e) => setSettleFromUserId(e.target.value)}
                  required
                >
                  <option value="">Select member</option>
                  {detail.members.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.name ?? m.username ?? "Member"}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Paid to">
                <Select
                  value={settleToUserId}
                  onChange={(e) => setSettleToUserId(e.target.value)}
                  required
                >
                  <option value="">Select member</option>
                  {detail.members.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.name ?? m.username ?? "Member"}
                    </option>
                  ))}
                </Select>
              </FormField>
            </FormRow>

            <FormRow>
              <FormField label="Amount">
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  required
                />
              </FormField>
              <FormField label="Date">
                <DatePicker value={settleDate} onChange={setSettleDate} required />
              </FormField>
            </FormRow>

            <FormField label="Note (optional)">
              <Input
                value={settleNote}
                onChange={(e) => setSettleNote(e.target.value)}
                placeholder="UPI, cash, bank transfer…"
              />
            </FormField>

            {error && (
              <FormError
                title="Couldn't record settlement"
                message={error}
                onDismiss={() => setError(null)}
              />
            )}
          </FormBody>
        </form>
      </Modal>

      {/* Add expense modal */}
      <Modal
        open={expenseOpen}
        onClose={() => setExpenseOpen(false)}
        title="Add expense"
        description="Split equally, by exact amounts, or by percentage."
        size="lg"
        footer={
          <FormFooter
            formId={EXPENSE_FORM}
            onCancel={() => setExpenseOpen(false)}
            submitLabel="Add expense"
            loading={saving}
          />
        }
      >
        <form id={EXPENSE_FORM} onSubmit={handleAddExpense}>
          <FormBody>
            <FormField label="Description">
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Groceries, dinner, utilities…"
                required
                autoFocus
              />
            </FormField>

            <CurrencyMoneyInput
              value={amount}
              onChange={setAmount}
              currency={currency}
              onCurrencyChange={setCurrency}
              exchangeRate={exchangeRate}
              onExchangeRateChange={setExchangeRate}
              transactionDate={date}
              required
            />

            <FormRow>
              <FormField label="Date">
                <DatePicker value={date} onChange={setDate} required />
              </FormField>
              <FormField label="Paid by">
                <Select
                  value={paidByUserId}
                  onChange={(e) => setPaidByUserId(e.target.value)}
                  required
                >
                  <option value="">Select member</option>
                  {detail.members.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.name ?? m.username ?? "Member"}
                    </option>
                  ))}
                </Select>
              </FormField>
            </FormRow>

            <FormField label="Split type">
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["equal", "Equal"],
                    ["amount", "Exact amounts"],
                    ["percent", "Percent"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSplitType(value)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      splitType === value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/40",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </FormField>

            <FormField label="Split among">
              <div className="flex flex-wrap gap-2">
                {detail.members.map((m) => {
                  const selected = splitUserIds.includes(m.userId as string);
                  return (
                    <button
                      key={m.userId}
                      type="button"
                      onClick={() => toggleSplitMember(m.userId as string)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                        selected
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/40",
                      )}
                    >
                      {m.name ?? m.username}
                    </button>
                  );
                })}
              </div>
            </FormField>

            {splitType !== "equal" && splitUserIds.length > 0 && (
              <div className="space-y-2 rounded-xl border border-border/60 p-3">
                {splitUserIds.map((userId) => {
                  const member = detail.members.find((m) => m.userId === userId);
                  const label = member?.name ?? member?.username ?? "Member";
                  return (
                    <div key={userId} className="flex items-center gap-3">
                      <p className="min-w-0 flex-1 truncate text-sm">{label}</p>
                      {splitType === "amount" ? (
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          className="w-28"
                          value={shareAmounts[userId] ?? ""}
                          onChange={(e) =>
                            setShareAmounts((prev) => ({ ...prev, [userId]: e.target.value }))
                          }
                          placeholder="0.00"
                          required
                        />
                      ) : (
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            className="w-24"
                            value={sharePercents[userId] ?? ""}
                            onChange={(e) =>
                              setSharePercents((prev) => ({ ...prev, [userId]: e.target.value }))
                            }
                            placeholder="0"
                            required
                          />
                          <span className="text-xs text-muted-foreground">%</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {splitPreview && splitPreview.mode === "equal" && (
              <FormHint>
                {formatCurrency(splitPreview.shares[0]?.amount ?? 0)} per person (
                {splitPreview.count} people) · total {formatCurrency(splitPreview.total)}
              </FormHint>
            )}
            {splitPreview && splitPreview.mode === "amount" && (
              <FormHint>
                Entered {formatCurrency(splitPreview.sum)} of {formatCurrency(splitPreview.total)}
                {Math.abs(splitPreview.sum - splitPreview.total) > 0.009 ? " — must match total" : ""}
              </FormHint>
            )}
            {splitPreview && splitPreview.mode === "percent" && (
              <FormHint>
                Percents total {splitPreview.percentSum}%
                {Math.abs(splitPreview.percentSum - 100) > 0.05 ? " — must equal 100%" : ""}
              </FormHint>
            )}

            {error && (
              <FormError title="Couldn't add expense" message={error} onDismiss={() => setError(null)} />
            )}
          </FormBody>
        </form>
      </Modal>

      {/* Add member modal */}
      <Modal
        open={memberOpen}
        onClose={() => setMemberOpen(false)}
        title="Add member"
        description="They must have a Kubera account."
        footer={
          <FormFooter
            formId={MEMBER_FORM}
            onCancel={() => setMemberOpen(false)}
            submitLabel="Add member"
            loading={saving}
          />
        }
      >
        <form id={MEMBER_FORM} onSubmit={handleAddMember}>
          <FormBody>
            <FormField label="Username">
              <Input
                value={memberUsername}
                onChange={(e) => setMemberUsername(e.target.value)}
                placeholder="@username"
                required
                autoFocus
              />
            </FormField>
            {lookup === undefined && memberUsername.trim() && (
              <p className="text-xs text-muted-foreground">Looking up…</p>
            )}
            {lookup === null && memberUsername.trim() && (
              <p className="text-xs text-[hsl(var(--expense))]">No user found with that username</p>
            )}
            {lookup && (
              <div className="flex items-center gap-3 rounded-xl bg-muted/30 px-3 py-2">
                <UserAvatar
                  name={lookup.name}
                  username={lookup.username}
                  imageUrl={lookup.imageUrl}
                />
                <div>
                  <p className="text-sm font-medium">{lookup.name ?? lookup.username}</p>
                  <p className="text-xs text-muted-foreground">@{lookup.username}</p>
                </div>
              </div>
            )}
            {error && (
              <FormError title="Couldn't add member" message={error} onDismiss={() => setError(null)} />
            )}
          </FormBody>
        </form>
      </Modal>
    </>
  );
}
