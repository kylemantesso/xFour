import { v } from "convex/values";
import { query, mutation, internalQuery } from "./_generated/server";
import { requirePlatformAdmin } from "./lib/auth";

// ============================================
// CHAIN QUERIES
// ============================================

/**
 * List all active supported chains
 */
export const listSupportedChains = query({
  args: {
    includeTestnets: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let chains = await ctx.db
      .query("supportedChains")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Filter out testnets by default
    if (!args.includeTestnets) {
      chains = chains.filter((c) => !c.isTestnet);
    }

    return chains;
  },
});

/**
 * List all chains (admin only) - includes inactive chains
 */
export const listAllChains = query({
  args: {},
  handler: async (ctx) => {
    await requirePlatformAdmin(ctx);
    return await ctx.db.query("supportedChains").collect();
  },
});

/**
 * Get a chain by its chainId
 */
export const getChainById = query({
  args: {
    chainId: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("supportedChains")
      .withIndex("by_chainId", (q) => q.eq("chainId", args.chainId))
      .first();
  },
});

/**
 * Get a chain by network name (e.g., "base", "base-sepolia")
 * This is used to resolve x402 invoice network field
 */
export const getChainByNetworkName = query({
  args: {
    networkName: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("supportedChains")
      .withIndex("by_networkName", (q) => q.eq("networkName", args.networkName.toLowerCase()))
      .first();
  },
});

/**
 * Internal query to get chain by network name (for HTTP actions)
 */
export const getChainByNetworkNameInternal = internalQuery({
  args: {
    networkName: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("supportedChains")
      .withIndex("by_networkName", (q) => q.eq("networkName", args.networkName.toLowerCase()))
      .first();
  },
});

/**
 * Internal query to get chain by chainId (for HTTP actions)
 */
export const getChainByIdInternal = internalQuery({
  args: {
    chainId: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("supportedChains")
      .withIndex("by_chainId", (q) => q.eq("chainId", args.chainId))
      .first();
  },
});

// ============================================
// CHAIN MUTATIONS (Admin only)
// ============================================

/**
 * Seed default chains for development/testing
 */
export const seedDefaultChains = mutation({
  args: {},
  handler: async (ctx) => {
    const defaultChains = [
      {
        chainId: 31337,
        name: "Localhost",
        networkName: "localhost",
        rpcUrl: "http://127.0.0.1:8545",
        explorerUrl: undefined,
        nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
        treasuryAddress: undefined, // Set after deploy-local.ts
        swapRouterAddress: undefined, // Set after deploy-local.ts
        zeroxApiUrl: undefined,
        isTestnet: true,
        isActive: true,
      },
      {
        chainId: 1,
        name: "Ethereum",
        networkName: "ethereum",
        rpcUrl: "https://eth.llamarpc.com",
        explorerUrl: "https://etherscan.io",
        nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
        treasuryAddress: undefined,
        swapRouterAddress: undefined,
        zeroxApiUrl: "https://api.0x.org",
        isTestnet: false,
        isActive: true,
      },
      {
        chainId: 11155111,
        name: "Sepolia",
        networkName: "sepolia",
        rpcUrl: "https://rpc.sepolia.org",
        explorerUrl: "https://sepolia.etherscan.io",
        nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
        treasuryAddress: undefined,
        swapRouterAddress: undefined,
        zeroxApiUrl: "https://sepolia.api.0x.org",
        isTestnet: true,
        isActive: true,
      },
      {
        chainId: 8453,
        name: "Base",
        networkName: "base",
        rpcUrl: "https://mainnet.base.org",
        explorerUrl: "https://basescan.org",
        nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
        treasuryAddress: undefined,
        swapRouterAddress: undefined,
        zeroxApiUrl: "https://base.api.0x.org",
        isTestnet: false,
        isActive: true,
      },
      {
        chainId: 84532,
        name: "Base Sepolia",
        networkName: "base-sepolia",
        rpcUrl: "https://sepolia.base.org",
        explorerUrl: "https://sepolia.basescan.org",
        nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
        treasuryAddress: undefined,
        swapRouterAddress: undefined,
        zeroxApiUrl: "https://sepolia.base.api.0x.org",
        isTestnet: true,
        isActive: true,
      },
    ];

    const added: string[] = [];

    for (const chain of defaultChains) {
      const existing = await ctx.db
        .query("supportedChains")
        .withIndex("by_chainId", (q) => q.eq("chainId", chain.chainId))
        .first();

      if (!existing) {
        await ctx.db.insert("supportedChains", {
          ...chain,
          createdAt: Date.now(),
        });
        added.push(chain.name);
      }
    }

    return {
      added,
      message: added.length > 0 ? `Added chains: ${added.join(", ")}` : "No new chains added",
    };
  },
});

