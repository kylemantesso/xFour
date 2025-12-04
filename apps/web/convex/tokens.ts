import { v } from "convex/values";
import { query, mutation, internalQuery } from "./_generated/server";
import { getCurrentWorkspaceContext, requireRole, ALL_ROLES, WRITE_ROLES, requirePlatformAdmin, isPlatformAdmin, requireAuth, getUser } from "./lib/auth";

/**
 * Seed default tokens for development/testing
 * Call this once to populate the supportedTokens table
 */
export const seedDefaultTokens = mutation({
  args: {
    tokens: v.array(
      v.object({
        address: v.string(),
        symbol: v.string(),
        name: v.string(),
        decimals: v.number(),
        chainId: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const added: string[] = [];

    for (const token of args.tokens) {
      // Check if token already exists
      const existing = await ctx.db
        .query("supportedTokens")
        .withIndex("by_address", (q) => q.eq("address", token.address))
        .first();

      if (!existing) {
        await ctx.db.insert("supportedTokens", {
          ...token,
          isActive: true,
          createdAt: Date.now(),
        });
        added.push(token.symbol);
      }
    }

    return { added, message: added.length > 0 ? `Added tokens: ${added.join(", ")}` : "No new tokens added" };
  },
});

/**
 * List all active supported tokens
 * Available to all authenticated users
 */
export const listSupportedTokens = query({
  args: {
    chainId: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const tokensQuery = ctx.db
      .query("supportedTokens")
      .filter((q) => q.eq(q.field("isActive"), true));

    const tokens = await tokensQuery.collect();

    // Filter by chainId if provided
    if (args.chainId !== undefined) {
      return tokens.filter((t) => t.chainId === args.chainId);
    }

    return tokens;
  },
});

/**
 * Get a token by its address
 */
export const getTokenByAddress = query({
  args: {
    address: v.string(),
    chainId: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const tokens = await ctx.db
      .query("supportedTokens")
      .withIndex("by_address", (q) => q.eq("address", args.address))
      .collect();

    if (args.chainId !== undefined) {
      return tokens.find((t) => t.chainId === args.chainId) ?? null;
    }

    return tokens[0] ?? null;
  },
});

/**
 * Internal query to get token by address (for HTTP actions)
 */
export const getTokenByAddressInternal = internalQuery({
  args: {
    address: v.string(),
    chainId: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const tokens = await ctx.db
      .query("supportedTokens")
      .withIndex("by_address", (q) => q.eq("address", args.address))
      .collect();

    if (args.chainId !== undefined) {
      return tokens.find((t) => t.chainId === args.chainId) ?? null;
    }

    return tokens[0] ?? null;
  },
});

/**
 * Internal query to get token by symbol (for HTTP actions)
 * Used to resolve currency symbols (e.g., "USDC") to token addresses
 */
export const getTokenBySymbolInternal = internalQuery({
  args: {
    symbol: v.string(),
    chainId: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const tokens = await ctx.db
      .query("supportedTokens")
      .filter((q) => 
        q.and(
          q.eq(q.field("symbol"), args.symbol.toUpperCase()),
          q.eq(q.field("isActive"), true)
        )
      )
      .collect();

    if (args.chainId !== undefined) {
      return tokens.find((t) => t.chainId === args.chainId) ?? null;
    }

    return tokens[0] ?? null;
  },
});

/**
 * Add a new supported token (platform admin only)
 */
export const addSupportedToken = mutation({
  args: {
    address: v.string(),
    symbol: v.string(),
    name: v.string(),
    decimals: v.number(),
    chainId: v.number(),
  },
  handler: async (ctx, args) => {
    // Require platform admin
    await requirePlatformAdmin(ctx);

    // Check if token already exists for this chain
    const existing = await ctx.db
      .query("supportedTokens")
      .withIndex("by_address_chainId", (q) =>
        q.eq("address", args.address).eq("chainId", args.chainId)
      )
      .unique();

    if (existing) {
      throw new Error(
        `Token ${args.symbol} already exists on chain ${args.chainId}`
      );
    }

    const tokenId = await ctx.db.insert("supportedTokens", {
      address: args.address,
      symbol: args.symbol,
      name: args.name,
      decimals: args.decimals,
      chainId: args.chainId,
      isActive: true,
      createdAt: Date.now(),
    });

    return tokenId;
  },
});

/**
 * Update a supported token (platform admin only)
 */
export const updateSupportedToken = mutation({
  args: {
    tokenId: v.id("supportedTokens"),
    symbol: v.optional(v.string()),
    name: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Require platform admin
    await requirePlatformAdmin(ctx);

    const token = await ctx.db.get(args.tokenId);
    if (!token) {
      throw new Error("Token not found");
    }

    const updates: {
      symbol?: string;
      name?: string;
      isActive?: boolean;
    } = {};

    if (args.symbol !== undefined) updates.symbol = args.symbol;
    if (args.name !== undefined) updates.name = args.name;
    if (args.isActive !== undefined) updates.isActive = args.isActive;

    await ctx.db.patch(args.tokenId, updates);
    return { success: true };
  },
});

/**
 * Delete a supported token (platform admin only)
 */
export const deleteSupportedToken = mutation({
  args: {
    tokenId: v.id("supportedTokens"),
  },
  handler: async (ctx, args) => {
    // Require platform admin
    await requirePlatformAdmin(ctx);

    const token = await ctx.db.get(args.tokenId);
    if (!token) {
      throw new Error("Token not found");
    }

    await ctx.db.delete(args.tokenId);
    return { success: true };
  },
});

// ============================================
// ADMIN STATUS FUNCTIONS
// ============================================

/**
 * Check if the current user is a platform admin
 */
export const checkIsAdmin = query({
  args: {},
  handler: async (ctx) => {
    return await isPlatformAdmin(ctx);
  },
});

/**
 * Get all platform admins (platform admin only)
 */
export const listAdmins = query({
  args: {},
  handler: async (ctx) => {
    const isAdmin = await isPlatformAdmin(ctx);
    if (!isAdmin) {
      throw new Error("Platform admin access required");
    }

    const admins = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("isAdmin"), true))
      .collect();

    return admins.map((admin) => ({
      _id: admin._id,
      email: admin.email,
      name: admin.name,
      clerkUserId: admin.clerkUserId,
    }));
  },
});

/**
 * Grant admin status to a user by email (platform admin only)
 */
export const grantAdminByEmail = mutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    await requirePlatformAdmin(ctx);

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .unique();

    if (!user) {
      throw new Error(`User with email ${args.email} not found`);
    }

    await ctx.db.patch(user._id, { isAdmin: true });
    return { success: true, userId: user._id };
  },
});

