import { v } from "convex/values";
import { query } from "./_generated/server";
import {
  isValidUsername,
  normalizeUsername,
} from "../lib/auth/normalize";

async function isUsernameTaken(ctx: { db: any }, username: string) {
  const normalized = normalizeUsername(username);
  const user = await ctx.db
    .query("users")
    .withIndex("username", (q: any) => q.eq("username", normalized))
    .unique();
  if (user) return true;

  const reserved = await ctx.db
    .query("usernames")
    .withIndex("by_username", (q: any) => q.eq("username", normalized))
    .unique();
  return reserved?.userId !== undefined;
}

/** Public availability check (username only — email/phone owned by Clerk). */
export const checkFieldAvailable = query({
  args: {
    field: v.literal("username"),
    value: v.string(),
  },
  handler: async (ctx, { value }) => {
    const trimmed = value.trim();
    if (!trimmed) return { available: true as const };

    const normalized = normalizeUsername(trimmed);
    if (!isValidUsername(normalized)) {
      return { available: false as const, reason: "invalid" as const };
    }
    const taken = await isUsernameTaken(ctx, normalized);
    return { available: !taken };
  },
});
