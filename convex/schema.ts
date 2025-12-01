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
    originalAmount: v.number(), // Amount in original currency
    originalCurrency: v.string(), // e.g., "USDC"
    originalNetwork: v.string(), // e.g., "base"
    payTo: v.string(), // Payment address
    // MNEE conversion
    mneeAmount: v.number(), // Amount in MNEE after FX conversion
    fxRate: v.number(), // FX rate used for conversion
    // Status and lifecycle
    status: v.union(
      v.literal("allowed"), // Quote approved, ready for payment
      v.literal("denied"), // Quote rejected by policy
      v.literal("pending"), // Payment initiated
      v.literal("completed"), // Payment successful
      v.literal("failed"), // Payment failed
      v.literal("refunded")
    ),
    denialReason: v.optional(v.string()), // Reason for denial (e.g., "AGENT_DAILY_LIMIT")
    txHash: v.optional(v.string()),
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
    dailyLimitMnee: v.optional(v.number()),
    monthlyLimitMnee: v.optional(v.number()),
    maxRequestMnee: v.optional(v.number()),
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
    monthlyLimitMnee: v.optional(v.number()),
    dailyLimitMnee: v.optional(v.number()),
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
});
