import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Role types for workspace members
export const workspaceRole = v.union(
  v.literal("owner"),
  v.literal("admin"),
  v.literal("member"),
  v.literal("viewer")
);

// Invite status types
export const inviteStatus = v.union(
  v.literal("pending"),
  v.literal("accepted"),
  v.literal("revoked"),
  v.literal("expired")
);

export default defineSchema({
  // ============================================
  // GLOBAL TABLES
  // ============================================

  // Supported blockchain networks (global, admin-managed)
  supportedChains: defineTable({
    chainId: v.number(), // e.g., 8453
    name: v.string(), // e.g., "Base"
    networkName: v.string(), // e.g., "base" - used in x402 invoice network field
    rpcUrl: v.string(), // e.g., "https://mainnet.base.org"
    explorerUrl: v.optional(v.string()), // e.g., "https://basescan.org"
    nativeCurrency: v.object({
      name: v.string(), // e.g., "Ether"
      symbol: v.string(), // e.g., "ETH"
      decimals: v.number(), // e.g., 18
    }),
    // Contract addresses (deployed per-chain)
    treasuryAddress: v.optional(v.string()), // Treasury contract address on this chain
    // Swap configuration
    swapRouterAddress: v.optional(v.string()), // Mock router for localhost, null for 0x chains
    zeroxApiUrl: v.optional(v.string()), // e.g., "https://base.api.0x.org"
    isTestnet: v.boolean(),
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_chainId", ["chainId"])
    .index("by_networkName", ["networkName"]),

  // Supported ERC-20 tokens (global, admin-managed)
  supportedTokens: defineTable({
    address: v.string(), // Token contract address (checksummed)
    symbol: v.string(), // e.g., "USDC"
    name: v.string(), // e.g., "USD Coin"
    decimals: v.number(), // e.g., 6
    chainId: v.number(), // e.g., 31337
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_address", ["address"])
    .index("by_chainId", ["chainId"])
    .index("by_address_chainId", ["address", "chainId"])
    .index("by_symbol_chainId", ["symbol", "chainId"]),

  // ============================================
  // WORKSPACE TABLES
  // ============================================

  // Core workspace (org) table
  workspaces: defineTable({
    name: v.string(),
    slug: v.optional(v.string()),
    ownerUserId: v.string(), // Clerk user id of original creator
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_ownerUserId", ["ownerUserId"])
    .index("by_slug", ["slug"]),

  // Connects Clerk users to workspaces with a role
  workspaceMembers: defineTable({
    workspaceId: v.id("workspaces"),
    userId: v.string(), // Clerk user id
    role: workspaceRole,
    createdAt: v.number(),
  })
    .index("by_workspaceId", ["workspaceId"])
    .index("by_userId", ["userId"])
    .index("by_workspace_user", ["workspaceId", "userId"]),

  // For inviting teammates via email
  workspaceInvites: defineTable({
    workspaceId: v.id("workspaces"),
    email: v.string(),
    role: v.union(v.literal("admin"), v.literal("member"), v.literal("viewer")),
    invitedByUserId: v.string(), // Clerk user id of inviter
    token: v.string(), // Random string for invite URL
    status: inviteStatus,
    createdAt: v.number(),
    expiresAt: v.number(),
  })
    .index("by_workspaceId", ["workspaceId"])
    .index("by_email", ["email"])
    .index("by_token", ["token"])
    .index("by_workspace_email", ["workspaceId", "email"]),

  // Convex-side shadow of Clerk user with preferences
  users: defineTable({
    clerkUserId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    defaultWorkspaceId: v.optional(v.id("workspaces")),
    currentWorkspaceId: v.optional(v.id("workspaces")),
    isAdmin: v.optional(v.boolean()), // Platform-level admin (can manage global tokens)
    createdAt: v.number(),
  })
    .index("by_clerkUserId", ["clerkUserId"])
    .index("by_email", ["email"]),

  // ============================================
  // DOMAIN TABLES (all scoped to workspaceId)
  // ============================================

  // API keys for agents
  apiKeys: defineTable({
    workspaceId: v.id("workspaces"),
    name: v.string(),
    description: v.optional(v.string()),
    apiKey: v.string(), // The actual key (hashed or plain depending on security needs)
    apiKeyPrefix: v.string(), // First 8 chars for display "x402_abc..."
    preferredPaymentToken: v.optional(v.string()), // Token address for payments (optional for backwards compat, required in UI)
    createdByUserId: v.string(), // Clerk user id who created it
    lastUsedAt: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspaceId", ["workspaceId"])
    .index("by_apiKey", ["apiKey"])
    .index("by_workspace_active", ["workspaceId", "isActive"]),

  // Provider configurations
  providers: defineTable({
    workspaceId: v.id("workspaces"),
    name: v.string(),
    host: v.string(), // Domain host for matching (e.g., "api.novaai.com")
    baseUrl: v.optional(v.string()),
    type: v.string(), // "openai", "anthropic", "custom", etc.
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspaceId", ["workspaceId"])
    .index("by_workspace_active", ["workspaceId", "isActive"])
    .index("by_workspace_host", ["workspaceId", "host"]),

  // Payment records
  payments: defineTable({
    workspaceId: v.id("workspaces"),
    apiKeyId: v.id("apiKeys"),
    providerId: v.optional(v.id("providers")),
    providerHost: v.string(), // Host derived from request URL
    // x402 invoice details
    invoiceId: v.string(),
    originalAmount: v.number(), // Amount in original currency (what provider requested)
    originalCurrency: v.string(), // e.g., "USDC" (currency provider requested)
    originalNetwork: v.string(), // e.g., "base"
    payTo: v.string(), // Payment address
    // Treasury token (workspace's preferred payment token)
    paymentToken: v.optional(v.string()), // Token address used from treasury
    paymentTokenSymbol: v.optional(v.string()), // Token symbol (e.g., "MNEE", "USDC")
    // Amount debited from treasury (in treasury token)
    treasuryAmount: v.number(), // Amount debited from treasury after FX conversion
    fxRate: v.number(), // FX rate used for conversion (originalCurrency → treasuryToken)
    // Status and lifecycle
    status: v.union(
      v.literal("allowed"), // Quote approved, ready for payment
      v.literal("denied"), // Quote rejected by policy
      v.literal("settled"), // Payment confirmed/settled
      v.literal("pending"), // Payment initiated
      v.literal("completed"), // Payment successful
      v.literal("failed"), // Payment failed
      v.literal("refunded")
    ),
    updatedAt: v.optional(v.number()),
    denialReason: v.optional(v.string()), // Reason for denial (e.g., "AGENT_DAILY_LIMIT")
    txHash: v.optional(v.string()), // Main payment transaction hash
    // Swap details (when treasury token != provider's required token)
    swapTxHash: v.optional(v.string()), // Swap transaction hash
    swapSellAmount: v.optional(v.number()), // Amount sold in swap
    swapSellToken: v.optional(v.string()), // Token address sold
    swapBuyAmount: v.optional(v.number()), // Amount received from swap
    swapBuyToken: v.optional(v.string()), // Token address received
    swapFee: v.optional(v.number()), // Fee paid for swap (in sell token units)
    metadata: v.optional(v.any()),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_workspaceId", ["workspaceId"])
    .index("by_apiKeyId", ["apiKeyId"])
    .index("by_invoiceId", ["invoiceId"])
    .index("by_workspace_status", ["workspaceId", "status"])
    .index("by_workspace_created", ["workspaceId", "createdAt"]),

  // Agent-level policies (per API key)
  agentPolicies: defineTable({
    workspaceId: v.id("workspaces"),
    apiKeyId: v.id("apiKeys"),
    dailyLimit: v.optional(v.number()), // Daily spend limit (in treasury token)
    monthlyLimit: v.optional(v.number()), // Monthly spend limit (in treasury token)
    maxRequest: v.optional(v.number()), // Max per-request amount (in treasury token)
    allowedProviders: v.optional(v.array(v.id("providers"))),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspaceId", ["workspaceId"])
    .index("by_apiKeyId", ["apiKeyId"]),

  // Provider-level policies
  providerPolicies: defineTable({
    workspaceId: v.id("workspaces"),
    providerId: v.id("providers"),
    monthlyLimit: v.optional(v.number()), // Monthly spend limit for this provider (in treasury token)
    dailyLimit: v.optional(v.number()), // Daily spend limit for this provider (in treasury token)
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspaceId", ["workspaceId"])
    .index("by_providerId", ["providerId"]),

  // Treasury configuration per workspace
  treasuryConfig: defineTable({
    workspaceId: v.id("workspaces"),
    tokenAddress: v.string(),
    chainId: v.number(),
    treasuryWalletAddress: v.string(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspaceId", ["workspaceId"]),

  // Workspace-selected tokens (links workspace to global supportedTokens)
  workspaceTokens: defineTable({
    workspaceId: v.id("workspaces"),
    tokenId: v.id("supportedTokens"), // Reference to global token
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_workspaceId", ["workspaceId"])
    .index("by_tokenId", ["tokenId"])
    .index("by_workspace_token", ["workspaceId", "tokenId"]),
});
