import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "../_generated/dataModel";
import { MutationCtx, QueryCtx } from "../_generated/server";

export async function requireUserId(ctx: QueryCtx | MutationCtx): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  return userId;
}

/** Returns rows belonging to the current user (excludes legacy unscoped data). */
export function belongsToUser<T extends { userId?: Id<"users"> }>(
  row: T,
  userId: Id<"users">,
): boolean {
  return row.userId === userId;
}
