import { v } from "convex/values";
import { query, mutation, internalQuery } from "./_generated/server";
import {
  getCurrentWorkspaceContext,
  requireRole,
  ADMIN_ROLES,
  WRITE_ROLES,
  ALL_ROLES,
  generateApiKey,
} from "./lib/auth";

// ============================================
// INTERNAL QUERIES (for other Convex modules)
// ============================================

/**
 * Get API key by ID (internal use only)
 */
export const getApiKeyInternal = internalQuery({
  args: {
    apiKeyId: v.id("apiKeys"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.apiKeyId);
  },
});

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

    const query = ctx.db
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
      apiKeyHash: key.apiKeyHash,
      type: key.type,
      treasuryId: key.treasuryId,
      ethereumNetwork: key.ethereumNetwork,
      receivingAddress: key.receivingAddress,
      receivingNetwork: key.receivingNetwork,
      spendingLimits: key.spendingLimits,
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
    type: v.optional(v.union(v.literal("agent"), v.literal("provider"))),
    // Treasury reference (for agent keys)
    treasuryId: v.optional(v.id("treasuries")),
    // For agent keys: network preference
    ethereumNetwork: v.optional(v.union(v.literal("sepolia"), v.literal("mainnet"))),
    // For provider keys: receiving address
    receivingAddress: v.optional(v.string()),
    receivingNetwork: v.optional(v.union(v.literal("sepolia"), v.literal("mainnet"))),
    expiresAt: v.optional(v.number()),
    // Spending limits (synced to treasury contract)
    spendingLimits: v.optional(v.object({
      maxPerTransaction: v.number(),
      dailyLimit: v.number(),
      monthlyLimit: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    const { workspaceId, role, clerkUserId } = await getCurrentWorkspaceContext(ctx);
    requireRole(role, WRITE_ROLES, "create API keys");

    // Default to "agent" type for backward compatibility
    const keyType = args.type ?? "agent";

    // If treasuryId is provided, validate it belongs to workspace
    if (args.treasuryId) {
      const treasury = await ctx.db.get(args.treasuryId);
      if (!treasury || treasury.workspaceId !== workspaceId) {
        throw new Error("Treasury not found in this workspace");
      }
      if (treasury.status !== "active") {
        throw new Error("Cannot link to an inactive treasury");
      }
    }

    // Validation for provider keys
    if (keyType === "provider") {
      if (!args.receivingAddress) {
        throw new Error("Provider keys must have a receiving address");
      }
      if (!args.receivingNetwork) {
        throw new Error("Provider keys must specify a receiving network");
      }
    }

    const now = Date.now();
    const { key, prefix } = generateApiKey();

    // Create keccak256 hash of API key for on-chain matching
    // Note: This should match the hashApiKey function in the treasury module
    const apiKeyHash = `keccak256:${key}`; // Placeholder - actual hash done on-chain

    // Determine network from treasury if provided
    let network: "sepolia" | "mainnet" | undefined;
    if (args.treasuryId) {
      const treasury = await ctx.db.get(args.treasuryId);
      if (treasury) {
        network = treasury.network;
      }
    } else if (keyType === "agent") {
      network = args.ethereumNetwork ?? "sepolia"; // Default to testnet
    } else if (keyType === "provider") {
      network = args.receivingNetwork;
    }

    const apiKeyId = await ctx.db.insert("apiKeys", {
      workspaceId,
      name: args.name,
      description: args.description,
      apiKey: key,
      apiKeyPrefix: prefix,
      apiKeyHash,
      type: keyType,
      treasuryId: args.treasuryId,
      ethereumNetwork: keyType === "agent" ? network : undefined,
      receivingAddress: keyType === "provider" ? args.receivingAddress : undefined,
      receivingNetwork: keyType === "provider" ? network : undefined,
      spendingLimits: args.spendingLimits ? {
        ...args.spendingLimits,
        isSyncedOnChain: false, // Will be synced when user configures on-chain
      } : undefined,
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
    // Treasury reference
    treasuryId: v.optional(v.union(v.id("treasuries"), v.null())),
    // For agent keys
    ethereumNetwork: v.optional(v.union(v.literal("sepolia"), v.literal("mainnet"))),
    // For provider keys
    receivingAddress: v.optional(v.string()),
    receivingNetwork: v.optional(v.union(v.literal("sepolia"), v.literal("mainnet"))),
    // Spending limits
    spendingLimits: v.optional(v.object({
      maxPerTransaction: v.number(),
      dailyLimit: v.number(),
      monthlyLimit: v.number(),
    })),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { workspaceId, role } = await getCurrentWorkspaceContext(ctx);
    requireRole(role, ADMIN_ROLES, "update API keys");

    const apiKey = await ctx.db.get(args.apiKeyId);
    if (!apiKey || apiKey.workspaceId !== workspaceId) {
      throw new Error("API key not found in this workspace");
    }

    // If treasuryId is provided (and not null), validate it belongs to workspace
    if (args.treasuryId !== undefined && args.treasuryId !== null) {
      const treasury = await ctx.db.get(args.treasuryId);
      if (!treasury || treasury.workspaceId !== workspaceId) {
        throw new Error("Treasury not found in this workspace");
      }
      if (treasury.status !== "active") {
        throw new Error("Cannot link to an inactive treasury");
      }
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() };

    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.treasuryId !== undefined) {
      updates.treasuryId = args.treasuryId === null ? undefined : args.treasuryId;
    }
    if (args.ethereumNetwork !== undefined && apiKey.type === "agent") {
      updates.ethereumNetwork = args.ethereumNetwork;
    }
    if (args.receivingAddress !== undefined && apiKey.type === "provider") {
      updates.receivingAddress = args.receivingAddress;
    }
    if (args.receivingNetwork !== undefined && apiKey.type === "provider") {
      updates.receivingNetwork = args.receivingNetwork;
    }
    if (args.spendingLimits !== undefined) {
      updates.spendingLimits = {
        ...args.spendingLimits,
        isSyncedOnChain: false, // Mark as needing sync
      };
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
    const apiKeyHash = `keccak256:${key}`; // Placeholder - actual hash done on-chain

    await ctx.db.patch(args.apiKeyId, {
      apiKey: key,
      apiKeyPrefix: prefix,
      apiKeyHash,
      spendingLimits: apiKey.spendingLimits ? {
        ...apiKey.spendingLimits,
        isSyncedOnChain: false, // New key needs sync
      } : undefined,
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

    // Get treasury if linked
    let treasuryAddress: string | undefined;
    if (keyRecord.treasuryId) {
      const treasury = await ctx.db.get(keyRecord.treasuryId);
      if (treasury && treasury.status === "active") {
        treasuryAddress = treasury.contractAddress;
      }
    }

    return {
      valid: true,
      apiKeyId: keyRecord._id,
      workspaceId: keyRecord.workspaceId,
      workspaceName: workspace.name,
      ethereumNetwork: keyRecord.ethereumNetwork,
      treasuryId: keyRecord.treasuryId,
      treasuryAddress,
      apiKeyHash: keyRecord.apiKeyHash,
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

/**
 * Mark spending limits as synced on-chain
 */
export const markSpendingLimitsSynced = mutation({
  args: {
    apiKeyId: v.id("apiKeys"),
  },
  handler: async (ctx, args) => {
    const { workspaceId, role } = await getCurrentWorkspaceContext(ctx);
    requireRole(role, ADMIN_ROLES, "manage API keys");

    const apiKey = await ctx.db.get(args.apiKeyId);
    if (!apiKey || apiKey.workspaceId !== workspaceId) {
      throw new Error("API key not found in this workspace");
    }

    if (apiKey.spendingLimits) {
      await ctx.db.patch(args.apiKeyId, {
        spendingLimits: {
          ...apiKey.spendingLimits,
          isSyncedOnChain: true,
          lastSyncedAt: Date.now(),
        },
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});
