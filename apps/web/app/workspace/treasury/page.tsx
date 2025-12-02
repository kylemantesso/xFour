"use client";

import { useState, useEffect } from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useWriteContract,
  useWaitForTransactionReceipt,
  useSwitchChain,
} from "wagmi";
import { parseUnits } from "viem";
import { WorkspaceGuard } from "../../../components/WorkspaceGuard";
import { useWorkspaceKey } from "../../../hooks/useWorkspaceKey";
import { useTokenBalance, useTokenAllowance } from "../../../hooks/useTokenBalance";
import { useTreasuryBalance } from "../../../hooks/useTreasuryBalance";
import { erc20Abi, treasuryAbi } from "../../../lib/contracts";
import { TOKEN_ADDRESS, TREASURY_ADDRESS, localhost } from "../../../lib/wagmi";

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
  const { address, isConnected, chain, chainId } = useAccount();
  const { connectors, connect, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  const isWrongChain = isConnected && chainId !== localhost.id;

  // Debug logging
  useEffect(() => {
    console.log("Wallet state:", {
      isConnected,
      address,
      chain,
      chainId,
      TOKEN_ADDRESS,
      TREASURY_ADDRESS,
    });
  }, [isConnected, address, chain, chainId]);

  // Token balance
  const {
    formattedBalance: walletBalance,
    decimals,
    isLoading: tokenLoading,
    error: tokenError,
    refetch: refetchWalletBalance,
  } = useTokenBalance(address);

  // Debug token balance
  useEffect(() => {
    console.log("Token balance state:", {
      walletBalance,
      decimals,
      tokenLoading,
      tokenError: tokenError?.message,
    });
  }, [walletBalance, decimals, tokenLoading, tokenError]);

  // Treasury balance
  const {
    formattedBalance: treasuryBalance,
    isLoading: treasuryLoading,
    error: treasuryError,
    refetch: refetchTreasuryBalance,
  } = useTreasuryBalance(workspaceKey, decimals);

  // Allowance
  const { allowance, refetch: refetchAllowance } = useTokenAllowance(
    address,
    TREASURY_ADDRESS
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
    if (!workspaceKey || !decimals) return;

    const amountInSmallestUnits = parseUnits(amount, decimals);

    writeDeposit({
      address: TREASURY_ADDRESS,
      abi: treasuryAbi,
      functionName: "deposit",
      args: [workspaceKey, amountInSmallestUnits],
    });
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setDepositPhase("idle");

    console.log("Deposit clicked", {
      isConnected,
      address,
      workspace: workspace?._id,
      workspaceKey,
      amount,
      decimals,
      walletBalance,
      TOKEN_ADDRESS,
      TREASURY_ADDRESS,
    });

    // Validate
    if (!TOKEN_ADDRESS || !TREASURY_ADDRESS) {
      setErrorMessage("Contract addresses not configured. Check environment variables.");
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
      setErrorMessage(`Insufficient wallet balance (you have ${walletBalance || 0})`);
      return;
    }

    if (decimals === undefined) {
      setErrorMessage("Unable to determine token decimals. Is the token contract deployed?");
      return;
    }

    const amountInSmallestUnits = parseUnits(amount, decimals);
    console.log("Amount in smallest units:", amountInSmallestUnits.toString());

    // Check if we need to approve
    console.log("Current allowance:", allowance?.toString(), "Need:", amountInSmallestUnits.toString());
    
    if (allowance !== undefined && allowance >= amountInSmallestUnits) {
      // Skip approval, go straight to deposit
      console.log("Skipping approval, sufficient allowance");
      setDepositPhase("depositing");
      executeDeposit();
    } else {
      // Need to approve first
      console.log("Requesting approval...");
      setDepositPhase("approving");
      writeApprove({
        address: TOKEN_ADDRESS,
        abi: erc20Abi,
        functionName: "approve",
        args: [TREASURY_ADDRESS, amountInSmallestUnits],
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
    return "Deposit to Treasury";
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

        {/* Wrong Chain Warning */}
        {isWrongChain && (
          <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ExclamationIcon className="w-5 h-5 text-red-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-200">
                    Wrong network! Switch to {localhost.name}
                  </p>
                  <p className="text-xs text-red-200/70 mt-0.5">
                    You're on chain {chainId}. The treasury is on {localhost.name} (chain {localhost.id}).
                  </p>
                </div>
              </div>
              <button
                onClick={() => switchChain({ chainId: localhost.id })}
                disabled={isSwitching}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {isSwitching ? "Switching..." : "Switch Network"}
              </button>
            </div>
          </div>
        )}

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

        {/* Balances Section */}
        {workspace && (
          <>
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              {/* Wallet Balance Card */}
              <div className="bg-[#111] rounded-xl border border-[#333] p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-[#1a1a1a] flex items-center justify-center">
                    <WalletIcon className="w-5 h-5 text-[#888]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-[#888]">Your Wallet Balance</h3>
                    <p className="text-xs text-[#666]">Available to deposit</p>
                  </div>
                </div>
                {!isConnected ? (
                  <p className="text-2xl font-bold text-[#666]">—</p>
                ) : tokenLoading ? (
                  <div className="h-8 w-32 bg-[#1a1a1a] rounded animate-pulse" />
                ) : tokenError ? (
                  <p className="text-2xl font-bold text-[#666]">—</p>
                ) : (
                  <p className="text-2xl font-bold text-white">
                    {parseFloat(walletBalance || "0").toLocaleString(undefined, {
                      maximumFractionDigits: 4,
                    })}{" "}
                    <span className="text-lg text-[#888]">TOKEN</span>
                  </p>
                )}
              </div>

              {/* Treasury Balance Card */}
              <div className="bg-[#111] rounded-xl border border-[#333] p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                    <VaultIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-[#888]">
                      Workspace Treasury Balance
                    </h3>
                    <p className="text-xs text-[#666]">{workspace.name}</p>
                  </div>
                </div>
                {treasuryLoading ? (
                  <div className="h-8 w-32 bg-[#1a1a1a] rounded animate-pulse" />
                ) : treasuryError ? (
                  <p className="text-2xl font-bold text-[#666]">—</p>
                ) : (
                  <p className="text-2xl font-bold text-white">
                    {parseFloat(treasuryBalance || "0").toLocaleString(undefined, {
                      maximumFractionDigits: 4,
                    })}{" "}
                    <span className="text-lg text-[#888]">TOKEN</span>
                  </p>
                )}
              </div>
            </div>

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

                {/* Success Message */}
                {depositPhase === "success" && (
                  <div className="bg-emerald-900/20 border border-emerald-800 rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-3">
                      <CheckCircleIcon className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                      <p className="text-sm text-emerald-200">
                        Successfully deposited tokens to the workspace treasury!
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
                    {walletBalance && (
                      <p className="text-xs text-[#666] mt-1">
                        Available: {walletBalance} TOKEN
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isTransacting || depositPhase === "success" || !amount || isWrongChain}
                    className={`w-full px-4 py-3 text-sm font-medium rounded-lg transition-colors disabled:cursor-not-allowed ${
                      depositPhase === "success"
                        ? "bg-emerald-600 text-white"
                        : "bg-white text-black hover:bg-gray-200 disabled:opacity-50"
                    }`}
                  >
                    {getButtonText()}
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

