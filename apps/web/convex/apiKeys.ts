import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import {
  getCurrentWorkspaceContext,
  requireRole,
  ADMIN_ROLES,
  WRITE_ROLES,
  ALL_ROLES,
  generateApiKey,
} from "./lib/auth";

/**
 * List all API keys for the current workspace
 */
export const listApiKeys = query({
  args: {},
  handler: async (ctx) => {
    const { workspaceId, role } = await getCurrentWorkspaceContext(ctx);
    requireRole(role, ALL_ROLES, "view API keys");

    const apiKeys = await ctx.db
      .query("apiKeys")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", workspaceId))
      .collect();

    // Don't return the full API key for security
    return apiKeys.map((key) => ({
      _id: key._id,
      name: key.name,
      description: key.description,
      apiKeyPrefix: key.apiKeyPrefix,
      preferredPaymentToken: key.preferredPaymentToken,
      createdByUserId: key.createdByUserId,
      lastUsedAt: key.lastUsedAt,
      expiresAt: key.expiresAt,
      isActive: key.isActive,
      createdAt: key.createdAt,
      updatedAt: key.updatedAt,
    }));
  },
});

/**
 * Create a new API key
 */
export const createApiKey = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    preferredPaymentToken: v.string(), // Required: token address for payments
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { workspaceId, role, clerkUserId } = await getCurrentWorkspaceContext(ctx);
    requireRole(role, WRITE_ROLES, "create API keys");

    const now = Date.now();
    const { key, prefix } = generateApiKey();

    const apiKeyId = await ctx.db.insert("apiKeys", {
      workspaceId,
      name: args.name,
      description: args.description,
      apiKey: key,
      apiKeyPrefix: prefix,
      preferredPaymentToken: args.preferredPaymentToken,
      createdByUserId: clerkUserId,
      expiresAt: args.expiresAt,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    // Return the full key only once on creation
    return { apiKeyId, apiKey: key, prefix };
  },
});

/**
 * Update an API key
 */
export const updateApiKey = mutation({
  args: {
    apiKeyId: v.id("apiKeys"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    preferredPaymentToken: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { workspaceId, role } = await getCurrentWorkspaceContext(ctx);
    requireRole(role, ADMIN_ROLES, "update API keys");

    const apiKey = await ctx.db.get(args.apiKeyId);
    if (!apiKey || apiKey.workspaceId !== workspaceId) {
      throw new Error("API key not found in this workspace");
    }

    const updates: {
      name?: string;
      description?: string;
      preferredPaymentToken?: string;
      isActive?: boolean;
      updatedAt: number;
    } = { updatedAt: Date.now() };

    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.preferredPaymentToken !== undefined) updates.preferredPaymentToken = args.preferredPaymentToken;
    if (args.isActive !== undefined) updates.isActive = args.isActive;

    await ctx.db.patch(args.apiKeyId, updates);
    return { success: true };
  },
});

/**
 * Delete an API key
 */
export const deleteApiKey = mutation({
  args: {
    apiKeyId: v.id("apiKeys"),
  },
  handler: async (ctx, args) => {
    const { workspaceId, role } = await getCurrentWorkspaceContext(ctx);
    requireRole(role, ADMIN_ROLES, "delete API keys");

    const apiKey = await ctx.db.get(args.apiKeyId);
    if (!apiKey || apiKey.workspaceId !== workspaceId) {
      throw new Error("API key not found in this workspace");
    }

    // Also delete associated policies
    const policies = await ctx.db
      .query("agentPolicies")
      .withIndex("by_apiKeyId", (q) => q.eq("apiKeyId", args.apiKeyId))
      .collect();

    for (const policy of policies) {
      await ctx.db.delete(policy._id);
    }

    await ctx.db.delete(args.apiKeyId);
    return { success: true };
  },
});

/**
 * Regenerate an API key (creates new key, keeps metadata)
 */
