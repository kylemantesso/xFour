"use client";

/**
 * ConnectWallet Component
 * 
 * Button/UI for connecting a wallet via Web3Modal.
 * Shows connection status.
 */

import { useWeb3Modal } from "@web3modal/wagmi/react";
import { useAccount, useDisconnect, useBalance } from "wagmi";
import { formatUnits } from "viem";
import { useWeb3ModalAvailable } from "./Web3Provider";

interface ConnectWalletProps {
  className?: string;
  showBalance?: boolean;
  variant?: "button" | "compact";
}

// Inner component that uses useWeb3Modal hook
function ConnectWalletInner({ 
  className = "", 
  showBalance = false,
  variant = "button" 
}: ConnectWalletProps) {
  const { open } = useWeb3Modal();
  const { address, isConnecting, isConnected, chain } = useAccount();
  const { disconnect } = useDisconnect();
  const { data: balance } = useBalance({ address });

  // Truncate address for display
  const truncatedAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : "";

  if (isConnecting) {
    return (
      <button
        className={`flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-700 text-gray-400 cursor-wait ${className}`}
        disabled
      >
        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Connecting...
      </button>
    );
  }

  if (isConnected && address) {
    if (variant === "compact") {
      return (
        <div className={`flex items-center gap-2 ${className}`}>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-sm font-mono text-gray-300">{truncatedAddress}</span>
            {chain && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-gray-700 text-gray-400">
                {chain.name}
              </span>
            )}
          </div>
          <button
            onClick={() => disconnect()}
            className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-500 hover:text-gray-300 transition-colors"
            title="Disconnect wallet"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      );
    }

    return (
      <div className={`flex flex-col gap-2 ${className}`}>
        <div className="flex items-center justify-between p-3 rounded-lg bg-gray-800 border border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <div>
              <p className="font-mono text-sm text-white">{truncatedAddress}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-xs text-gray-400">
                  {chain?.name || "Unknown Network"}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => open({ view: "Networks" })}
              className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
              title="Switch network"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </button>
            <button
              onClick={() => disconnect()}
              className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-red-400 transition-colors"
              title="Disconnect"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
        
        {showBalance && balance && (
          <div className="flex justify-between items-center px-3 py-2 rounded-lg bg-gray-800/50 border border-gray-700/50">
            <span className="text-sm text-gray-400">ETH Balance</span>
            <span className="font-mono text-sm text-white">
              {parseFloat(formatUnits(balance.value, balance.decimals)).toFixed(4)} ETH
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => open()}
      className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors ${className}`}
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
      Connect Wallet
    </button>
  );
}

// Fallback when Web3Modal is not configured
function WalletNotConfigured({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 border border-amber-600/50 ${className}`}>
      <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <span className="text-sm text-amber-400">Wallet not configured</span>
    </div>
  );
}

// Exported wrapper that checks if modal is available
export function ConnectWallet(props: ConnectWalletProps) {
  const modalAvailable = useWeb3ModalAvailable();
  
  if (!modalAvailable) {
    return <WalletNotConfigured className={props.className} />;
  }
  
  return <ConnectWalletInner {...props} />;
}

/**
 * Hook to get the current wallet connection state
 * Note: This hook requires Web3Modal to be configured
 */
export function useWalletConnection() {
  const modalAvailable = useWeb3ModalAvailable();
  const { address, isConnecting, isConnected, chain } = useAccount();
  const { disconnect } = useDisconnect();

  return {
    address,
    isConnecting,
    isConnected,
    chain,
    chainId: chain?.id,
    networkName: chain?.name,
    connect: modalAvailable ? () => {} : () => console.warn("Web3Modal not configured"),
    disconnect,
    switchNetwork: modalAvailable ? () => {} : () => console.warn("Web3Modal not configured"),
    modalAvailable,
  };
}
