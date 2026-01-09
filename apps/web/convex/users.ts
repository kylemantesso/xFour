import { v } from "convex/values";
import { query, mutation, internalQuery } from "./_generated/server";
import {
  getClerkUserId,
  requireAuth,
  getUser,
  getWorkspaceMembership,
  createSlug,
} from "./lib/auth";

/**
 * Get the current user's profile and workspace info
 */
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const clerkUserId = await getClerkUserId(ctx);
    if (!clerkUserId) return null;

    const user = await getUser(ctx, clerkUserId);
    if (!user) return null;

    // Get current workspace if set
    let currentWorkspace = null;
    if (user.currentWorkspaceId) {
      currentWorkspace = await ctx.db.get(user.currentWorkspaceId);
    }

    // Get all workspace memberships
    const memberships = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_userId", (q) => q.eq("userId", clerkUserId))
      .collect();

    // Fetch workspace details for each membership
    const workspaces = await Promise.all(
      memberships.map(async (m) => {
        const workspace = await ctx.db.get(m.workspaceId);
        return workspace ? { ...workspace, role: m.role } : null;
      })
    );

    return {
      user,
      currentWorkspace,
      workspaces: workspaces.filter(Boolean),
    };
  },
});

/**
 * Ensure user exists and has a workspace on first login
 * Called after Clerk authentication
 */
export const ensureUserAndWorkspace = mutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const clerkUserId = await requireAuth(ctx);
    const now = Date.now();

    // Check if user already exists
    let user = await getUser(ctx, clerkUserId);

    if (!user) {
      // Create new user
      const userId = await ctx.db.insert("users", {
        clerkUserId,
        email: args.email,
        name: args.name,
        createdAt: now,
      });
      user = await ctx.db.get(userId);
    }

    if (!user) {
      throw new Error("Failed to create user");
    }

    // Check if user has any workspace memberships
    const memberships = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_userId", (q) => q.eq("userId", clerkUserId))
      .collect();

    if (memberships.length === 0) {
      // Auto-create a default workspace for new users
      const workspaceName = args.name ? `${args.name}'s Workspace` : "My Workspace";
      const workspaceId = await ctx.db.insert("workspaces", {
        name: workspaceName,
        slug: createSlug(workspaceName) + "-" + Date.now().toString(36),
        ownerUserId: clerkUserId,
        createdAt: now,
        updatedAt: now,
      });

      // Create owner membership
      await ctx.db.insert("workspaceMembers", {
        workspaceId,
        userId: clerkUserId,
        role: "owner",
        createdAt: now,
      });

      // Set as current and default workspace
      await ctx.db.patch(user._id, {
        defaultWorkspaceId: workspaceId,
        currentWorkspaceId: workspaceId,
      });

      return { userId: user._id, workspaceId, isNewUser: true };
    }

    // User exists with workspaces - ensure currentWorkspaceId is set
    if (!user.currentWorkspaceId) {
      const firstWorkspaceId = user.defaultWorkspaceId || memberships[0].workspaceId;
      await ctx.db.patch(user._id, {
        currentWorkspaceId: firstWorkspaceId,
      });
    }

    return { userId: user._id, workspaceId: user.currentWorkspaceId, isNewUser: false };
  },
});

/**
 * Set the current workspace for the user
 */
export const setCurrentWorkspace = mutation({
  args: {
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    const clerkUserId = await requireAuth(ctx);
    const user = await getUser(ctx, clerkUserId);

    if (!user) {
      throw new Error("User not found");
    }

    // Verify membership in the target workspace
    const membership = await getWorkspaceMembership(ctx, args.workspaceId, clerkUserId);
    if (!membership) {
      throw new Error("You are not a member of this workspace");
    }

    // Update current workspace
    await ctx.db.patch(user._id, {
      currentWorkspaceId: args.workspaceId,
    });

    return { success: true };
  },
});

/**
 * Set the default workspace for the user
 */
export const setDefaultWorkspace = mutation({
  args: {
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    const clerkUserId = await requireAuth(ctx);
    const user = await getUser(ctx, clerkUserId);

    if (!user) {
      throw new Error("User not found");
    }

    // Verify membership
    const membership = await getWorkspaceMembership(ctx, args.workspaceId, clerkUserId);
    if (!membership) {
      throw new Error("You are not a member of this workspace");
    }

    await ctx.db.patch(user._id, {
      defaultWorkspaceId: args.workspaceId,
    });

    return { success: true };
  },
});