export const regenerateApiKey = mutation({
  args: {
    apiKeyId: v.id("apiKeys"),
  },
  handler: async (ctx, args) => {
    const { workspaceId, role } = await getCurrentWorkspaceContext(ctx);
    requireRole(role, ADMIN_ROLES, "regenerate API keys");

    const apiKey = await ctx.db.get(args.apiKeyId);
    if (!apiKey || apiKey.workspaceId !== workspaceId) {
      throw new Error("API key not found in this workspace");
    }

    const { key, prefix } = generateApiKey();

    await ctx.db.patch(args.apiKeyId, {
      apiKey: key,
      apiKeyPrefix: prefix,
      updatedAt: Date.now(),
    });

    // Return the full key only once on regeneration
    return { apiKey: key, prefix };
  },
});

/**
 * Validate an API key and get workspace context (for gateway API)
 * This is used by HTTP actions for agent authentication
 */
export const validateApiKey = query({
  args: {
    apiKey: v.string(),
  },
  handler: async (ctx, args) => {
    const keyRecord = await ctx.db
      .query("apiKeys")
      .withIndex("by_apiKey", (q) => q.eq("apiKey", args.apiKey))
      .unique();

    if (!keyRecord) {
      return { valid: false, error: "Invalid API key" };
    }

    if (!keyRecord.isActive) {
      return { valid: false, error: "API key is disabled" };
    }

    if (keyRecord.expiresAt && keyRecord.expiresAt < Date.now()) {
      return { valid: false, error: "API key has expired" };
    }

    const workspace = await ctx.db.get(keyRecord.workspaceId);
    if (!workspace) {
      return { valid: false, error: "Workspace not found" };
    }

    return {
      valid: true,
      apiKeyId: keyRecord._id,
      workspaceId: keyRecord.workspaceId,
      workspaceName: workspace.name,
    };
  },
});

/**
 * Update last used timestamp (called by gateway on API key usage)
 */
