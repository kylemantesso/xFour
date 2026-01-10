/**
 * Web3Modal/Wagmi Configuration
 * 
 * Configures WalletConnect for connecting user wallets to manage treasuries.
 */

import { defaultWagmiConfig } from "@web3modal/wagmi/react/config";
import { cookieStorage, createStorage } from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";

// Get WalletConnect project ID from environment
export const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "";

if (!projectId) {
  console.warn("NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set. WalletConnect will not work.");
}

// Metadata for WalletConnect
const metadata = {
  name: "x402 Gateway",
  description: "Non-custodial payment gateway for AI agents using MNEE stablecoin",
  url: typeof window !== "undefined" ? window.location.origin : "https://www.xfour.xyz",
  icons: ["https://www.xfour.xyz/icon.png"],
};

// Supported chains
export const chains = [mainnet, sepolia] as const;

// Create wagmi config
export const wagmiConfig = defaultWagmiConfig({
  chains,
  projectId,
  metadata,
  ssr: true,
  storage: createStorage({
    storage: cookieStorage,
  }),
  enableWalletConnect: true,
  enableInjected: true,
  enableEIP6963: true,
  enableCoinbase: true,
});
