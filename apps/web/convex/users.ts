import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
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


