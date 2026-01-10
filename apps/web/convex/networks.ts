import { v } from "convex/values";
import { query, mutation, internalQuery } from "./_generated/server";
import { requirePlatformAdmin } from "./lib/auth";

// ============================================
// NETWORK QUERIES (Ethereum-based)
// ============================================

/**
 * List all active networks
 */
export const listNetworks = query({
  args: {
    includeTestnet: v.optional(v.boolean()),
    includeSepolia: v.optional(v.boolean()), // Alias for includeTestnet
  },
  returns: v.array(
    v.object({
      _id: v.id("networks"),
      _creationTime: v.number(),
      network: v.union(v.literal("sepolia"), v.literal("mainnet")),
      name: v.string(),
      rpcUrl: v.string(),
      explorerUrl: v.optional(v.string()),
      contractAddress: v.string(),
      chainId: v.number(),
      decimals: v.number(),
      isActive: v.boolean(),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    let networks = await ctx.db
      .query("networks")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Filter out testnet by default for production use
    if (!args.includeTestnet && !args.includeSepolia) {
      networks = networks.filter((n) => n.network !== "sepolia");
    }

    return networks;
  },
});

/**
 * Get a specific network
 */
export const getNetwork = query({
  args: {
    network: v.union(v.literal("sepolia"), v.literal("mainnet")),
  },
  returns: v.union(
    v.object({
      _id: v.id("networks"),
      _creationTime: v.number(),
      network: v.union(v.literal("sepolia"), v.literal("mainnet")),
      name: v.string(),
      rpcUrl: v.string(),
      explorerUrl: v.optional(v.string()),
      contractAddress: v.string(),
      chainId: v.number(),
      decimals: v.number(),
      isActive: v.boolean(),
      createdAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("networks")
      .withIndex("by_network", (q) => q.eq("network", args.network))
      .first();
  },
});

/**
 * Internal query to get network (for HTTP actions)
 */
export const getNetworkInternal = internalQuery({
  args: {
    network: v.union(v.literal("sepolia"), v.literal("mainnet")),
  },
  returns: v.union(
    v.object({
      _id: v.id("networks"),
      _creationTime: v.number(),
      network: v.union(v.literal("sepolia"), v.literal("mainnet")),
      name: v.string(),
      rpcUrl: v.string(),
      explorerUrl: v.optional(v.string()),
      contractAddress: v.string(),
      chainId: v.number(),
      decimals: v.number(),
      isActive: v.boolean(),
      createdAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("networks")
      .withIndex("by_network", (q) => q.eq("network", args.network))
      .first();
  },
});

// ============================================
// NETWORK MUTATIONS (Admin only)
// ============================================

/**
 * Seed default Ethereum networks
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
        name: "Ethereum Mainnet",
        rpcUrl: process.env.ETHEREUM_RPC_URL || "https://eth.llamarpc.com",
        explorerUrl: "https://etherscan.io",
        contractAddress: "0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF",
        chainId: 1,
        decimals: 18, // Standard ERC20 decimals
        isActive: true,
      },
      {
        network: "sepolia" as const,
        name: "Sepolia Testnet",
        rpcUrl: process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org",
        explorerUrl: "https://sepolia.etherscan.io",
        // TODO: Update with deployed TestMNEE contract address
        contractAddress: "0x0000000000000000000000000000000000000000",
        chainId: 11155111,
        decimals: 18,
        isActive: true,
      },
    ];

    const added: Array<string> = [];

    for (const network of defaultNetworks) {
      const existing = await ctx.db
        .query("networks")
        .withIndex("by_network", (q) => q.eq("network", network.network))
        .first();

      if (!existing) {
        await ctx.db.insert("networks", {
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
 * Update network configuration (platform admin only)
 */
export const updateNetwork = mutation({
  args: {
    network: v.union(v.literal("sepolia"), v.literal("mainnet")),
    name: v.optional(v.string()),
    rpcUrl: v.optional(v.string()),
    explorerUrl: v.optional(v.string()),
    contractAddress: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  returns: v.object({
    success: v.boolean(),
  }),
  handler: async (ctx, args) => {
    await requirePlatformAdmin(ctx);

    const networkDoc = await ctx.db
      .query("networks")
      .withIndex("by_network", (q) => q.eq("network", args.network))
      .first();

    if (!networkDoc) {
      throw new Error(`Network "${args.network}" not found`);
    }

    const updates: Record<string, unknown> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.rpcUrl !== undefined) updates.rpcUrl = args.rpcUrl;
    if (args.explorerUrl !== undefined) updates.explorerUrl = args.explorerUrl;
    if (args.contractAddress !== undefined) updates.contractAddress = args.contractAddress;
    if (args.isActive !== undefined) updates.isActive = args.isActive;

    await ctx.db.patch(networkDoc._id, updates);
    return { success: true };
  },
});

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get Etherscan explorer URL for a transaction
 */
export function getExplorerTxUrl(txHash: string, network: "sepolia" | "mainnet"): string {
  const baseUrl = network === "mainnet" 
    ? "https://etherscan.io" 
    : "https://sepolia.etherscan.io";
  
  return `${baseUrl}/tx/${txHash}`;
}

/**
 * Get Etherscan explorer URL for an address
 */
export function getExplorerAddressUrl(address: string, network: "sepolia" | "mainnet"): string {
  const baseUrl = network === "mainnet" 
    ? "https://etherscan.io" 
    : "https://sepolia.etherscan.io";
  
  return `${baseUrl}/address/${address}`;
}

/**
 * Get chain ID for a network
 */
export function getChainId(network: "sepolia" | "mainnet"): number {
  return network === "mainnet" ? 1 : 11155111;
}

/**
 * Format MNEE amount (18 decimals)
 */
export function formatMneeAmount(amount: number, decimals: number = 2): string {
  return amount.toFixed(decimals);
}
