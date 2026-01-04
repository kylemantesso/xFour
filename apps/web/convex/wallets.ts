import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import {
  getCurrentWorkspaceContext,
  requireRole,
  ADMIN_ROLES,
  WRITE_ROLES,
  ALL_ROLES,
} from "./lib/auth";

/**
 * List all wallets for the current workspace
 */
export const listWallets = query({
  args: {
    network: v.optional(v.union(v.literal("sandbox"), v.literal("mainnet"))),
  },
  returns: v.array(
    v.object({
      _id: v.id("wallets"),
      name: v.string(),
      address: v.string(),
      network: v.union(v.literal("sandbox"), v.literal("mainnet")),
      isActive: v.boolean(),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const { workspaceId, role } = await getCurrentWorkspaceContext(ctx);
    requireRole(role, ALL_ROLES, "view wallets");

    const wallets = await ctx.db
      .query("wallets")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", workspaceId))
      .collect();

    // Filter by network if specified
    const filteredWallets = args.network
      ? wallets.filter((w) => w.network === args.network)
      : wallets;

    // Return wallet info without the encrypted WIF
    return filteredWallets.map((wallet) => ({
      _id: wallet._id,
      name: wallet.name,
      address: wallet.address,
      network: wallet.network,
      isActive: wallet.isActive,
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt,
    }));
  },
});

/**
 * Get a specific wallet by ID
 */
export const getWallet = query({
  args: {
    walletId: v.id("wallets"),
  },
  returns: v.union(
    v.object({
      _id: v.id("wallets"),
      name: v.string(),
      address: v.string(),
      network: v.union(v.literal("sandbox"), v.literal("mainnet")),
      isActive: v.boolean(),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const { workspaceId, role } = await getCurrentWorkspaceContext(ctx);
    requireRole(role, ALL_ROLES, "view wallets");

    const wallet = await ctx.db.get(args.walletId);
    if (!wallet || wallet.workspaceId !== workspaceId) {
      return null;
    }

    return {
      _id: wallet._id,
      name: wallet.name,
      address: wallet.address,
      network: wallet.network,
      isActive: wallet.isActive,
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt,
    };
  },
});

/**
 * Create a new wallet (manual - for advanced users)
 */
export const createWallet = mutation({
  args: {
    name: v.string(),
    address: v.string(),
    encryptedWif: v.string(),
    network: v.union(v.literal("sandbox"), v.literal("mainnet")),
  },
  returns: v.object({
    walletId: v.id("wallets"),
  }),
  handler: async (ctx, args) => {
    const { workspaceId, role } = await getCurrentWorkspaceContext(ctx);
    requireRole(role, WRITE_ROLES, "create wallets");

    // Check if wallet with this address already exists in workspace
    const existingWallet = await ctx.db
      .query("wallets")
      .withIndex("by_address", (q) => q.eq("address", args.address))
      .first();

    if (existingWallet && existingWallet.workspaceId === workspaceId) {
      throw new Error("A wallet with this address already exists in your workspace");
    }

    const now = Date.now();
    const walletId = await ctx.db.insert("wallets", {
      workspaceId,
      name: args.name,
      address: args.address,
      encryptedWif: args.encryptedWif,
      network: args.network,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    return { walletId };
  },
});

/**
 * Generate a new wallet automatically
 * Triggers wallet generation action that uses MNEE SDK
 */
export const generateWallet = mutation({
  args: {
    name: v.string(),
    network: v.union(v.literal("sandbox"), v.literal("mainnet")),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    const { workspaceId, role } = await getCurrentWorkspaceContext(ctx);
    requireRole(role, WRITE_ROLES, "create wallets");

    // Schedule the wallet generation action
    await ctx.scheduler.runAfter(0, internal.mneeActions.generateAndStoreWallet, {
      workspaceId,
      name: args.name,
      network: args.network,
    });

    return {
      success: true,
      message: "Wallet generation started. This may take a few seconds...",
    };
  },
});

/**
 * Update an existing wallet
 */
export const updateWallet = mutation({
  args: {
    walletId: v.id("wallets"),
    name: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  returns: v.object({
    success: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const { workspaceId, role } = await getCurrentWorkspaceContext(ctx);
    requireRole(role, ADMIN_ROLES, "update wallets");

    const wallet = await ctx.db.get(args.walletId);
    if (!wallet || wallet.workspaceId !== workspaceId) {
      throw new Error("Wallet not found in this workspace");
    }

    const updates: {
      name?: string;
      isActive?: boolean;
      updatedAt: number;
    } = { updatedAt: Date.now() };

    if (args.name !== undefined) updates.name = args.name;
    if (args.isActive !== undefined) updates.isActive = args.isActive;

    await ctx.db.patch(args.walletId, updates);
    return { success: true };
  },
});

/**
 * Delete a wallet (only if not in use by any API keys)
 */
export const deleteWallet = mutation({
  args: {
    walletId: v.id("wallets"),
  },
  returns: v.object({
    success: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const { workspaceId, role } = await getCurrentWorkspaceContext(ctx);
    requireRole(role, ADMIN_ROLES, "delete wallets");

    const wallet = await ctx.db.get(args.walletId);
    if (!wallet || wallet.workspaceId !== workspaceId) {
      throw new Error("Wallet not found in this workspace");
    }

    // Check if any API keys are using this wallet
    const apiKeysUsingWallet = await ctx.db
      .query("apiKeys")
      .withIndex("by_walletId", (q) => q.eq("walletId", args.walletId))
      .collect();

    if (apiKeysUsingWallet.length > 0) {
      throw new Error(
        `Cannot delete wallet: it is currently linked to ${apiKeysUsingWallet.length} API key(s). Please unlink or delete those keys first.`
      );
    }

    await ctx.db.delete(args.walletId);
    return { success: true };
  },
});

/**
 * Get API keys linked to a wallet
 */
export const getWalletApiKeys = query({
  args: {
    walletId: v.id("wallets"),
  },
  returns: v.array(
    v.object({
      _id: v.id("apiKeys"),
      name: v.string(),
      type: v.union(v.literal("agent"), v.literal("provider")),
      apiKeyPrefix: v.string(),
      isActive: v.boolean(),
    })
  ),
  handler: async (ctx, args) => {
    const { workspaceId, role } = await getCurrentWorkspaceContext(ctx);
    requireRole(role, ALL_ROLES, "view wallet details");

    const wallet = await ctx.db.get(args.walletId);
    if (!wallet || wallet.workspaceId !== workspaceId) {
      throw new Error("Wallet not found in this workspace");
    }

    const apiKeys = await ctx.db
      .query("apiKeys")
      .withIndex("by_walletId", (q) => q.eq("walletId", args.walletId))
      .collect();

    return apiKeys.map((key) => ({
      _id: key._id,
      name: key.name,
      type: key.type,
      apiKeyPrefix: key.apiKeyPrefix,
      isActive: key.isActive,
    }));
  },
});

/**
 * Internal mutation to create a wallet (called by action)
 */
export const internalCreateWallet = internalMutation({
  args: {
    workspaceId: v.id("workspaces"),
    name: v.string(),
    address: v.string(),
    encryptedWif: v.string(),
    network: v.union(v.literal("sandbox"), v.literal("mainnet")),
    createdAt: v.number(),
    updatedAt: v.number(),
  },
  returns: v.id("wallets"),
  handler: async (ctx, args) => {
    const walletId = await ctx.db.insert("wallets", {
      workspaceId: args.workspaceId,
      name: args.name,
      address: args.address,
      encryptedWif: args.encryptedWif,
      network: args.network,
      isActive: true,
      createdAt: args.createdAt,
      updatedAt: args.updatedAt,
    });

    return walletId;
  },
});

