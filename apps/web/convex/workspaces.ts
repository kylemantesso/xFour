import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import {
  requireAuth,
  getUser,
  getCurrentWorkspaceContext,
  requireRole,
  ADMIN_ROLES,
  ALL_ROLES,
  createSlug,
  WorkspaceRole,
} from "./lib/auth";
import { workspaceRole } from "./schema";

/**
 * Get the current workspace details
 */
export const getCurrentWorkspace = query({
  args: {},
  handler: async (ctx) => {
    try {
      const { workspace, role, membership } = await getCurrentWorkspaceContext(ctx);
      return { workspace, role, membership };
    } catch {
      return null;
    }
  },
});

/**
 * List all workspaces the current user belongs to
 */
export const listMyWorkspaces = query({
  args: {},
  handler: async (ctx) => {
    const clerkUserId = await requireAuth(ctx);

    const memberships = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_userId", (q) => q.eq("userId", clerkUserId))
      .collect();

    const workspaces = await Promise.all(
      memberships.map(async (m) => {
        const workspace = await ctx.db.get(m.workspaceId);
        if (!workspace) return null;
        return {
          ...workspace,
          role: m.role,
          membershipId: m._id,
        };
      })
    );

    return workspaces.filter(Boolean);
  },
});

/**
 * Create a new workspace
 */
