import { ConvexError, v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import {
  isValidUsername,
  normalizeUsername,
} from "../lib/auth/normalize";
import { BASE_CURRENCY, isLogCurrency, resolveHomeCurrency } from "../lib/currency";
import {
  ensureUserForIdentity,
  getCurrentUserId,
  requireUserId,
} from "./lib/user";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

function parseStorageId(image: string | undefined): Id<"_storage"> | null {
  if (!image) return null;
  return image as Id<"_storage">;
}

/** Create or link the Convex user for the signed-in Clerk identity. */
export const ensureCurrentUser = mutation({
  args: {},
  handler: async (ctx) => {
    return await ensureUserForIdentity(ctx);
  },
});

export const me = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) return null;

    const user = await ctx.db.get(userId);
    if (!user) return null;

    const storageId = parseStorageId(user.image);
    const imageUrl = storageId ? await ctx.storage.getUrl(storageId) : null;

    return {
      _id: user._id,
      name: user.name ?? null,
      username: user.username ?? null,
      email: user.email ?? null,
      phone: user.phone ?? null,
      imageUrl,
      homeCurrency: resolveHomeCurrency(user.homeCurrency),
    };
  },
});

export const updateProfile = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, { name }) => {
    const userId = await requireUserId(ctx);
    const trimmed = name.trim();
    if (!trimmed) {
      throw new ConvexError("Name is required.");
    }
    await ctx.db.patch(userId, { name: trimmed });
  },
});

export const updateUsername = mutation({
  args: {
    username: v.string(),
  },
  handler: async (ctx, { username }) => {
    const userId = await requireUserId(ctx);
    const normalized = normalizeUsername(username);
    if (!isValidUsername(normalized)) {
      throw new ConvexError(
        "Username must be 3–24 characters: letters, numbers, and underscores only.",
      );
    }

    const user = await ctx.db.get(userId);
    if (!user) throw new ConvexError("User not found.");
    if (user.username === normalized) return normalized;

    const takenUser = await ctx.db
      .query("users")
      .withIndex("username", (q) => q.eq("username", normalized))
      .unique();
    if (takenUser && takenUser._id !== userId) {
      throw new ConvexError("That username is already taken.");
    }

    const takenRegistry = await ctx.db
      .query("usernames")
      .withIndex("by_username", (q) => q.eq("username", normalized))
      .unique();
    if (takenRegistry?.userId !== undefined && takenRegistry.userId !== userId) {
      throw new ConvexError("That username is already taken.");
    }

    const previous = user.username;
    if (previous && previous !== normalized) {
      const oldReg = await ctx.db
        .query("usernames")
        .withIndex("by_username", (q) => q.eq("username", previous))
        .unique();
      if (oldReg?.userId === userId) {
        await ctx.db.delete(oldReg._id);
      }
    }

    if (takenRegistry) {
      await ctx.db.patch(takenRegistry._id, { userId });
    } else {
      await ctx.db.insert("usernames", { username: normalized, userId });
    }

    await ctx.db.patch(userId, { username: normalized });
    return normalized;
  },
});

export const updateHomeCurrency = mutation({
  args: {
    homeCurrency: v.string(),
  },
  handler: async (ctx, { homeCurrency }) => {
    const userId = await requireUserId(ctx);
    const code = homeCurrency.trim().toUpperCase();
    if (!isLogCurrency(code)) {
      throw new ConvexError("Unsupported currency.");
    }
    await ctx.db.patch(userId, {
      homeCurrency: code === BASE_CURRENCY ? undefined : code,
    });
    return resolveHomeCurrency(code);
  },
});

export const generateAvatarUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireUserId(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const updateProfileImage = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    const userId = await requireUserId(ctx);
    const user = await ctx.db.get(userId);
    if (!user) throw new ConvexError("User not found.");

    const metadata = await ctx.storage.getMetadata(storageId);
    if (!metadata) throw new ConvexError("Upload not found.");
    if (metadata.size > MAX_AVATAR_BYTES) {
      await ctx.storage.delete(storageId);
      throw new ConvexError("Image must be 2 MB or smaller.");
    }
    if (!metadata.contentType?.startsWith("image/")) {
      await ctx.storage.delete(storageId);
      throw new ConvexError("Please upload an image file.");
    }

    const previousId = parseStorageId(user.image);
    if (previousId) {
      await ctx.storage.delete(previousId);
    }

    await ctx.db.patch(userId, { image: storageId });
  },
});

export const removeProfileImage = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const user = await ctx.db.get(userId);
    if (!user) return;

    const previousId = parseStorageId(user.image);
    if (previousId) {
      await ctx.storage.delete(previousId);
    }
    await ctx.db.patch(userId, { image: undefined });
  },
});
