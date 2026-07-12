/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as PhonePasswordReset from "../PhonePasswordReset.js";
import type * as accounts from "../accounts.js";
import type * as auth from "../auth.js";
import type * as authHelpers from "../authHelpers.js";
import type * as budgets from "../budgets.js";
import type * as categories from "../categories.js";
import type * as currency from "../currency.js";
import type * as emis from "../emis.js";
import type * as groups from "../groups.js";
import type * as http from "../http.js";
import type * as investments from "../investments.js";
import type * as lib_credit from "../lib/credit.js";
import type * as lib_currency from "../lib/currency.js";
import type * as lib_emi from "../lib/emi.js";
import type * as lib_encryption from "../lib/encryption.js";
import type * as lib_groupBalances from "../lib/groupBalances.js";
import type * as lib_retrieveAccount from "../lib/retrieveAccount.js";
import type * as lib_sensitiveFields from "../lib/sensitiveFields.js";
import type * as lib_shareId from "../lib/shareId.js";
import type * as lib_subscriptionDates from "../lib/subscriptionDates.js";
import type * as lib_txQuery from "../lib/txQuery.js";
import type * as lib_user from "../lib/user.js";
import type * as migrations from "../migrations.js";
import type * as providers_kuberaPassword from "../providers/kuberaPassword.js";
import type * as seed from "../seed.js";
import type * as stats from "../stats.js";
import type * as subscriptions from "../subscriptions.js";
import type * as transactions from "../transactions.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  PhonePasswordReset: typeof PhonePasswordReset;
  accounts: typeof accounts;
  auth: typeof auth;
  authHelpers: typeof authHelpers;
  budgets: typeof budgets;
  categories: typeof categories;
  currency: typeof currency;
  emis: typeof emis;
  groups: typeof groups;
  http: typeof http;
  investments: typeof investments;
  "lib/credit": typeof lib_credit;
  "lib/currency": typeof lib_currency;
  "lib/emi": typeof lib_emi;
  "lib/encryption": typeof lib_encryption;
  "lib/groupBalances": typeof lib_groupBalances;
  "lib/retrieveAccount": typeof lib_retrieveAccount;
  "lib/sensitiveFields": typeof lib_sensitiveFields;
  "lib/shareId": typeof lib_shareId;
  "lib/subscriptionDates": typeof lib_subscriptionDates;
  "lib/txQuery": typeof lib_txQuery;
  "lib/user": typeof lib_user;
  migrations: typeof migrations;
  "providers/kuberaPassword": typeof providers_kuberaPassword;
  seed: typeof seed;
  stats: typeof stats;
  subscriptions: typeof subscriptions;
  transactions: typeof transactions;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
