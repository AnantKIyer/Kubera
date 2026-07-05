import { retrieveAccount } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import { GenericActionCtx, GenericDataModel } from "convex/server";

type RetrieveArgs = {
  provider: string;
  account: { id: string; secret?: string };
};

/**
 * Wraps retrieveAccount — Convex Auth throws Error codes instead of returning null
 * when the password is wrong or the account is missing.
 */
export async function retrieveAccountOrThrow<
  DataModel extends GenericDataModel = GenericDataModel,
>(
  ctx: GenericActionCtx<DataModel>,
  args: RetrieveArgs,
  invalidMessage = "Invalid credentials",
) {
  try {
    return await retrieveAccount(ctx, args);
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "TooManyFailedAttempts") {
        throw new ConvexError("Too many failed attempts. Try again in a few minutes.");
      }
      if (err.message === "InvalidSecret" || err.message === "InvalidAccountId") {
        throw new ConvexError(invalidMessage);
      }
    }
    throw err;
  }
}
