"use client";

/**
 * Web3Provider Component
 * 
 * Wraps the application with wagmi and Web3Modal for wallet connectivity.
 * Enables users to connect their wallets to manage treasuries.
 */

import { createWeb3Modal } from "@web3modal/wagmi/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type State, WagmiProvider } from "wagmi";
import { ReactNode, useState, useRef, createContext, useContext } from "react";
import { wagmiConfig, projectId } from "@/lib/web3/config";

// Context to track if Web3Modal is available
const Web3ModalContext = createContext<boolean>(false);
export const useWeb3ModalAvailable = () => useContext(Web3ModalContext);

interface Web3ProviderProps {
  children: ReactNode;
  initialState?: State;
}

export function Web3Provider({ children, initialState }: Web3ProviderProps) {
  const [queryClient] = useState(() => new QueryClient());
  
  // Use a ref to track initialization and ensure it happens exactly once
  const initialized = useRef(false);
  const modalAvailable = useRef(false);
  
  if (typeof window !== "undefined" && !initialized.current && projectId) {
    try {
      createWeb3Modal({
        wagmiConfig,
        projectId,
        enableAnalytics: false,
        enableOnramp: false,
        themeMode: "dark",
        themeVariables: {
          "--w3m-accent": "#6366f1",
          "--w3m-border-radius-master": "8px",
        },
      });
      modalAvailable.current = true;
    } catch (e) {
      console.error("Failed to create Web3Modal:", e);
    }
    initialized.current = true;
  }

  return (
    <WagmiProvider config={wagmiConfig} initialState={initialState}>
      <QueryClientProvider client={queryClient}>
        <Web3ModalContext.Provider value={modalAvailable.current}>
          {children}
        </Web3ModalContext.Provider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
