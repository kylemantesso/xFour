import { v } from "convex/values";
import { query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getCurrentWorkspaceContext, requireRole, ALL_ROLES } from "./lib/auth";

/**
 * Get usage analytics over time (daily aggregates) - MNEE only
 */
export const getUsageOverTime = query({
  args: {
    days: v.optional(v.number()), // Number of days to look back (default 30)
  },
  returns: v.array(
    v.object({
      date: v.string(), // YYYY-MM-DD
      totalPayments: v.number(),
      settledPayments: v.number(),
      deniedPayments: v.number(),
      totalSpent: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const { workspaceId, role } = await getCurrentWorkspaceContext(ctx);
    requireRole(role, ALL_ROLES, "view usage analytics");

    const days = args.days ?? 30;
    const startTime = Date.now() - days * 24 * 60 * 60 * 1000;

    const payments = await ctx.db
      .query("payments")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", workspaceId))
      .collect();

    // Filter to recent payments
    const recentPayments = payments.filter((p) => p.createdAt >= startTime);

    // Group by date
    const byDate: Record<
      string,
      {
        totalPayments: number;
        settledPayments: number;
        deniedPayments: number;
        totalSpent: number;
      }
    > = {};

    // Initialize all dates in range
    for (let i = 0; i < days; i++) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split("T")[0];
      byDate[dateStr] = {
        totalPayments: 0,
        settledPayments: 0,
        deniedPayments: 0,
        totalSpent: 0,
      };
    }

    // Aggregate payments
    for (const payment of recentPayments) {
      const dateStr = new Date(payment.createdAt).toISOString().split("T")[0];
      if (!byDate[dateStr]) continue;

      byDate[dateStr].totalPayments += 1;

      if (payment.status === "settled" || payment.status === "completed") {
        byDate[dateStr].settledPayments += 1;
        byDate[dateStr].totalSpent += payment.amount;
      } else if (payment.status === "denied") {
        byDate[dateStr].deniedPayments += 1;
      }
    }

    // Convert to array and sort by date
    return Object.entries(byDate)
      .map(([date, data]) => ({
        date,
        ...data,
        totalSpent: Math.round(data.totalSpent * 100000) / 100000, // 5 decimal places for MNEE
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  },
});

/**
 * Get usage breakdown by agent (API key) - MNEE only
 */
export const getUsageByAgent = query({
  args: {
    days: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      apiKeyId: v.id("apiKeys"),
      apiKeyName: v.string(),
      totalPayments: v.number(),
      settledPayments: v.number(),
      deniedPayments: v.number(),
      totalSpent: v.number(),
      lastUsed: v.optional(v.number()),
    })
  ),
  handler: async (ctx, args) => {
    const { workspaceId, role } = await getCurrentWorkspaceContext(ctx);
    requireRole(role, ALL_ROLES, "view usage analytics");

    const days = args.days ?? 30;
    const startTime = Date.now() - days * 24 * 60 * 60 * 1000;

    const payments = await ctx.db
      .query("payments")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", workspaceId))
      .collect();

    const recentPayments = payments.filter((p) => p.createdAt >= startTime);

    // Group by API key
    const byAgent: Record<
      string,
      {
        totalPayments: number;
        settledPayments: number;
        deniedPayments: number;
        totalSpent: number;
        lastUsed: number | undefined;
      }
    > = {};

    for (const payment of recentPayments) {
      const keyId = payment.apiKeyId;
      if (!byAgent[keyId]) {
        byAgent[keyId] = {
          totalPayments: 0,
          settledPayments: 0,
          deniedPayments: 0,
          totalSpent: 0,
          lastUsed: undefined,
        };
      }

      byAgent[keyId].totalPayments += 1;
      byAgent[keyId].lastUsed = Math.max(
        byAgent[keyId].lastUsed ?? 0,
        payment.createdAt
      );

      if (payment.status === "settled" || payment.status === "completed") {
        byAgent[keyId].settledPayments += 1;
        byAgent[keyId].totalSpent += payment.amount;
      } else if (payment.status === "denied") {
        byAgent[keyId].deniedPayments += 1;
      }
    }

    // Get API key names
    const result = await Promise.all(
      Object.entries(byAgent).map(async ([apiKeyId, data]) => {
        const apiKey = await ctx.db.get(apiKeyId as Id<"apiKeys">);
        return {
          apiKeyId: apiKeyId as Id<"apiKeys">,
          apiKeyName: apiKey?.name ?? "Unknown Agent",
          ...data,
          totalSpent: Math.round(data.totalSpent * 100000) / 100000,
        };
      })
    );

    // Sort by total spent descending
    return result.sort((a, b) => b.totalSpent - a.totalSpent);
  },
});

/**
 * Get usage breakdown by provider - MNEE only
 */
export const getUsageByProvider = query({
  args: {
    days: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      providerHost: v.string(),
      providerName: v.string(),
      totalPayments: v.number(),
      settledPayments: v.number(),
      deniedPayments: v.number(),
      totalSpent: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const { workspaceId, role } = await getCurrentWorkspaceContext(ctx);
    requireRole(role, ALL_ROLES, "view usage analytics");

    const days = args.days ?? 30;
    const startTime = Date.now() - days * 24 * 60 * 60 * 1000;

    const payments = await ctx.db
      .query("payments")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", workspaceId))
      .collect();

    const recentPayments = payments.filter((p) => p.createdAt >= startTime);

    // Group by provider host
    const byProvider: Record<
      string,
      {
        providerId?: Id<"providers">;
        totalPayments: number;
        settledPayments: number;
        deniedPayments: number;
        totalSpent: number;
      }
    > = {};

    for (const payment of recentPayments) {
      const host = payment.providerHost;
      if (!byProvider[host]) {
        byProvider[host] = {
          providerId: payment.providerId,
          totalPayments: 0,
          settledPayments: 0,
          deniedPayments: 0,
          totalSpent: 0,
        };
      }

      byProvider[host].totalPayments += 1;

      if (payment.status === "settled" || payment.status === "completed") {
        byProvider[host].settledPayments += 1;
        byProvider[host].totalSpent += payment.amount;
      } else if (payment.status === "denied") {
        byProvider[host].deniedPayments += 1;
      }
    }

    // Get provider names
    const result = await Promise.all(
      Object.entries(byProvider).map(async ([host, data]) => {
        let providerName = host;
        if (data.providerId) {
          const provider = await ctx.db.get(data.providerId as Id<"providers">);
          if (provider?.name) {
            providerName = provider.name;
          }
        }
        return {
          providerHost: host,
          providerName,
          totalPayments: data.totalPayments,
          settledPayments: data.settledPayments,
          deniedPayments: data.deniedPayments,
          totalSpent: Math.round(data.totalSpent * 100000) / 100000,
        };
      })
    );

    // Sort by total spent descending
    return result.sort((a, b) => b.totalSpent - a.totalSpent);
  },
});

/**
 * Get comprehensive usage summary stats - MNEE only
 */
export const getUsageSummary = query({
  args: {
    days: v.optional(v.number()),
  },
  returns: v.object({
    totalPayments: v.number(),
    settledPayments: v.number(),
    deniedPayments: v.number(),
    pendingPayments: v.number(),
    totalSpent: v.number(),
    uniqueAgents: v.number(),
    uniqueProviders: v.number(),
    avgPaymentSize: v.number(),
    successRate: v.number(),
    // Comparisons to previous period
    spentChange: v.number(), // Percentage change from previous period
    paymentsChange: v.number(),
  }),
  handler: async (ctx, args) => {
    const { workspaceId, role } = await getCurrentWorkspaceContext(ctx);
    requireRole(role, ALL_ROLES, "view usage analytics");

    const days = args.days ?? 30;
    const now = Date.now();
    const currentPeriodStart = now - days * 24 * 60 * 60 * 1000;
    const previousPeriodStart = currentPeriodStart - days * 24 * 60 * 60 * 1000;

    const payments = await ctx.db
      .query("payments")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", workspaceId))
      .collect();

    // Split into current and previous periods
    const currentPayments = payments.filter((p) => p.createdAt >= currentPeriodStart);
    const previousPayments = payments.filter(
      (p) => p.createdAt >= previousPeriodStart && p.createdAt < currentPeriodStart
    );

    // Current period stats
    const settled = currentPayments.filter(
      (p) => p.status === "settled" || p.status === "completed"
    );
    const denied = currentPayments.filter((p) => p.status === "denied");
    const pending = currentPayments.filter(
      (p) => p.status === "allowed" || p.status === "pending"
    );

    const totalSpent = settled.reduce((sum, p) => sum + p.amount, 0);

    const uniqueAgents = new Set(currentPayments.map((p) => p.apiKeyId)).size;
    const uniqueProviders = new Set(currentPayments.map((p) => p.providerHost)).size;

    const avgPaymentSize = settled.length > 0 ? totalSpent / settled.length : 0;
    const successRate =
      currentPayments.length > 0
        ? (settled.length / currentPayments.length) * 100
        : 0;

    // Previous period stats for comparison
    const prevSettled = previousPayments.filter(
      (p) => p.status === "settled" || p.status === "completed"
    );
    const prevTotalSpent = prevSettled.reduce((sum, p) => sum + p.amount, 0);

    // Calculate percentage changes
    const spentChange =
      prevTotalSpent > 0
        ? ((totalSpent - prevTotalSpent) / prevTotalSpent) * 100
        : totalSpent > 0
          ? 100
          : 0;
    const paymentsChange =
      previousPayments.length > 0
        ? ((currentPayments.length - previousPayments.length) / previousPayments.length) * 100
        : currentPayments.length > 0
          ? 100
          : 0;

    return {
      totalPayments: currentPayments.length,
      settledPayments: settled.length,
      deniedPayments: denied.length,
      pendingPayments: pending.length,
      totalSpent: Math.round(totalSpent * 100000) / 100000,
      uniqueAgents,
      uniqueProviders,
      avgPaymentSize: Math.round(avgPaymentSize * 100000) / 100000,
      successRate: Math.round(successRate * 10) / 10,
      spentChange: Math.round(spentChange * 10) / 10,
      paymentsChange: Math.round(paymentsChange * 10) / 10,
    };
  },
});

/**
 * Get hourly distribution of payments (for heat map) - MNEE only
 */
export const getHourlyDistribution = query({
  args: {
    days: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      hour: v.number(), // 0-23
      dayOfWeek: v.number(), // 0-6 (Sunday = 0)
      count: v.number(),
      spent: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const { workspaceId, role } = await getCurrentWorkspaceContext(ctx);
    requireRole(role, ALL_ROLES, "view usage analytics");

    const days = args.days ?? 30;
    const startTime = Date.now() - days * 24 * 60 * 60 * 1000;

    const payments = await ctx.db
      .query("payments")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", workspaceId))
      .collect();

    const recentPayments = payments.filter(
      (p) => p.createdAt >= startTime && (p.status === "settled" || p.status === "completed")
    );

    // Initialize all hour/day combinations
    const distribution: Record<string, { count: number; spent: number }> = {};
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        distribution[`${day}-${hour}`] = { count: 0, spent: 0 };
      }
    }

    // Aggregate
    for (const payment of recentPayments) {
      const date = new Date(payment.createdAt);
      const key = `${date.getDay()}-${date.getHours()}`;
      distribution[key].count += 1;
      distribution[key].spent += payment.amount;
    }

    return Object.entries(distribution).map(([key, data]) => {
      const [dayOfWeek, hour] = key.split("-").map(Number);
      return {
        hour,
        dayOfWeek,
        count: data.count,
        spent: Math.round(data.spent * 100000) / 100000,
      };
    });
  },
});

