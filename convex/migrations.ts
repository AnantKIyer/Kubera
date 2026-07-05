import { internalMutation } from "./_generated/server";

/** Remove username holds left by failed sign-ups (no linked user) */
export const clearOrphanUsernameReservations = internalMutation({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("usernames").collect();
    let deleted = 0;
    for (const row of rows) {
      if (row.userId === undefined) {
        await ctx.db.delete(row._id);
        deleted++;
      }
    }
    return { deleted };
  },
});

/** One-time cleanup of pre-auth data that has no userId. Safe to run after enabling multi-user. */
export const clearLegacyData = internalMutation({
  args: {},
  handler: async (ctx) => {
    const tables = ["transactions", "budgets", "subscriptions", "accounts", "categories"] as const;
    let deleted = 0;
    for (const table of tables) {
      const rows = await ctx.db.query(table).collect();
      for (const row of rows) {
        if (!("userId" in row) || !row.userId) {
          await ctx.db.delete(row._id);
          deleted++;
        }
      }
    }
    return { deleted };
  },
});
