"use client";

import { useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { erc20Abi } from "../lib/contracts";
import { TOKEN_ADDRESS, localhost } from "../lib/wagmi";

/**
 * Hook that returns the ERC-20 token balance for a given address
 */
export function useTokenBalance(address: `0x${string}` | undefined) {
  // Fetch token decimals
  const {
    data: decimals,
    isLoading: decimalsLoading,
    error: decimalsError,
  } = useReadContract({
    address: TOKEN_ADDRESS,
    abi: erc20Abi,
    functionName: "decimals",
    chainId: localhost.id,
    query: {
      enabled: !!TOKEN_ADDRESS,
    },
  });

  // Fetch token balance
  const {
    data: balance,
    isLoading: balanceLoading,
    error: balanceError,
    refetch,
  } = useReadContract({
    address: TOKEN_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: localhost.id,
    query: {
      enabled: !!address && !!TOKEN_ADDRESS,
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
 * Hook that returns the current allowance for the treasury contract
 */
export function useTokenAllowance(
  owner: `0x${string}` | undefined,
  spender: `0x${string}` | undefined
) {
  const { data: allowance, refetch } = useReadContract({
    address: TOKEN_ADDRESS,
    abi: erc20Abi,
    functionName: "allowance",
    args: owner && spender ? [owner, spender] : undefined,
    chainId: localhost.id,
    query: {
      enabled: !!owner && !!spender && !!TOKEN_ADDRESS,
    },
  });

  return { allowance, refetch };
}

