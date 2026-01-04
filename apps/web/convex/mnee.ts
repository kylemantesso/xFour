/**
 * MNEE Public Queries and Mutations
 * 
 * Public-facing Convex queries and mutations for MNEE wallet information
 */

import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { getCurrentWorkspaceContext, requireRole, ADMIN_ROLES } from "./lib/auth";

/**
 * Get MNEE wallet info for the current workspace (public)
 * Returns address and network only (no private keys)
 */
export const getWorkspaceMneeWallet = query({
  args: {
    network: v.optional(v.union(v.literal("sandbox"), v.literal("mainnet"))),
  },
  returns: v.union(
    v.object({
      _id: v.id("mneeWallets"),
      address: v.string(),
      network: v.union(v.literal("sandbox"), v.literal("mainnet")),
      isActive: v.boolean(),
      createdAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    try {
      const { workspace } = await getCurrentWorkspaceContext(ctx);

      const network = args.network || "sandbox";

      const wallet = await ctx.db
        .query("mneeWallets")
        .withIndex("by_workspace_network", (q) =>
          q.eq("workspaceId", workspace._id).eq("network", network)
        )
        .first();

      if (!wallet) {
        return null;
      }

      // Return only public information (no encrypted WIF)
      return {
        _id: wallet._id,
        address: wallet.address,
        network: wallet.network,
        isActive: wallet.isActive,
        createdAt: wallet.createdAt,
      };
    } catch {
      // User not authenticated or no workspace
      return null;
    }
  },
});

/**
 * Get all MNEE wallets for the current workspace
 */
export const listWorkspaceMneeWallets = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("mneeWallets"),
      address: v.string(),
      network: v.union(v.literal("sandbox"), v.literal("mainnet")),
      isActive: v.boolean(),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx) => {
    try {
      const { workspace } = await getCurrentWorkspaceContext(ctx);

      const wallets = await ctx.db
        .query("mneeWallets")
        .withIndex("by_workspaceId", (q) => q.eq("workspaceId", workspace._id))
        .collect();

      // Return only public information
      return wallets.map((w) => ({
        _id: w._id,
        address: w.address,
        network: w.network,
        isActive: w.isActive,
        createdAt: w.createdAt,
      }));
    } catch {
      return [];
    }
  },
});

/**
 * Create a new MNEE wallet for the current workspace
 * Triggers wallet generation through internal action
 */
export const createMneeWallet = mutation({
  args: {
    network: v.union(v.literal("sandbox"), v.literal("mainnet")),
  },
  returns: v.object({
    success: v.boolean(),
    address: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const { workspaceId, role } = await getCurrentWorkspaceContext(ctx);
    requireRole(role, ADMIN_ROLES, "create MNEE wallets");

    // Check if wallet already exists for this workspace/network
    const existing = await ctx.db
      .query("mneeWallets")
      .withIndex("by_workspace_network", (q) =>
        q.eq("workspaceId", workspaceId).eq("network", args.network)
      )
      .first();

    if (existing) {
      return {
        success: false,
        error: `A ${args.network} MNEE wallet already exists for this workspace`,
      };
    }

    // Schedule the wallet creation action
    // The action will create the wallet and store it in the database
    await ctx.scheduler.runAfter(0, internal.mneeActions.createWalletForWorkspace, {
      workspaceId,
      network: args.network,
    });

    return {
      success: true,
      // Note: address will be available after the action completes
      // The frontend should poll/subscribe to see the new wallet
    };
  },
});
