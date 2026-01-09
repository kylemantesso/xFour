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

// MNEE network type
export const mneeNetwork = v.union(
  v.literal("sandbox"),
  v.literal("mainnet")
);

export default defineSchema(
  {
  // ============================================
  // GLOBAL TABLES
  // ============================================

  // MNEE network configuration (global, admin-managed)
  // MNEE is the only supported network - no EVM chains
  mneeNetworks: defineTable({
    network: v.union(v.literal("sandbox"), v.literal("mainnet")),
    name: v.string(), // e.g., "MNEE Mainnet" or "MNEE Sandbox"
    apiUrl: v.string(), // MNEE API endpoint
    explorerUrl: v.optional(v.string()), // e.g., "https://whatsonchain.com"
    decimals: v.number(), // MNEE has 5 decimals
    isActive: v.boolean(),
    createdAt: v.number(),
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
      address: v.string(), // MNEE address where you receive payments as a provider
      network: v.union(v.literal("sandbox"), v.literal("mainnet")),
      label: v.optional(v.string()), // Optional label for this address
    }))),
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

  // Wallets - independent wallet entities that can be linked to API keys
  wallets: defineTable({
    workspaceId: v.id("workspaces"),
    name: v.string(), // User-friendly name for the wallet
    address: v.string(), // MNEE Bitcoin address (public)
    encryptedWif: v.string(), // Wallet Import Format encrypted with master key
    network: v.union(v.literal("sandbox"), v.literal("mainnet")),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspaceId", ["workspaceId"])
    .index("by_workspace_network", ["workspaceId", "network"])
    .index("by_address", ["address"]),

  // API keys for agents and providers
  apiKeys: defineTable({
    workspaceId: v.id("workspaces"),
    name: v.string(),
    description: v.optional(v.string()),
    apiKey: v.string(), // The actual key (hashed or plain depending on security needs)
    apiKeyPrefix: v.string(), // First 8 chars for display "x402_abc..."
    type: v.union(v.literal("agent"), v.literal("provider")), // Type of API key
    // Wallet reference (can be used by both agent and provider keys)
    walletId: v.optional(v.id("wallets")),
    // For agent keys: network preference for making payments (deprecated in favor of walletId)
    mneeNetwork: v.optional(v.union(v.literal("sandbox"), v.literal("mainnet"))),
    // For provider keys: address where payments are received (deprecated in favor of walletId)
    receivingAddress: v.optional(v.string()), // MNEE address for receiving payments (provider keys only)
    receivingNetwork: v.optional(v.union(v.literal("sandbox"), v.literal("mainnet"))), // Network for receiving address
    createdByUserId: v.string(), // Clerk user id who created it
    lastUsedAt: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspaceId", ["workspaceId"])
    .index("by_apiKey", ["apiKey"])
    .index("by_workspace_active", ["workspaceId", "isActive"])
    .index("by_workspace_type", ["workspaceId", "type"])
    .index("by_walletId", ["walletId"]),

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

  // Payment records (MNEE-only)
  payments: defineTable({
    workspaceId: v.id("workspaces"),
    apiKeyId: v.id("apiKeys"),
    providerId: v.optional(v.id("providers")),
    providerHost: v.string(), // Host derived from request URL
    // x402 invoice details
    invoiceId: v.string(),
    amount: v.number(), // Amount in MNEE (up to 5 decimals)
    payTo: v.string(), // MNEE payment address (Bitcoin address)
    network: v.union(v.literal("sandbox"), v.literal("mainnet")), // MNEE network
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
    txHash: v.optional(v.string()), // MNEE transaction hash
    ticketId: v.optional(v.string()), // MNEE ticket ID (for tracking async transfers)
    metadata: v.optional(v.any()),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_workspaceId", ["workspaceId"])
    .index("by_apiKeyId", ["apiKeyId"])
    .index("by_invoiceId", ["invoiceId"])
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

  }
);
