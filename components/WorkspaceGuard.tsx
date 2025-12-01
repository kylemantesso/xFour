"use client";

import { useEffect, ReactNode, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "../convex/_generated/api";

interface WorkspaceGuardProps {
  children: ReactNode;
}

/**
 * WorkspaceGuard ensures the user has a Convex user record and at least one workspace.
 * Wrap your authenticated content with this component.
 */
export function WorkspaceGuard({ children }: WorkspaceGuardProps) {
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser();
  const { isAuthenticated: isConvexAuthenticated, isLoading: isConvexLoading } = useConvexAuth();
  const userData = useQuery(api.users.getCurrentUser);
  const ensureUserAndWorkspace = useMutation(api.users.ensureUserAndWorkspace);
  const [hasCalledEnsure, setHasCalledEnsure] = useState(false);

  useEffect(() => {
    // Only run if both Clerk and Convex are ready and authenticated
    if (!clerkLoaded || !clerkUser) return;
    if (isConvexLoading || !isConvexAuthenticated) return;

    // If we already have user data, no need to ensure
    if (userData !== undefined && userData !== null) return;

    // Prevent duplicate calls
    if (hasCalledEnsure) return;

    // Ensure user and workspace exist
    const email = clerkUser.primaryEmailAddress?.emailAddress ?? "";
    const name = clerkUser.fullName ?? clerkUser.firstName ?? undefined;

    setHasCalledEnsure(true);
    ensureUserAndWorkspace({ email, name }).catch((err) => {
      console.error("Failed to ensure user and workspace:", err);
      setHasCalledEnsure(false); // Allow retry
    });
  }, [clerkLoaded, clerkUser, userData, ensureUserAndWorkspace, isConvexAuthenticated, isConvexLoading, hasCalledEnsure]);

  // Show loading state while Clerk is loading
  if (!clerkLoaded) {
    return <LoadingState message="Loading authentication..." />;
  }

  // If no Clerk user, don't render children (user needs to sign in)
  if (!clerkUser) {
    return null;
  }

  // Show loading state while Convex auth is syncing
  if (isConvexLoading || !isConvexAuthenticated) {
    return <LoadingState message="Connecting to server..." />;
  }

  // Show loading state while fetching Convex user data
  if (userData === undefined) {
    return <LoadingState message="Setting up your workspace..." />;
  }

  // User is authenticated and has workspace data
  return <>{children}</>;
}

function LoadingState({ message }: { message: string }) {
  return (
    <div className="min-h-[200px] flex flex-col items-center justify-center gap-4">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" />
        <div
          className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"
          style={{ animationDelay: "0.1s" }}
        />
        <div
          className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce"
          style={{ animationDelay: "0.2s" }}
        />
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-400">{message}</p>
    </div>
  );
}

