import { http, createConfig } from "wagmi";
import { defineChain } from "viem";
import { injected } from "wagmi/connectors";

// ============================================
// CHAIN CONFIGURATIONS
// ============================================

/**
 * Local Hardhat/Anvil chain configuration
 */
export const localhost = defineChain({
  id: 31337,
  name: "Localhost 31337",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH",
  },
  rpcUrls: {
    default: {
      http: ["http://127.0.0.1:8545"],
    },
  },
});

/**
 * Base Mainnet chain configuration
 */
export const base = defineChain({
  id: 8453,
  name: "Base",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH",
  },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_BASE_RPC_URL || "https://mainnet.base.org"],
    },
  },
  blockExplorers: {
    default: {
      name: "BaseScan",
      url: "https://basescan.org",
    },
  },
});

/**
 * Base Sepolia (testnet) chain configuration
 */
export const baseSepolia = defineChain({
  id: 84532,
  name: "Base Sepolia",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH",
  },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org"],
    },
  },
  blockExplorers: {
    default: {
      name: "BaseScan",
      url: "https://sepolia.basescan.org",
    },
  },
  testnet: true,
});

// ============================================
// 0x SWAP API URLS
// ============================================

/**
 * 0x Swap API URLs by environment
 */
export const ZEROX_API_URLS = {
  localhost: null, // Uses mock router
  base: "https://base.api.0x.org",
  "base-sepolia": "https://sepolia.base.api.0x.org",
} as const;

// ============================================
// WAGMI CONFIGURATION
// ============================================

/**
 * Get the active chain based on environment
 */
function getActiveChain() {
  const chainId = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "31337");
  switch (chainId) {
    case 8453:
      return base;
    case 84532:
      return baseSepolia;
    default:
      return localhost;
  }
}

const activeChain = getActiveChain();

/**
 * wagmi configuration for the app
 */
export const wagmiConfig = createConfig({
  chains: [activeChain],
  connectors: [injected()],
  transports: {
    [activeChain.id]: http(activeChain.rpcUrls.default.http[0]),
  } as Record<number, ReturnType<typeof http>>,
  ssr: true,
});

// ============================================
// CONTRACT ADDRESSES
// ============================================

/**
 * Contract addresses from environment variables
 * Note: Token addresses now come from Convex database (supportedTokens table)
 */
export const TREASURY_ADDRESS = process.env
  .NEXT_PUBLIC_TREASURY_ADDRESS as `0x${string}`;

/**
 * Swap router address (mock router for localhost)
 */
export const SWAP_ROUTER_ADDRESS = process.env
  .NEXT_PUBLIC_SWAP_ROUTER_ADDRESS as `0x${string}` | undefined;

/**
 * Get the current chain ID
 */
export function getChainId(): number {
  return parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "31337");
}