/**
 * Add a new supported chain (platform admin only)
 */
export const addSupportedChain = mutation({
  args: {
    chainId: v.number(),
    name: v.string(),
    networkName: v.string(),
    rpcUrl: v.string(),
    explorerUrl: v.optional(v.string()),
    nativeCurrency: v.object({
      name: v.string(),
      symbol: v.string(),
      decimals: v.number(),
    }),
    treasuryAddress: v.optional(v.string()),
    swapRouterAddress: v.optional(v.string()),
    zeroxApiUrl: v.optional(v.string()),
    isTestnet: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requirePlatformAdmin(ctx);

    // Check if chain already exists
    const existing = await ctx.db
      .query("supportedChains")
      .withIndex("by_chainId", (q) => q.eq("chainId", args.chainId))
      .first();

    if (existing) {
      throw new Error(`Chain with ID ${args.chainId} already exists`);
    }

    // Check if network name is unique
    const existingNetwork = await ctx.db
      .query("supportedChains")
      .withIndex("by_networkName", (q) => q.eq("networkName", args.networkName.toLowerCase()))
      .first();

    if (existingNetwork) {
      throw new Error(`Network name "${args.networkName}" already exists`);
    }

    const chainId = await ctx.db.insert("supportedChains", {
      ...args,
      networkName: args.networkName.toLowerCase(),
      isActive: true,
      createdAt: Date.now(),
    });

    return chainId;
  },
});

/**
 * Update a supported chain (platform admin only)
 */
export const updateSupportedChain = mutation({
  args: {
    chainId: v.number(),
    name: v.optional(v.string()),
    rpcUrl: v.optional(v.string()),
    explorerUrl: v.optional(v.string()),
    treasuryAddress: v.optional(v.string()),
    swapRouterAddress: v.optional(v.string()),
    zeroxApiUrl: v.optional(v.string()),
    isTestnet: v.optional(v.boolean()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requirePlatformAdmin(ctx);

    const chain = await ctx.db
      .query("supportedChains")
      .withIndex("by_chainId", (q) => q.eq("chainId", args.chainId))
      .first();

    if (!chain) {
      throw new Error(`Chain with ID ${args.chainId} not found`);
    }

    const updates: Record<string, unknown> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.rpcUrl !== undefined) updates.rpcUrl = args.rpcUrl;
    if (args.explorerUrl !== undefined) updates.explorerUrl = args.explorerUrl;
    if (args.treasuryAddress !== undefined) updates.treasuryAddress = args.treasuryAddress;
    if (args.swapRouterAddress !== undefined) updates.swapRouterAddress = args.swapRouterAddress;
    if (args.zeroxApiUrl !== undefined) updates.zeroxApiUrl = args.zeroxApiUrl;
    if (args.isTestnet !== undefined) updates.isTestnet = args.isTestnet;
    if (args.isActive !== undefined) updates.isActive = args.isActive;

    await ctx.db.patch(chain._id, updates);
    return { success: true };
  },
});

/**
 * Setup localhost chain with deployed contract addresses
 * This is for local development only - no auth required
 * Only updates localhost (chainId 31337)
 */
export const setupLocalhost = mutation({
  args: {
    treasuryAddress: v.string(),
    swapRouterAddress: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Only allow updating localhost chain (31337)
    const chain = await ctx.db
      .query("supportedChains")
      .withIndex("by_chainId", (q) => q.eq("chainId", 31337))
      .first();

    if (!chain) {
      throw new Error("Localhost chain not found. Run seedDefaultChains first.");
    }

    await ctx.db.patch(chain._id, {
      treasuryAddress: args.treasuryAddress,
      swapRouterAddress: args.swapRouterAddress,
    });

    return { success: true, chainId: 31337 };
  },
});

/**
 * Delete a supported chain (platform admin only)
 */
export const deleteSupportedChain = mutation({
  args: {
    chainId: v.number(),
  },
  handler: async (ctx, args) => {
    await requirePlatformAdmin(ctx);

    const chain = await ctx.db
      .query("supportedChains")
      .withIndex("by_chainId", (q) => q.eq("chainId", args.chainId))
      .first();

    if (!chain) {
      throw new Error(`Chain with ID ${args.chainId} not found`);
    }

    // Check if there are tokens using this chain
    const tokensOnChain = await ctx.db
      .query("supportedTokens")
      .withIndex("by_chainId", (q) => q.eq("chainId", args.chainId))
      .first();

    if (tokensOnChain) {
      throw new Error(`Cannot delete chain ${args.chainId} - tokens exist on this chain`);
    }

    await ctx.db.delete(chain._id);
    return { success: true };
  },
});

