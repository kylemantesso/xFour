"use client";

import { useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { erc20Abi } from "../lib/contracts";

/**
 * Hook that returns the ERC-20 token balance for a given address and token
 */
export function useTokenBalance(
  tokenAddress: `0x${string}` | undefined,
  walletAddress: `0x${string}` | undefined,
  chainId?: number
) {
  // Fetch token decimals
  const {
    data: decimals,
    isLoading: decimalsLoading,
    error: decimalsError,
  } = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: "decimals",
    chainId: chainId,
    query: {
      enabled: !!tokenAddress,
    },
  });

  // Fetch token balance
  const {
    data: balance,
    isLoading: balanceLoading,
    error: balanceError,
    refetch,
  } = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: walletAddress ? [walletAddress] : undefined,
    chainId: chainId,
    query: {
      enabled: !!walletAddress && !!tokenAddress,
    },
  });

  // Format balance to human-readable string
  const formattedBalance =
    balance !== undefined && decimals !== undefined
      ? formatUnits(balance, decimals)
      : null;

  return {
    balance,
    decimals,
    formattedBalance,
    isLoading: decimalsLoading || balanceLoading,
    error: decimalsError || balanceError,
    refetch,
  };
}

/**
 * Hook that returns the current allowance for a spender on a specific token
 */
export function useTokenAllowance(
  tokenAddress: `0x${string}` | undefined,
  owner: `0x${string}` | undefined,
  spender: `0x${string}` | undefined,
  chainId?: number
) {
  const { data: allowance, refetch } = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: "allowance",
    args: owner && spender ? [owner, spender] : undefined,
    chainId: chainId,
    query: {
      enabled: !!owner && !!spender && !!tokenAddress,
    },
  });

  return { allowance, refetch };
}
