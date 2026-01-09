/**
 * MNEE Admin Functions
 * 
 * Admin-level operations for managing MNEE wallets for workspaces
 * NOTE: These functions are deprecated - use wallets.ts instead
 */

import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { getCurrentWorkspaceContext, requireRole, ADMIN_ROLES } from "./lib/auth";

// ============================================
// INTERNAL MUTATIONS (for admin scripts)
// ============================================

/**
 * Internal: Update wallet encrypted WIF (no auth required)
 * Used for re-encrypting wallets with a new key
 * @deprecated Use wallets.ts instead
 */
export const internalUpdateEncryptedWif = internalMutation({
  args: {
    walletId: v.id("wallets"),
    encryptedWif: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const wallet = await ctx.db.get(args.walletId);
    
    if (!wallet) {
      return { success: false, error: "Wallet not found" };
    }

    await ctx.db.patch(args.walletId, {
      encryptedWif: args.encryptedWif,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// ============================================
// QUERIES
// ============================================

/**
 * Get MNEE wallets for current workspace
 * @deprecated Use wallets.listWallets instead
 */
export const getWorkspaceMneeWallets = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("wallets"),
      address: v.string(),
      network: v.union(v.literal("sandbox"), v.literal("mainnet")),
      isActive: v.boolean(),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx) => {
    const { workspaceId, role } = await getCurrentWorkspaceContext(ctx);
    requireRole(role, ADMIN_ROLES, "view MNEE wallets");

    const wallets = await ctx.db
      .query("wallets")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", workspaceId))
      .collect();

    // Return wallet info without exposing encrypted WIF
    return wallets.map((w) => ({
      _id: w._id,
      address: w.address,
      network: w.network,
      isActive: w.isActive,
      createdAt: w.createdAt,
    }));
  },
});

/**
 * Get a specific MNEE wallet by address
 * @deprecated Use wallets.ts instead
 */
export const getMneeWalletByAddress = query({
  args: {
    address: v.string(),
  },
  returns: v.union(
    v.object({
      _id: v.id("wallets"),
      workspaceId: v.id("workspaces"),
      address: v.string(),
      network: v.union(v.literal("sandbox"), v.literal("mainnet")),
      isActive: v.boolean(),
      createdAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const { workspaceId, role } = await getCurrentWorkspaceContext(ctx);
    requireRole(role, ADMIN_ROLES, "view MNEE wallets");

    const wallet = await ctx.db
      .query("wallets")
      .withIndex("by_address", (q) => q.eq("address", args.address))
      .filter((q) => q.eq(q.field("workspaceId"), workspaceId))
      .first();

    if (!wallet) {
      return null;
    }

    // Return wallet info without exposing encrypted WIF
    return {
      _id: wallet._id,
      workspaceId: wallet.workspaceId,
      address: wallet.address,
      network: wallet.network,
      isActive: wallet.isActive,
      createdAt: wallet.createdAt,
    };
  },
});

// ============================================
// MUTATIONS
// ============================================

/**
 * Add a MNEE wallet to the workspace
 * @deprecated Use wallets.createWallet instead
 * 
 * NOTE: This mutation expects the WIF to already be encrypted.
 * The encryption should happen in the Next.js API route before calling this.
 * 
 * Workflow:
 * 1. User generates wallet using MNEE CLI: `mnee create`
 * 2. User exports WIF: `mnee export`
 * 3. Admin UI sends address + WIF to API route
 * 4. API route encrypts WIF using mnee-crypto.ts
 * 5. API route calls this mutation with encrypted WIF
 */
export const addMneeWalletToWorkspace = mutation({
  args: {
    address: v.string(),
    encryptedWif: v.string(),
    network: v.union(v.literal("sandbox"), v.literal("mainnet")),
  },
  returns: v.object({
    success: v.boolean(),
    walletId: v.optional(v.id("wallets")),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const { workspaceId, role } = await getCurrentWorkspaceContext(ctx);
    requireRole(role, ADMIN_ROLES, "add MNEE wallets");

    // Check if wallet already exists for this workspace/network
    const existing = await ctx.db
      .query("wallets")
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

    // Check if this address is already used by another workspace
    const addressInUse = await ctx.db
      .query("wallets")
      .withIndex("by_address", (q) => q.eq("address", args.address))
      .first();

    if (addressInUse) {
      return {
        success: false,
        error: "This address is already registered to another workspace",
      };
    }

    // Validate Bitcoin address format (basic check)
    const bitcoinAddressRegex = /^(1|3|bc1)[a-zA-Z0-9]{25,34}$/;
    if (!bitcoinAddressRegex.test(args.address)) {
      return {
        success: false,
        error: "Invalid Bitcoin address format",
      };
    }

    // Insert the wallet
    const now = Date.now();
    const walletId = await ctx.db.insert("wallets", {
      workspaceId,
      name: `Imported ${args.network} Wallet`,
      address: args.address,
      encryptedWif: args.encryptedWif,
      network: args.network,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    return {
      success: true,
      walletId,
    };
  },
});

/**
 * Update wallet encrypted WIF
 * Used when re-encrypting with a new key
 * @deprecated Use wallets.ts instead
 */
export const updateMneeWalletEncryptedWif = mutation({
  args: {
    walletId: v.id("wallets"),
    encryptedWif: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const { workspaceId, role } = await getCurrentWorkspaceContext(ctx);
    requireRole(role, ADMIN_ROLES, "update MNEE wallets");

    const wallet = await ctx.db.get(args.walletId);
    
    if (!wallet) {
      return {
        success: false,
        error: "Wallet not found",
      };
    }

    if (wallet.workspaceId !== workspaceId) {
      return {
        success: false,
        error: "Wallet does not belong to this workspace",
      };
    }

    await ctx.db.patch(args.walletId, {
      encryptedWif: args.encryptedWif,
      updatedAt: Date.now(),
    });

    return {
      success: true,
    };
  },
});

/**
 * Remove/deactivate a wallet from the workspace
 * @deprecated Use wallets.deleteWallet instead
 */
export const removeMneeWallet = mutation({
  args: {
    walletId: v.id("wallets"),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const { workspaceId, role } = await getCurrentWorkspaceContext(ctx);
    requireRole(role, ADMIN_ROLES, "remove MNEE wallets");

    const wallet = await ctx.db.get(args.walletId);
    
    if (!wallet) {
      return {
        success: false,
        error: "Wallet not found",
      };
    }

    if (wallet.workspaceId !== workspaceId) {
      return {
        success: false,
        error: "Wallet does not belong to this workspace",
      };
    }

    // Soft delete - deactivate instead of deleting
    await ctx.db.patch(args.walletId, {
      isActive: false,
      updatedAt: Date.now(),
    });

    return {
      success: true,
    };
  },
});


