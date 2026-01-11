/**
 * Treasury Contract Interactions
 * 
 * Functions for interacting with the x402 Treasury system:
 * - TreasuryFactory: Deploy new treasuries
 * - Treasury: Manage deposits, withdrawals, and API key limits
 * - X402Gateway: Execute payments
 */

import {
  type Address,
  type Hex,
  keccak256,
  toBytes,
  parseUnits,
  formatUnits,
  encodeFunctionData,
} from "viem";
import { createEthereumPublicClient, createEthereumWalletClient, type EthereumNetwork } from "./client";

// ============================================
// CONTRACT ABIS (minimal interfaces)
// ============================================

export const TREASURY_FACTORY_ABI = [
  {
    inputs: [{ name: "workspaceId", type: "string" }, { name: "admin", type: "address" }],
    name: "createTreasury",
    outputs: [{ name: "treasury", type: "address" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "workspaceId", type: "string" }],
    name: "getTreasury",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "", type: "address" }],
    name: "isTreasury",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getTreasuryCount",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "token",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "defaultGateway",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  // Events
  {
    type: "event",
    name: "TreasuryCreated",
    inputs: [
      { name: "workspaceId", type: "string", indexed: true },
      { name: "treasury", type: "address", indexed: true },
      { name: "admin", type: "address", indexed: true },
    ],
  },
] as const;

export const TREASURY_ABI = [
  // Read functions
  {
    inputs: [],
    name: "getBalance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getStats",
    outputs: [
      { name: "balance", type: "uint256" },
      { name: "deposits", type: "uint256" },
      { name: "withdrawals", type: "uint256" },
      { name: "payments", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "apiKeyHash", type: "bytes32" }],
    name: "apiKeyLimits",
    outputs: [
      { name: "maxPerTransaction", type: "uint256" },
      { name: "dailyLimit", type: "uint256" },
      { name: "monthlyLimit", type: "uint256" },
      { name: "isActive", type: "bool" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "apiKeyHash", type: "bytes32" }],
    name: "getCurrentSpending",
    outputs: [
      { name: "dailySpent", type: "uint256" },
      { name: "monthlySpent", type: "uint256" },
      { name: "totalSpent", type: "uint256" },
      { name: "transactionCount", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "apiKeyHash", type: "bytes32" }],
    name: "getRemainingAllowance",
    outputs: [
      { name: "remainingDaily", type: "uint256" },
      { name: "remainingMonthly", type: "uint256" },
      { name: "remainingPerTx", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "apiKeyHash", type: "bytes32" }, { name: "amount", type: "uint256" }],
    name: "checkPaymentAllowed",
    outputs: [
      { name: "allowed", type: "bool" },
      { name: "reason", type: "string" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "token",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "workspaceId",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "paused",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  // Write functions
  {
    inputs: [{ name: "amount", type: "uint256" }],
    name: "deposit",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }],
    name: "withdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "apiKeyHash", type: "bytes32" },
      { name: "maxPerTransaction", type: "uint256" },
      { name: "dailyLimit", type: "uint256" },
      { name: "monthlyLimit", type: "uint256" },
      { name: "isActive", type: "bool" },
    ],
    name: "configureApiKey",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "apiKeyHash", type: "bytes32" }],
    name: "deactivateApiKey",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "pause",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "unpause",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // AccessControl functions
  {
    inputs: [],
    name: "ADMIN_ROLE",
    outputs: [{ name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "GATEWAY_ROLE",
    outputs: [{ name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "role", type: "bytes32" }, { name: "account", type: "address" }],
    name: "hasRole",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "role", type: "bytes32" }, { name: "account", type: "address" }],
    name: "grantRole",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "role", type: "bytes32" }, { name: "account", type: "address" }],
    name: "revokeRole",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export const X402_GATEWAY_ABI = [
  {
    inputs: [
      { name: "treasury", type: "address" },
      { name: "apiKeyHash", type: "bytes32" },
      { name: "recipient", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "invoiceId", type: "string" },
      { name: "nonce", type: "bytes32" },
    ],
    name: "executePayment",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "treasury", type: "address" },
      { name: "apiKeyHash", type: "bytes32" },
      { name: "amount", type: "uint256" },
    ],
    name: "checkPaymentAllowed",
    outputs: [
      { name: "allowed", type: "bool" },
      { name: "reason", type: "string" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getStats",
    outputs: [
      { name: "payments", type: "uint256" },
      { name: "volume", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "nonce", type: "bytes32" }],
    name: "isNonceUsed",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const ERC20_ABI = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }],
    name: "transfer",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Hash an API key to get the on-chain identifier
 */
