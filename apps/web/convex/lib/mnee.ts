/**
 * MNEE Utilities
 * 
 * Helper functions for MNEE wallet management, encryption, and SDK integration
 * NOTE: These are deprecated - use wallets.ts for wallet operations
 */

import { v } from "convex/values";
import { internalQuery, internalMutation, query } from "../_generated/server";
import { getCurrentWorkspaceContext } from "./auth";

// ============================================
// TYPES
// ============================================

export interface MneeWalletInfo {
  address: string;
  wif: string; // Wallet Import Format (private key)
}

export interface MneeBalance {
  address: string;
  balance: number; // Balance in MNEE
  network: "sandbox" | "mainnet";
}

// ============================================
// WALLET QUERIES
// ============================================

/**
 * Get MNEE wallet for a workspace (internal)
 * @deprecated Use wallets table directly
 */
export const getMneeWallet = internalQuery({
  args: {
    workspaceId: v.id("workspaces"),
    network: v.union(v.literal("sandbox"), v.literal("mainnet")),
  },
  returns: v.union(
    v.object({
      _id: v.id("wallets"),
      _creationTime: v.number(),
      workspaceId: v.id("workspaces"),
      name: v.string(),
      address: v.string(),
      encryptedWif: v.string(),
      network: v.union(v.literal("sandbox"), v.literal("mainnet")),
      isActive: v.boolean(),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const wallet = await ctx.db
      .query("wallets")
      .withIndex("by_workspace_network", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("network", args.network)
      )
      .first();

    return wallet;
  },
});

// ============================================
// WALLET MUTATIONS
// ============================================

/**
 * Store a new MNEE wallet for a workspace
 * Called during workspace creation or when adding MNEE support
 * @deprecated Use wallets.internalCreateWallet instead
 */
export const storeMneeWallet = internalMutation({
  args: {
    workspaceId: v.id("workspaces"),
    address: v.string(),
    encryptedWif: v.string(),
    network: v.union(v.literal("sandbox"), v.literal("mainnet")),
  },
  returns: v.id("wallets"),
  handler: async (ctx, args) => {
    // Check if wallet already exists for this workspace/network
    const existing = await ctx.db
      .query("wallets")
      .withIndex("by_workspace_network", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("network", args.network)
      )
      .first();

    if (existing) {
      throw new Error(`MNEE wallet already exists for this workspace on ${args.network}`);
    }

    const now = Date.now();
    const walletId = await ctx.db.insert("wallets", {
      workspaceId: args.workspaceId,
      name: `Default ${args.network} Wallet`,
      address: args.address,
      encryptedWif: args.encryptedWif,
      network: args.network,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    return walletId;
  },
});

/**
 * Deactivate a MNEE wallet (soft delete)
 * @deprecated Use wallets.updateWallet instead
 */
export const deactivateMneeWallet = internalMutation({
  args: {
    walletId: v.id("wallets"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.walletId, {
      isActive: false,
      updatedAt: Date.now(),
    });
    return null;
  },
});

// ============================================
// PUBLIC QUERIES FOR UI
// ============================================

/**
 * Get the current workspace's MNEE wallet for a specific network
 * @deprecated Use wallets.listWallets instead
 */
export const getWorkspaceMneeWallet = query({
  args: {
    network: v.union(v.literal("sandbox"), v.literal("mainnet")),
  },
  handler: async (ctx, args) => {
    const { workspace } = await getCurrentWorkspaceContext(ctx);
    if (!workspace) {
      return null;
    }

    const wallet = await ctx.db
      .query("wallets")
      .withIndex("by_workspace_network", (q) =>
        q.eq("workspaceId", workspace._id).eq("network", args.network)
      )
      .first();

    return wallet;
  },
});

/**
 * List all MNEE wallets for the current workspace
 * @deprecated Use wallets.listWallets instead
 */
export const listWorkspaceMneeWallets = query({
  args: {},
  handler: async (ctx) => {
    const { workspace } = await getCurrentWorkspaceContext(ctx);
    if (!workspace) {
      return [];
    }

    const wallets = await ctx.db
      .query("wallets")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", workspace._id))
      .collect();

    return wallets;
  },
});

// ============================================
// NOTES ON ENCRYPTION AND SDK USAGE
// ============================================

/**
 * ENCRYPTION STRATEGY:
 * 
 * WIF (Wallet Import Format) keys are encrypted using AES-256-GCM with a master key
 * stored in environment variables. This happens in Next.js API routes, not in Convex.
 * 
 * Flow:
 * 1. Generate wallet using MNEE SDK (in API route)
 * 2. Encrypt WIF with master key (in API route)
 * 3. Store encrypted WIF in Convex (via internalMutation)
 * 4. When making payments:
 *    - Fetch encrypted WIF from Convex
 *    - Decrypt in API route
 *    - Use with MNEE SDK to sign transaction
 *    - Never expose decrypted WIF to client
 * 
 * MNEE SDK USAGE:
 * 
 * The MNEE SDK is used in Next.js API routes (not in Convex functions):
 * 
 * ```typescript
 * import Mnee from '@mnee/ts-sdk';
 * 
 * const mnee = new Mnee({
 *   environment: 'sandbox', // or 'production'
 *   apiKey: process.env.MNEE_API_KEY!,
 * });
 * 
 * // Get balance
 * const balance = await mnee.getBalance(address);
 * 
 * // Transfer
 * const result = await mnee.transfer([{
 *   address: recipientAddress,
 *   amount: 0.01, // MNEE amount (up to 5 decimals)
 * }], wif);
 * ```
 * 
 * Security considerations:
 * - WIF decryption happens server-side only
 * - MNEE_API_KEY never exposed to client
 * - MNEE_ENCRYPTION_KEY never exposed to client
 * - All MNEE SDK calls happen in API routes with proper error handling
 */

