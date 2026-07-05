import { ConvexError, v } from "convex/values";
import {
  getAuthUserId,
  modifyAccountCredentials,
} from "@convex-dev/auth/server";
import { retrieveAccountOrThrow } from "./lib/retrieveAccount";
import { Id } from "./_generated/dataModel";
import { action, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { normalizeEmail } from "../lib/auth/normalize";
import { requireUserId } from "./lib/user";

const PROVIDER_ID = "password";
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

function parseStorageId(image: string | undefined): Id<"_storage"> | null {
  if (!image) return null;
  return image as Id<"_storage">;
}

export const me = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
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
    };
  },
});

export const getUserForPasswordChange = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user?.email) return null;
    return { email: normalizeEmail(user.email) };
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

export const changePassword = action({
  args: {
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, { currentPassword, newPassword }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated.");

    if (!newPassword || newPassword.length < 8) {
      throw new ConvexError("New password must be at least 8 characters.");
    }
    if (currentPassword === newPassword) {
      throw new ConvexError("New password must be different from the current one.");
    }

    const account = await ctx.runQuery(internal.users.getUserForPasswordChange, {
      userId,
    });
    if (!account) {
      throw new ConvexError("Password change is not available for this account.");
    }

    const retrieved = await retrieveAccountOrThrow(
      ctx,
      {
        provider: PROVIDER_ID,
        account: { id: account.email, secret: currentPassword },
      },
      "Current password is incorrect.",
    );
    if (retrieved.user._id !== userId) {
      throw new ConvexError("Current password is incorrect.");
    }

    await modifyAccountCredentials(ctx, {
      provider: PROVIDER_ID,
      account: { id: account.email, secret: newPassword },
    });
  },
});