export function hashApiKey(apiKey: string): Hex {
  return keccak256(toBytes(apiKey));
}

/**
 * Generate a unique nonce for a payment
 */
export function generatePaymentNonce(): Hex {
  const timestamp = Date.now().toString(16).padStart(16, "0");
  const random = Math.random().toString(16).slice(2).padStart(48, "0");
  return keccak256(toBytes(timestamp + random));
}

/**
 * Parse MNEE amount from human readable to contract units (18 decimals)
 */
export function parseMneeAmount(amount: number | string): bigint {
  return parseUnits(amount.toString(), 18);
}

/**
 * Format MNEE amount from contract units (18 decimals) to human readable
 */
export function formatMneeAmount(amount: bigint): string {
  return formatUnits(amount, 18);
}

// ============================================
// TREASURY FACTORY INTERACTIONS
// ============================================

export interface ContractAddresses {
  mneeToken: Address;
  treasuryFactory: Address;
  x402Gateway: Address;
}

/**
 * Get contract addresses for a network
 */
export function getContractAddresses(network: EthereumNetwork): ContractAddresses {
  if (network === "mainnet") {
    return {
      mneeToken: (process.env.NEXT_PUBLIC_MAINNET_MNEE_TOKEN || "0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF") as Address,
      treasuryFactory: (process.env.NEXT_PUBLIC_MAINNET_TREASURY_FACTORY || "") as Address,
      x402Gateway: (process.env.NEXT_PUBLIC_MAINNET_X402_GATEWAY || "") as Address,
    };
  }
  
  // Sepolia testnet contracts
  return {
    mneeToken: (process.env.NEXT_PUBLIC_SEPOLIA_MNEE_TOKEN || "0x0709AA400ef60be15AE4a3B62A29253fdBA840D3") as Address,
    treasuryFactory: (process.env.NEXT_PUBLIC_SEPOLIA_TREASURY_FACTORY || "0x7e23d968C236c7e680bF400A2Ee3765F8e289251") as Address,
    x402Gateway: (process.env.NEXT_PUBLIC_SEPOLIA_X402_GATEWAY || "0x57a0196D1dDF8CEC9e9447e0628084c3Ec7A5854") as Address,
  };
}

/**
 * Get treasury address for a workspace
 */
export async function getTreasuryAddress(
  network: EthereumNetwork,
  workspaceId: string
): Promise<Address | null> {
  const client = createEthereumPublicClient(network);
  const addresses = getContractAddresses(network);
  
  if (!addresses.treasuryFactory) {
    console.warn(`Treasury factory not configured for ${network}`);
    return null;
  }

  try {
    const treasury = await client.readContract({
      address: addresses.treasuryFactory,
      abi: TREASURY_FACTORY_ABI,
      functionName: "getTreasury",
      args: [workspaceId],
    });

    return treasury === "0x0000000000000000000000000000000000000000" ? null : treasury;
  } catch (error) {
    console.error("Error getting treasury address:", error);
    return null;
  }
}

// ============================================
// TREASURY READ OPERATIONS
// ============================================

export interface TreasuryStats {
  balance: number;
  totalDeposits: number;
  totalWithdrawals: number;
  totalPayments: number;
}

/**
 * Get treasury balance and stats
 */
export async function getTreasuryStats(
  network: EthereumNetwork,
  treasuryAddress: Address
): Promise<TreasuryStats> {
  const client = createEthereumPublicClient(network);

  const [balance, deposits, withdrawals, payments] = await client.readContract({
    address: treasuryAddress,
    abi: TREASURY_ABI,
    functionName: "getStats",
  });

  return {
    balance: parseFloat(formatMneeAmount(balance)),
    totalDeposits: parseFloat(formatMneeAmount(deposits)),
    totalWithdrawals: parseFloat(formatMneeAmount(withdrawals)),
    totalPayments: parseFloat(formatMneeAmount(payments)),
  };
}

