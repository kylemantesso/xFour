import { http, createConfig } from "wagmi";
import { defineChain } from "viem";
import { injected } from "wagmi/connectors";

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
 * wagmi configuration for the app
 */
export const wagmiConfig = createConfig({
  chains: [localhost],
  connectors: [injected()],
  transports: {
    [localhost.id]: http("http://127.0.0.1:8545"),
  },
  ssr: true,
});

/**
 * Contract addresses from environment variables
 */
export const TOKEN_ADDRESS = process.env
  .NEXT_PUBLIC_TOKEN_ADDRESS as `0x${string}`;
export const TREASURY_ADDRESS = process.env
  .NEXT_PUBLIC_TREASURY_ADDRESS as `0x${string}`;