export const createWorkspace = mutation({
  args: {
    name: v.string(),
    slug: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const clerkUserId = await requireAuth(ctx);
    const now = Date.now();

    // Generate unique slug
    const baseSlug = args.slug || createSlug(args.name);
    const slug = baseSlug + "-" + now.toString(36);

    // Create workspace
    const workspaceId = await ctx.db.insert("workspaces", {
      name: args.name,
      slug,
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

    // Update user's current workspace
    const user = await getUser(ctx, clerkUserId);
    if (user) {
      await ctx.db.patch(user._id, {
        currentWorkspaceId: workspaceId,
      });
    }

    // Auto-generate MNEE wallet for the workspace (scheduled to run immediately)
    await ctx.scheduler.runAfter(0, internal.mneeActions.createWalletForWorkspace, {
      workspaceId,
      network: "sandbox",
    });

    return { workspaceId };
  },
});

/**
 * Update workspace settings
 */
export const updateWorkspace = mutation({
  args: {
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { workspaceId, role } = await getCurrentWorkspaceContext(ctx);
    requireRole(role, ADMIN_ROLES, "update workspace settings");

    const updates: { name?: string; slug?: string; updatedAt: number } = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) {
      updates.name = args.name;
    }
    if (args.slug !== undefined) {
      updates.slug = args.slug;
    }

    await ctx.db.patch(workspaceId, updates);
    return { success: true };
  },
});

/**
 * Delete a workspace (owner only)
 */
export const deleteWorkspace = mutation({
  args: {
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    const { clerkUserId, role } = await getCurrentWorkspaceContext(ctx);
    requireRole(role, ["owner"], "delete workspace");

    // Delete all related data
    // Members
    const members = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();
    for (const member of members) {
      await ctx.db.delete(member._id);
    }

    // Invites
    const invites = await ctx.db
      .query("workspaceInvites")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();
    for (const invite of invites) {
      await ctx.db.delete(invite._id);
    }

    // API Keys
    const apiKeys = await ctx.db
      .query("apiKeys")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();
    for (const apiKey of apiKeys) {
      await ctx.db.delete(apiKey._id);
    }

    // Providers
    const providers = await ctx.db
      .query("providers")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();
    for (const provider of providers) {
      await ctx.db.delete(provider._id);
    }

    // Agent Policies
    const agentPolicies = await ctx.db
      .query("agentPolicies")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();
    for (const policy of agentPolicies) {
      await ctx.db.delete(policy._id);
    }

    // Provider Policies
    const providerPolicies = await ctx.db
      .query("providerPolicies")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();
    for (const policy of providerPolicies) {
      await ctx.db.delete(policy._id);
    }

    // MNEE Wallets
    const mneeWallets = await ctx.db
      .query("mneeWallets")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();
    for (const wallet of mneeWallets) {
      await ctx.db.delete(wallet._id);
    }

    // Payments (keep for audit trail, but you could also delete)
    // Skipping payment deletion to preserve history

    // Delete workspace
    await ctx.db.delete(args.workspaceId);

    // Update user's current workspace if needed
    const user = await getUser(ctx, clerkUserId);
    if (user && user.currentWorkspaceId === args.workspaceId) {
      const otherMembership = await ctx.db
        .query("workspaceMembers")
        .withIndex("by_userId", (q) => q.eq("userId", clerkUserId))
        .first();

      await ctx.db.patch(user._id, {
        currentWorkspaceId: otherMembership?.workspaceId ?? undefined,
        defaultWorkspaceId:
          user.defaultWorkspaceId === args.workspaceId
            ? otherMembership?.workspaceId ?? undefined
            : user.defaultWorkspaceId,
      });
    }

    return { success: true };
  },
});

/**
 * List workspace members
 */
export const listMembers = query({
  args: {},
  handler: async (ctx) => {
    const { workspaceId, role } = await getCurrentWorkspaceContext(ctx);
    requireRole(role, ALL_ROLES, "view members");

    const members = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", workspaceId))
      .collect();

    // Fetch user details for each member
    const membersWithDetails = await Promise.all(
      members.map(async (m) => {
        const user = await ctx.db
          .query("users")
          .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", m.userId))
          .unique();
        return {
          ...m,
          email: user?.email ?? "Unknown",
          name: user?.name ?? null,
        };
      })
    );

    return membersWithDetails;
  },
});

/**
 * Update a member's role
 */
export const updateMemberRole = mutation({
  args: {
    memberId: v.id("workspaceMembers"),
    role: workspaceRole,
  },
  handler: async (ctx, args) => {
    const { workspaceId, role, clerkUserId } = await getCurrentWorkspaceContext(ctx);
    requireRole(role, ["owner"], "change member roles");

    const member = await ctx.db.get(args.memberId);
    if (!member || member.workspaceId !== workspaceId) {
      throw new Error("Member not found in this workspace");
    }

    // Cannot change own role
    if (member.userId === clerkUserId) {
      throw new Error("Cannot change your own role");
    }

    // Cannot demote another owner (there must always be at least one owner)
    if (member.role === "owner" && args.role !== "owner") {
      const owners = await ctx.db
        .query("workspaceMembers")
        .withIndex("by_workspaceId", (q) => q.eq("workspaceId", workspaceId))
        .filter((q) => q.eq(q.field("role"), "owner"))
        .collect();

      if (owners.length <= 1) {
        throw new Error("Cannot demote the last owner");
      }
    }

    await ctx.db.patch(args.memberId, { role: args.role as WorkspaceRole });
    return { success: true };
  },
});

/**
 * Remove a member from the workspace
 */
export const removeMember = mutation({
  args: {
    memberId: v.id("workspaceMembers"),
  },
  handler: async (ctx, args) => {
    const { workspaceId, role, clerkUserId } = await getCurrentWorkspaceContext(ctx);
    requireRole(role, ADMIN_ROLES, "remove members");

    const member = await ctx.db.get(args.memberId);
    if (!member || member.workspaceId !== workspaceId) {
      throw new Error("Member not found in this workspace");
    }

    // Cannot remove yourself
    if (member.userId === clerkUserId) {
      throw new Error("Cannot remove yourself. Use 'Leave workspace' instead.");
    }

    // Admins cannot remove owners
    if (role === "admin" && member.role === "owner") {
      throw new Error("Admins cannot remove owners");
    }

    await ctx.db.delete(args.memberId);

    // Update the removed user's workspace if needed
    const removedUser = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", member.userId))
      .unique();

    if (removedUser && removedUser.currentWorkspaceId === workspaceId) {
      const otherMembership = await ctx.db
        .query("workspaceMembers")
        .withIndex("by_userId", (q) => q.eq("userId", member.userId))
        .first();

      await ctx.db.patch(removedUser._id, {
        currentWorkspaceId: otherMembership?.workspaceId ?? undefined,
        defaultWorkspaceId:
          removedUser.defaultWorkspaceId === workspaceId
            ? otherMembership?.workspaceId ?? undefined
            : removedUser.defaultWorkspaceId,
      });
    }

    return { success: true };
  },
});

/**
 * Leave a workspace
 */
export const leaveWorkspace = mutation({
  args: {
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    const clerkUserId = await requireAuth(ctx);

    const membership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_user", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", clerkUserId)
      )
      .unique();

    if (!membership) {
      throw new Error("You are not a member of this workspace");
    }

    // Owners cannot leave if they're the last owner
    if (membership.role === "owner") {
      const owners = await ctx.db
        .query("workspaceMembers")
        .withIndex("by_workspaceId", (q) => q.eq("workspaceId", args.workspaceId))
        .filter((q) => q.eq(q.field("role"), "owner"))
        .collect();

      if (owners.length <= 1) {
        throw new Error("Cannot leave workspace as the last owner. Transfer ownership or delete the workspace.");
      }
    }

    await ctx.db.delete(membership._id);

    // Update user's current workspace
    const user = await getUser(ctx, clerkUserId);
    if (user && user.currentWorkspaceId === args.workspaceId) {
      const otherMembership = await ctx.db
        .query("workspaceMembers")
        .withIndex("by_userId", (q) => q.eq("userId", clerkUserId))
        .first();

      await ctx.db.patch(user._id, {
        currentWorkspaceId: otherMembership?.workspaceId ?? undefined,
        defaultWorkspaceId:
          user.defaultWorkspaceId === args.workspaceId
            ? otherMembership?.workspaceId ?? undefined
            : user.defaultWorkspaceId,
      });
    }

    return { success: true };
  },
});

