import { v } from "convex/values";
import { query } from "./_generated/server";
import { getCurrentWorkspaceContext, requireRole, ALL_ROLES } from "./lib/auth";

/**
 * Get real-time activity data for a 60-second sliding window
 * Returns individual payment events with timestamps for animated timeline
 */
export const getActivityTimeline = query({
  args: {
    windowSeconds: v.optional(v.number()), // default 60
  },
  handler: async (ctx, args) => {
    const { workspaceId, role } = await getCurrentWorkspaceContext(ctx);
    requireRole(role, ALL_ROLES, "view activity timeline");

    const windowSeconds = args.windowSeconds ?? 60;
    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;

    // Fetch recent payments
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", workspaceId))
      .order("desc")
      .take(100);

    // Filter to only payments in the window and map to timeline events
    const events = payments
      .filter((p) => p.createdAt >= windowStart)
      .map((p) => ({
        id: p._id,
        timestamp: p.createdAt,
        status: p.status,
        amount: p.treasuryAmount,
        // Normalize amount for height (we'll calculate max on frontend)
      }));

    // Count by status for stats
    const settled = events.filter((e) => e.status === "settled" || e.status === "completed").length;
    const pending = events.filter((e) => e.status === "allowed" || e.status === "pending").length;
    const denied = events.filter((e) => e.status === "denied" || e.status === "failed").length;

    // Get max amount for normalization
    const maxAmount = Math.max(...events.map((e) => e.amount), 1);

    return {
      events,
      serverTime: now,
      windowSeconds,
      stats: {
        total: events.length,
        settled,
        pending,
        denied,
      },
      maxAmount,
    };
  },
});

/**
 * List payments for the current workspace
 */
export const listPayments = query({
  args: {
    limit: v.optional(v.number()),
    status: v.optional(
      v.union(
        v.literal("allowed"),
        v.literal("denied"),
        v.literal("settled"),
        v.literal("pending"),
        v.literal("completed"),
        v.literal("failed"),
        v.literal("refunded")
      )
    ),
  },
  handler: async (ctx, args) => {
    const { workspaceId, role } = await getCurrentWorkspaceContext(ctx);
    requireRole(role, ALL_ROLES, "view payments");

    const limit = args.limit ?? 100;

    const paymentsQuery = ctx.db
      .query("payments")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", workspaceId))
      .order("desc");

    const payments = await paymentsQuery.take(limit);

    // Filter by status if provided
    const filteredPayments = args.status
      ? payments.filter((p) => p.status === args.status)
      : payments;

    // Get API key names and token details for each payment
    const paymentsWithDetails = await Promise.all(
      filteredPayments.map(async (payment) => {
        const apiKey = await ctx.db.get(payment.apiKeyId);
        const provider = payment.providerId
          ? await ctx.db.get(payment.providerId)
          : null;

        // Look up token symbols
        let treasuryTokenSymbol: string | null = null;
        let paidTokenSymbol: string | null = null;

        if (payment.paymentToken) {
          const treasuryToken = await ctx.db
            .query("supportedTokens")
            .withIndex("by_address", (q) => q.eq("address", payment.paymentToken!))
            .first();
          treasuryTokenSymbol = treasuryToken?.symbol ?? null;
        }

        if (payment.swapBuyToken) {
          const paidToken = await ctx.db
            .query("supportedTokens")
            .withIndex("by_address", (q) => q.eq("address", payment.swapBuyToken!))
            .first();
          paidTokenSymbol = paidToken?.symbol ?? null;
        }

        return {
          ...payment,
          apiKeyName: apiKey?.name ?? "Unknown",
          providerName: provider?.name ?? payment.providerHost,
          // Token info
          treasuryTokenSymbol: treasuryTokenSymbol ?? payment.originalCurrency,
          paidTokenSymbol: paidTokenSymbol ?? payment.originalCurrency,
          // Was there a swap?
          hadSwap: !!payment.swapTxHash,
        };
      })
    );

    return paymentsWithDetails;
  },
});

/**
 * Get payment statistics for the current workspace
 */