/**
 * Get agent's current daily and monthly spend (MNEE only)
 * Used for displaying spend vs limits in the UI
 */
export const getAgentSpend = query({
  args: {
    apiKeyId: v.id("apiKeys"),
  },
  returns: v.object({
    dailySpend: v.number(),
    monthlySpend: v.number(),
  }),
  handler: async (ctx, args) => {
    const { workspaceId, role } = await getCurrentWorkspaceContext(ctx);
    requireRole(role, ALL_ROLES, "view agent spend");

    const apiKey = await ctx.db.get(args.apiKeyId);
    if (!apiKey || apiKey.workspaceId !== workspaceId) {
      throw new Error("API key not found in this workspace");
    }

    const now = Date.now();

    // Calculate daily spend
    const startOfDay = new Date(now);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const startOfDayTimestamp = startOfDay.getTime();

    const dailyPayments = await ctx.db
      .query("payments")
      .withIndex("by_apiKeyId", (q) => q.eq("apiKeyId", args.apiKeyId))
      .filter((q) =>
        q.and(
          q.gte(q.field("createdAt"), startOfDayTimestamp),
          q.or(
            q.eq(q.field("status"), "settled"),
            q.eq(q.field("status"), "completed")
          )
        )
      )
      .collect();

    const dailySpend = dailyPayments.reduce((sum, p) => sum + p.amount, 0);

    // Calculate monthly spend
    const startOfMonth = new Date(now);
    startOfMonth.setUTCDate(1);
    startOfMonth.setUTCHours(0, 0, 0, 0);
    const startOfMonthTimestamp = startOfMonth.getTime();

    const monthlyPayments = await ctx.db
      .query("payments")
      .withIndex("by_apiKeyId", (q) => q.eq("apiKeyId", args.apiKeyId))
      .filter((q) =>
        q.and(
          q.gte(q.field("createdAt"), startOfMonthTimestamp),
          q.or(
            q.eq(q.field("status"), "settled"),
            q.eq(q.field("status"), "completed")
          )
        )
      )
      .collect();

    const monthlySpend = monthlyPayments.reduce((sum, p) => sum + p.amount, 0);

    return {
      dailySpend: Math.round(dailySpend * 100000) / 100000,
      monthlySpend: Math.round(monthlySpend * 100000) / 100000,
    };
  },
});