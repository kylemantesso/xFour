"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { keccak256, toHex } from "viem";
import { api } from "../convex/_generated/api";

/**
 * Hook that returns the current workspace and its derived bytes32 key
 * for use with the ERC20WorkspaceTreasury contract.
 *
 * The workspaceKey is derived as: keccak256(utf8Bytes(workspace._id))
 */
export function useWorkspaceKey() {
  const workspaceData = useQuery(api.workspaces.getCurrentWorkspace);

  const workspaceKey = useMemo(() => {
    if (!workspaceData?.workspace?._id) return null;
    // Convert the workspace ID to bytes and hash it
    return keccak256(toHex(workspaceData.workspace._id));
  }, [workspaceData?.workspace?._id]);

  return {
    workspace: workspaceData?.workspace ?? null,
    workspaceKey,
    role: workspaceData?.role ?? null,
    isLoading: workspaceData === undefined,
  };
}

