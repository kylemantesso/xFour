import { v } from "convex/values";
import { query } from "./_generated/server";
import { getCurrentWorkspaceContext, requireRole, ALL_ROLES } from "./lib/auth";

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

    let paymentsQuery = ctx.db
      .query("payments")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", workspaceId))
      .order("desc");

    const payments = await paymentsQuery.take(limit);

    // Filter by status if provided
    const filteredPayments = args.status
      ? payments.filter((p) => p.status === args.status)
      : payments;

    // Get API key names for each payment
    const paymentsWithDetails = await Promise.all(
      filteredPayments.map(async (payment) => {
        const apiKey = await ctx.db.get(payment.apiKeyId);
        const provider = payment.providerId
          ? await ctx.db.get(payment.providerId)
          : null;

        return {
          ...payment,
          apiKeyName: apiKey?.name ?? "Unknown",
          providerName: provider?.name ?? payment.providerHost,
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
    const totalSpent = settledPayments.reduce((sum, p) => sum + p.mneeAmount, 0);

    // Get payments from last 24 hours
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recentPayments = payments.filter((p) => p.createdAt > oneDayAgo);
    const recentSpent = recentPayments
      .filter((p) => p.status === "settled")
      .reduce((sum, p) => sum + p.mneeAmount, 0);

    return {
      totalPayments,
      settledCount: settledPayments.length,
      deniedCount: deniedPayments.length,
      totalSpent: Math.round(totalSpent * 1000000) / 1000000,
      recentPayments: recentPayments.length,
      recentSpent: Math.round(recentSpent * 1000000) / 1000000,
    };
  },
});

