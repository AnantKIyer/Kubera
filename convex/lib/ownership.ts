import { MutationCtx, QueryCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

export async function assertOwnedCategory(
  ctx: MutationCtx | QueryCtx,
  userId: Id<"users">,
  categoryId: Id<"categories"> | undefined | null,
) {
  if (categoryId == null) return;
  const category = await ctx.db.get(categoryId);
  if (!category || category.userId !== userId) {
    throw new Error("Category not found");
  }
}

export async function assertOwnedAccount(
  ctx: MutationCtx | QueryCtx,
  userId: Id<"users">,
  accountId: Id<"accounts"> | undefined | null,
) {
  if (accountId == null) return;
  const account = await ctx.db.get(accountId);
  if (!account || account.userId !== userId) {
    throw new Error("Account not found");
  }
}
