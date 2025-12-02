import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import {
  requireAuth,
  getUser,
  getCurrentWorkspaceContext,
  requireRole,
  ADMIN_ROLES,
  ALL_ROLES,
  generateInviteToken,
  getWorkspaceMembership,
  WorkspaceRole,
} from "./lib/auth";

const INVITE_EXPIRY_DAYS = 7;

/**
 * List pending invites for the current workspace
 */
export const listInvites = query({
  args: {},
  handler: async (ctx) => {
    const { workspaceId, role } = await getCurrentWorkspaceContext(ctx);
    requireRole(role, ADMIN_ROLES, "view invites");

    const invites = await ctx.db
      .query("workspaceInvites")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", workspaceId))
      .collect();

    // Filter out expired invites in the response
    const now = Date.now();
    return invites.map((invite) => ({
      ...invite,
      isExpired: invite.expiresAt < now && invite.status === "pending",
    }));
  },
});

/**
 * Create a new invite
 */
export const createInvite = mutation({
  args: {
    email: v.string(),
    role: v.union(v.literal("admin"), v.literal("member"), v.literal("viewer")),
  },
  handler: async (ctx, args) => {
    const { workspaceId, role, clerkUserId } = await getCurrentWorkspaceContext(ctx);
    requireRole(role, ADMIN_ROLES, "create invites");

    const now = Date.now();

    // Check if email is already a member
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (existingUser) {
      const existingMembership = await getWorkspaceMembership(
        ctx,
        workspaceId,
        existingUser.clerkUserId
      );
      if (existingMembership) {
        throw new Error("This user is already a member of this workspace");
      }
    }

    // Check for existing pending invite
    const existingInvite = await ctx.db
      .query("workspaceInvites")
      .withIndex("by_workspace_email", (q) =>
        q.eq("workspaceId", workspaceId).eq("email", args.email)
      )
      .filter((q) => q.eq(q.field("status"), "pending"))
      .first();

    if (existingInvite && existingInvite.expiresAt > now) {
      throw new Error("An active invite already exists for this email");
    }

    // If there's an expired invite, revoke it
    if (existingInvite) {
      await ctx.db.patch(existingInvite._id, { status: "expired" });
    }

    // Create new invite
    const token = generateInviteToken();
    const inviteId = await ctx.db.insert("workspaceInvites", {
      workspaceId,
      email: args.email,
      role: args.role,
      invitedByUserId: clerkUserId,
      token,
      status: "pending",
      createdAt: now,
      expiresAt: now + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    });

    return { inviteId, token };
  },
});

/**
 * Revoke an invite
 */
export const revokeInvite = mutation({
  args: {
    inviteId: v.id("workspaceInvites"),
  },
  handler: async (ctx, args) => {
    const { workspaceId, role } = await getCurrentWorkspaceContext(ctx);
    requireRole(role, ADMIN_ROLES, "revoke invites");

    const invite = await ctx.db.get(args.inviteId);
    if (!invite || invite.workspaceId !== workspaceId) {
      throw new Error("Invite not found in this workspace");
    }

    if (invite.status !== "pending") {
      throw new Error("Can only revoke pending invites");
    }

    await ctx.db.patch(args.inviteId, { status: "revoked" });
    return { success: true };
  },
});

/**
 * Get invite details by token (for accepting)
 */
export const getInviteByToken = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const invite = await ctx.db
      .query("workspaceInvites")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();

    if (!invite) {
      return { error: "Invite not found" };
    }

    if (invite.status !== "pending") {
      return { error: `This invite has been ${invite.status}` };
    }

    if (invite.expiresAt < Date.now()) {
      return { error: "This invite has expired" };
    }

    const workspace = await ctx.db.get(invite.workspaceId);
    if (!workspace) {
      return { error: "Workspace not found" };
    }

    return {
      invite: {
        _id: invite._id,
        email: invite.email,
        role: invite.role,
        workspaceName: workspace.name,
        workspaceId: invite.workspaceId,
      },
    };
  },
});

/**
 * Accept an invite
 */
export const acceptInvite = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const clerkUserId = await requireAuth(ctx);
    const user = await getUser(ctx, clerkUserId);

    if (!user) {
      throw new Error("User not found. Please complete onboarding first.");
    }

    const invite = await ctx.db
      .query("workspaceInvites")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();

    if (!invite) {
      throw new Error("Invite not found");
    }

    if (invite.status !== "pending") {
      throw new Error(`This invite has been ${invite.status}`);
    }

    if (invite.expiresAt < Date.now()) {
      await ctx.db.patch(invite._id, { status: "expired" });
      throw new Error("This invite has expired");
    }

    // Verify email matches (optional - remove for more flexibility)
    if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
      throw new Error("This invite was sent to a different email address");
    }

    // Check if already a member
    const existingMembership = await getWorkspaceMembership(
      ctx,
      invite.workspaceId,
      clerkUserId
    );
    if (existingMembership) {
      await ctx.db.patch(invite._id, { status: "accepted" });
      throw new Error("You are already a member of this workspace");
    }

    const now = Date.now();

    // Create membership
    await ctx.db.insert("workspaceMembers", {
      workspaceId: invite.workspaceId,
      userId: clerkUserId,
      role: invite.role as WorkspaceRole,
      createdAt: now,
    });

    // Mark invite as accepted
    await ctx.db.patch(invite._id, { status: "accepted" });

    // Set as current workspace if user doesn't have one
    if (!user.currentWorkspaceId) {
      await ctx.db.patch(user._id, {
        currentWorkspaceId: invite.workspaceId,
      });
    }

    return { workspaceId: invite.workspaceId };
  },
});

/**
 * List invites sent to the current user's email
 */
export const listMyPendingInvites = query({
  args: {},
  handler: async (ctx) => {
    const clerkUserId = await requireAuth(ctx);
    const user = await getUser(ctx, clerkUserId);

    if (!user) {
      return [];
    }

    const now = Date.now();
    const invites = await ctx.db
      .query("workspaceInvites")
      .withIndex("by_email", (q) => q.eq("email", user.email))
      .filter((q) =>
        q.and(q.eq(q.field("status"), "pending"), q.gt(q.field("expiresAt"), now))
      )
      .collect();

    // Fetch workspace details
    const invitesWithDetails = await Promise.all(
      invites.map(async (invite) => {
        const workspace = await ctx.db.get(invite.workspaceId);
        return {
          ...invite,
          workspaceName: workspace?.name ?? "Unknown",
        };
      })
    );

    return invitesWithDetails;
  },
});

/**
 * Resend an invite (generates new token, resets expiry)
 */
export const resendInvite = mutation({
  args: {
    inviteId: v.id("workspaceInvites"),
  },
  handler: async (ctx, args) => {
    const { workspaceId, role } = await getCurrentWorkspaceContext(ctx);
    requireRole(role, ADMIN_ROLES, "resend invites");

    const invite = await ctx.db.get(args.inviteId);
    if (!invite || invite.workspaceId !== workspaceId) {
      throw new Error("Invite not found in this workspace");
    }

    if (invite.status !== "pending") {
      throw new Error("Can only resend pending invites");
    }

    const now = Date.now();
    const newToken = generateInviteToken();

    await ctx.db.patch(args.inviteId, {
      token: newToken,
      createdAt: now,
      expiresAt: now + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    });

    return { token: newToken };
  },
});


