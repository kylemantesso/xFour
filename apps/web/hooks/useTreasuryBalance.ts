"use client";

import { useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { treasuryAbi } from "../lib/contracts";

/**
 * Hook that returns the workspace's treasury balance for a specific token
 * @param tokenAddress - The ERC20 token address
 * @param workspaceKey - The workspace key (bytes32)
 * @param decimals - Token decimals for formatting
 * @param treasuryAddress - The treasury contract address (from Convex chain config)
 * @param chainId - The chain ID to query
 */
export function useTreasuryBalance(
  tokenAddress: `0x${string}` | null,
  workspaceKey: `0x${string}` | null,
  decimals: number | undefined,
  treasuryAddress?: `0x${string}` | null,
  chainId?: number
) {
  const {
    data: balance,
    isLoading,
    error,
    refetch,
  } = useReadContract({
    address: treasuryAddress as `0x${string}`,
    abi: treasuryAbi,
    functionName: "balances",
    args: tokenAddress && workspaceKey ? [tokenAddress, workspaceKey] : undefined,
    chainId: chainId,
    query: {
      enabled: !!tokenAddress && !!workspaceKey && !!treasuryAddress,
    },
  });

  // Format balance to human-readable string
  const formattedBalance =
    balance !== undefined && decimals !== undefined
      ? formatUnits(balance, decimals)
      : null;

  return {
    balance,
    formattedBalance,
    isLoading,
    error,
    refetch,
  };
}
