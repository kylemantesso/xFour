import { v } from "convex/values";
import { query, mutation, internalMutation, internalQuery } from "./_generated/server";

/**
 * Treasury Management
 * 
 * Convex functions for managing non-custodial treasury contracts.
 * The actual treasury contracts are on-chain; this tracks state off-chain.
 */

// ============================================
// INTERNAL QUERIES (for other Convex modules)
// ============================================

/**
 * Get treasury for a workspace on a specific network (internal use)
 */
export const getTreasuryInternal = internalQuery({
  args: {
    workspaceId: v.id("workspaces"),
    network: v.union(v.literal("sepolia"), v.literal("mainnet")),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("treasuries")
      .withIndex("by_workspace_network", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("network", args.network)
      )
      .unique();
  },
});

// ============================================
// QUERIES
// ============================================

/**
 * Get treasury for a workspace on a specific network
 */
export const getTreasury = query({
  args: {
    workspaceId: v.id("workspaces"),
    network: v.union(v.literal("sepolia"), v.literal("mainnet")),
  },
  returns: v.union(
    v.object({
      _id: v.id("treasuries"),
      _creationTime: v.number(),
      workspaceId: v.id("workspaces"),
      network: v.union(v.literal("sepolia"), v.literal("mainnet")),
      contractAddress: v.string(),
      adminAddresses: v.array(v.string()),
      status: v.union(
        v.literal("pending"),
        v.literal("active"),
        v.literal("paused"),
        v.literal("disabled")
      ),
      cachedBalance: v.optional(v.number()),
      lastSyncedAt: v.optional(v.number()),
      txHash: v.optional(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const treasury = await ctx.db
      .query("treasuries")
      .withIndex("by_workspace_network", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("network", args.network)
      )
      .unique();

    return treasury;
  },
});

/**
 * Get treasury by ID
 */
export const getTreasuryById = query({
  args: {
    treasuryId: v.id("treasuries"),
  },
  returns: v.union(
    v.object({
      _id: v.id("treasuries"),
      _creationTime: v.number(),
      workspaceId: v.id("workspaces"),
      network: v.union(v.literal("sepolia"), v.literal("mainnet")),
      contractAddress: v.string(),
      adminAddresses: v.array(v.string()),
      status: v.union(
        v.literal("pending"),
        v.literal("active"),
        v.literal("paused"),
        v.literal("disabled")
      ),
      cachedBalance: v.optional(v.number()),
      lastSyncedAt: v.optional(v.number()),
      txHash: v.optional(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.treasuryId);
  },
});

/**
 * List all treasuries for a workspace
 */
export const listTreasuries = query({
  args: {
    workspaceId: v.id("workspaces"),
  },
  returns: v.array(
    v.object({
      _id: v.id("treasuries"),
      _creationTime: v.number(),
      workspaceId: v.id("workspaces"),
      network: v.union(v.literal("sepolia"), v.literal("mainnet")),
      contractAddress: v.string(),
      adminAddresses: v.array(v.string()),
      status: v.union(
        v.literal("pending"),
        v.literal("active"),
        v.literal("paused"),
        v.literal("disabled")
      ),
      cachedBalance: v.optional(v.number()),
      lastSyncedAt: v.optional(v.number()),
      txHash: v.optional(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const treasuries = await ctx.db
      .query("treasuries")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();

    return treasuries;
  },
});

/**
 * Get treasury by contract address
 */
export const getTreasuryByAddress = query({
  args: {
    contractAddress: v.string(),
  },
  returns: v.union(
    v.object({
      _id: v.id("treasuries"),
      _creationTime: v.number(),
      workspaceId: v.id("workspaces"),
      network: v.union(v.literal("sepolia"), v.literal("mainnet")),
      contractAddress: v.string(),
      adminAddresses: v.array(v.string()),
      status: v.union(
        v.literal("pending"),
        v.literal("active"),
        v.literal("paused"),
        v.literal("disabled")
      ),
      cachedBalance: v.optional(v.number()),
      lastSyncedAt: v.optional(v.number()),
      txHash: v.optional(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const treasury = await ctx.db
      .query("treasuries")
      .withIndex("by_contractAddress", (q) =>
        q.eq("contractAddress", args.contractAddress.toLowerCase())
      )
      .unique();

    return treasury;
  },
});

// ============================================
// MUTATIONS
// ============================================

/**
 * Create a treasury record (called after on-chain deployment)
 */
export const createTreasury = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    network: v.union(v.literal("sepolia"), v.literal("mainnet")),
    contractAddress: v.string(),
    adminAddress: v.string(),
    txHash: v.string(),
  },
  returns: v.id("treasuries"),
  handler: async (ctx, args) => {
    // Verify user has access to workspace
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    // Check workspace exists and user has permission
    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace) {
      throw new Error("Workspace not found");
    }

    // Check if treasury already exists for this network
    const existing = await ctx.db
      .query("treasuries")
      .withIndex("by_workspace_network", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("network", args.network)
      )
      .unique();

    if (existing) {
      throw new Error(`Treasury already exists for ${args.network}`);
    }

    const now = Date.now();
    const treasuryId = await ctx.db.insert("treasuries", {
      workspaceId: args.workspaceId,
      network: args.network,
      contractAddress: args.contractAddress.toLowerCase(),
      adminAddresses: [args.adminAddress.toLowerCase()],
      status: "active",
      txHash: args.txHash,
      createdAt: now,
      updatedAt: now,
    });

    return treasuryId;
  },
});

/**
 * Update treasury cached balance
 */
export const updateTreasuryBalance = mutation({
  args: {
    treasuryId: v.id("treasuries"),
    balance: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.treasuryId, {
      cachedBalance: args.balance,
      lastSyncedAt: Date.now(),
      updatedAt: Date.now(),
    });
    return null;
  },
});

/**
 * Update treasury status
 */
export const updateTreasuryStatus = mutation({
  args: {
    treasuryId: v.id("treasuries"),
    status: v.union(
      v.literal("pending"),
      v.literal("active"),
      v.literal("paused"),
      v.literal("disabled")
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(args.treasuryId, {
      status: args.status,
      updatedAt: Date.now(),
    });
    return null;
  },
});

/**
 * Add admin address to treasury
 */
export const addTreasuryAdmin = mutation({
  args: {
    treasuryId: v.id("treasuries"),
    adminAddress: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const treasury = await ctx.db.get(args.treasuryId);
    if (!treasury) {
      throw new Error("Treasury not found");
    }

    const normalizedAddress = args.adminAddress.toLowerCase();
    if (treasury.adminAddresses.includes(normalizedAddress)) {
      throw new Error("Address is already an admin");
    }

    await ctx.db.patch(args.treasuryId, {
      adminAddresses: [...treasury.adminAddresses, normalizedAddress],
      updatedAt: Date.now(),
    });
    return null;
  },
});

/**
 * Remove admin address from treasury
 */
export const removeTreasuryAdmin = mutation({
  args: {
    treasuryId: v.id("treasuries"),
    adminAddress: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const treasury = await ctx.db.get(args.treasuryId);
    if (!treasury) {
      throw new Error("Treasury not found");
    }

    const normalizedAddress = args.adminAddress.toLowerCase();
    const newAdmins = treasury.adminAddresses.filter(
      (addr) => addr !== normalizedAddress
    );

    if (newAdmins.length === 0) {
      throw new Error("Cannot remove the last admin");
    }

    await ctx.db.patch(args.treasuryId, {
      adminAddresses: newAdmins,
      updatedAt: Date.now(),
    });
    return null;
  },
});

// ============================================
// INTERNAL MUTATIONS
// ============================================

/**
 * Internal: Create treasury (for system use)
 */
export const internalCreateTreasury = internalMutation({
  args: {
    workspaceId: v.id("workspaces"),
    network: v.union(v.literal("sepolia"), v.literal("mainnet")),
    contractAddress: v.string(),
    adminAddress: v.string(),
    txHash: v.optional(v.string()),
  },
  returns: v.id("treasuries"),
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("treasuries", {
      workspaceId: args.workspaceId,
      network: args.network,
      contractAddress: args.contractAddress.toLowerCase(),
      adminAddresses: [args.adminAddress.toLowerCase()],
      status: "active",
      txHash: args.txHash,
      createdAt: now,
      updatedAt: now,
    });
  },
});
