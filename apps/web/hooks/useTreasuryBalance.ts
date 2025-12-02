"use client";

import { useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { treasuryAbi } from "../lib/contracts";
import { TREASURY_ADDRESS, localhost } from "../lib/wagmi";

/**
 * Hook that returns the workspace's treasury balance
 */
export function useTreasuryBalance(
  workspaceKey: `0x${string}` | null,
  decimals: number | undefined
) {
  const {
    data: balance,
    isLoading,
    error,
    refetch,
  } = useReadContract({
    address: TREASURY_ADDRESS,
    abi: treasuryAbi,
    functionName: "balances",
    args: workspaceKey ? [workspaceKey] : undefined,
    chainId: localhost.id,
    query: {
      enabled: !!workspaceKey && !!TREASURY_ADDRESS,
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

