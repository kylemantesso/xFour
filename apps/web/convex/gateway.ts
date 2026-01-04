import { v } from "convex/values";
import { internalMutation, internalQuery, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getCurrentWorkspaceContext, requireRole, ALL_ROLES } from "./lib/auth";

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
      mneeNetwork: keyRecord.mneeNetwork,
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
      mneeNetwork: keyRecord.mneeNetwork,
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
// PAYMENT RECORDS (MNEE-only)
// ============================================

/**
 * Create an MNEE payment quote record
 * Records the quote attempt with status allowed/denied
 */
export const createMneePaymentQuote = internalMutation({
  args: {
    workspaceId: v.id("workspaces"),
    apiKeyId: v.id("apiKeys"),
    providerId: v.optional(v.id("providers")),
    providerHost: v.string(),
    invoiceId: v.string(),
    amount: v.number(), // Amount in MNEE
    payTo: v.string(), // MNEE payment address (Bitcoin address)
    network: v.union(v.literal("sandbox"), v.literal("mainnet")),
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

    return paymentId;
  },
});

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
    ticketId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const payment = await ctx.db.get(args.paymentId);
    if (!payment) {
      return { success: false, error: "Payment not found" };
    }

    const now = Date.now();
    await ctx.db.patch(args.paymentId, {
      status: "settled",
      txHash: args.txHash,
      ticketId: args.ticketId,
      updatedAt: now,
      completedAt: now,
    });

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

    await ctx.db.patch(args.paymentId, {
      status: "failed",
      denialReason: args.errorMessage,
      updatedAt: Date.now(),
    });

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

    await ctx.db.patch(args.paymentId, {
      status: args.status,
      updatedAt: Date.now(),
    });

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
          ticketId: payment.ticketId,
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
          ticketId: payment.ticketId,
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

    // Get all payments to our receiving addresses
    const allPayments = await ctx.db.query("payments").collect();
    
    const receivedPayments = allPayments.filter((payment) =>
      receivingAddresses.some(
        (addr) => addr.address === payment.payTo && addr.network === payment.network
      )
    );

    // Calculate stats
    const totalPayments = receivedPayments.length;
    const settledPayments = receivedPayments.filter(
      (p) => p.status === "settled" || p.status === "completed"
    );
    const pendingPayments = receivedPayments.filter((p) => p.status === "pending");
    const failedPayments = receivedPayments.filter((p) => p.status === "failed");
    const deniedPayments = receivedPayments.filter((p) => p.status === "denied");

    const totalEarned = settledPayments.reduce((sum, p) => sum + p.amount, 0);

    // Calculate today's stats
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const todayPayments = receivedPayments.filter((p) => p.createdAt >= startOfDay.getTime());
    const todayEarned = todayPayments
      .filter((p) => p.status === "settled" || p.status === "completed")
      .reduce((sum, p) => sum + p.amount, 0);

    // Calculate this month's stats
    const startOfMonth = new Date();
    startOfMonth.setUTCDate(1);
    startOfMonth.setUTCHours(0, 0, 0, 0);
    const monthPayments = receivedPayments.filter((p) => p.createdAt >= startOfMonth.getTime());
    const monthEarned = monthPayments
      .filter((p) => p.status === "settled" || p.status === "completed")
      .reduce((sum, p) => sum + p.amount, 0);

    return {
      totalPayments,
      settledCount: settledPayments.length,
      pendingCount: pendingPayments.length,
      failedCount: failedPayments.length,
      deniedCount: deniedPayments.length,
      totalEarned,
      todayPayments: todayPayments.length,
      todayEarned,
      monthPayments: monthPayments.length,
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
          ticketId: payment.ticketId,
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

    const allPayments = await ctx.db.query("payments").collect();

    // Calculate stats
    const totalPayments = allPayments.length;
    const settledPayments = allPayments.filter(
      (p) => p.status === "settled" || p.status === "completed"
    );
    const pendingPayments = allPayments.filter((p) => p.status === "pending");
    const failedPayments = allPayments.filter((p) => p.status === "failed");

    const totalRevenue = settledPayments.reduce((sum, p) => sum + p.amount, 0);

    // Calculate today's stats
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const todayPayments = allPayments.filter((p) => p.createdAt >= startOfDay.getTime());
    const todayRevenue = todayPayments
      .filter((p) => p.status === "settled" || p.status === "completed")
      .reduce((sum, p) => sum + p.amount, 0);

    return {
      totalPayments,
      settledCount: settledPayments.length,
      pendingCount: pendingPayments.length,
      failedCount: failedPayments.length,
      totalRevenue,
      todayPayments: todayPayments.length,
      todayRevenue,
    };
  },
});

/**
 * Check agent policy against an MNEE payment request
 * Returns whether the request is allowed and a reason if denied
 */
export const checkAgentPolicyMnee = internalQuery({
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