/**
 * Revoke admin status from a user (platform admin only)
 */
export const revokeAdmin = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const clerkUserId = await requirePlatformAdmin(ctx);
    
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Prevent revoking your own admin status
    if (user.clerkUserId === clerkUserId) {
      throw new Error("Cannot revoke your own admin status");
    }

    await ctx.db.patch(args.userId, { isAdmin: false });
    return { success: true };
  },
});

/**
 * Bootstrap: Make current user admin if no admins exist
 * This is for initial setup only
 */
export const bootstrapAdmin = mutation({
  args: {},
  handler: async (ctx) => {
    const clerkUserId = await requireAuth(ctx);
    const user = await getUser(ctx, clerkUserId);

    if (!user) {
      throw new Error("User not found");
    }

    // Check if any admins exist
    const existingAdmin = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("isAdmin"), true))
      .first();

    if (existingAdmin) {
      throw new Error("Admin already exists. Use grantAdminByEmail to add more admins.");
    }

    // Make current user admin
    await ctx.db.patch(user._id, { isAdmin: true });
    return { success: true, message: "You are now a platform admin" };
  },
});

// ============================================
// WORKSPACE TOKEN FUNCTIONS
// ============================================

/**
 * List tokens enabled for the current workspace
 * Returns full token details joined with the global supportedTokens
 */
