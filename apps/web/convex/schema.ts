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

// Ethereum network type
export const ethereumNetwork = v.union(
  v.literal("sepolia"),
  v.literal("mainnet")
);

export default defineSchema(
  {
  // ============================================
  // GLOBAL TABLES
  // ============================================

  // Ethereum network configuration (global, admin-managed)
  // MNEE ERC20 token on Ethereum mainnet and Sepolia testnet
  networks: defineTable({
    network: v.union(v.literal("sepolia"), v.literal("mainnet")),
    name: v.string(), // e.g., "Ethereum Mainnet" or "Sepolia Testnet"
    rpcUrl: v.string(), // Ethereum RPC endpoint
    explorerUrl: v.optional(v.string()), // e.g., "https://etherscan.io"
    contractAddress: v.string(), // MNEE ERC20 contract address
    chainId: v.number(), // Ethereum chain ID
    decimals: v.number(), // MNEE has 18 decimals (standard ERC20)
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_network", ["network"]),

  // Contract addresses for the treasury system
  contractAddresses: defineTable({
    network: v.union(v.literal("sepolia"), v.literal("mainnet")),
    mneeToken: v.string(), // MNEE ERC20 contract address
    treasuryFactory: v.string(), // TreasuryFactory contract address
    x402Gateway: v.string(), // X402Gateway contract address
    updatedAt: v.number(),
  })
    .index("by_network", ["network"]),

  // ============================================
  // WORKSPACE TABLES
  // ============================================

  // Core workspace (org) table
  workspaces: defineTable({
    name: v.string(),
    slug: v.optional(v.string()),
    ownerUserId: v.string(), // Clerk user id of original creator
    // API Provider receiving addresses (for tracking incoming payments)
    receivingAddresses: v.optional(v.array(v.object({
      address: v.string(), // Ethereum address where you receive MNEE payments as a provider
      network: v.union(v.literal("sepolia"), v.literal("mainnet")),
      label: v.optional(v.string()), // Optional label for this address
    }))),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_ownerUserId", ["ownerUserId"])
    .index("by_slug", ["slug"]),

  // Treasury contracts for workspaces (non-custodial)
  // Each workspace can have one treasury per network
  treasuries: defineTable({
    workspaceId: v.id("workspaces"),
    network: v.union(v.literal("sepolia"), v.literal("mainnet")),
    contractAddress: v.string(), // Deployed Treasury contract address
    // Admin wallets that can manage this treasury (connected via WalletConnect)
    adminAddresses: v.array(v.string()), // Ethereum addresses with ADMIN_ROLE
    // Status tracking
    status: v.union(
      v.literal("pending"), // Waiting for contract deployment
      v.literal("active"), // Contract deployed and ready
      v.literal("paused"), // Treasury is paused
      v.literal("disabled") // Treasury is permanently disabled
    ),
    // On-chain sync (cached from contract for quick reads)
    cachedBalance: v.optional(v.number()), // Last known balance (18 decimals)
    lastSyncedAt: v.optional(v.number()), // When balance was last synced
    // Metadata
    txHash: v.optional(v.string()), // Deployment transaction hash
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspaceId", ["workspaceId"])
    .index("by_workspace_network", ["workspaceId", "network"])
    .index("by_contractAddress", ["contractAddress"]),

  // Connected wallets (via WalletConnect) for treasury admins
  connectedWallets: defineTable({
    workspaceId: v.id("workspaces"),
    userId: v.string(), // Clerk user ID who connected this wallet
    address: v.string(), // Ethereum address (checksummed)
    // Connection info
    label: v.optional(v.string()), // User-provided label
    isDefault: v.boolean(), // Is this the default wallet for this user in this workspace
    // Permissions
    canDeposit: v.boolean(),
    canWithdraw: v.boolean(),
    canManageApiKeys: v.boolean(),
    // Metadata
    lastUsedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspaceId", ["workspaceId"])
    .index("by_userId", ["userId"])
    .index("by_address", ["address"])
    .index("by_workspace_user", ["workspaceId", "userId"]),

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

  // API keys for agents and providers
  apiKeys: defineTable({
    workspaceId: v.id("workspaces"),
    name: v.string(),
    description: v.optional(v.string()),
    apiKey: v.string(), // The actual key (hashed or plain depending on security needs)
    apiKeyPrefix: v.string(), // First 8 chars for display "x402_abc..."
    apiKeyHash: v.optional(v.string()), // Keccak256 hash of API key for on-chain matching
    type: v.union(v.literal("agent"), v.literal("provider")), // Type of API key
    // Treasury reference (for agent keys that spend from treasury)
    treasuryId: v.optional(v.id("treasuries")),
    // For agent keys: network preference for making payments
    ethereumNetwork: v.optional(v.union(v.literal("sepolia"), v.literal("mainnet"))),
    // For provider keys: address where payments are received
    receivingAddress: v.optional(v.string()), // Ethereum address for receiving MNEE payments
    receivingNetwork: v.optional(v.union(v.literal("sepolia"), v.literal("mainnet"))),
    // Spending limits (synced to on-chain treasury contract)
    spendingLimits: v.optional(v.object({
      maxPerTransaction: v.number(), // Max per transaction in MNEE (0 = unlimited)
      dailyLimit: v.number(), // Max daily spend in MNEE (0 = unlimited)
      monthlyLimit: v.number(), // Max monthly spend in MNEE (0 = unlimited)
      isSyncedOnChain: v.boolean(), // Whether limits are synced to treasury contract
      lastSyncedAt: v.optional(v.number()),
    })),
    createdByUserId: v.string(), // Clerk user id who created it
    lastUsedAt: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspaceId", ["workspaceId"])
    .index("by_apiKey", ["apiKey"])
    .index("by_apiKeyHash", ["apiKeyHash"])
    .index("by_workspace_active", ["workspaceId", "isActive"])
    .index("by_workspace_type", ["workspaceId", "type"])
    .index("by_treasuryId", ["treasuryId"]),

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

  // Payment records (MNEE ERC20 on Ethereum)
  payments: defineTable({
    workspaceId: v.id("workspaces"),
    apiKeyId: v.id("apiKeys"),
    providerId: v.optional(v.id("providers")),
    providerHost: v.string(), // Host derived from request URL
    // x402 invoice details
    invoiceId: v.string(),
    amount: v.number(), // Amount in MNEE (18 decimals, stored as float for display)
    payTo: v.string(), // Ethereum address (0x...)
    network: v.union(v.literal("sepolia"), v.literal("mainnet")), // Ethereum network
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
    txHash: v.optional(v.string()), // Ethereum transaction hash
    metadata: v.optional(v.any()),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_workspaceId", ["workspaceId"])
    .index("by_apiKeyId", ["apiKeyId"])
    .index("by_invoiceId", ["invoiceId"])
    .index("by_status", ["status"])
    .index("by_workspace_status", ["workspaceId", "status"])
    .index("by_workspace_created", ["workspaceId", "createdAt"]),

  // Agent-level policies (per API key) - MNEE spend limits
  agentPolicies: defineTable({
    workspaceId: v.id("workspaces"),
    apiKeyId: v.id("apiKeys"),
    dailyLimit: v.optional(v.number()), // Daily spend limit in MNEE
    monthlyLimit: v.optional(v.number()), // Monthly spend limit in MNEE
    maxRequest: v.optional(v.number()), // Max per-request amount in MNEE
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
    monthlyLimit: v.optional(v.number()), // Monthly spend limit for this provider in MNEE
    dailyLimit: v.optional(v.number()), // Daily spend limit for this provider in MNEE
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspaceId", ["workspaceId"])
    .index("by_providerId", ["providerId"]),

  // ============================================
  // FEEDBACK TABLE
  // ============================================
  feedback: defineTable({
    userId: v.id("users"),
    message: v.string(),
    type: v.string(), // "bug", "feature", "general"
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_createdAt", ["createdAt"]),

  // ============================================
  // CACHED STATS TABLE
  // ============================================

  // Platform-wide aggregated stats (updated incrementally)
  // Avoids scanning all payments on every homepage load
  platformStats: defineTable({
    key: v.literal("global"), // Single row for global stats
    totalPayments: v.number(),
    settledPayments: v.number(),
    totalVolume: v.number(), // Total MNEE volume
    activeWorkspaces: v.number(),
    failedPayments: v.number(),
    last24hPayments: v.number(),
    last24hVolume: v.number(),
    lastUpdated: v.number(),
  })
    .index("by_key", ["key"]),

  // ============================================
  // TEST PAYMENT CONTROL
  // ============================================

  // Control flag for test payment loop
  testPaymentControl: defineTable({
    key: v.literal("loop"), // Single row for loop control
    isEnabled: v.boolean(),
    updatedAt: v.number(),
  })
    .index("by_key", ["key"]),

  }
);
