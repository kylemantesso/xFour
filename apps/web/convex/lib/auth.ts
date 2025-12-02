import { QueryCtx, MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

export type WorkspaceRole = "owner" | "admin" | "member" | "viewer";

/**
 * Get the current Clerk user ID from the auth context
 */
export async function getClerkUserId(ctx: QueryCtx | MutationCtx): Promise<string | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  // Clerk provides the subject as the user ID
  return identity.subject;
}

/**
 * Require authentication - throws if not logged in
 */
export async function requireAuth(ctx: QueryCtx | MutationCtx): Promise<string> {
  const clerkUserId = await getClerkUserId(ctx);
  if (!clerkUserId) {
    throw new Error("Authentication required");
  }
  return clerkUserId;
}

/**
 * Get the user record from our database
 */
export async function getUser(ctx: QueryCtx | MutationCtx, clerkUserId: string) {
  return await ctx.db
    .query("users")
    .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", clerkUserId))
    .unique();
}

/**
 * Get workspace membership for a user
 */
export async function getWorkspaceMembership(
  ctx: QueryCtx | MutationCtx,
  workspaceId: Id<"workspaces">,
  clerkUserId: string
) {
  return await ctx.db
    .query("workspaceMembers")
    .withIndex("by_workspace_user", (q) =>
      q.eq("workspaceId", workspaceId).eq("userId", clerkUserId)
    )
    .unique();
}

/**
 * Get the current workspace context for the authenticated user
 */
export async function getCurrentWorkspaceContext(ctx: QueryCtx | MutationCtx) {
  const clerkUserId = await requireAuth(ctx);
  const user = await getUser(ctx, clerkUserId);

  if (!user) {
    throw new Error("User not found. Please complete onboarding.");
  }

  if (!user.currentWorkspaceId) {
    throw new Error("No workspace selected. Please select or create a workspace.");
  }

  const membership = await getWorkspaceMembership(ctx, user.currentWorkspaceId, clerkUserId);

  if (!membership) {
    throw new Error("You are not a member of this workspace.");
  }

  const workspace = await ctx.db.get(user.currentWorkspaceId);
  if (!workspace) {
    throw new Error("Workspace not found.");
  }

  return {
    user,
    clerkUserId,
    workspace,
    workspaceId: user.currentWorkspaceId,
    role: membership.role as WorkspaceRole,
    membership,
  };
}

/**
 * Check if a role has at least the required permission level
 */
export function hasPermission(
  userRole: WorkspaceRole,
  requiredRoles: WorkspaceRole[]
): boolean {
  return requiredRoles.includes(userRole);
}

/**
 * Require a specific role - throws if user doesn't have permission
 */
export function requireRole(
  userRole: WorkspaceRole,
  allowedRoles: WorkspaceRole[],
  action: string = "perform this action"
): void {
  if (!hasPermission(userRole, allowedRoles)) {
    throw new Error(`Insufficient permissions to ${action}. Required roles: ${allowedRoles.join(", ")}`);
  }
}

// Role hierarchy helpers
export const ADMIN_ROLES: WorkspaceRole[] = ["owner", "admin"];
export const WRITE_ROLES: WorkspaceRole[] = ["owner", "admin", "member"];
export const ALL_ROLES: WorkspaceRole[] = ["owner", "admin", "member", "viewer"];

/**
 * Generate a random token for invites
 */
export function generateInviteToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

/**
 * Generate a random API key
 */
export function generateApiKey(): { key: string; prefix: string } {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let key = "x402_";
  for (let i = 0; i < 40; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return {
    key,
    prefix: key.substring(0, 12) + "...",
  };
}

/**
 * Create a URL-friendly slug from a string
 */
export function createSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 50);
}


