"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Plus, Users, Hash, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { EmptyState, Skeleton } from "@/components/ui/misc";
import {
  ColorPicker,
  FormBody,
  FormField,
  FormFooter,
  FormHint,
  Input,
  Textarea,
} from "@/components/ui/form";
import { formatCurrency } from "@/lib/format";
import { GROUP_COLORS, formatNetBalance } from "@/lib/groups";
import { cn } from "@/lib/utils";
import { parseUserError } from "@/lib/errors";
import { isValidShareIdInput, parseShareIdInput } from "@/lib/share-id";

const FORM_ID = "create-group-form";
const JOIN_FORM_ID = "join-group-form";

export default function GroupsPage() {
  const router = useRouter();
  const groups = useQuery(api.groups.listMyGroups, {});
  const summary = useQuery(api.groups.listSummary, {});
  const pendingRequests = useQuery(api.groups.myPendingJoinRequests, {});
  const create = useMutation(api.groups.create);
  const requestJoin = useMutation(api.groups.requestJoin);

  const [open, setOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState<string>(GROUP_COLORS[0]);
  const [memberInput, setMemberInput] = useState("");
  const [memberUsernames, setMemberUsernames] = useState<string[]>([]);
  const [shareIdInput, setShareIdInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [joining, setJoining] = useState(false);

  const parsedShareId = parseShareIdInput(shareIdInput);
  const shareIdPreview = useQuery(
    api.groups.previewByShareId,
    parsedShareId.length === 8 ? { shareId: parsedShareId } : "skip",
  );

  const resetForm = () => {
    setName("");
    setDescription("");
    setColor(GROUP_COLORS[0]);
    setMemberInput("");
    setMemberUsernames([]);
    setError(null);
  };

  const resetJoinForm = () => {
    setShareIdInput("");
    setJoinError(null);
  };

  const addMemberUsername = () => {
    const trimmed = memberInput.trim().replace(/^@/, "");
    if (!trimmed) return;
    if (memberUsernames.includes(trimmed)) return;
    setMemberUsernames((prev) => [...prev, trimmed]);
    setMemberInput("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Enter a group name");
      return;
    }
    setSaving(true);
    try {
      const groupId = await create({
        name: name.trim(),
        description: description.trim() || undefined,
        color,
        memberUsernames,
      });
      setOpen(false);
      resetForm();
      router.push(`/groups/${groupId}`);
    } catch (err) {
      setError(parseUserError(err, "Could not create group. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  const handleJoinRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError(null);
    if (!isValidShareIdInput(shareIdInput)) {
      setJoinError("Enter a valid 8-character share ID (e.g. #8TY3ISH5)");
      return;
    }
    setJoining(true);
    try {
      const result = await requestJoin({ shareId: parseShareIdInput(shareIdInput) });
      setJoinOpen(false);
      resetJoinForm();
      alert(
        `Request sent to join "${result.groupName}". The group owner must approve before you can see expenses.`,
      );
    } catch (err) {
      setJoinError(parseUserError(err, "Could not send join request."));
    } finally {
      setJoining(false);
    }
  };

  const sortedGroups = useMemo(() => {
    if (!groups) return [];
    return [...groups].sort((a, b) => {
      const aUnsettled = Math.abs(a.myNetBalance) >= 0.01 ? 1 : 0;
      const bUnsettled = Math.abs(b.myNetBalance) >= 0.01 ? 1 : 0;
      if (aUnsettled !== bUnsettled) return bUnsettled - aUnsettled;
      return Math.abs(b.myNetBalance) - Math.abs(a.myNetBalance);
    });
  }, [groups]);

  return (
    <>
      <PageHeader
        title="Groups"
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => { resetJoinForm(); setJoinOpen(true); }}>
              <Hash size={16} /> Join
            </Button>
            <Button onClick={() => { resetForm(); setOpen(true); }}>
              <Plus size={16} /> New
            </Button>
          </div>
        }
      />

      {summary && (summary.totalOwedToMe > 0 || summary.totalIOwe > 0) && (
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          {summary.totalOwedToMe > 0 && (
            <Card className="border-[hsl(var(--income))]/25 bg-[hsl(var(--income))]/5">
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Total owed to you</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-[hsl(var(--income))]">
                  +{formatCurrency(summary.totalOwedToMe)}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Across {summary.groupCount} group{summary.groupCount !== 1 ? "s" : ""}
                </p>
              </CardContent>
            </Card>
          )}
          {summary.totalIOwe > 0 && (
            <Card className="border-[hsl(var(--expense))]/25 bg-[hsl(var(--expense))]/5">
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Total you owe</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-[hsl(var(--expense))]">
                  −{formatCurrency(summary.totalIOwe)}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Across {summary.groupCount} group{summary.groupCount !== 1 ? "s" : ""}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {pendingRequests && pendingRequests.length > 0 && (
        <Card className="mb-4 border-amber-500/30 bg-amber-500/5">
          <CardContent className="pt-4">
            <p className="mb-2 text-sm font-medium">Pending join requests</p>
            <div className="space-y-1.5">
              {pendingRequests.map((req) => (
                <div
                  key={req!._id}
                  className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm"
                >
                  <span className="font-medium">{req!.groupName}</span>
                  <span className="text-xs text-muted-foreground">Awaiting approval</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!groups ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <EmptyState
          icon={<Users size={22} />}
          title="No groups yet"
          description="Create a group or join one with a share ID."
          action={
            <Button onClick={() => { resetForm(); setOpen(true); }}>
              Create a group
            </Button>
          }
        />
      ) : (
        <div className="divide-y divide-border rounded-xl border border-border bg-card">
          {sortedGroups.map((g) => {
            const balance = formatNetBalance(g.myNetBalance);
            return (
              <Link
                key={g._id}
                href={`/groups/${g._id}`}
                className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/30"
              >
                <div
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: g.color }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{g.name}</p>
                  <p className="text-xs text-muted-foreground">{balance.label}</p>
                </div>
                <div className="text-right">
                  {balance.tone === "neutral" ? (
                    <p className="text-sm text-muted-foreground">Settled</p>
                  ) : (
                    <p
                      className={cn(
                        "text-sm font-semibold tabular-nums",
                        balance.tone === "positive" && "text-[hsl(var(--income))]",
                        balance.tone === "negative" && "text-[hsl(var(--expense))]",
                      )}
                    >
                      {balance.tone === "positive" ? "+" : "−"}
                      {formatCurrency(balance.amount)}
                    </p>
                  )}
                </div>
                <ChevronRight size={16} className="shrink-0 text-muted-foreground" />
              </Link>
            );
          })}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New group"
        description="Add a name and invite Kubera users by username."
        size="lg"
        footer={
          <FormFooter
            formId={FORM_ID}
            onCancel={() => setOpen(false)}
            submitLabel="Create group"
            loading={saving}
          />
        }
      >
        <form id={FORM_ID} onSubmit={handleSubmit}>
          <FormBody>
            <FormField label="Group name">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Flat 4B, Goa trip, Office lunch…"
                required
                autoFocus
              />
            </FormField>

            <FormField label="Description" hint="Optional">
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Who's in this group?"
                rows={2}
              />
            </FormField>

            <FormField label="Color">
              <ColorPicker value={color} onChange={setColor} colors={[...GROUP_COLORS]} />
            </FormField>

            <FormField label="Add members" hint="Kubera username — they must already have an account">
              <div className="flex gap-2">
                <Input
                  value={memberInput}
                  onChange={(e) => setMemberInput(e.target.value)}
                  placeholder="@username"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addMemberUsername();
                    }
                  }}
                />
                <Button type="button" variant="outline" onClick={addMemberUsername}>
                  Add
                </Button>
              </div>
              {memberUsernames.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {memberUsernames.map((u) => (
                    <span
                      key={u}
                      className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium"
                    >
                      @{u}
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() =>
                          setMemberUsernames((prev) => prev.filter((x) => x !== u))
                        }
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <FormHint>You are added automatically as the group owner.</FormHint>
            </FormField>

            {error && <p className="text-sm text-[hsl(var(--expense))]">{error}</p>}
          </FormBody>
        </form>
      </Modal>

      <Modal
        open={joinOpen}
        onClose={() => setJoinOpen(false)}
        title="Join a group"
        description="Enter the 8-character share ID from the group owner."
        footer={
          <FormFooter
            formId={JOIN_FORM_ID}
            onCancel={() => setJoinOpen(false)}
            submitLabel="Request to join"
            loading={joining}
          />
        }
      >
        <form id={JOIN_FORM_ID} onSubmit={handleJoinRequest}>
          <FormBody>
            <FormField label="Share ID" hint="Example: #8TY3ISH5">
              <Input
                value={shareIdInput}
                onChange={(e) => setShareIdInput(e.target.value.toUpperCase())}
                placeholder="#8TY3ISH5"
                className="font-mono tracking-wider"
                autoFocus
              />
            </FormField>

            {parsedShareId.length === 8 && shareIdPreview === undefined && (
              <p className="text-xs text-muted-foreground">Looking up group…</p>
            )}
            {parsedShareId.length === 8 && shareIdPreview === null && (
              <p className="text-xs text-[hsl(var(--expense))]">No group found with that share ID</p>
            )}
            {shareIdPreview && (
              <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 px-3 py-2.5">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
                  style={{ backgroundColor: shareIdPreview.color }}
                >
                  <Users size={18} />
                </div>
                <div>
                  <p className="text-sm font-medium">{shareIdPreview.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {shareIdPreview.memberCount} member{shareIdPreview.memberCount !== 1 ? "s" : ""}
                    {" · "}
                    {shareIdPreview.shareIdLabel}
                  </p>
                </div>
              </div>
            )}

            <FormHint>The group owner must approve your request before you can see expenses.</FormHint>

            {joinError && <p className="text-sm text-[hsl(var(--expense))]">{joinError}</p>}
          </FormBody>
        </form>
      </Modal>
    </>
  );
}