export const getPaymentStats = query({
  args: {},
  handler: async (ctx) => {
    const { workspaceId, role } = await getCurrentWorkspaceContext(ctx);
    requireRole(role, ALL_ROLES, "view payment stats");

    const payments = await ctx.db
      .query("payments")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", workspaceId))
      .collect();

    const totalPayments = payments.length;
    const settledPayments = payments.filter((p) => p.status === "settled");
    const deniedPayments = payments.filter((p) => p.status === "denied");
    const totalSpent = settledPayments.reduce((sum, p) => sum + p.treasuryAmount, 0);

    // Get payments from last 24 hours
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recentPayments = payments.filter((p) => p.createdAt > oneDayAgo);
    const recentSpent = recentPayments
      .filter((p) => p.status === "settled")
      .reduce((sum, p) => sum + p.treasuryAmount, 0);

    // Calculate spend per token (from treasury)
    const spendByToken: Record<string, { amount: number; count: number }> = {};
    for (const payment of settledPayments) {
      const tokenAddress = payment.paymentToken ?? "unknown";
      if (!spendByToken[tokenAddress]) {
        spendByToken[tokenAddress] = { amount: 0, count: 0 };
      }
      // For swaps, use the sell amount (what left the treasury)
      const spentAmount = payment.swapSellAmount ?? payment.treasuryAmount;
      spendByToken[tokenAddress].amount += spentAmount;
      spendByToken[tokenAddress].count += 1;
    }

    // Look up token symbols
    const spendByTokenWithSymbols = await Promise.all(
      Object.entries(spendByToken).map(async ([address, data]) => {
        let symbol = "UNKNOWN";
        if (address !== "unknown") {
          const token = await ctx.db
            .query("supportedTokens")
            .withIndex("by_address", (q) => q.eq("address", address))
            .first();
          symbol = token?.symbol ?? "UNKNOWN";
        }
        return {
          address,
          symbol,
          amount: Math.round(data.amount * 1000000) / 1000000,
          count: data.count,
        };
      })
    );

    // Calculate paid tokens (what providers received)
    const paidByToken: Record<string, { amount: number; count: number }> = {};
    for (const payment of settledPayments) {
      // If there was a swap, use the buy token; otherwise use payment token
      const tokenAddress = payment.swapBuyToken ?? payment.paymentToken ?? "unknown";
      if (!paidByToken[tokenAddress]) {
        paidByToken[tokenAddress] = { amount: 0, count: 0 };
      }
      // For swaps, use the buy amount (what was paid out)
      const paidAmount = payment.swapBuyAmount ?? payment.treasuryAmount;
      paidByToken[tokenAddress].amount += paidAmount;
      paidByToken[tokenAddress].count += 1;
    }

    const paidByTokenWithSymbols = await Promise.all(
      Object.entries(paidByToken).map(async ([address, data]) => {
        let symbol = "UNKNOWN";
        if (address !== "unknown") {
          const token = await ctx.db
            .query("supportedTokens")
            .withIndex("by_address", (q) => q.eq("address", address))
            .first();
          symbol = token?.symbol ?? "UNKNOWN";
        }
        return {
          address,
          symbol,
          amount: Math.round(data.amount * 1000000) / 1000000,
          count: data.count,
        };
      })
    );

    // Count swaps
    const swapCount = settledPayments.filter((p) => !!p.swapTxHash).length;

    return {
      totalPayments,
      settledCount: settledPayments.length,
      deniedCount: deniedPayments.length,
      totalSpent: Math.round(totalSpent * 1000000) / 1000000,
      recentPayments: recentPayments.length,
      recentSpent: Math.round(recentSpent * 1000000) / 1000000,
      // Token breakdowns
      spendByToken: spendByTokenWithSymbols,
      paidByToken: paidByTokenWithSymbols,
      swapCount,
    };
  },
});

// ============================================
// PUBLIC QUERIES (No authentication required)
// For landing page / marketing purposes
// ============================================

/**
 * Get platform-wide public statistics
 * No authentication required - for landing page
 */