export const markApiKeyUsed = mutation({
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
// AGENT POLICY MANAGEMENT
// ============================================

/**
 * Get agent policy for an API key
 */
export const getAgentPolicy = query({
  args: {
    apiKeyId: v.id("apiKeys"),
  },
  handler: async (ctx, args) => {
    const { workspaceId, role } = await getCurrentWorkspaceContext(ctx);
    requireRole(role, ALL_ROLES, "view agent policies");

    const apiKey = await ctx.db.get(args.apiKeyId);
    if (!apiKey || apiKey.workspaceId !== workspaceId) {
      throw new Error("API key not found in this workspace");
    }

    const policy = await ctx.db
      .query("agentPolicies")
      .withIndex("by_apiKeyId", (q) => q.eq("apiKeyId", args.apiKeyId))
      .unique();

    return policy;
  },
});

/**
 * Create an agent policy (for allowedProviders and isActive only)
 * Note: Spending limits are now per-chain/token only, use upsertAgentPolicyLimit
 */
export const createAgentPolicy = mutation({
  args: {
    apiKeyId: v.id("apiKeys"),
    allowedProviders: v.optional(v.array(v.id("providers"))),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { workspaceId, role } = await getCurrentWorkspaceContext(ctx);
    requireRole(role, ADMIN_ROLES, "create agent policies");

    const apiKey = await ctx.db.get(args.apiKeyId);
    if (!apiKey || apiKey.workspaceId !== workspaceId) {
      throw new Error("API key not found in this workspace");
    }

    // Check if policy already exists
    const existingPolicy = await ctx.db
      .query("agentPolicies")
      .withIndex("by_apiKeyId", (q) => q.eq("apiKeyId", args.apiKeyId))
      .unique();

    if (existingPolicy) {
      throw new Error("Policy already exists for this API key. Use updateAgentPolicy instead.");
    }

    // Validate allowed providers belong to workspace
    if (args.allowedProviders && args.allowedProviders.length > 0) {
      for (const providerId of args.allowedProviders) {
        const provider = await ctx.db.get(providerId);
        if (!provider || provider.workspaceId !== workspaceId) {
          throw new Error(`Provider ${providerId} not found in this workspace`);
        }
      }
    }

    const now = Date.now();
    const policyId = await ctx.db.insert("agentPolicies", {
      workspaceId,
      apiKeyId: args.apiKeyId,
      allowedProviders: args.allowedProviders,
      isActive: args.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    });

    return { policyId };
  },
});

/**
 * Update an agent policy (for allowedProviders and isActive only)
 * Note: Spending limits are now per-chain/token only, use upsertAgentPolicyLimit
 */
export const updateAgentPolicy = mutation({
  args: {
    apiKeyId: v.id("apiKeys"),
    allowedProviders: v.optional(v.array(v.id("providers"))),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { workspaceId, role } = await getCurrentWorkspaceContext(ctx);
    requireRole(role, ADMIN_ROLES, "update agent policies");

    const apiKey = await ctx.db.get(args.apiKeyId);
    if (!apiKey || apiKey.workspaceId !== workspaceId) {
      throw new Error("API key not found in this workspace");
    }

    const policy = await ctx.db
      .query("agentPolicies")
      .withIndex("by_apiKeyId", (q) => q.eq("apiKeyId", args.apiKeyId))
      .unique();

    if (!policy) {
      throw new Error("Policy not found for this API key. Use createAgentPolicy instead.");
    }

    // Validate allowed providers belong to workspace
    if (args.allowedProviders && args.allowedProviders.length > 0) {
      for (const providerId of args.allowedProviders) {
        const provider = await ctx.db.get(providerId);
        if (!provider || provider.workspaceId !== workspaceId) {
          throw new Error(`Provider ${providerId} not found in this workspace`);
        }
      }
    }

    const updates: {
      allowedProviders?: Id<"providers">[];
      isActive?: boolean;
      updatedAt: number;
    } = { updatedAt: Date.now() };

    if (args.allowedProviders !== undefined) updates.allowedProviders = args.allowedProviders;
    if (args.isActive !== undefined) updates.isActive = args.isActive;

    await ctx.db.patch(policy._id, updates);
    return { success: true };
  },
});

/**
 * Delete an agent policy
 */
export const deleteAgentPolicy = mutation({
  args: {
    apiKeyId: v.id("apiKeys"),
  },
  handler: async (ctx, args) => {
    const { workspaceId, role } = await getCurrentWorkspaceContext(ctx);
    requireRole(role, ADMIN_ROLES, "delete agent policies");

    const apiKey = await ctx.db.get(args.apiKeyId);
    if (!apiKey || apiKey.workspaceId !== workspaceId) {
      throw new Error("API key not found in this workspace");
    }

    const policy = await ctx.db
      .query("agentPolicies")
      .withIndex("by_apiKeyId", (q) => q.eq("apiKeyId", args.apiKeyId))
      .unique();

    if (!policy) {
      throw new Error("Policy not found for this API key");
    }

    await ctx.db.delete(policy._id);
    return { success: true };
  },
});

// ============================================
// PER-CHAIN/TOKEN POLICY LIMITS MANAGEMENT
// ============================================

/**
 * List all per-chain/token limits for an API key
 */
export const listAgentPolicyLimits = query({
  args: {
    apiKeyId: v.id("apiKeys"),
  },
  handler: async (ctx, args) => {
    const { workspaceId, role } = await getCurrentWorkspaceContext(ctx);
    requireRole(role, ALL_ROLES, "view agent policy limits");

    const apiKey = await ctx.db.get(args.apiKeyId);
    if (!apiKey || apiKey.workspaceId !== workspaceId) {
      throw new Error("API key not found in this workspace");
    }

    const limits = await ctx.db
      .query("agentPolicyLimits")
      .withIndex("by_apiKeyId", (q) => q.eq("apiKeyId", args.apiKeyId))
      .collect();

    return limits;
  },
});

/**
 * Create or update a per-chain/token limit
 */
export const upsertAgentPolicyLimit = mutation({
  args: {
    apiKeyId: v.id("apiKeys"),
    chainId: v.number(),
    tokenAddress: v.string(),
    dailyLimit: v.optional(v.number()),
    monthlyLimit: v.optional(v.number()),
    maxRequest: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { workspaceId, role } = await getCurrentWorkspaceContext(ctx);
    requireRole(role, ADMIN_ROLES, "manage agent policy limits");

    const apiKey = await ctx.db.get(args.apiKeyId);
    if (!apiKey || apiKey.workspaceId !== workspaceId) {
      throw new Error("API key not found in this workspace");
    }

    // Verify chain exists
    const chain = await ctx.db
      .query("supportedChains")
      .withIndex("by_chainId", (q) => q.eq("chainId", args.chainId))
      .first();

    if (!chain) {
      throw new Error(`Chain with ID ${args.chainId} not found`);
    }

    // Verify token exists on this chain (check if it's in workspace tokens)
    // First check if it's a workspace token
    const workspaceTokens = await ctx.db
      .query("workspaceTokens")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", workspaceId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    let tokenFound = false;
    for (const wt of workspaceTokens) {
      const token = await ctx.db.get(wt.tokenId);
      if (token && 
          token.isActive && 
          token.chainId === args.chainId &&
          token.address.toLowerCase() === args.tokenAddress.toLowerCase()) {
        tokenFound = true;
        break;
      }
    }

    // If not found in workspace tokens, check global supportedTokens as fallback
    if (!tokenFound) {
      const token = await ctx.db
        .query("supportedTokens")
        .withIndex("by_address_chainId", (q) =>
          q.eq("address", args.tokenAddress.toLowerCase()).eq("chainId", args.chainId)
        )
        .first();

      if (!token || !token.isActive) {
        throw new Error(`Token ${args.tokenAddress} not found on chain ${args.chainId}. Please add it to your workspace tokens first.`);
      }
    }

    // Check if limit already exists
    const existingLimit = await ctx.db
      .query("agentPolicyLimits")
      .withIndex("by_apiKey_chain_token", (q) =>
        q.eq("apiKeyId", args.apiKeyId)
          .eq("chainId", args.chainId)
          .eq("tokenAddress", args.tokenAddress.toLowerCase())
      )
      .first();

    const now = Date.now();

    if (existingLimit) {
      // Update existing limit
      const updates: {
        dailyLimit?: number;
        monthlyLimit?: number;
        maxRequest?: number;
        isActive?: boolean;
        updatedAt: number;
      } = { updatedAt: now };

      if (args.dailyLimit !== undefined) updates.dailyLimit = args.dailyLimit;
      if (args.monthlyLimit !== undefined) updates.monthlyLimit = args.monthlyLimit;
      if (args.maxRequest !== undefined) updates.maxRequest = args.maxRequest;
      if (args.isActive !== undefined) updates.isActive = args.isActive;

      await ctx.db.patch(existingLimit._id, updates);
      return { limitId: existingLimit._id };
    } else {
      // Create new limit
      const limitId = await ctx.db.insert("agentPolicyLimits", {
        workspaceId,
        apiKeyId: args.apiKeyId,
        chainId: args.chainId,
        tokenAddress: args.tokenAddress.toLowerCase(),
        dailyLimit: args.dailyLimit,
        monthlyLimit: args.monthlyLimit,
        maxRequest: args.maxRequest,
        isActive: args.isActive ?? true,
        createdAt: now,
        updatedAt: now,
      });

      return { limitId };
    }
  },
});

/**
 * Delete a per-chain/token limit
 */
export const deleteAgentPolicyLimit = mutation({
  args: {
    limitId: v.id("agentPolicyLimits"),
  },
  handler: async (ctx, args) => {
    const { workspaceId, role } = await getCurrentWorkspaceContext(ctx);
    requireRole(role, ADMIN_ROLES, "delete agent policy limits");

    const limit = await ctx.db.get(args.limitId);
    if (!limit || limit.workspaceId !== workspaceId) {
      throw new Error("Policy limit not found in this workspace");
    }

    await ctx.db.delete(args.limitId);
    return { success: true };
  },
});


