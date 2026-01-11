import { v } from "convex/values";
import { internalMutation, internalQuery, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getCurrentWorkspaceContext, requireRole, ALL_ROLES } from "./lib/auth";
import { internal } from "./_generated/api";

// ============================================
// API KEY VALIDATION (for HTTP actions)
// ============================================

/**
 * Validate API key and return workspace context
 * Used by HTTP actions that need API key authentication
 */
export const validateApiKeyInternal = internalQuery({
  args: {
    apiKey: v.string(),
  },
  handler: async (ctx, args) => {
    const keyRecord = await ctx.db
      .query("apiKeys")
      .withIndex("by_apiKey", (q) => q.eq("apiKey", args.apiKey))
      .unique();

    if (!keyRecord) {
      return { valid: false as const, error: "Invalid API key" };
    }

    if (!keyRecord.isActive) {
      return { valid: false as const, error: "API key is disabled" };
    }

    if (keyRecord.expiresAt && keyRecord.expiresAt < Date.now()) {
      return { valid: false as const, error: "API key has expired" };
    }

    const workspace = await ctx.db.get(keyRecord.workspaceId);
    if (!workspace) {
      return { valid: false as const, error: "Workspace not found" };
    }

    return {
      valid: true as const,
      apiKeyId: keyRecord._id,
      workspaceId: keyRecord.workspaceId,
      workspaceName: workspace.name,
      ethereumNetwork: keyRecord.ethereumNetwork,
    };
  },
});

/**
 * Get API key details (for provider config endpoint)
 */
export const getApiKeyDetails = internalQuery({
  args: {
    apiKeyId: v.id("apiKeys"),
  },
  handler: async (ctx, args) => {
    const keyRecord = await ctx.db.get(args.apiKeyId);
    if (!keyRecord) {
      return null;
    }

    return {
      type: keyRecord.type,
      receivingAddress: keyRecord.receivingAddress,
      receivingNetwork: keyRecord.receivingNetwork,
      ethereumNetwork: keyRecord.ethereumNetwork,
      treasuryId: keyRecord.treasuryId,
    };
  },
});

// ============================================
// PROVIDER MANAGEMENT
// ============================================

/**
 * List providers for the current workspace
 */
export const listProviders = query({
  args: {},
  handler: async (ctx) => {
    const { workspaceId, role } = await getCurrentWorkspaceContext(ctx);
    requireRole(role, ALL_ROLES, "view providers");

    const providers = await ctx.db
      .query("providers")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", workspaceId))
      .collect();

    return providers.map((p) => ({
      _id: p._id,
      name: p.name,
      host: p.host,
      type: p.type,
      isActive: p.isActive,
    }));
  },
});

/**
 * Get or create a provider for a given host
 * Auto-creates providers when we see new hosts
 */