// ============================================
// API PROVIDER RECEIVING ADDRESSES
// ============================================

/**
 * Add a receiving address for tracking payments as an API provider
 */
export const addReceivingAddress = mutation({
  args: {
    address: v.string(),
    network: v.union(v.literal("sandbox"), v.literal("mainnet")),
    label: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { workspaceId, workspace, role } = await getCurrentWorkspaceContext(ctx);
    requireRole(role, ADMIN_ROLES, "manage receiving addresses");

    const currentAddresses = workspace.receivingAddresses || [];

    // Check if address already exists
    const exists = currentAddresses.some(
      (a) => a.address === args.address && a.network === args.network
    );
    if (exists) {
      throw new Error("This address already exists for this network");
    }

    const updatedAddresses = [
      ...currentAddresses,
      {
        address: args.address,
        network: args.network,
        label: args.label,
      },
    ];

    await ctx.db.patch(workspaceId, {
      receivingAddresses: updatedAddresses,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Remove a receiving address
 */
export const removeReceivingAddress = mutation({
  args: {
    address: v.string(),
    network: v.union(v.literal("sandbox"), v.literal("mainnet")),
  },
  handler: async (ctx, args) => {
    const { workspaceId, workspace, role } = await getCurrentWorkspaceContext(ctx);
    requireRole(role, ADMIN_ROLES, "manage receiving addresses");

    const currentAddresses = workspace.receivingAddresses || [];
    const updatedAddresses = currentAddresses.filter(
      (a) => !(a.address === args.address && a.network === args.network)
    );

    await ctx.db.patch(workspaceId, {
      receivingAddresses: updatedAddresses,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * List receiving addresses for the workspace
 */
export const listReceivingAddresses = query({
  args: {},
  handler: async (ctx) => {
    const { workspace, role } = await getCurrentWorkspaceContext(ctx);
    requireRole(role, ALL_ROLES, "view receiving addresses");

    return workspace.receivingAddresses || [];
  },
});

