import { Id } from "../_generated/dataModel";
import { MutationCtx, QueryCtx } from "../_generated/server";
import { canLinkClerkToUser } from "./clerkLink";

type AuthCtx = QueryCtx | MutationCtx;

async function findUserByClerkId(ctx: AuthCtx, clerkId: string) {
  return ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
    .unique();
}

async function findUserByEmail(ctx: AuthCtx, email: string) {
  return ctx.db
    .query("users")
    .withIndex("email", (q) => q.eq("email", email))
    .unique();
}

/** Resolve the Convex users row for the current Clerk session (read-only). */
export async function getCurrentUserId(
  ctx: AuthCtx,
): Promise<Id<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  const byClerk = await findUserByClerkId(ctx, identity.subject);
  if (byClerk) return byClerk._id;

  const email = identity.email?.trim().toLowerCase();
  if (email) {
    const byEmail = await findUserByEmail(ctx, email);
    if (byEmail && canLinkClerkToUser(byEmail.clerkId, identity.subject)) {
      return byEmail._id;
    }
  }

  return null;
}

export async function requireUserId(ctx: AuthCtx): Promise<Id<"users">> {
  const userId = await getCurrentUserId(ctx);
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

function slugUsername(raw: string): string {
  const cleaned = raw
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 24);
  return cleaned.length >= 3 ? cleaned : `user_${cleaned || "kubera"}`.slice(0, 24);
}

/**
 * Ensure a Convex user exists for the Clerk identity.
 * Links legacy rows by email when possible so existing data is kept.
 */
export async function ensureUserForIdentity(
  ctx: MutationCtx,
): Promise<Id<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");

  const clerkId = identity.subject;
  const email = identity.email?.trim().toLowerCase() || undefined;
  const phone =
    typeof identity.phoneNumber === "string"
      ? identity.phoneNumber
      : undefined;
  const name =
    identity.name?.trim() ||
    [identity.givenName, identity.familyName].filter(Boolean).join(" ").trim() ||
    undefined;

  const existingByClerk = await findUserByClerkId(ctx, clerkId);
  if (existingByClerk) {
    const patch: Record<string, unknown> = {};
    if (email && existingByClerk.email !== email) patch.email = email;
    if (phone && existingByClerk.phone !== phone) patch.phone = phone;
    if (name && !existingByClerk.name) patch.name = name;
    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(existingByClerk._id, patch);
    }
    return existingByClerk._id;
  }

  if (email) {
    const legacy = await findUserByEmail(ctx, email);
    if (legacy) {
      if (!canLinkClerkToUser(legacy.clerkId, clerkId)) {
        throw new Error(
          "This email is already linked to a different Clerk account.",
        );
      }
      await ctx.db.patch(legacy._id, {
        clerkId,
        ...(name && !legacy.name ? { name } : {}),
        ...(phone && !legacy.phone ? { phone } : {}),
      });
      return legacy._id;
    }
  }

  let username: string | undefined;
  const preferred =
    (typeof identity.nickname === "string" && identity.nickname) ||
    (email ? email.split("@")[0] : undefined) ||
    `user${clerkId.slice(-6)}`;
  const candidate = slugUsername(preferred);
  const takenUser = await ctx.db
    .query("users")
    .withIndex("username", (q) => q.eq("username", candidate))
    .unique();
  const takenRegistry = await ctx.db
    .query("usernames")
    .withIndex("by_username", (q) => q.eq("username", candidate))
    .unique();
  if (!takenUser && !(takenRegistry?.userId !== undefined)) {
    username = candidate;
  }

  const userId = await ctx.db.insert("users", {
    clerkId,
    email,
    phone,
    name,
    username,
  });

  if (username) {
    const existingReg = await ctx.db
      .query("usernames")
      .withIndex("by_username", (q) => q.eq("username", username!))
      .unique();
    if (existingReg) {
      await ctx.db.patch(existingReg._id, { userId });
    } else {
      await ctx.db.insert("usernames", { username, userId });
    }
  }

  return userId;
}