export const getPublicStats = query({
  args: {},
  returns: v.object({
    totalPayments: v.number(),
    settledPayments: v.number(),
    totalVolume: v.number(),
    activeWorkspaces: v.number(),
    successRate: v.number(),
    last24hPayments: v.number(),
    last24hVolume: v.number(),
  }),
  handler: async (ctx) => {
    // Get all payments across all workspaces
    const payments = await ctx.db.query("payments").collect();

    const totalPayments = payments.length;
    const settledPayments = payments.filter(
      (p) => p.status === "settled" || p.status === "completed"
    );
    const settledCount = settledPayments.length;
    const totalVolume = settledPayments.reduce(
      (sum, p) => sum + p.treasuryAmount,
      0
    );

    // Count unique workspaces with payments
    const uniqueWorkspaces = new Set(payments.map((p) => p.workspaceId));
    const activeWorkspaces = uniqueWorkspaces.size;

    // Calculate success rate
    // Successful payments: settled, completed, and denied (policy decisions are successful)
    // Failed payments: only actual errors (status === "failed")
    const successfulPayments = payments.filter(
      (p) => p.status === "settled" || p.status === "completed" || p.status === "denied"
    );
    const failedPayments = payments.filter((p) => p.status === "failed");
    const paymentsWithOutcome = successfulPayments.length + failedPayments.length;
    const successRate =
      paymentsWithOutcome > 0
        ? (successfulPayments.length / paymentsWithOutcome) * 100
        : 100;

    // Get payments from last 24 hours
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recentPayments = payments.filter((p) => p.createdAt > oneDayAgo);
    const recentSettled = recentPayments.filter(
      (p) => p.status === "settled" || p.status === "completed"
    );
    const last24hVolume = recentSettled.reduce(
      (sum, p) => sum + p.treasuryAmount,
      0
    );

    return {
      totalPayments,
      settledPayments: settledCount,
      totalVolume: Math.round(totalVolume * 10000) / 10000,
      activeWorkspaces,
      successRate: Math.round(successRate * 10) / 10,
      last24hPayments: recentPayments.length,
      last24hVolume: Math.round(last24hVolume * 10000) / 10000,
    };
  },
});

/**
 * Get public real-time activity timeline
 * No authentication required - for landing page
 * Returns anonymized data (no workspace/user info)
 */
export const getPublicActivityTimeline = query({
  args: {
    windowSeconds: v.optional(v.number()), // default 60
  },
  returns: v.object({
    events: v.array(
      v.object({
        id: v.string(),
        timestamp: v.number(),
        status: v.string(),
        amount: v.number(),
      })
    ),
    serverTime: v.number(),
    windowSeconds: v.number(),
    stats: v.object({
      total: v.number(),
      settled: v.number(),
      pending: v.number(),
      denied: v.number(),
    }),
    maxAmount: v.number(),
  }),
  handler: async (ctx, args) => {
    const windowSeconds = args.windowSeconds ?? 60;
    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;

    // Fetch recent payments across all workspaces
    const payments = await ctx.db
      .query("payments")
      .order("desc")
      .take(200);

    // Filter to only payments in the window and map to anonymized timeline events
    const events = payments
      .filter((p) => p.createdAt >= windowStart)
      .map((p) => ({
        id: p._id,
        timestamp: p.createdAt,
        status: p.status,
        amount: p.treasuryAmount,
      }));

    // Count by status for stats
    const settled = events.filter(
      (e) => e.status === "settled" || e.status === "completed"
    ).length;
    const pending = events.filter(
      (e) => e.status === "allowed" || e.status === "pending"
    ).length;
    const denied = events.filter(
      (e) => e.status === "denied" || e.status === "failed"
    ).length;

    // Get max amount for normalization
    const maxAmount = Math.max(...events.map((e) => e.amount), 1);

    return {
      events,
      serverTime: now,
      windowSeconds,
      stats: {
        total: events.length,
        settled,
        pending,
        denied,
      },
      maxAmount,
    };
  },
});