/**
 * Update user profile
 */
export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const clerkUserId = await requireAuth(ctx);
    const user = await getUser(ctx, clerkUserId);

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, {
      name: args.name,
    });

    return { success: true };
  },
});

// ============================================
// ADMIN FUNCTIONS
// ============================================

/**
 * Check if current user is a platform admin
 */
export const checkIsAdmin = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    const clerkUserId = await getClerkUserId(ctx);
    if (!clerkUserId) return false;

    const user = await getUser(ctx, clerkUserId);
    return user?.isAdmin === true;
  },
});

/**
 * Internal: Check if a user is a platform admin by token identifier
 * Used by actions that need to verify admin status
 */
export const checkIsAdminInternal = internalQuery({
  args: {
    tokenIdentifier: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    // Token identifier format is typically "https://domain|userId"
    // Extract the clerk user ID from it
    const parts = args.tokenIdentifier.split("|");
    const clerkUserId = parts.length > 1 ? parts[1] : args.tokenIdentifier;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", clerkUserId))
      .unique();

    return user?.isAdmin === true;
  },
});

/**
 * Internal: Get user by token identifier
 * Used by actions that need to look up the current user
 */
export const getUserByTokenIdentifierInternal = internalQuery({
  args: {
    tokenIdentifier: v.string(),
  },
  returns: v.union(
    v.object({
      _id: v.id("users"),
      clerkUserId: v.string(),
      email: v.string(),
      name: v.optional(v.string()),
      currentWorkspaceId: v.optional(v.id("workspaces")),
      isAdmin: v.optional(v.boolean()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    // Token identifier format is typically "https://domain|userId"
    const parts = args.tokenIdentifier.split("|");
    const clerkUserId = parts.length > 1 ? parts[1] : args.tokenIdentifier;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", clerkUserId))
      .unique();

    if (!user) return null;

    return {
      _id: user._id,
      clerkUserId: user.clerkUserId,
      email: user.email,
      name: user.name,
      currentWorkspaceId: user.currentWorkspaceId,
      isAdmin: user.isAdmin,
    };
  },
});

/**
 * Bootstrap the first admin (only works if no admins exist)
 */
export const bootstrapAdmin = mutation({
  args: {},
  handler: async (ctx) => {
    const clerkUserId = await requireAuth(ctx);

    // Check if any admins exist
    const existingAdmins = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("isAdmin"), true))
      .first();

    if (existingAdmins) {
      throw new Error("Admin already exists. Ask an existing admin to grant you access.");
    }

    // Get or create user
    const user = await getUser(ctx, clerkUserId);
    if (!user) {
      throw new Error("User not found");
    }

    // Make this user an admin
    await ctx.db.patch(user._id, { isAdmin: true });
    return { success: true };
  },
});

/**
 * List all platform admins
 */
export const listAdmins = query({
  args: {},
  handler: async (ctx) => {
    const clerkUserId = await getClerkUserId(ctx);
    if (!clerkUserId) return [];

    // Verify caller is admin
    const caller = await getUser(ctx, clerkUserId);
    if (!caller?.isAdmin) return [];

    return await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("isAdmin"), true))
      .collect();
  },
});

/**
 * Grant admin access to a user by email
 */
export const grantAdminByEmail = mutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const clerkUserId = await requireAuth(ctx);

    // Verify caller is admin
    const caller = await getUser(ctx, clerkUserId);
    if (!caller?.isAdmin) {
      throw new Error("Only admins can grant admin access");
    }

    // Find user by email
    const targetUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!targetUser) {
      throw new Error(`User with email ${args.email} not found`);
    }

    if (targetUser.isAdmin) {
      throw new Error("User is already an admin");
    }

    // Grant admin
    await ctx.db.patch(targetUser._id, { isAdmin: true });
    return { success: true };
  },
});

/**
 * Revoke admin access from a user
 */
export const revokeAdmin = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const clerkUserId = await requireAuth(ctx);

    // Verify caller is admin
    const caller = await getUser(ctx, clerkUserId);
    if (!caller?.isAdmin) {
      throw new Error("Only admins can revoke admin access");
    }

    // Prevent self-revocation
    if (caller._id === args.userId) {
      throw new Error("You cannot revoke your own admin access");
    }

    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) {
      throw new Error("User not found");
    }

    if (!targetUser.isAdmin) {
      throw new Error("User is not an admin");
    }

    await ctx.db.patch(args.userId, { isAdmin: false });
    return { success: true };
  },
});

