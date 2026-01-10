/**
 * MNEE ERC20 Contract Configuration
 * 
 * This file contains the ABI and contract addresses for the MNEE token on Ethereum.
 * - Mainnet: Official MNEE contract
 * - Sepolia: TestMNEE contract deployed for testing
 */

import { type Address } from "viem";

/**
 * MNEE Contract Addresses
 */
export const MNEE_CONTRACT_ADDRESSES = {
  mainnet: "0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF" as Address,
  // TODO: Update this after deploying TestMNEE to Sepolia
  sepolia: "0x0000000000000000000000000000000000000000" as Address,
} as const;

/**
 * Get the MNEE contract address for a given network
 */
export function getMneeContractAddress(network: "mainnet" | "sepolia"): Address {
  return MNEE_CONTRACT_ADDRESSES[network];
}

/**
 * MNEE ERC20 ABI
 * Standard ERC20 interface used by the MNEE token
 */
export const MNEE_ABI = [
  // ERC20 Standard Functions
  {
    inputs: [],
    name: "name",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalSupply",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "owner", type: "address" },
      { internalType: "address", name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "from", type: "address" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "transferFrom",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "from", type: "address" },
      { indexed: true, internalType: "address", name: "to", type: "address" },
      { indexed: false, internalType: "uint256", name: "value", type: "uint256" },
    ],
    name: "Transfer",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "owner", type: "address" },
      { indexed: true, internalType: "address", name: "spender", type: "address" },
      { indexed: false, internalType: "uint256", name: "value", type: "uint256" },
    ],
    name: "Approval",
    type: "event",
  },
] as const;

/**
 * TestMNEE ABI (extends ERC20 with mint functions)
 * Used only on Sepolia testnet
 */
export const TEST_MNEE_ABI = [
  ...MNEE_ABI,
  // Faucet mint function
  {
    inputs: [
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "mint",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // View functions
  {
    inputs: [],
    name: "MAX_MINT_AMOUNT",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "MINT_COOLDOWN",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "lastMintTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

/**
 * MNEE token has 18 decimals (standard ERC20)
 */
export const MNEE_DECIMALS = 18;

/**
 * Parse MNEE amount from human-readable format to wei
 */
export function parseMneeAmount(amount: number | string): bigint {
  const amountStr = typeof amount === "number" ? amount.toString() : amount;
  const [whole, fraction = ""] = amountStr.split(".");
  const paddedFraction = fraction.padEnd(MNEE_DECIMALS, "0").slice(0, MNEE_DECIMALS);
  return BigInt(whole + paddedFraction);
}

/**
 * Format MNEE amount from wei to human-readable format
 */
export function formatMneeAmount(amount: bigint, decimals: number = 2): string {
  const divisor = BigInt(10 ** MNEE_DECIMALS);
  const whole = amount / divisor;
  const fraction = amount % divisor;
  
  const fractionStr = fraction.toString().padStart(MNEE_DECIMALS, "0");
  const trimmedFraction = fractionStr.slice(0, decimals);
  
  if (decimals === 0 || Number(trimmedFraction) === 0) {
    return whole.toString();
  }
  
  return `${whole}.${trimmedFraction}`;
}
