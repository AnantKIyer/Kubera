/**
 * Whether a Convex users row may be linked / resolved for a Clerk subject.
 * - No existing clerkId → link allowed (legacy migration).
 * - Same subject → already linked to this identity.
 * - Different subject → conflict (do not impersonate).
 */
export function canLinkClerkToUser(
  existingClerkId: string | undefined | null,
  subject: string,
): boolean {
  if (!existingClerkId) return true;
  return existingClerkId === subject;
}

/** Active group membership: soft-leave uses leftAt. */
export function isActiveMember(m: { leftAt?: number | null }): boolean {
  return m.leftAt == null;
}

/**
 * Balance participants = all membership rows (incl. left) ∪ expense/split/settlement refs.
 * Pure set algebra for tests and group balance queries.
 */
export function collectBalanceParticipantIds(
  memberUserIds: string[],
  expensePaidByIds: string[],
  splitUserIds: string[],
  settlementPairs: { fromUserId: string; toUserId: string }[],
): string[] {
  const ids = new Set<string>();
  for (const id of memberUserIds) ids.add(id);
  for (const id of expensePaidByIds) ids.add(id);
  for (const id of splitUserIds) ids.add(id);
  for (const s of settlementPairs) {
    ids.add(s.fromUserId);
    ids.add(s.toUserId);
  }
  return Array.from(ids);
}