export const listWorkspaceTokens = query({
  args: {
    chainId: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { workspaceId, role } = await getCurrentWorkspaceContext(ctx);
    requireRole(role, ALL_ROLES, "view workspace tokens");

    // Get all workspace token links
    const workspaceTokens = await ctx.db
      .query("workspaceTokens")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", workspaceId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Fetch full token details for each
    const tokens = await Promise.all(
      workspaceTokens.map(async (wt) => {
        const token = await ctx.db.get(wt.tokenId);
        if (!token || !token.isActive) return null;
        return {
          ...token,
          workspaceTokenId: wt._id,
        };
      })
    );

    // Filter out nulls and optionally by chainId
    const validTokens = tokens.filter((t) => t !== null);
    
    if (args.chainId !== undefined) {
      return validTokens.filter((t) => t.chainId === args.chainId);
    }

    return validTokens;
  },
});

/**
 * Get available tokens that can be added to workspace
 * Returns global tokens NOT already in the workspace
 */
export const listAvailableTokensForWorkspace = query({
  args: {
    chainId: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { workspaceId, role } = await getCurrentWorkspaceContext(ctx);
    requireRole(role, ALL_ROLES, "view available tokens");

    // Get all global tokens
    let allTokens = await ctx.db
      .query("supportedTokens")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Filter by chainId if provided
    if (args.chainId !== undefined) {
      allTokens = allTokens.filter((t) => t.chainId === args.chainId);
    }

    // Get tokens already in workspace
    const workspaceTokens = await ctx.db
      .query("workspaceTokens")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", workspaceId))
      .collect();

    const workspaceTokenIds = new Set(workspaceTokens.map((wt) => wt.tokenId.toString()));

    // Return tokens not in workspace
    return allTokens.filter((t) => !workspaceTokenIds.has(t._id.toString()));
  },
});

/**
 * Add a token to the current workspace
 */
export const addTokenToWorkspace = mutation({
  args: {
    tokenId: v.id("supportedTokens"),
  },
  handler: async (ctx, args) => {
    const { workspaceId, role } = await getCurrentWorkspaceContext(ctx);
    requireRole(role, WRITE_ROLES, "add tokens to workspace");

    // Verify the token exists and is active
    const token = await ctx.db.get(args.tokenId);
    if (!token || !token.isActive) {
      throw new Error("Token not found or not active");
    }

    // Check if already added
    const existing = await ctx.db
      .query("workspaceTokens")
      .withIndex("by_workspace_token", (q) =>
        q.eq("workspaceId", workspaceId).eq("tokenId", args.tokenId)
      )
      .unique();

    if (existing) {
      // Reactivate if it was disabled
      if (!existing.isActive) {
        await ctx.db.patch(existing._id, { isActive: true });
        return { success: true, reactivated: true };
      }
      throw new Error("Token already added to workspace");
    }

    await ctx.db.insert("workspaceTokens", {
      workspaceId,
      tokenId: args.tokenId,
      isActive: true,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Remove a token from the current workspace
 */
export const removeTokenFromWorkspace = mutation({
  args: {
    tokenId: v.id("supportedTokens"),
  },
  handler: async (ctx, args) => {
    const { workspaceId, role } = await getCurrentWorkspaceContext(ctx);
    requireRole(role, WRITE_ROLES, "remove tokens from workspace");

    const workspaceToken = await ctx.db
      .query("workspaceTokens")
      .withIndex("by_workspace_token", (q) =>
        q.eq("workspaceId", workspaceId).eq("tokenId", args.tokenId)
      )
      .unique();

    if (!workspaceToken) {
      throw new Error("Token not found in workspace");
    }

    // Soft delete - set isActive to false
    await ctx.db.patch(workspaceToken._id, { isActive: false });

    return { success: true };
  },
});

