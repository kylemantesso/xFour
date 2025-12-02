"use client";

import { useState, useEffect } from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { parseUnits } from "viem";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { WorkspaceGuard } from "../../../components/WorkspaceGuard";
import { useWorkspaceKey } from "../../../hooks/useWorkspaceKey";
import { useTokenBalance, useTokenAllowance } from "../../../hooks/useTokenBalance";
import { useTreasuryBalance } from "../../../hooks/useTreasuryBalance";
import { erc20Abi, treasuryAbi } from "../../../lib/contracts";

// Types
type SupportedToken = {
  _id: string;
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  chainId: number;
  isActive: boolean;
};

// Icons
function WalletIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
      />
    </svg>
  );
}

function VaultIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
      />
    </svg>
  );
}

function ArrowDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 14l-7 7m0 0l-7-7m7 7V3"
      />
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function ExclamationIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

function TokenIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

type DepositPhase = "idle" | "approving" | "depositing" | "success" | "error";

export default function TreasuryPage() {
  return (
    <WorkspaceGuard>
      <TreasuryContent />
    </WorkspaceGuard>
  );
}

function TreasuryContent() {
  const { workspace, workspaceKey, isLoading: workspaceLoading } = useWorkspaceKey();
  const { address, isConnected, chain, chainId: walletChainId } = useAccount();
  const { connectors, connect, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();

  // Fetch all supported chains from Convex
  const supportedChains = useQuery(api.chains.listSupportedChains, { includeTestnets: true });

  // Selected chain (defaults to wallet chain, or first available chain)
  const [selectedChainId, setSelectedChainId] = useState<number | null>(null);

  // Set default selected chain when wallet connects or chains load
  useEffect(() => {
    if (selectedChainId === null) {
      if (walletChainId) {
        setSelectedChainId(walletChainId);
      } else if (supportedChains && supportedChains.length > 0) {
        setSelectedChainId(supportedChains[0].chainId);
      }
    }
  }, [walletChainId, supportedChains, selectedChainId]);

  // Current chain ID for filtering tokens (selected chain or wallet chain)
  const currentChainId = selectedChainId || walletChainId;
  const selectedChain = supportedChains?.find((c) => c.chainId === currentChainId);

  // Fetch workspace tokens from Convex for the selected chain
  const workspaceTokens = useQuery(
    api.tokens.listWorkspaceTokens, 
    currentChainId ? { chainId: currentChainId } : "skip"
  );

  // Fetch available tokens (not yet added to workspace) for selected chain
  const availableTokens = useQuery(
    api.tokens.listAvailableTokensForWorkspace,
    currentChainId ? { chainId: currentChainId } : "skip"
  );

  // Mutations for token management
  const addTokenToWorkspace = useMutation(api.tokens.addTokenToWorkspace);
  const removeTokenFromWorkspace = useMutation(api.tokens.removeTokenFromWorkspace);
  const [selectedTokenId, setSelectedTokenId] = useState<Id<"supportedTokens"> | null>(null);
  const [isAddingToken, setIsAddingToken] = useState(false);
  const [removingTokenId, setRemovingTokenId] = useState<Id<"supportedTokens"> | null>(null);

  const handleAddToken = async () => {
    if (!selectedTokenId) return;
    setIsAddingToken(true);
    try {
      await addTokenToWorkspace({ tokenId: selectedTokenId });
      setSelectedTokenId(null);
    } finally {
      setIsAddingToken(false);
    }
  };

  const handleRemoveToken = async (tokenId: Id<"supportedTokens">) => {
    if (!confirm("Remove this token from your workspace?")) return;
    setRemovingTokenId(tokenId);
    try {
      await removeTokenFromWorkspace({ tokenId });
    } finally {
      setRemovingTokenId(null);
    }
  };

  // Selected token for deposit
  const [selectedToken, setSelectedToken] = useState<SupportedToken | null>(null);
  const [isTokenDropdownOpen, setIsTokenDropdownOpen] = useState(false);

  // Set default selected token when tokens load
  useEffect(() => {
    if (workspaceTokens && workspaceTokens.length > 0 && !selectedToken) {
      setSelectedToken(workspaceTokens[0] as SupportedToken);
    }
  }, [workspaceTokens, selectedToken]);

  const selectedTokenAddress = selectedToken?.address as `0x${string}` | undefined;

  // Token balance for selected token
  const {
    formattedBalance: walletBalance,
    decimals,
    isLoading: tokenLoading,
    error: tokenError,
    refetch: refetchWalletBalance,
  } = useTokenBalance(selectedTokenAddress, address, walletChainId);

  // Get treasury address from selected chain
  const treasuryAddress = selectedChain?.treasuryAddress as `0x${string}` | undefined;

  // Treasury balance for selected token
  const {
    formattedBalance: treasuryBalance,
    isLoading: treasuryLoading,
    error: treasuryError,
    refetch: refetchTreasuryBalance,
  } = useTreasuryBalance(
    selectedTokenAddress ?? null,
    workspaceKey,
    selectedToken?.decimals,
    treasuryAddress,
    currentChainId
  );

  // Allowance for selected token
  const { allowance, refetch: refetchAllowance } = useTokenAllowance(
    selectedTokenAddress,
    address,
    treasuryAddress,
    walletChainId
  );

  // Deposit form state
  const [amount, setAmount] = useState("");
  const [depositPhase, setDepositPhase] = useState<DepositPhase>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Contract write hooks
  const {
    writeContract: writeApprove,
    data: approveHash,
    isPending: isApprovePending,
    error: approveError,
    reset: resetApprove,
  } = useWriteContract();

  const {
    writeContract: writeDeposit,
    data: depositHash,
    isPending: isDepositPending,
    error: depositError,
    reset: resetDeposit,
  } = useWriteContract();

  // Transaction receipt hooks
  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } =
    useWaitForTransactionReceipt({ hash: approveHash });

  const { isLoading: isDepositConfirming, isSuccess: isDepositSuccess } =
    useWaitForTransactionReceipt({ hash: depositHash });

  // Handle approve success -> deposit
  useEffect(() => {
    if (isApproveSuccess && depositPhase === "approving") {
      setDepositPhase("depositing");
      executeDeposit();
    }
  }, [isApproveSuccess, depositPhase]);

  // Handle deposit success
  useEffect(() => {
    if (isDepositSuccess && depositPhase === "depositing") {
      setDepositPhase("success");
      setAmount("");
      // Refetch balances
      refetchWalletBalance();
      refetchTreasuryBalance();
      refetchAllowance();
      // Reset after 3 seconds
      setTimeout(() => {
        setDepositPhase("idle");
        resetApprove();
        resetDeposit();
      }, 3000);
    }
  }, [isDepositSuccess, depositPhase]);

  // Handle errors
  useEffect(() => {
    if (approveError) {
      setDepositPhase("error");
      setErrorMessage(approveError.message || "Approval failed");
    }
  }, [approveError]);

  useEffect(() => {
    if (depositError) {
      setDepositPhase("error");
      setErrorMessage(depositError.message || "Deposit failed");
    }
  }, [depositError]);

  const executeDeposit = () => {
    if (!workspaceKey || !selectedToken || decimals === undefined) return;

    const amountInSmallestUnits = parseUnits(amount, decimals);

    if (!treasuryAddress) return;

    writeDeposit({
      address: treasuryAddress,
      abi: treasuryAbi,
      functionName: "deposit",
      args: [selectedToken.address as `0x${string}`, workspaceKey, amountInSmallestUnits],
    });
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setDepositPhase("idle");

    // Validate
    if (!selectedToken || !selectedTokenAddress) {
      setErrorMessage("Please select a token to deposit");
      return;
    }

    if (!treasuryAddress) {
      setErrorMessage("Treasury contract not deployed on this chain. Check admin panel.");
      return;
    }

    if (!isConnected || !address) {
      setErrorMessage("Please connect your wallet first");
      return;
    }

    if (!workspace || !workspaceKey) {
      setErrorMessage("No workspace selected");
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setErrorMessage("Please enter a valid amount greater than 0");
      return;
    }

    const walletBalanceNum = parseFloat(walletBalance || "0");
    if (amountNum > walletBalanceNum) {
      setErrorMessage(`Insufficient wallet balance (you have ${walletBalance || 0} ${selectedToken.symbol})`);
      return;
    }

    if (decimals === undefined) {
      setErrorMessage("Unable to determine token decimals. Is the token contract deployed?");
      return;
    }

    const amountInSmallestUnits = parseUnits(amount, decimals);

    // Check if we need to approve
    if (allowance !== undefined && allowance >= amountInSmallestUnits) {
      // Skip approval, go straight to deposit
      setDepositPhase("depositing");
      executeDeposit();
    } else {
      // Need to approve first
      setDepositPhase("approving");
      writeApprove({
        address: selectedTokenAddress,
        abi: erc20Abi,
        functionName: "approve",
        args: [treasuryAddress!, amountInSmallestUnits],
      });
    }
  };

  const handleReset = () => {
    setDepositPhase("idle");
    setErrorMessage(null);
    resetApprove();
    resetDeposit();
  };

  const shortenAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const isTransacting =
    depositPhase === "approving" ||
    depositPhase === "depositing" ||
    isApprovePending ||
    isDepositPending ||
    isApproveConfirming ||
    isDepositConfirming;

  const getButtonText = () => {
    if (depositPhase === "approving" || isApprovePending || isApproveConfirming) {
      return "Approving...";
    }
    if (depositPhase === "depositing" || isDepositPending || isDepositConfirming) {
      return "Depositing...";
    }
    if (depositPhase === "success") {
      return "Success!";
    }
    return `Deposit ${selectedToken?.symbol || "Token"} to Treasury`;
  };

  const hasRpcError = tokenError || treasuryError;

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Workspace Treasury</h1>
          <p className="text-sm text-[#888] mt-1">
            Manage your workspace funds on the blockchain
          </p>
        </div>


        {/* Wallet Connection Section */}
        <section className="bg-[#111] rounded-xl border border-[#333] p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  isConnected
                    ? "bg-emerald-900/50"
                    : "bg-gradient-to-br from-blue-500 to-violet-600"
                }`}
              >
                <WalletIcon
                  className={`w-5 h-5 ${isConnected ? "text-emerald-400" : "text-white"}`}
                />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {isConnected ? "Wallet Connected" : "Connect Wallet"}
                </h2>
                {isConnected && address ? (
                  <div className="flex items-center gap-2 mt-0.5">
                    <code className="text-sm font-mono text-[#888]">
                      {shortenAddress(address)}
                    </code>
                    <span className="text-[#333]">•</span>
                    <span className="text-sm text-[#888]">
                      {chain?.name || (chain?.id ? `Chain ${chain.id}` : "Unknown chain")}
                    </span>
                  </div>
                ) : (
                  <p className="text-sm text-[#888]">
                    Connect your wallet to manage treasury funds
                  </p>
                )}
              </div>
            </div>

            {isConnected ? (
              <button
                onClick={() => disconnect()}
                className="px-4 py-2 text-sm font-medium text-[#888] hover:text-white hover:bg-[#1a1a1a] rounded-lg transition-colors"
              >
                Disconnect
              </button>
            ) : (
              <button
                onClick={() => {
                  const connector = connectors[0];
                  if (connector) connect({ connector });
                }}
                disabled={isConnecting}
                className="px-4 py-2 text-sm font-medium text-black bg-white hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
              >
                {isConnecting ? "Connecting..." : "Connect Wallet"}
              </button>
            )}
          </div>
        </section>

        {/* Chain Selector */}
        {supportedChains && supportedChains.length > 0 && (
          <section className="bg-[#111] rounded-xl border border-[#333] p-6 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Network</h2>
                  <p className="text-sm text-[#888]">
                    Manage tokens and deposits for each chain
                  </p>
                </div>
              </div>
              <select
                value={currentChainId || ""}
                onChange={(e) => setSelectedChainId(Number(e.target.value))}
                className="px-4 py-2 border border-[#333] rounded-lg bg-[#0a0a0a] text-white focus:outline-none focus:border-[#555]"
              >
                {supportedChains.map((c) => (
                  <option key={c.chainId} value={c.chainId}>
                    {c.name} {c.isTestnet ? "(Testnet)" : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Wallet chain mismatch info */}
            {isConnected && walletChainId && walletChainId !== currentChainId && (
              <div className="mt-4 bg-blue-900/20 border border-blue-800 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm text-blue-200">
                      Your wallet is on <strong>{chain?.name || `Chain ${walletChainId}`}</strong>. 
                      You can manage tokens here, but switch your wallet to <strong>{selectedChain?.name}</strong> to deposit.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* No treasury deployed warning */}
            {selectedChain && !selectedChain.treasuryAddress && (
              <div className="mt-4 bg-amber-900/20 border border-amber-800 rounded-lg p-3">
                <p className="text-sm text-amber-200">
                  <strong>Note:</strong> No treasury contract deployed on {selectedChain.name} yet. 
                  Deposits will not work until a treasury is deployed.
                </p>
              </div>
            )}
          </section>
        )}

        {/* RPC Error Warning */}
        {hasRpcError && (
          <div className="bg-amber-900/20 border border-amber-800 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <ExclamationIcon className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-200">
                  Unable to connect to local chain
                </p>
                <p className="text-xs text-amber-200/70 mt-0.5">
                  Make sure your local node is running at http://127.0.0.1:8545
                </p>
              </div>
            </div>
          </div>
        )}

        {/* No Workspace Warning */}
        {!workspaceLoading && !workspace && (
          <div className="bg-[#111] rounded-xl border border-[#333] p-8 text-center">
            <VaultIcon className="w-12 h-12 text-[#666] mx-auto mb-4" />
            <p className="text-white font-medium">No workspace selected</p>
            <p className="text-sm text-[#888] mt-1">
              Please select a workspace to view its treasury
            </p>
          </div>
        )}

        {/* Accepted Tokens Management */}
        {workspace && currentChainId && (
          <section className="bg-[#111] rounded-xl border border-[#333] p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                  <TokenIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Accepted Tokens</h2>
                  <p className="text-sm text-[#888]">
                    Tokens this workspace accepts for payments on {selectedChain?.name || "this chain"}
                  </p>
                </div>
              </div>
            </div>

            {/* Add Token - show if there are available tokens */}
            {availableTokens && availableTokens.length > 0 && (
              <div className="bg-[#0a0a0a] rounded-lg border border-[#333] p-4 mb-4">
                <label className="block text-sm font-medium text-[#888] mb-2">
                  Add a token to your workspace
                </label>
                <div className="flex gap-2">
                  <select
                    value={selectedTokenId?.toString() || ""}
                    onChange={(e) => setSelectedTokenId(e.target.value as Id<"supportedTokens"> || null)}
                    className="flex-1 px-3 py-2 border border-[#333] rounded-lg bg-[#111] text-white focus:outline-none focus:border-[#555]"
                  >
                    <option value="">Select a token...</option>
                    {availableTokens.map((token) => (
                      <option key={token._id} value={token._id}>
                        {token.symbol} - {token.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleAddToken}
                    disabled={!selectedTokenId || isAddingToken}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-black bg-white hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <PlusIcon className="w-4 h-4" />
                    {isAddingToken ? "Adding..." : "Add"}
                  </button>
                </div>
              </div>
            )}

            {/* No available tokens message */}
            {availableTokens && availableTokens.length === 0 && workspaceTokens && workspaceTokens.length === 0 && (
              <div className="bg-amber-900/20 border border-amber-800 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-3">
                  <ExclamationIcon className="w-5 h-5 text-amber-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-200">
                      No tokens available for {selectedChain?.name || "this chain"}
                    </p>
                    <p className="text-xs text-amber-200/70 mt-0.5">
                      Ask a platform admin to add supported tokens for Chain ID {currentChainId}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Current Workspace Tokens List */}
            {workspaceTokens === undefined ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="animate-pulse flex items-center gap-4 py-3">
                    <div className="w-10 h-10 bg-[#1a1a1a] rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-32 bg-[#1a1a1a] rounded" />
                      <div className="h-3 w-24 bg-[#1a1a1a] rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : workspaceTokens.length === 0 ? (
              <div className="text-center py-6">
                <div className="w-12 h-12 rounded-xl bg-[#1a1a1a] flex items-center justify-center mx-auto mb-3">
                  <TokenIcon className="w-6 h-6 text-[#666]" />
                </div>
                <p className="text-sm font-medium text-white">No tokens added yet</p>
                <p className="text-xs text-[#666] mt-1">
                  {availableTokens && availableTokens.length > 0 
                    ? "Select a token above to start accepting payments"
                    : "Waiting for platform admin to add supported tokens"}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#333]">
                {workspaceTokens.map((token) => (
                  <div
                    key={token._id}
                    className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-600/20 border border-emerald-500/30 flex items-center justify-center">
                        <span className="text-sm font-bold text-emerald-400">
                          {token.symbol.slice(0, 2)}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{token.symbol}</p>
                        <p className="text-xs text-[#666]">
                          {token.name} • {token.decimals} decimals
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveToken(token._id)}
                      disabled={removingTokenId === token._id}
                      className="p-1.5 text-[#666] hover:text-red-400 rounded-lg hover:bg-[#1a1a1a] transition-colors disabled:opacity-50"
                      title="Remove token"
                    >
                      {removingTokenId === token._id ? (
                        <span className="text-xs">...</span>
                      ) : (
                        <TrashIcon className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Treasury Balances Section */}
        {workspace && workspaceTokens && workspaceTokens.length > 0 && (
          <>
            {/* Treasury Balances - All Tokens */}
            <section className="bg-[#111] rounded-xl border border-[#333] p-6 mb-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                  <VaultIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    Treasury Balances
                  </h2>
                  <p className="text-sm text-[#888]">{workspace.name}</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {workspaceTokens.map((token) => (
                  <TokenBalanceCard
                    key={token._id}
                    token={token as SupportedToken}
                    workspaceKey={workspaceKey}
                    treasuryAddress={treasuryAddress}
                    chainId={currentChainId}
                    isSelected={selectedToken?._id === token._id}
                    onSelect={() => setSelectedToken(token as SupportedToken)}
                  />
                ))}
              </div>
            </section>

            {/* Deposit Form */}
            {isConnected && (
              <section className="bg-[#111] rounded-xl border border-[#333] p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
                    <ArrowDownIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">
                      Deposit to Treasury
                    </h2>
                    <p className="text-sm text-[#888]">
                      Transfer tokens from your wallet to the workspace treasury
                    </p>
                  </div>
                </div>

                {/* Chain mismatch - can't deposit */}
                {walletChainId !== currentChainId && (
                  <div className="bg-amber-900/20 border border-amber-800 rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-3">
                      <ExclamationIcon className="w-5 h-5 text-amber-400 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-amber-200">
                          Switch wallet to {selectedChain?.name || "the selected chain"} to deposit
                        </p>
                        <p className="text-xs text-amber-200/70 mt-0.5">
                          Your wallet is on {chain?.name || `Chain ${walletChainId}`}. Change network in your wallet to deposit to {selectedChain?.name}.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Success Message */}
                {depositPhase === "success" && (
                  <div className="bg-emerald-900/20 border border-emerald-800 rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-3">
                      <CheckCircleIcon className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                      <p className="text-sm text-emerald-200">
                        Successfully deposited {selectedToken?.symbol} to the workspace treasury!
                      </p>
                    </div>
                  </div>
                )}

                {/* Error Message */}
                {depositPhase === "error" && errorMessage && (
                  <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 mb-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <ExclamationIcon className="w-5 h-5 text-red-400 flex-shrink-0" />
                        <p className="text-sm text-red-200">{errorMessage}</p>
                      </div>
                      <button
                        onClick={handleReset}
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                )}

                <form onSubmit={handleDeposit} className="space-y-4">
                  {/* Token Selector */}
                  <div>
                    <label className="block text-sm font-medium text-[#888] mb-2">
                      Token
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsTokenDropdownOpen(!isTokenDropdownOpen)}
                        disabled={isTransacting}
                        className="w-full flex items-center justify-between px-4 py-3 border border-[#333] rounded-lg bg-[#0a0a0a] text-white focus:outline-none focus:border-[#555] disabled:opacity-50"
                      >
                        {selectedToken ? (
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-xs font-bold text-white">
                              {selectedToken.symbol.slice(0, 2)}
                            </div>
                            <div className="text-left">
                              <p className="font-medium">{selectedToken.symbol}</p>
                              <p className="text-xs text-[#888]">{selectedToken.name}</p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-[#666]">Select a token</span>
                        )}
                        <ChevronDownIcon className="w-5 h-5 text-[#888]" />
                      </button>

                      {isTokenDropdownOpen && (
                        <div className="absolute z-10 mt-2 w-full bg-[#111] border border-[#333] rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {workspaceTokens.map((token) => (
                            <button
                              key={token._id}
                              type="button"
                              onClick={() => {
                                setSelectedToken(token as SupportedToken);
                                setIsTokenDropdownOpen(false);
                              }}
                              className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-[#1a1a1a] transition-colors ${
                                selectedToken?._id === token._id ? "bg-[#1a1a1a]" : ""
                              }`}
                            >
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-xs font-bold text-white">
                                {token.symbol.slice(0, 2)}
                              </div>
                              <div className="text-left">
                                <p className="font-medium text-white">{token.symbol}</p>
                                <p className="text-xs text-[#888]">{token.name}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Wallet Balance for Selected Token */}
                  {selectedToken && (
                    <div className="bg-[#0a0a0a] border border-[#333] rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[#888]">Your Wallet Balance</span>
                        {tokenLoading ? (
                          <div className="h-5 w-24 bg-[#1a1a1a] rounded animate-pulse" />
                        ) : (
                          <span className="text-sm font-medium text-white">
                            {parseFloat(walletBalance || "0").toLocaleString(undefined, {
                              maximumFractionDigits: 6,
                            })}{" "}
                            {selectedToken.symbol}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Amount Input */}
                  <div>
                    <label className="block text-sm font-medium text-[#888] mb-2">
                      Amount
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        disabled={isTransacting}
                        className="w-full px-4 py-3 pr-20 border border-[#333] rounded-lg bg-[#0a0a0a] text-white placeholder-[#666] focus:outline-none focus:border-[#555] disabled:opacity-50"
                      />
                      <button
                        type="button"
                        onClick={() => setAmount(walletBalance || "0")}
                        disabled={isTransacting || !walletBalance}
                        className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-xs font-medium text-[#888] hover:text-white hover:bg-[#1a1a1a] rounded transition-colors disabled:opacity-50"
                      >
                        MAX
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isTransacting || depositPhase === "success" || !amount || !selectedToken || walletChainId !== currentChainId}
                    className={`w-full px-4 py-3 text-sm font-medium rounded-lg transition-colors disabled:cursor-not-allowed ${
                      depositPhase === "success"
                        ? "bg-emerald-600 text-white"
                        : "bg-white text-black hover:bg-gray-200 disabled:opacity-50"
                    }`}
                  >
                    {walletChainId !== currentChainId ? `Switch wallet to ${selectedChain?.name || "selected chain"}` : getButtonText()}
                  </button>
                </form>

                {/* Transaction Info */}
                {(approveHash || depositHash) && (
                  <div className="mt-4 pt-4 border-t border-[#333]">
                    <p className="text-xs text-[#666]">
                      {approveHash && !isApproveSuccess && (
                        <>
                          Approval tx:{" "}
                          <code className="text-[#888]">
                            {shortenAddress(approveHash)}
                          </code>
                        </>
                      )}
                      {depositHash && (
                        <>
                          Deposit tx:{" "}
                          <code className="text-[#888]">
                            {shortenAddress(depositHash)}
                          </code>
                        </>
                      )}
                    </p>
                  </div>
                )}
              </section>
            )}

            {/* Connect Prompt */}
            {!isConnected && (
              <div className="bg-[#111] rounded-xl border border-[#333] p-8 text-center">
                <WalletIcon className="w-12 h-12 text-[#666] mx-auto mb-4" />
                <p className="text-white font-medium">Connect your wallet to deposit</p>
                <p className="text-sm text-[#888] mt-1">
                  You need to connect a wallet to deposit tokens into the treasury
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Token Balance Card Component
function TokenBalanceCard({
  token,
  workspaceKey,
  treasuryAddress,
  chainId,
  isSelected,
  onSelect,
}: {
  token: SupportedToken;
  workspaceKey: `0x${string}` | null;
  treasuryAddress?: `0x${string}`;
  chainId?: number;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const {
    formattedBalance,
    isLoading,
    error,
  } = useTreasuryBalance(
    token.address as `0x${string}`,
    workspaceKey,
    token.decimals,
    treasuryAddress,
    chainId
  );

  return (
    <button
      onClick={onSelect}
      className={`text-left p-4 rounded-lg border transition-all ${
        isSelected
          ? "border-emerald-500 bg-emerald-900/20"
          : "border-[#333] bg-[#0a0a0a] hover:border-[#555]"
      }`}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-sm font-bold text-white">
          {token.symbol.slice(0, 2)}
        </div>
        <div>
          <p className="font-medium text-white">{token.symbol}</p>
          <p className="text-xs text-[#888]">{token.name}</p>
        </div>
      </div>
      <div>
        {isLoading ? (
          <div className="h-6 w-20 bg-[#1a1a1a] rounded animate-pulse" />
        ) : error ? (
          <p className="text-lg font-bold text-[#666]">—</p>
        ) : (
          <p className="text-lg font-bold text-white">
            {parseFloat(formattedBalance || "0").toLocaleString(undefined, {
              maximumFractionDigits: 4,
            })}
          </p>
        )}
      </div>
    </button>
  );
}

