/**
 * Test function to manually create MNEE wallet for a workspace
 * Run this to debug wallet creation issues
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

/**
 * List all workspaces (for testing)
 */
export const listAllWorkspaces = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("workspaces"),
      name: v.string(),
      slug: v.union(v.string(), v.null()),
    })
  ),
  handler: async (ctx) => {
    const workspaces = await ctx.db.query("workspaces").collect();
    return workspaces.map((w) => ({
      _id: w._id,
      name: w.name,
      slug: w.slug || null,
    }));
  },
});

/**
 * Check if workspace has MNEE wallet
 */
export const checkMneeWallet = query({
  args: {
    workspaceId: v.id("workspaces"),
  },
  returns: v.union(
    v.object({
      address: v.string(),
      network: v.string(),
      createdAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const wallet = await ctx.db
      .query("mneeWallets")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", args.workspaceId))
      .first();

    if (!wallet) return null;

    return {
      address: wallet.address,
      network: wallet.network,
      createdAt: wallet.createdAt,
    };
  },
});

/**
 * Manually trigger MNEE wallet creation for a workspace
 */
export const createWalletManually = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    network: v.optional(v.union(v.literal("sandbox"), v.literal("mainnet"))),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    const network = args.network || "sandbox";

    // Check if wallet already exists
    const existing = await ctx.db
      .query("mneeWallets")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", args.workspaceId))
      .filter((q) => q.eq(q.field("network"), network))
      .first();

    if (existing) {
      return {
        success: false,
        message: `Wallet already exists: ${existing.address}`,
      };
    }

    // Schedule the wallet creation action (runs immediately)
    await ctx.scheduler.runAfter(0, internal.mneeActions.createWalletForWorkspace, {
      workspaceId: args.workspaceId,
      network,
    });

    return {
      success: true,
      message: "Wallet creation scheduled (runs immediately)",
    };
  },
});

