import { ConvexError, v } from "convex/values";
import { internalMutation, internalQuery, query } from "./_generated/server";
import {
  isValidUsername,
  normalizeEmail,
  normalizePhone,
  normalizeUsername,
} from "../lib/auth/normalize";

export const USERNAME_TAKEN = "This username already exists.";

async function findByEmail(ctx: { db: any }, email: string) {
  return ctx.db
    .query("users")
    .withIndex("email", (q: any) => q.eq("email", email))
    .unique();
}

async function findByPhone(ctx: { db: any }, phone: string) {
  return ctx.db
    .query("users")
    .withIndex("phone", (q: any) => q.eq("phone", phone))
    .unique();
}

async function findUserByUsername(ctx: { db: any }, username: string) {
  return ctx.db
    .query("users")
    .withIndex("username", (q: any) => q.eq("username", username))
    .unique();
}

async function findReservedUsername(ctx: { db: any }, username: string) {
  return ctx.db
    .query("usernames")
    .withIndex("by_username", (q: any) => q.eq("username", username))
    .unique();
}

/**
 * Username is taken if assigned to a user, or linked in the registry.
 * Orphan registry rows (failed sign-ups) do not count as taken.
 */
async function isUsernameTaken(ctx: { db: any }, username: string) {
  const normalized = normalizeUsername(username);

  if (await findUserByUsername(ctx, normalized)) {
    return true;
  }

  const reserved = await findReservedUsername(ctx, normalized);
  if (!reserved) {
    return false;
  }

  return reserved.userId !== undefined;
}

/** Remove failed sign-up hold on a username so it can be reused */
async function clearOrphanUsernameReservation(
  ctx: { db: any },
  username: string,
) {
  const normalized = normalizeUsername(username);
  const reserved = await findReservedUsername(ctx, normalized);
  if (reserved && reserved.userId === undefined) {
    await ctx.db.delete(reserved._id);
  }
}

export const userByIdentifier = internalQuery({
  args: { identifier: v.string() },
  handler: async (ctx, { identifier }) => {
    const trimmed = identifier.trim();
    if (!trimmed) return null;

    if (trimmed.includes("@")) {
      return findByEmail(ctx, normalizeEmail(trimmed));
    }

    const digits = trimmed.replace(/\D/g, "");
    if (digits.length >= 10) {
      const byPhone = await findByPhone(ctx, normalizePhone(trimmed));
      if (byPhone) return byPhone;
    }

    return findUserByUsername(ctx, normalizeUsername(trimmed));
  },
});

export const userByPhone = internalQuery({
  args: { phone: v.string() },
  handler: async (ctx, { phone }) => {
    return findByPhone(ctx, normalizePhone(phone));
  },
});

/** Validates email and phone availability before sign-up */
export const assertSignUpAvailable = internalQuery({
  args: {
    email: v.string(),
    username: v.string(),
    phone: v.string(),
  },
  handler: async (ctx, args) => {
    const email = normalizeEmail(args.email);
    const username = normalizeUsername(args.username);
    const phone = normalizePhone(args.phone);

    const [usernameTaken, existingEmail, existingPhone] = await Promise.all([
      isUsernameTaken(ctx, username),
      findByEmail(ctx, email),
      findByPhone(ctx, phone),
    ]);

    if (usernameTaken) {
      throw new ConvexError(USERNAME_TAKEN);
    }
    if (existingEmail) {
      throw new ConvexError("An account with this email already exists.");
    }
    if (existingPhone) {
      throw new ConvexError("An account with this phone number already exists.");
    }

    return { email, username, phone };
  },
});

/**
 * Atomically reserve a username before account creation.
 * Clears orphan reservations left by failed sign-ups first.
 */
export const reserveUsername = internalMutation({
  args: { username: v.string() },
  handler: async (ctx, { username }) => {
    const normalized = normalizeUsername(username);

    if (!isValidUsername(normalized)) {
      throw new ConvexError(
        "Username must be 3–24 characters (letters, numbers, underscore).",
      );
    }

    await clearOrphanUsernameReservation(ctx, normalized);

    if (await findUserByUsername(ctx, normalized)) {
      throw new ConvexError(USERNAME_TAKEN);
    }

    const reserved = await findReservedUsername(ctx, normalized);
    if (reserved?.userId !== undefined) {
      throw new ConvexError(USERNAME_TAKEN);
    }

    const registryId = await ctx.db.insert("usernames", { username: normalized });
    return { registryId, username: normalized };
  },
});

export const linkUsernameToUser = internalMutation({
  args: {
    registryId: v.id("usernames"),
    userId: v.id("users"),
  },
  handler: async (ctx, { registryId, userId }) => {
    await ctx.db.patch(registryId, { userId });
  },
});

export const releaseUsername = internalMutation({
  args: { registryId: v.id("usernames") },
  handler: async (ctx, { registryId }) => {
    await ctx.db.delete(registryId);
  },
});

/** Public availability check for sign-up form feedback */
export const checkFieldAvailable = query({
  args: {
    field: v.union(v.literal("email"), v.literal("username"), v.literal("phone")),
    value: v.string(),
  },
  handler: async (ctx, { field, value }) => {
    const trimmed = value.trim();
    if (!trimmed) return { available: true as const };

    if (field === "email") {
      const existing = await findByEmail(ctx, normalizeEmail(trimmed));
      return { available: existing === null };
    }

    if (field === "username") {
      const normalized = normalizeUsername(trimmed);
      if (!isValidUsername(normalized)) {
        return { available: false as const, reason: "invalid" as const };
      }
      const taken = await isUsernameTaken(ctx, normalized);
      return { available: !taken };
    }

    const existing = await findByPhone(ctx, normalizePhone(trimmed));
    return { available: existing === null };
  },
});