export const getOrCreateProviderForHost = internalMutation({
  args: {
    workspaceId: v.id("workspaces"),
    host: v.string(),
  },
  handler: async (ctx, args): Promise<Id<"providers">> => {
    // Check if provider exists for this host
    const existingProvider = await ctx.db
      .query("providers")
      .withIndex("by_workspace_host", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("host", args.host)
      )
      .unique();

    if (existingProvider) {
      return existingProvider._id;
    }

    // Create new provider
    const now = Date.now();
    const providerId = await ctx.db.insert("providers", {
      workspaceId: args.workspaceId,
      name: args.host, // Use host as name initially
      host: args.host,
      type: "custom",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    return providerId;
  },
});

// ============================================
// PAYMENT RECORDS (MNEE ERC20 on Ethereum)
// ============================================

/**
 * Create an MNEE payment quote record
 * Records the quote attempt with status allowed/denied
 */
export const createPaymentQuote = internalMutation({
  args: {
    workspaceId: v.id("workspaces"),
    apiKeyId: v.id("apiKeys"),
    providerId: v.optional(v.id("providers")),
    providerHost: v.string(),
    invoiceId: v.string(),
    amount: v.number(), // Amount in MNEE (18 decimals)
    payTo: v.string(), // Ethereum address (0x...)
    network: v.union(v.literal("sepolia"), v.literal("mainnet")),
    status: v.union(v.literal("allowed"), v.literal("denied")),
    denialReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const paymentId = await ctx.db.insert("payments", {
      workspaceId: args.workspaceId,
      apiKeyId: args.apiKeyId,
      providerId: args.providerId,
      providerHost: args.providerHost,
      invoiceId: args.invoiceId,
      amount: args.amount,
      payTo: args.payTo,
      network: args.network,
      status: args.status,
      denialReason: args.denialReason,
      createdAt: now,
    });

    // Update platform stats incrementally (real-time)
    await ctx.scheduler.runAfter(0, internal.payments.updatePlatformStatsIncremental, {
      totalPaymentsDelta: 1,
    });

    return paymentId;
  },
});

// Keep old name as alias for backward compatibility
export const createMneePaymentQuote = createPaymentQuote;

/**
 * Update API key's last used timestamp
 */
export const markApiKeyUsedInternal = internalMutation({
  args: {
    apiKeyId: v.id("apiKeys"),
  },
  handler: async (ctx, args) => {
    const apiKey = await ctx.db.get(args.apiKeyId);
    if (!apiKey) return;

    await ctx.db.patch(args.apiKeyId, {
      lastUsedAt: Date.now(),
    });
  },
});

// ============================================
// PAYMENT SETTLEMENT
// ============================================

/**
 * Get a payment by ID for validation
 */
export const getPaymentById = internalQuery({
  args: {
    paymentId: v.id("payments"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.paymentId);
  },
});

/**
 * Get a payment by invoice ID (for provider verification)
 */
export const getPaymentByInvoiceId = internalQuery({
  args: {
    invoiceId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("payments")
      .withIndex("by_invoiceId", (q) => q.eq("invoiceId", args.invoiceId))
      .unique();
  },
});

/**
 * Mark a payment as settled with transaction details
 */
export const markPaymentSettled = internalMutation({
  args: {
    paymentId: v.id("payments"),
    txHash: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const payment = await ctx.db.get(args.paymentId);
    if (!payment) {
      return { success: false, error: "Payment not found" };
    }

    const wasNotSettled = payment.status !== "settled" && payment.status !== "completed";

    const now = Date.now();
    await ctx.db.patch(args.paymentId, {
      status: "settled",
      txHash: args.txHash,
      updatedAt: now,
      completedAt: now,
    });

    // Update platform stats incrementally (real-time)
    // Only increment if payment wasn't already settled
    if (wasNotSettled) {
      await ctx.scheduler.runAfter(0, internal.payments.updatePlatformStatsIncremental, {
        settledPaymentsDelta: 1,
        volumeDelta: payment.amount,
      });
    }

    return { success: true };
  },
});

/**
 * Mark a payment as failed
 */
export const markPaymentFailed = internalMutation({
  args: {
    paymentId: v.id("payments"),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const payment = await ctx.db.get(args.paymentId);
    if (!payment) {
      return { success: false, error: "Payment not found" };
    }

    const wasNotFailed = payment.status !== "failed";

    await ctx.db.patch(args.paymentId, {
      status: "failed",
      denialReason: args.errorMessage,
      updatedAt: Date.now(),
    });

    // Update platform stats incrementally (real-time)
    // Only increment if payment wasn't already failed
    if (wasNotFailed) {
      await ctx.scheduler.runAfter(0, internal.payments.updatePlatformStatsIncremental, {
        failedPaymentsDelta: 1,
      });
    }

    return { success: true };
  },
});

/**
 * Update payment status (e.g., from "allowed" to "pending")
 */
export const updatePaymentStatus = internalMutation({
  args: {
    paymentId: v.id("payments"),
    status: v.union(
      v.literal("allowed"),
      v.literal("denied"),
      v.literal("settled"),
      v.literal("pending"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("refunded")
    ),
  },
  handler: async (ctx, args) => {
    const payment = await ctx.db.get(args.paymentId);
    if (!payment) {
      return { success: false, error: "Payment not found" };
    }

    const oldStatus = payment.status;
    const newStatus = args.status;

    await ctx.db.patch(args.paymentId, {
      status: args.status,
      updatedAt: Date.now(),
    });

    // Update platform stats incrementally based on status change
    const wasSettled = oldStatus === "settled" || oldStatus === "completed";
    const isNowSettled = newStatus === "settled" || newStatus === "completed";
    const wasFailed = oldStatus === "failed";
    const isNowFailed = newStatus === "failed";

    if (!wasSettled && isNowSettled) {
      // Payment just became settled
      await ctx.scheduler.runAfter(0, internal.payments.updatePlatformStatsIncremental, {
        settledPaymentsDelta: 1,
        volumeDelta: payment.amount,
      });
    }

    if (!wasFailed && isNowFailed) {
      // Payment just became failed
      await ctx.scheduler.runAfter(0, internal.payments.updatePlatformStatsIncremental, {
        failedPaymentsDelta: 1,
      });
    }

    return { success: true };
  },
});

// ============================================
// POLICY ENFORCEMENT (MNEE-only)
// ============================================

/**
 * List payments for a specific workspace (user-facing)
 */
export const listWorkspacePayments = query({
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
    const { workspaceId } = await getCurrentWorkspaceContext(ctx);
    
    const limit = args.limit || 100;

    // Get payments for this workspace
    const paymentsQuery = ctx.db
      .query("payments")
      .withIndex("by_workspace_created", (q) => q.eq("workspaceId", workspaceId))
      .order("desc");

    const payments = await paymentsQuery.take(limit);

    // Get related data
    const paymentsWithDetails = await Promise.all(
      payments.map(async (payment) => {
        const apiKey = await ctx.db.get(payment.apiKeyId);
        const provider = payment.providerId ? await ctx.db.get(payment.providerId) : null;

        return {
          _id: payment._id,
          invoiceId: payment.invoiceId,
          amount: payment.amount,
          payTo: payment.payTo,
          network: payment.network,
          status: payment.status,
          providerHost: payment.providerHost,
          txHash: payment.txHash,
          denialReason: payment.denialReason,
          createdAt: payment.createdAt,
          completedAt: payment.completedAt,
          updatedAt: payment.updatedAt,
          // Related data
          apiKeyName: apiKey?.name,
          providerName: provider?.name,
        };
      })
    );

    // Filter by status if provided
    if (args.status) {
      return paymentsWithDetails.filter((p) => p.status === args.status);
    }

    return paymentsWithDetails;
  },
});

/**
 * Get payment statistics for a workspace (user-facing)
 */
export const getWorkspacePaymentStats = query({
  args: {},
  handler: async (ctx) => {
    const { workspaceId } = await getCurrentWorkspaceContext(ctx);

    const allPayments = await ctx.db
      .query("payments")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", workspaceId))
      .collect();

    // Calculate stats
    const totalPayments = allPayments.length;
    const settledPayments = allPayments.filter(
      (p) => p.status === "settled" || p.status === "completed"
    );
    const pendingPayments = allPayments.filter((p) => p.status === "pending");
    const failedPayments = allPayments.filter((p) => p.status === "failed");
    const deniedPayments = allPayments.filter((p) => p.status === "denied");

    const totalSpent = settledPayments.reduce((sum, p) => sum + p.amount, 0);

    // Calculate today's stats
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const todayPayments = allPayments.filter((p) => p.createdAt >= startOfDay.getTime());
    const todaySpent = todayPayments
      .filter((p) => p.status === "settled" || p.status === "completed")
      .reduce((sum, p) => sum + p.amount, 0);

    // Calculate this month's stats
    const startOfMonth = new Date();
    startOfMonth.setUTCDate(1);
    startOfMonth.setUTCHours(0, 0, 0, 0);
    const monthPayments = allPayments.filter((p) => p.createdAt >= startOfMonth.getTime());
    const monthSpent = monthPayments
      .filter((p) => p.status === "settled" || p.status === "completed")
      .reduce((sum, p) => sum + p.amount, 0);

    return {
      totalPayments,
      settledCount: settledPayments.length,
      pendingCount: pendingPayments.length,
      failedCount: failedPayments.length,
      deniedCount: deniedPayments.length,
      totalSpent,
      todayPayments: todayPayments.length,
      todaySpent,
      monthPayments: monthPayments.length,
      monthSpent,
    };
  },
});

/**
 * List payments received to workspace provider API keys (provider income)
 */
export const listReceivedPayments = query({
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
    const { workspaceId } = await getCurrentWorkspaceContext(ctx);
    
    // Get all provider API keys for this workspace
    const providerKeys = await ctx.db
      .query("apiKeys")
      .withIndex("by_workspace_type", (q) => 
        q.eq("workspaceId", workspaceId).eq("type", "provider")
      )
      .collect();

    if (providerKeys.length === 0) {
      return [];
    }

    // Get receiving addresses from provider keys
    const receivingAddresses = providerKeys
      .filter(k => k.receivingAddress && k.receivingNetwork)
      .map(k => ({ address: k.receivingAddress!, network: k.receivingNetwork! }));

    if (receivingAddresses.length === 0) {
      return [];
    }

    const limit = args.limit || 100;

    // Get all payments where payTo matches any of our receiving addresses
    const allPayments = await ctx.db.query("payments").order("desc").take(limit * 10); // Get more to filter

    const receivedPayments = allPayments.filter((payment) =>
      receivingAddresses.some(
        (addr) => addr.address === payment.payTo && addr.network === payment.network
      )
    ).slice(0, limit);

    // Get related data
    const paymentsWithDetails = await Promise.all(
      receivedPayments.map(async (payment) => {
        const payerWorkspace = await ctx.db.get(payment.workspaceId);
        const apiKey = await ctx.db.get(payment.apiKeyId);
        const provider = payment.providerId ? await ctx.db.get(payment.providerId) : null;

        return {
          _id: payment._id,
          invoiceId: payment.invoiceId,
          amount: payment.amount,
          payTo: payment.payTo,
          network: payment.network,
          status: payment.status,
          providerHost: payment.providerHost,
          txHash: payment.txHash,
          denialReason: payment.denialReason,
          createdAt: payment.createdAt,
          completedAt: payment.completedAt,
          updatedAt: payment.updatedAt,
          // Related data
          payerWorkspaceName: payerWorkspace?.name,
          apiKeyName: apiKey?.name,
          providerName: provider?.name,
        };
      })
    );

    // Filter by status if provided
    if (args.status) {
      return paymentsWithDetails.filter((p) => p.status === args.status);
    }

    return paymentsWithDetails;
  },
});

/**
 * Get received payment statistics (provider income stats)
 * Uses streaming to avoid 16MB read limit
 */
export const getReceivedPaymentStats = query({
  args: {},
  handler: async (ctx) => {
    const { workspaceId } = await getCurrentWorkspaceContext(ctx);

    // Get all provider API keys for this workspace
    const providerKeys = await ctx.db
      .query("apiKeys")
      .withIndex("by_workspace_type", (q) => 
        q.eq("workspaceId", workspaceId).eq("type", "provider")
      )
      .collect();

    // Get receiving addresses from provider keys
    const receivingAddresses = providerKeys
      .filter(k => k.receivingAddress && k.receivingNetwork)
      .map(k => ({ address: k.receivingAddress!, network: k.receivingNetwork! }));

    if (receivingAddresses.length === 0) {
      return {
        totalPayments: 0,
        settledCount: 0,
        pendingCount: 0,
        failedCount: 0,
        deniedCount: 0,
        totalEarned: 0,
        todayPayments: 0,
        todayEarned: 0,
        monthPayments: 0,
        monthEarned: 0,
      };
    }

    // Calculate time boundaries
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const startOfMonth = new Date();
    startOfMonth.setUTCDate(1);
    startOfMonth.setUTCHours(0, 0, 0, 0);

    // Use streaming to avoid 16MB limit
    let totalPayments = 0;
    let settledCount = 0;
    let pendingCount = 0;
    let failedCount = 0;
    let deniedCount = 0;
    let totalEarned = 0;
    let todayPaymentsCount = 0;
    let todayEarned = 0;
    let monthPaymentsCount = 0;
    let monthEarned = 0;

    for await (const payment of ctx.db.query("payments")) {
      // Check if payment is to one of our receiving addresses
      const isReceived = receivingAddresses.some(
        (addr) => addr.address === payment.payTo && addr.network === payment.network
      );

      if (!isReceived) continue;

      totalPayments++;

      const isSettled = payment.status === "settled" || payment.status === "completed";
      
      if (isSettled) {
        settledCount++;
        totalEarned += payment.amount;
      } else if (payment.status === "pending") {
        pendingCount++;
      } else if (payment.status === "failed") {
        failedCount++;
      } else if (payment.status === "denied") {
        deniedCount++;
      }

      // Today stats
      if (payment.createdAt >= startOfDay.getTime()) {
        todayPaymentsCount++;
        if (isSettled) {
          todayEarned += payment.amount;
        }
      }

      // Month stats
      if (payment.createdAt >= startOfMonth.getTime()) {
        monthPaymentsCount++;
        if (isSettled) {
          monthEarned += payment.amount;
        }
      }
    }

    return {
      totalPayments,
      settledCount,
      pendingCount,
      failedCount,
      deniedCount,
      totalEarned,
      todayPayments: todayPaymentsCount,
      todayEarned,
      monthPayments: monthPaymentsCount,
      monthEarned,
    };
  },
});

/**
 * List all payments for admin dashboard (platform-wide)
 */
export const listAllPaymentsForAdmin = query({
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
    // Check if user is admin
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", identity.subject))
      .unique();

    if (!user || !user.isAdmin) {
      throw new Error("Not authorized - admin access required");
    }

    const limit = args.limit || 100;

    // Build query
    const paymentsQuery = ctx.db.query("payments").order("desc");

    const payments = await paymentsQuery.take(limit);

    // Get related data
    const paymentsWithDetails = await Promise.all(
      payments.map(async (payment) => {
        const workspace = await ctx.db.get(payment.workspaceId);
        const apiKey = await ctx.db.get(payment.apiKeyId);
        const provider = payment.providerId ? await ctx.db.get(payment.providerId) : null;

        return {
          _id: payment._id,
          invoiceId: payment.invoiceId,
          amount: payment.amount,
          payTo: payment.payTo,
          network: payment.network,
          status: payment.status,
          providerHost: payment.providerHost,
          txHash: payment.txHash,
          denialReason: payment.denialReason,
          createdAt: payment.createdAt,
          completedAt: payment.completedAt,
          updatedAt: payment.updatedAt,
          // Related data
          workspaceName: workspace?.name,
          apiKeyName: apiKey?.name,
          providerName: provider?.name,
        };
      })
    );

    // Filter by status if provided
    if (args.status) {
      return paymentsWithDetails.filter((p) => p.status === args.status);
    }

    return paymentsWithDetails;
  },
});

