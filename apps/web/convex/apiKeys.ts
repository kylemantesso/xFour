import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
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


