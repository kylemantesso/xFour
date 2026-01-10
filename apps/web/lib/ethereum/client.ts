/**
 * Ethereum Client Factory
 * 
 * Creates viem public and wallet clients for interacting with Ethereum networks.
 * Supports mainnet and Sepolia testnet.
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  type PublicClient,
  type WalletClient,
  type Chain,
  type Transport,
  type Account,
} from "viem";
import { mainnet, sepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

export type EthereumNetwork = "mainnet" | "sepolia";

/**
 * Get the RPC URL for a given network from environment variables
 */
function getRpcUrl(network: EthereumNetwork): string {
  if (network === "mainnet") {
    const url = process.env.ETHEREUM_RPC_URL;
    if (!url) {
      throw new Error("ETHEREUM_RPC_URL environment variable not set");
    }
    return url;
  }

  const url = process.env.SEPOLIA_RPC_URL;
  if (!url) {
    throw new Error("SEPOLIA_RPC_URL environment variable not set");
  }
  return url;
}

/**
 * Get the chain configuration for a given network
 */
export function getChain(network: EthereumNetwork): Chain {
  return network === "mainnet" ? mainnet : sepolia;
}

/**
 * Get the chain ID for a given network
 */
export function getChainId(network: EthereumNetwork): number {
  return network === "mainnet" ? 1 : 11155111;
}

/**
 * Create a public client for reading blockchain data
 * 
 * @param network - The Ethereum network to connect to
 * @returns A viem PublicClient instance
 */
export function createEthereumPublicClient(
  network: EthereumNetwork
): PublicClient<Transport, Chain> {
  const chain = getChain(network);
  const rpcUrl = getRpcUrl(network);

  return createPublicClient({
    chain,
    transport: http(rpcUrl),
  });
}

/**
 * Create a wallet client for signing transactions
 * 
 * @param network - The Ethereum network to connect to
 * @param privateKey - The private key for the wallet (hex string, with or without 0x prefix)
 * @returns A viem WalletClient instance with the account
 */
export function createEthereumWalletClient(
  network: EthereumNetwork,
  privateKey: string
): WalletClient<Transport, Chain, Account> {
  const chain = getChain(network);
  const rpcUrl = getRpcUrl(network);

  // Ensure private key has 0x prefix
  const normalizedKey = privateKey.startsWith("0x")
    ? (privateKey as `0x${string}`)
    : (`0x${privateKey}` as `0x${string}`);

  const account = privateKeyToAccount(normalizedKey);

  return createWalletClient({
    account,
    chain,
    transport: http(rpcUrl),
  });
}

/**
 * Get the block explorer URL for a transaction
 */
export function getExplorerTxUrl(network: EthereumNetwork, txHash: string): string {
  const baseUrl = network === "mainnet" 
    ? "https://etherscan.io" 
    : "https://sepolia.etherscan.io";
  return `${baseUrl}/tx/${txHash}`;
}

/**
 * Get the block explorer URL for an address
 */
export function getExplorerAddressUrl(network: EthereumNetwork, address: string): string {
  const baseUrl = network === "mainnet" 
    ? "https://etherscan.io" 
    : "https://sepolia.etherscan.io";
  return `${baseUrl}/address/${address}`;
}

/**
 * Get the block explorer URL for a token
 */
export function getExplorerTokenUrl(
  network: EthereumNetwork, 
  tokenAddress: string, 
  holderAddress?: string
): string {
  const baseUrl = network === "mainnet" 
    ? "https://etherscan.io" 
    : "https://sepolia.etherscan.io";
  
  if (holderAddress) {
    return `${baseUrl}/token/${tokenAddress}?a=${holderAddress}`;
  }
  return `${baseUrl}/token/${tokenAddress}`;
}
