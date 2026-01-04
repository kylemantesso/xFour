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
  args: {
    type: v.optional(v.union(v.literal("agent"), v.literal("provider"))),
  },
  handler: async (ctx, args) => {
    const { workspaceId, role } = await getCurrentWorkspaceContext(ctx);
    requireRole(role, ALL_ROLES, "view API keys");

    let query = ctx.db
      .query("apiKeys")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", workspaceId));

    const apiKeys = await query.collect();

    // Filter by type if specified
    const filteredKeys = args.type 
      ? apiKeys.filter(k => k.type === args.type)
      : apiKeys;

    // Don't return the full API key for security
    return filteredKeys.map((key) => ({
      _id: key._id,
      name: key.name,
      description: key.description,
      apiKeyPrefix: key.apiKeyPrefix,
      type: key.type,
      walletId: key.walletId,
      mneeNetwork: key.mneeNetwork,
      receivingAddress: key.receivingAddress,
      receivingNetwork: key.receivingNetwork,
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
    type: v.optional(v.union(v.literal("agent"), v.literal("provider"))), // Optional, defaults to "agent"
    // Wallet reference (preferred method)
    walletId: v.optional(v.id("wallets")),
    // For agent keys (legacy, use walletId instead)
    mneeNetwork: v.optional(v.union(v.literal("sandbox"), v.literal("mainnet"))),
    // For provider keys (legacy, use walletId instead)
    receivingAddress: v.optional(v.string()),
    receivingNetwork: v.optional(v.union(v.literal("sandbox"), v.literal("mainnet"))),
    expiresAt: v.optional(v.number()),
    // Policy/usage limits (optional, creates policy if any are provided)
    dailyLimit: v.optional(v.number()),
    monthlyLimit: v.optional(v.number()),
    maxRequest: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { workspaceId, role, clerkUserId } = await getCurrentWorkspaceContext(ctx);
    requireRole(role, WRITE_ROLES, "create API keys");

    // Default to "agent" type for backward compatibility
    const keyType = args.type ?? "agent";

    // If walletId is provided, validate it belongs to workspace
    if (args.walletId) {
      const wallet = await ctx.db.get(args.walletId);
      if (!wallet || wallet.workspaceId !== workspaceId) {
        throw new Error("Wallet not found in this workspace");
      }
      if (!wallet.isActive) {
        throw new Error("Cannot link to an inactive wallet");
      }
    } else {
      // Legacy validation for non-wallet keys
      if (keyType === "provider") {
        if (!args.receivingAddress) {
          throw new Error("Provider keys must have a wallet or receiving address");
        }
        if (!args.receivingNetwork) {
          throw new Error("Provider keys must specify a receiving network");
        }
      }
    }

    const now = Date.now();
    const { key, prefix } = generateApiKey();

    // Determine network from wallet if provided, otherwise use args or default to mainnet
    let network: "sandbox" | "mainnet" | undefined;
    if (args.walletId) {
      const wallet = await ctx.db.get(args.walletId);
      if (wallet) {
        network = wallet.network;
      }
    } else if (keyType === "agent") {
      network = args.mneeNetwork ?? "mainnet";
    } else if (keyType === "provider") {
      network = args.receivingNetwork;
    }

    const apiKeyId = await ctx.db.insert("apiKeys", {
      workspaceId,
      name: args.name,
      description: args.description,
      apiKey: key,
      apiKeyPrefix: prefix,
      type: keyType,
      walletId: args.walletId,
      mneeNetwork: keyType === "agent" ? network : undefined,
      receivingAddress: keyType === "provider" ? args.receivingAddress : undefined,
      receivingNetwork: keyType === "provider" ? network : undefined,
      createdByUserId: clerkUserId,
      expiresAt: args.expiresAt,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    // Create policy if any limits are provided
    if (args.dailyLimit !== undefined || args.monthlyLimit !== undefined || args.maxRequest !== undefined) {
      await ctx.db.insert("agentPolicies", {
        workspaceId,
        apiKeyId,
        dailyLimit: args.dailyLimit,
        monthlyLimit: args.monthlyLimit,
        maxRequest: args.maxRequest,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
    }

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
    // Wallet reference
    walletId: v.optional(v.union(v.id("wallets"), v.null())),
    // For agent keys (legacy)
    mneeNetwork: v.optional(v.union(v.literal("sandbox"), v.literal("mainnet"))),
    // For provider keys (legacy)
    receivingAddress: v.optional(v.string()),
    receivingNetwork: v.optional(v.union(v.literal("sandbox"), v.literal("mainnet"))),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { workspaceId, role } = await getCurrentWorkspaceContext(ctx);
    requireRole(role, ADMIN_ROLES, "update API keys");

    const apiKey = await ctx.db.get(args.apiKeyId);
    if (!apiKey || apiKey.workspaceId !== workspaceId) {
      throw new Error("API key not found in this workspace");
    }

    // If walletId is provided (and not null), validate it belongs to workspace
    if (args.walletId !== undefined && args.walletId !== null) {
      const wallet = await ctx.db.get(args.walletId);
      if (!wallet || wallet.workspaceId !== workspaceId) {
        throw new Error("Wallet not found in this workspace");
      }
      if (!wallet.isActive) {
        throw new Error("Cannot link to an inactive wallet");
      }
    }

    const updates: {
      name?: string;
      description?: string;
      walletId?: Id<"wallets"> | undefined;
      mneeNetwork?: "sandbox" | "mainnet";
      receivingAddress?: string;
      receivingNetwork?: "sandbox" | "mainnet";
      isActive?: boolean;
      updatedAt: number;
    } = { updatedAt: Date.now() };

    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.walletId !== undefined) {
      updates.walletId = args.walletId === null ? undefined : args.walletId;
    }
    if (args.mneeNetwork !== undefined && apiKey.type === "agent") {
      updates.mneeNetwork = args.mneeNetwork;
    }
    if (args.receivingAddress !== undefined && apiKey.type === "provider") {
      updates.receivingAddress = args.receivingAddress;
    }
    if (args.receivingNetwork !== undefined && apiKey.type === "provider") {
      updates.receivingNetwork = args.receivingNetwork;
    }
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
      mneeNetwork: keyRecord.mneeNetwork,
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

/**
 * Get the full API key (for viewing after creation)
 */
export const getApiKey = query({
  args: {
    apiKeyId: v.id("apiKeys"),
  },
  returns: v.object({
    apiKey: v.string(),
  }),
  handler: async (ctx, args) => {
    const { workspaceId, role } = await getCurrentWorkspaceContext(ctx);
    requireRole(role, ALL_ROLES, "view API keys");

    const apiKey = await ctx.db.get(args.apiKeyId);
    if (!apiKey || apiKey.workspaceId !== workspaceId) {
      throw new Error("API key not found in this workspace");
    }

    return {
      apiKey: apiKey.apiKey,
    };
  },
});

// ============================================
// AGENT POLICY MANAGEMENT (MNEE spending limits)
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
 * Create an agent policy with MNEE spending limits
 */
export const createAgentPolicy = mutation({
  args: {
    apiKeyId: v.id("apiKeys"),
    dailyLimit: v.optional(v.number()), // Daily spend limit in MNEE
    monthlyLimit: v.optional(v.number()), // Monthly spend limit in MNEE
    maxRequest: v.optional(v.number()), // Max per-request amount in MNEE
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
      dailyLimit: args.dailyLimit,
      monthlyLimit: args.monthlyLimit,
      maxRequest: args.maxRequest,
      allowedProviders: args.allowedProviders,
      isActive: args.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    });

    return { policyId };
  },
});

/**
 * Update an agent policy with MNEE spending limits
 */
export const updateAgentPolicy = mutation({
  args: {
    apiKeyId: v.id("apiKeys"),
    dailyLimit: v.optional(v.number()), // Daily spend limit in MNEE
    monthlyLimit: v.optional(v.number()), // Monthly spend limit in MNEE
    maxRequest: v.optional(v.number()), // Max per-request amount in MNEE
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
      dailyLimit?: number;
      monthlyLimit?: number;
      maxRequest?: number;
      allowedProviders?: Id<"providers">[];
      isActive?: boolean;
      updatedAt: number;
    } = { updatedAt: Date.now() };

    if (args.dailyLimit !== undefined) updates.dailyLimit = args.dailyLimit;
    if (args.monthlyLimit !== undefined) updates.monthlyLimit = args.monthlyLimit;
    if (args.maxRequest !== undefined) updates.maxRequest = args.maxRequest;
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

/**
 * Upsert (create or update) an agent policy
 * This simplifies frontend code by handling both cases
 */
export const upsertAgentPolicy = mutation({
  args: {
    apiKeyId: v.id("apiKeys"),
    dailyLimit: v.optional(v.number()), // Daily spend limit in MNEE
    monthlyLimit: v.optional(v.number()), // Monthly spend limit in MNEE
    maxRequest: v.optional(v.number()), // Max per-request amount in MNEE
    allowedProviders: v.optional(v.array(v.id("providers"))),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { workspaceId, role } = await getCurrentWorkspaceContext(ctx);
    requireRole(role, ADMIN_ROLES, "manage agent policies");

    const apiKey = await ctx.db.get(args.apiKeyId);
    if (!apiKey || apiKey.workspaceId !== workspaceId) {
      throw new Error("API key not found in this workspace");
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

    // Check if policy already exists
    const existingPolicy = await ctx.db
      .query("agentPolicies")
      .withIndex("by_apiKeyId", (q) => q.eq("apiKeyId", args.apiKeyId))
      .unique();

    const now = Date.now();

    if (existingPolicy) {
      // Update existing policy
      const updates: {
        dailyLimit?: number;
        monthlyLimit?: number;
        maxRequest?: number;
        allowedProviders?: Id<"providers">[];
        isActive?: boolean;
        updatedAt: number;
      } = { updatedAt: now };

      if (args.dailyLimit !== undefined) updates.dailyLimit = args.dailyLimit;
      if (args.monthlyLimit !== undefined) updates.monthlyLimit = args.monthlyLimit;
      if (args.maxRequest !== undefined) updates.maxRequest = args.maxRequest;
      if (args.allowedProviders !== undefined) updates.allowedProviders = args.allowedProviders;
      if (args.isActive !== undefined) updates.isActive = args.isActive;

      await ctx.db.patch(existingPolicy._id, updates);
      return { success: true, policyId: existingPolicy._id };
    } else {
      // Create new policy
      const policyId = await ctx.db.insert("agentPolicies", {
        workspaceId,
        apiKeyId: args.apiKeyId,
        dailyLimit: args.dailyLimit,
        monthlyLimit: args.monthlyLimit,
        maxRequest: args.maxRequest,
        allowedProviders: args.allowedProviders,
        isActive: args.isActive ?? true,
        createdAt: now,
        updatedAt: now,
      });
      return { success: true, policyId };
    }
  },
});
