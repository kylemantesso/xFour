import { v } from "convex/values";
import { query, mutation, internalQuery } from "./_generated/server";
import { requirePlatformAdmin } from "./lib/auth";

// ============================================
// MNEE NETWORK QUERIES
// ============================================

/**
 * List all active MNEE networks
 */
export const listNetworks = query({
  args: {
    includeSandbox: v.optional(v.boolean()),
  },
  returns: v.array(
    v.object({
      _id: v.id("mneeNetworks"),
      _creationTime: v.number(),
      network: v.union(v.literal("sandbox"), v.literal("mainnet")),
      name: v.string(),
      apiUrl: v.string(),
      explorerUrl: v.optional(v.string()),
      decimals: v.number(),
      isActive: v.boolean(),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    let networks = await ctx.db
      .query("mneeNetworks")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Filter out sandbox by default for production use
    if (!args.includeSandbox) {
      networks = networks.filter((n) => n.network !== "sandbox");
    }

    return networks;
  },
});

/**
 * Get a specific MNEE network
 */
export const getNetwork = query({
  args: {
    network: v.union(v.literal("sandbox"), v.literal("mainnet")),
  },
  returns: v.union(
    v.object({
      _id: v.id("mneeNetworks"),
      _creationTime: v.number(),
      network: v.union(v.literal("sandbox"), v.literal("mainnet")),
      name: v.string(),
      apiUrl: v.string(),
      explorerUrl: v.optional(v.string()),
      decimals: v.number(),
      isActive: v.boolean(),
      createdAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("mneeNetworks")
      .withIndex("by_network", (q) => q.eq("network", args.network))
      .first();
  },
});

/**
 * Internal query to get MNEE network (for HTTP actions)
 */
export const getNetworkInternal = internalQuery({
  args: {
    network: v.union(v.literal("sandbox"), v.literal("mainnet")),
  },
  returns: v.union(
    v.object({
      _id: v.id("mneeNetworks"),
      _creationTime: v.number(),
      network: v.union(v.literal("sandbox"), v.literal("mainnet")),
      name: v.string(),
      apiUrl: v.string(),
      explorerUrl: v.optional(v.string()),
      decimals: v.number(),
      isActive: v.boolean(),
      createdAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("mneeNetworks")
      .withIndex("by_network", (q) => q.eq("network", args.network))
      .first();
  },
});

// ============================================
// MNEE NETWORK MUTATIONS (Admin only)
// ============================================

/**
 * Seed default MNEE networks
 */
export const seedNetworks = mutation({
  args: {},
  returns: v.object({
    added: v.array(v.string()),
    message: v.string(),
  }),
  handler: async (ctx) => {
    const defaultNetworks = [
      {
        network: "mainnet" as const,
        name: "MNEE Mainnet",
        apiUrl: "https://api.mnee.io",
        explorerUrl: "https://whatsonchain.com",
        decimals: 5, // MNEE has 5 decimal places
        isActive: true,
      },
      {
        network: "sandbox" as const,
        name: "MNEE Sandbox",
        apiUrl: "https://api.mnee.io",
        explorerUrl: "https://test.whatsonchain.com",
        decimals: 5,
        isActive: true,
      },
    ];

    const added: Array<string> = [];

    for (const network of defaultNetworks) {
      const existing = await ctx.db
        .query("mneeNetworks")
        .withIndex("by_network", (q) => q.eq("network", network.network))
        .first();

      if (!existing) {
        await ctx.db.insert("mneeNetworks", {
          ...network,
          createdAt: Date.now(),
        });
        added.push(network.name);
      }
    }

    return {
      added,
      message: added.length > 0 ? `Added networks: ${added.join(", ")}` : "No new networks added",
    };
  },
});

/**
 * Update MNEE network configuration (platform admin only)
 */
export const updateNetwork = mutation({
  args: {
    network: v.union(v.literal("sandbox"), v.literal("mainnet")),
    name: v.optional(v.string()),
    apiUrl: v.optional(v.string()),
    explorerUrl: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  returns: v.object({
    success: v.boolean(),
  }),
  handler: async (ctx, args) => {
    await requirePlatformAdmin(ctx);

    const networkDoc = await ctx.db
      .query("mneeNetworks")
      .withIndex("by_network", (q) => q.eq("network", args.network))
      .first();

    if (!networkDoc) {
      throw new Error(`MNEE network "${args.network}" not found`);
    }

    const updates: Record<string, unknown> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.apiUrl !== undefined) updates.apiUrl = args.apiUrl;
    if (args.explorerUrl !== undefined) updates.explorerUrl = args.explorerUrl;
    if (args.isActive !== undefined) updates.isActive = args.isActive;

    await ctx.db.patch(networkDoc._id, updates);
    return { success: true };
  },
});

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get MNEE explorer URL for a transaction
 */
export function getMneeExplorerUrl(txHash: string, network: "sandbox" | "mainnet"): string {
  const baseUrl = network === "mainnet" 
    ? "https://whatsonchain.com/tx" 
    : "https://test.whatsonchain.com/tx";
  
  return `${baseUrl}/${txHash}`;
}

/**
 * Format MNEE amount (ensures max 5 decimal places)
 */
export function formatMneeAmount(amount: number): number {
  return Math.round(amount * 100000) / 100000;
}



