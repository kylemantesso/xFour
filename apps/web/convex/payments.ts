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
