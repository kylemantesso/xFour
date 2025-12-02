import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// ============================================
// FX CONVERSION
// ============================================

/**
 * Convert amount from one currency to treasury token amount
 * For now, uses fixed rates. Later can be dynamic based on currency pairs.
 */
interface ConvertToTreasuryResult {
  treasuryAmount: number;
  rate: number;
}

export function convertToTreasuryToken(amount: number, fromSymbol: string, toSymbol: string): ConvertToTreasuryResult {
  // Fixed rates for now - will be dynamic later
  // These are rates TO the treasury token (e.g., how much treasury token per 1 unit of fromSymbol)
  const rates: Record<string, number> = {
    USDC: 0.98, // 1 USDC = 0.98 treasury token
    USDT: 0.98,
    USD: 1.0,
    ETH: 2000.0,
    MNEE: 1.0, // 1:1 if same currency
  };

  // If converting to same currency, rate is 1:1
  if (fromSymbol.toUpperCase() === toSymbol.toUpperCase()) {
    return {
      treasuryAmount: amount,
      rate: 1.0,
    };
  }

  const rate = rates[fromSymbol.toUpperCase()] ?? 1.0;
  const treasuryAmount = amount * rate;

  return {
    treasuryAmount: Math.round(treasuryAmount * 1000000) / 1000000, // 6 decimal precision
    rate,
  };
}

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
      preferredPaymentToken: keyRecord.preferredPaymentToken,
    };
  },
});

// ============================================
// PROVIDER MANAGEMENT
// ============================================

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
// PAYMENT RECORDS
// ============================================

/**
 * Create a payment quote record
 * Records the quote attempt with status allowed/denied
 */
export const createPaymentQuote = internalMutation({
  args: {
    workspaceId: v.id("workspaces"),
    apiKeyId: v.id("apiKeys"),
    providerId: v.optional(v.id("providers")),
    providerHost: v.string(),
    invoiceId: v.string(),
    originalAmount: v.number(),
    originalCurrency: v.string(),
    originalNetwork: v.string(),
    payTo: v.string(),
    paymentToken: v.optional(v.string()), // Token address from API key preference
    paymentTokenSymbol: v.optional(v.string()), // Token symbol (e.g., "MNEE", "USDC")
    treasuryAmount: v.number(), // Amount in treasury token after FX conversion
    fxRate: v.number(),
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
      originalAmount: args.originalAmount,
      originalCurrency: args.originalCurrency,
      originalNetwork: args.originalNetwork,
      payTo: args.payTo,
      paymentToken: args.paymentToken,
      paymentTokenSymbol: args.paymentTokenSymbol,
      treasuryAmount: args.treasuryAmount,
      fxRate: args.fxRate,
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
 * Settle a payment - marks it as confirmed
 */
export const settlePayment = internalMutation({
  args: {
    paymentId: v.id("payments"),
  },
  handler: async (ctx, args) => {
    const payment = await ctx.db.get(args.paymentId);
    if (!payment) {
      return { success: false, error: "Payment not found" };
    }

    await ctx.db.patch(args.paymentId, {
      status: "settled",
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Update swap details on a payment after on-chain swap execution
 */
export const updatePaymentSwapDetails = internalMutation({
  args: {
    paymentId: v.id("payments"),
    txHash: v.optional(v.string()),
    swapTxHash: v.optional(v.string()),
    swapSellAmount: v.optional(v.number()),
    swapSellToken: v.optional(v.string()),
    swapBuyAmount: v.optional(v.number()),
    swapBuyToken: v.optional(v.string()),
    swapFee: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const payment = await ctx.db.get(args.paymentId);
    if (!payment) {
      return { success: false, error: "Payment not found" };
    }

    const now = Date.now();
    await ctx.db.patch(args.paymentId, {
      txHash: args.txHash,
      swapTxHash: args.swapTxHash,
      swapSellAmount: args.swapSellAmount,
      swapSellToken: args.swapSellToken,
      swapBuyAmount: args.swapBuyAmount,
      swapBuyToken: args.swapBuyToken,
      swapFee: args.swapFee,
      updatedAt: now,
      completedAt: now, // Mark as completed when tx details are saved
    });

    return { success: true };
  },
});

