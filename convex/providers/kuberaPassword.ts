import {
  createAccount,
  invalidateSessions,
  modifyAccountCredentials,
  retrieveAccount,
  signInViaProvider,
} from "@convex-dev/auth/server";
import { ConvexCredentials } from "@convex-dev/auth/providers/ConvexCredentials";
import { ConvexError, Value } from "convex/values";
import { Id } from "../_generated/dataModel";
import { Scrypt } from "lucia";
import { internal } from "../_generated/api";
import { PhonePasswordReset } from "../PhonePasswordReset";
import {
  isValidEmail,
  isValidPhone,
  isValidUsername,
  normalizeEmail,
  normalizePhone,
  normalizeUsername,
} from "../../lib/auth/normalize";

const PROVIDER_ID = "password";

function validatePassword(password: string) {
  if (!password || password.length < 8) {
    throw new ConvexError("Password must be at least 8 characters.");
  }
}

async function resolveUserEmail(
  ctx: { runQuery: (ref: any, args: any) => Promise<any> },
  identifier: string,
) {
  const user = await ctx.runQuery(internal.authHelpers.userByIdentifier, {
    identifier,
  });
  if (!user?.email) {
    throw new ConvexError("Invalid credentials");
  }
  return normalizeEmail(user.email);
}

async function buildSignUpProfile(
  params: Record<string, Value | undefined>,
  ctx: { runQuery: (ref: any, args: any) => Promise<any> },
) {
  const name = (params.name as string)?.trim();
  const email = normalizeEmail(params.email as string);
  const username = normalizeUsername(params.username as string);
  const phone = normalizePhone(params.phone as string);

  if (!name) throw new ConvexError("Name is required.");
  if (!isValidEmail(email)) throw new ConvexError("Enter a valid email address.");
  if (!isValidUsername(username)) {
    throw new ConvexError("Username must be 3–24 characters (letters, numbers, underscore).");
  }
  if (!isValidPhone(phone)) {
    throw new ConvexError("Enter a valid phone number with country code.");
  }

  await ctx.runQuery(internal.authHelpers.assertSignUpAvailable, {
    email,
    username,
    phone,
  });

  return { email, name, username, phone };
}

export const KuberaPassword = ConvexCredentials({
  id: PROVIDER_ID,
  extraProviders: [PhonePasswordReset],
  crypto: {
    async hashSecret(password: string) {
      return await new Scrypt().hash(password);
    },
    async verifySecret(password: string, hash: string) {
      return await new Scrypt().verify(hash, password);
    },
  },
  authorize: async (params, ctx): Promise<{
    userId: Id<"users">;
    sessionId?: Id<"authSessions">;
  } | null> => {
    const flow = params.flow as string;

    if (flow === "signUp") {
      const password = params.password as string;
      validatePassword(password);

      const profile = await buildSignUpProfile(params, ctx);

      const { registryId } = await ctx.runMutation(internal.authHelpers.reserveUsername, {
        username: profile.username,
      });

      try {
        const { user } = await createAccount(ctx, {
          provider: PROVIDER_ID,
          account: { id: profile.email, secret: password },
          profile,
          shouldLinkViaEmail: false,
          shouldLinkViaPhone: false,
        });

        await ctx.runMutation(internal.authHelpers.linkUsernameToUser, {
          registryId,
          userId: user._id,
        });

        return { userId: user._id };
      } catch (err) {
        await ctx.runMutation(internal.authHelpers.releaseUsername, { registryId });
        throw err;
      }
    }

    if (flow === "signIn") {
      const password = params.password as string;
      const identifier = params.identifier as string;
      if (!identifier?.trim()) throw new ConvexError("Enter your email, username, or phone.");
      if (!password) throw new ConvexError("Password is required.");

      const email = await resolveUserEmail(ctx, identifier);
      const retrieved = await retrieveAccount(ctx, {
        provider: PROVIDER_ID,
        account: { id: email, secret: password },
      });
      if (retrieved === null) throw new ConvexError("Invalid credentials");
      return { userId: retrieved.user._id };
    }

    if (flow === "reset") {
      const phone = normalizePhone(params.phone as string);
      if (!isValidPhone(phone)) {
        throw new ConvexError("Enter the phone number linked to your account.");
      }

      const user = await ctx.runQuery(internal.authHelpers.userByPhone, { phone });
      if (!user?.email) {
        throw new ConvexError("No account found with this phone number.");
      }

      const email = normalizeEmail(user.email);
      const retrieved = await retrieveAccount(ctx, {
        provider: PROVIDER_ID,
        account: { id: email },
      });
      if (retrieved === null) {
        throw new ConvexError("No account found with this phone number.");
      }
      const { account } = retrieved;

      return await signInViaProvider(ctx, PhonePasswordReset, {
        accountId: account._id,
        params: { phone },
      });
    }

    if (flow === "reset-verification") {
      const phone = normalizePhone(params.phone as string);
      const code = params.code as string;
      const newPassword = params.newPassword as string;

      if (!code) throw new ConvexError("Enter the verification code.");
      validatePassword(newPassword);

      const user = await ctx.runQuery(internal.authHelpers.userByPhone, { phone });
      if (!user?.email) throw new ConvexError("Invalid code.");

      const email = normalizeEmail(user.email);
      const { account: resetAccount } = await retrieveAccount(ctx, {
        provider: PROVIDER_ID,
        account: { id: email },
      });

      const result = await signInViaProvider(ctx, PhonePasswordReset, {
        params: { phone, code },
      });
      if (result === null) throw new ConvexError("Invalid or expired code.");

      const { userId, sessionId } = result;
      if (resetAccount.userId !== userId) throw new ConvexError("Invalid code.");

      await modifyAccountCredentials(ctx, {
        provider: PROVIDER_ID,
        account: { id: email, secret: newPassword },
      });
      await invalidateSessions(ctx, { userId, except: [sessionId!] });
      return { userId, sessionId };
    }

    throw new ConvexError(
      "Unknown auth flow. Use signUp, signIn, reset, or reset-verification.",
    );
  },
});