/**
 * Get payment statistics for admin dashboard
 * Uses streaming to avoid 16MB read limit
 */
export const getPaymentStatsForAdmin = query({
  args: {},
  handler: async (ctx) => {
    // Check if user is admin
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", identity.subject))
      .unique();

    if (!user || !user.isAdmin) {
      throw new Error("Not authorized - admin access required");
    }

    // Calculate time boundaries
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);

    // Use streaming to avoid 16MB limit
    let totalPayments = 0;
    let settledCount = 0;
    let pendingCount = 0;
    let failedCount = 0;
    let totalRevenue = 0;
    let todayPaymentsCount = 0;
    let todayRevenue = 0;

    for await (const payment of ctx.db.query("payments")) {
      totalPayments++;

      const isSettled = payment.status === "settled" || payment.status === "completed";
      
      if (isSettled) {
        settledCount++;
        totalRevenue += payment.amount;
      } else if (payment.status === "pending") {
        pendingCount++;
      } else if (payment.status === "failed") {
        failedCount++;
      }

      // Today stats
      if (payment.createdAt >= startOfDay.getTime()) {
        todayPaymentsCount++;
        if (isSettled) {
          todayRevenue += payment.amount;
        }
      }
    }

    return {
      totalPayments,
      settledCount,
      pendingCount,
      failedCount,
      totalRevenue,
      todayPayments: todayPaymentsCount,
      todayRevenue,
    };
  },
});