/**
 * Get treasury balance
 */
export async function getTreasuryBalance(
  network: EthereumNetwork,
  treasuryAddress: Address
): Promise<number> {
  const client = createEthereumPublicClient(network);

  const balance = await client.readContract({
    address: treasuryAddress,
    abi: TREASURY_ABI,
    functionName: "getBalance",
  });

  return parseFloat(formatMneeAmount(balance));
}

export interface ApiKeyLimits {
  maxPerTransaction: number;
  dailyLimit: number;
  monthlyLimit: number;
  isActive: boolean;
}

/**
 * Get API key spending limits from treasury contract
 */
export async function getApiKeyLimits(
  network: EthereumNetwork,
  treasuryAddress: Address,
  apiKeyHash: Hex
): Promise<ApiKeyLimits> {
  const client = createEthereumPublicClient(network);

  const [maxPerTransaction, dailyLimit, monthlyLimit, isActive] = await client.readContract({
    address: treasuryAddress,
    abi: TREASURY_ABI,
    functionName: "apiKeyLimits",
    args: [apiKeyHash],
  });

  return {
    maxPerTransaction: parseFloat(formatMneeAmount(maxPerTransaction)),
    dailyLimit: parseFloat(formatMneeAmount(dailyLimit)),
    monthlyLimit: parseFloat(formatMneeAmount(monthlyLimit)),
    isActive,
  };
}

export interface ApiKeySpending {
  dailySpent: number;
  monthlySpent: number;
  totalSpent: number;
  transactionCount: number;
}

/**
 * Get current spending for an API key
 */
export async function getApiKeySpending(
  network: EthereumNetwork,
  treasuryAddress: Address,
  apiKeyHash: Hex
): Promise<ApiKeySpending> {
  const client = createEthereumPublicClient(network);

  const [dailySpent, monthlySpent, totalSpent, transactionCount] = await client.readContract({
    address: treasuryAddress,
    abi: TREASURY_ABI,
    functionName: "getCurrentSpending",
    args: [apiKeyHash],
  });

  return {
    dailySpent: parseFloat(formatMneeAmount(dailySpent)),
    monthlySpent: parseFloat(formatMneeAmount(monthlySpent)),
    totalSpent: parseFloat(formatMneeAmount(totalSpent)),
    transactionCount: Number(transactionCount),
  };
}

export interface RemainingAllowance {
  remainingDaily: number;
  remainingMonthly: number;
  remainingPerTx: number;
}

/**
 * Get remaining allowance for an API key
 */
export async function getRemainingAllowance(
  network: EthereumNetwork,
  treasuryAddress: Address,
  apiKeyHash: Hex
): Promise<RemainingAllowance> {
  const client = createEthereumPublicClient(network);

  const [remainingDaily, remainingMonthly, remainingPerTx] = await client.readContract({
    address: treasuryAddress,
    abi: TREASURY_ABI,
    functionName: "getRemainingAllowance",
    args: [apiKeyHash],
  });

  // Handle max uint256 (unlimited)
  const MAX_UINT = BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
  
  return {
    remainingDaily: remainingDaily === MAX_UINT ? Infinity : parseFloat(formatMneeAmount(remainingDaily)),
    remainingMonthly: remainingMonthly === MAX_UINT ? Infinity : parseFloat(formatMneeAmount(remainingMonthly)),
    remainingPerTx: remainingPerTx === MAX_UINT ? Infinity : parseFloat(formatMneeAmount(remainingPerTx)),
  };
}

/**
 * Check if a payment would be allowed
 */
export async function checkPaymentAllowed(
  network: EthereumNetwork,
  treasuryAddress: Address,
  apiKeyHash: Hex,
  amount: number
): Promise<{ allowed: boolean; reason: string }> {
  const client = createEthereumPublicClient(network);

  const [allowed, reason] = await client.readContract({
    address: treasuryAddress,
    abi: TREASURY_ABI,
    functionName: "checkPaymentAllowed",
    args: [apiKeyHash, parseMneeAmount(amount)],
  });

  return { allowed, reason };
}