/**
 * Check agent policy against a payment request
 * Returns whether the request is allowed and a reason if denied
 */
export const checkAgentPolicy = internalQuery({
  args: {
    apiKeyId: v.id("apiKeys"),
    providerId: v.optional(v.id("providers")),
    amount: v.number(), // Amount in MNEE
  },
  handler: async (ctx, args) => {
    // Get agent policy
    const policy = await ctx.db
      .query("agentPolicies")
      .withIndex("by_apiKeyId", (q) => q.eq("apiKeyId", args.apiKeyId))
      .unique();

    // Check if policy exists and is active
    if (policy && !policy.isActive) {
      return { allowed: false, reason: "AGENT_POLICY_INACTIVE" };
    }

    // Check allowedProviders if configured
    if (policy && policy.allowedProviders && policy.allowedProviders.length > 0) {
      if (!args.providerId || !policy.allowedProviders.includes(args.providerId)) {
        return { allowed: false, reason: "AGENT_PROVIDER_NOT_ALLOWED" };
      }
    }

    // If no policy exists, allow (no limits configured)
    if (!policy) {
      return { allowed: true, reason: null };
    }

    // Check maxRequest limit (fastest check)
    if (policy.maxRequest !== undefined && args.amount > policy.maxRequest) {
      return { allowed: false, reason: "AGENT_MAX_REQUEST_EXCEEDED" };
    }

    // Calculate spend for MNEE payments
    const now = Date.now();
    const startOfDay = new Date(now);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const startOfDayTimestamp = startOfDay.getTime();

    const startOfMonth = new Date(now);
    startOfMonth.setUTCDate(1);
    startOfMonth.setUTCHours(0, 0, 0, 0);
    const startOfMonthTimestamp = startOfMonth.getTime();

    // Get all settled/completed payments for this agent
    const allPayments = await ctx.db
      .query("payments")
      .withIndex("by_apiKeyId", (q) => q.eq("apiKeyId", args.apiKeyId))
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "settled"),
          q.eq(q.field("status"), "completed")
        )
      )
      .collect();

    // Calculate daily spend
    const dailyPayments = allPayments.filter((p) => p.createdAt >= startOfDayTimestamp);
    const dailySpend = dailyPayments.reduce((sum, p) => sum + p.amount, 0);

    // Check daily limit
    if (policy.dailyLimit !== undefined && dailySpend + args.amount > policy.dailyLimit) {
      return { allowed: false, reason: "AGENT_DAILY_LIMIT_EXCEEDED" };
    }

    // Calculate monthly spend
    const monthlyPayments = allPayments.filter((p) => p.createdAt >= startOfMonthTimestamp);
    const monthlySpend = monthlyPayments.reduce((sum, p) => sum + p.amount, 0);

    // Check monthly limit
    if (policy.monthlyLimit !== undefined && monthlySpend + args.amount > policy.monthlyLimit) {
      return { allowed: false, reason: "AGENT_MONTHLY_LIMIT_EXCEEDED" };
    }

    // All checks passed
    return { allowed: true, reason: null };
  },
});

// Keep old name as alias for backward compatibility
export const checkAgentPolicyMnee = checkAgentPolicy;