// ============================================
// TREASURY WRITE OPERATIONS (via wallet client)
// ============================================

/**
 * Build transaction data for approving MNEE to treasury
 */
export function buildApproveTransaction(
  network: EthereumNetwork,
  treasuryAddress: Address,
  amount: number
): { to: Address; data: Hex } {
  const addresses = getContractAddresses(network);
  
  const data = encodeFunctionData({
    abi: ERC20_ABI,
    functionName: "approve",
    args: [treasuryAddress, parseMneeAmount(amount)],
  });

  return { to: addresses.mneeToken, data };
}

/**
 * Build transaction data for depositing to treasury
 */
export function buildDepositTransaction(
  treasuryAddress: Address,
  amount: number
): { to: Address; data: Hex } {
  const data = encodeFunctionData({
    abi: TREASURY_ABI,
    functionName: "deposit",
    args: [parseMneeAmount(amount)],
  });

  return { to: treasuryAddress, data };
}

/**
 * Build transaction data for configuring API key limits
 */
export function buildConfigureApiKeyTransaction(
  treasuryAddress: Address,
  apiKeyHash: Hex,
  limits: {
    maxPerTransaction: number;
    dailyLimit: number;
    monthlyLimit: number;
    isActive: boolean;
  }
): { to: Address; data: Hex } {
  const data = encodeFunctionData({
    abi: TREASURY_ABI,
    functionName: "configureApiKey",
    args: [
      apiKeyHash,
      parseMneeAmount(limits.maxPerTransaction),
      parseMneeAmount(limits.dailyLimit),
      parseMneeAmount(limits.monthlyLimit),
      limits.isActive,
    ],
  });

  return { to: treasuryAddress, data };
}

// ============================================
// GATEWAY PAYMENT EXECUTION (server-side only)
// ============================================

/**
 * Execute a payment through the X402 Gateway
 * This is called by the server with the gateway's private key
 */
export async function executeGatewayPayment(
  network: EthereumNetwork,
  gatewayPrivateKey: string,
  params: {
    treasuryAddress: Address;
    apiKeyHash: Hex;
    recipient: Address;
    amount: number;
    invoiceId: string;
  }
): Promise<{ txHash: Hex; success: boolean; error?: string }> {
  try {
    const addresses = getContractAddresses(network);
    const publicClient = createEthereumPublicClient(network);
    const walletClient = createEthereumWalletClient(network, gatewayPrivateKey);

    // Generate unique nonce
    const nonce = generatePaymentNonce();

    // Check if nonce is already used (shouldn't happen with random nonces)
    const isUsed = await publicClient.readContract({
      address: addresses.x402Gateway,
      abi: X402_GATEWAY_ABI,
      functionName: "isNonceUsed",
      args: [nonce],
    });

    if (isUsed) {
      return { txHash: "0x" as Hex, success: false, error: "Nonce collision - retry" };
    }

    // Get the wallet account
    const [account] = await walletClient.getAddresses();

    // Estimate gas with a 15% buffer to avoid underestimation
    const gasEstimate = await publicClient.estimateContractGas({
      address: addresses.x402Gateway,
      abi: X402_GATEWAY_ABI,
      functionName: "executePayment",
      args: [
        params.treasuryAddress,
        params.apiKeyHash,
        params.recipient,
        parseMneeAmount(params.amount),
        params.invoiceId,
        nonce,
      ],
      account,
    });

    // Add 15% buffer to gas estimate
    const gasLimit = (gasEstimate * BigInt(115)) / BigInt(100);

    // Execute payment with manual gas limit
    const hash = await walletClient.writeContract({
      address: addresses.x402Gateway,
      abi: X402_GATEWAY_ABI,
      functionName: "executePayment",
      args: [
        params.treasuryAddress,
        params.apiKeyHash,
        params.recipient,
        parseMneeAmount(params.amount),
        params.invoiceId,
        nonce,
      ],
      gas: gasLimit,
    });

    // Wait for confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    if (receipt.status === "reverted") {
      return { txHash: hash, success: false, error: "Transaction reverted" };
    }

    return { txHash: hash, success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Gateway payment execution failed:", errorMessage);
    return { txHash: "0x" as Hex, success: false, error: errorMessage };
  }
}
