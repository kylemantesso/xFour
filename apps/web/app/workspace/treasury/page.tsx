"use client";

/**
 * Treasury Management Page
 * 
 * Non-custodial treasury system for workspaces:
 * - Connect wallet via WalletConnect
 * - Deploy treasury contract (one per network)
 * - Deposit MNEE tokens
 * - Configure API key spending limits
 * - Withdraw funds
 * - View balance and spending stats
 */

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@clerk/nextjs";
import { 
  useAccount, 
  useBalance, 
  useWaitForTransactionReceipt,
  useSwitchChain,
  useWriteContract,
  usePublicClient,
} from "wagmi";
import { parseUnits, formatUnits, type Address, decodeEventLog } from "viem";
import { ConnectWallet } from "@/components/ConnectWallet";
import { 
  getContractAddresses, 
  TREASURY_FACTORY_ABI,
  TREASURY_ABI,
  ERC20_ABI,
} from "@/lib/ethereum/treasury";
import { Id } from "@/convex/_generated/dataModel";

type EthereumNetwork = "mainnet" | "sepolia";

// Network chain IDs
const CHAIN_IDS = {
  mainnet: 1,
  sepolia: 11155111,
} as const;

export default function TreasuryPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const userData = useQuery(api.users.getCurrentUser);
  const workspace = userData?.currentWorkspace;
  const workspaceId = workspace?._id;
  
  // Wallet connection state
  const { address, isConnected, chain } = useAccount();
  const { switchChain } = useSwitchChain();
  
  // Selected network
  const [selectedNetwork, setSelectedNetwork] = useState<EthereumNetwork>("sepolia");
  
  // Treasury state (would come from Convex query)
  const treasuries = useQuery(
    api.treasuries.listTreasuries,
    workspaceId ? { workspaceId } : "skip"
  );
  
  // API keys for configuring limits
  const apiKeys = useQuery(api.apiKeys.listApiKeys, {});
  
  // Check if wallet is on correct chain
  const isCorrectChain = chain?.id === CHAIN_IDS[selectedNetwork];
  
  // Get current treasury for selected network
  const currentTreasury = treasuries?.find(t => t.network === selectedNetwork);

  if (!isLoaded || !isSignedIn || !workspace) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Treasury</h1>
              <p className="text-sm text-[#888] mt-1">
                Non-custodial treasury for your AI agents
              </p>
            </div>
          </div>
          
          {/* Network Selector */}
          <div className="flex items-center gap-4">
            <select
              value={selectedNetwork}
              onChange={(e) => setSelectedNetwork(e.target.value as EthereumNetwork)}
              className="bg-[#111] border border-[#333] rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="sepolia">Sepolia Testnet</option>
              <option value="mainnet">Ethereum Mainnet</option>
            </select>
            
            <ConnectWallet variant="compact" />
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Treasury Status & Actions */}
          <div className="lg:col-span-2 space-y-6">
            {/* Connection Status */}
            {!isConnected ? (
              <WalletConnectionPrompt />
            ) : !isCorrectChain ? (
              <NetworkSwitchPrompt 
                currentChain={chain?.name || "Unknown"} 
                targetNetwork={selectedNetwork}
                onSwitch={() => switchChain?.({ chainId: CHAIN_IDS[selectedNetwork] })}
              />
            ) : currentTreasury ? (
              <>
                <TreasuryOverview 
                  treasury={currentTreasury} 
                  network={selectedNetwork}
                />
                <DepositSection 
                  treasuryAddress={currentTreasury.contractAddress as Address}
                  network={selectedNetwork}
                />
                <ApiKeyLimitsSection 
                  treasuryAddress={currentTreasury.contractAddress as Address}
                  apiKeys={apiKeys || []}
                  network={selectedNetwork}
                />
              </>
            ) : (
              <DeployOrSyncTreasurySection 
                workspaceId={workspace._id as Id<"workspaces">}
                network={selectedNetwork}
                adminAddress={address as Address}
              />
            )}
          </div>

          {/* Right Column - Quick Stats & Info */}
          <div className="space-y-6">
            <QuickStats treasury={currentTreasury} network={selectedNetwork} />
            <InfoPanel />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// SUB-COMPONENTS
// ============================================

function WalletConnectionPrompt() {
  return (
    <div className="bg-[#111] border border-[#333] rounded-xl p-8 text-center">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">Connect Your Wallet</h3>
      <p className="text-[#888] mb-6 max-w-md mx-auto">
        Connect your Ethereum wallet to manage your treasury. You maintain full control of your funds at all times.
      </p>
      <ConnectWallet className="mx-auto" />
    </div>
  );
}

function NetworkSwitchPrompt({ 
  currentChain, 
  targetNetwork, 
  onSwitch 
}: { 
  currentChain: string; 
  targetNetwork: EthereumNetwork;
  onSwitch: () => void;
}) {
  const targetName = targetNetwork === "mainnet" ? "Ethereum Mainnet" : "Sepolia Testnet";
  
  return (
    <div className="bg-amber-900/20 border border-amber-900/50 rounded-xl p-6">
      <div className="flex items-start gap-4">
        <div className="p-2 rounded-lg bg-amber-500/20">
          <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-amber-400">Wrong Network</h3>
          <p className="text-[#888] mt-1">
            You&apos;re connected to {currentChain}. Please switch to {targetName} to manage this treasury.
          </p>
          <button
            onClick={onSwitch}
            className="mt-4 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium transition-colors"
          >
            Switch to {targetName}
          </button>
        </div>
      </div>
    </div>
  );
}

function TreasuryOverview({ 
  treasury, 
  network 
}: { 
  treasury: { contractAddress: string; cachedBalance?: number; status: string };
  network: EthereumNetwork;
}) {
  const { chain } = useAccount();
  const publicClient = usePublicClient({ chainId: CHAIN_IDS[network] });
  const contracts = getContractAddresses(network);
  const [liveBalance, setLiveBalance] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>("");

  const fetchBalance = async () => {
    console.log("[TreasuryOverview] ======= FETCHING BALANCE =======");
    console.log("[TreasuryOverview] Network:", network);
    console.log("[TreasuryOverview] Chain ID expected:", CHAIN_IDS[network]);
    console.log("[TreasuryOverview] Current wallet chain:", chain?.id, chain?.name);
    console.log("[TreasuryOverview] Treasury address:", treasury.contractAddress);
    console.log("[TreasuryOverview] MNEE token address:", contracts.mneeToken);
    console.log("[TreasuryOverview] Public client:", publicClient ? "Available" : "NOT AVAILABLE");
    
    if (!publicClient) {
      console.log("[TreasuryOverview] ERROR: No public client available");
      setError("No blockchain connection");
      setDebugInfo(`No client for chain ${CHAIN_IDS[network]}`);
      return;
    }
    
    setIsRefreshing(true);
    setError(null);
    
    try {
      // Method 1: Call getBalance() on the Treasury contract directly
      console.log("[TreasuryOverview] Method 1: Calling getBalance() on Treasury contract...");
      const treasuryBalance = await publicClient.readContract({
        address: treasury.contractAddress as Address,
        abi: TREASURY_ABI,
        functionName: "getBalance",
        args: [],
      }) as bigint;
      console.log("[TreasuryOverview] Treasury.getBalance() result:", treasuryBalance.toString());
      
      // Method 2: Also check MNEE balanceOf for comparison
      console.log("[TreasuryOverview] Method 2: Calling balanceOf() on MNEE token...");
      const mneeBalance = await publicClient.readContract({
        address: contracts.mneeToken as Address,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [treasury.contractAddress as Address],
      }) as bigint;
      console.log("[TreasuryOverview] MNEE.balanceOf(treasury) result:", mneeBalance.toString());
      
      // They should match
      const formattedTreasuryBalance = formatUnits(treasuryBalance, 18);
      const formattedMneeBalance = formatUnits(mneeBalance, 18);
      
      console.log("[TreasuryOverview] Treasury balance formatted:", formattedTreasuryBalance);
      console.log("[TreasuryOverview] MNEE balance formatted:", formattedMneeBalance);
      console.log("[TreasuryOverview] ======= END FETCH =======");
      
      setLiveBalance(formattedTreasuryBalance);
      setDebugInfo(`Treasury: ${formattedTreasuryBalance}, MNEE: ${formattedMneeBalance}`);
    } catch (err) {
      console.error("[TreasuryOverview] ERROR fetching balance:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch balance");
      setDebugInfo(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Fetch balance on mount and when treasury changes
  useEffect(() => {
    fetchBalance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [treasury.contractAddress, publicClient, network]);

  const displayBalance = liveBalance !== null 
    ? parseFloat(liveBalance).toFixed(4) 
    : (treasury.cachedBalance || 0).toFixed(4);

  return (
    <div className="bg-[#111] border border-[#333] rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">Treasury Overview</h2>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
          treasury.status === "active" 
            ? "bg-emerald-900/30 text-emerald-400" 
            : "bg-[#1a1a1a] text-[#888]"
        }`}>
          {treasury.status}
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#1a1a1a] rounded-lg p-4">
          <div className="flex items-center justify-between">
            <p className="text-[#888] text-sm">Balance</p>
            <button 
              onClick={fetchBalance}
              disabled={isRefreshing}
              className="text-xs text-indigo-400 hover:text-indigo-300 disabled:opacity-50"
            >
              {isRefreshing ? "..." : "↻ Refresh"}
            </button>
          </div>
          <p className="text-2xl font-bold text-white mt-1">
            {displayBalance} <span className="text-lg text-[#888]">MNEE</span>
          </p>
          {liveBalance !== null && (
            <p className="text-xs text-emerald-400 mt-1">Live from chain</p>
          )}
          {error && (
            <p className="text-xs text-red-400 mt-1">{error}</p>
          )}
          {debugInfo && (
            <p className="text-xs text-[#666] mt-1 font-mono">{debugInfo}</p>
          )}
        </div>
        
        <div className="bg-[#1a1a1a] rounded-lg p-4">
          <p className="text-[#888] text-sm">Contract</p>
          <a 
            href={`https://${network === "mainnet" ? "" : "sepolia."}etherscan.io/address/${treasury.contractAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-mono text-indigo-400 hover:text-indigo-300 mt-1 block truncate"
          >
            {treasury.contractAddress}
          </a>
        </div>
      </div>
    </div>
  );
}

function DepositSection({ 
  treasuryAddress, 
  network 
}: { 
  treasuryAddress: Address;
  network: EthereumNetwork;
}) {
  const { address } = useAccount();
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<"idle" | "approving" | "depositing" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  
  const contracts = getContractAddresses(network);
  
  // Get MNEE balance - refetch after deposit
  const { data: mneeBalance, refetch: refetchBalance } = useBalance({
    address,
    token: contracts.mneeToken as Address,
  });
  
  // Approval transaction
  const { 
    writeContract: writeApprove, 
    data: approveTxHash, 
    isPending: isApprovePending,
    reset: resetApprove 
  } = useWriteContract();
  
  const { isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({
    hash: approveTxHash,
  });
  
  // Deposit transaction
  const { 
    writeContract: writeDeposit, 
    data: depositTxHash, 
    isPending: isDepositPending,
    reset: resetDeposit 
  } = useWriteContract();
  
  const { isSuccess: isDepositSuccess } = useWaitForTransactionReceipt({
    hash: depositTxHash,
  });

  // Log state changes
  useEffect(() => {
    console.log("[Deposit] State changed:", { step, approveTxHash, depositTxHash, isApproveSuccess, isDepositSuccess });
  }, [step, approveTxHash, depositTxHash, isApproveSuccess, isDepositSuccess]);

  // Chain the deposit after approval succeeds
  useEffect(() => {
    if (isApproveSuccess && step === "approving") {
      console.log("[Deposit] Approval confirmed! TX:", approveTxHash);
      console.log("[Deposit] Now calling deposit on treasury:", treasuryAddress);
      console.log("[Deposit] Amount (raw):", parseUnits(amount, 18).toString());
      
      setStep("depositing");
      writeDeposit({
        address: treasuryAddress,
        abi: TREASURY_ABI,
        functionName: "deposit",
        args: [parseUnits(amount, 18)],
      });
    }
  }, [isApproveSuccess, step, writeDeposit, treasuryAddress, amount, approveTxHash]);

  // Handle deposit success
  useEffect(() => {
    if (isDepositSuccess && step === "depositing") {
      console.log("[Deposit] Deposit confirmed! TX:", depositTxHash);
      console.log("[Deposit] Deposit successful, refreshing balance...");
      
      setStep("success");
      setAmount("");
      refetchBalance();
      // Reset after a moment
      setTimeout(() => {
        setStep("idle");
        resetApprove();
        resetDeposit();
      }, 3000);
    }
  }, [isDepositSuccess, step, refetchBalance, resetApprove, resetDeposit, depositTxHash]);

  const handleDeposit = async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    
    const parsedAmount = parseUnits(amount, 18);
    
    console.log("[Deposit] Starting deposit flow...");
    console.log("[Deposit] Treasury address:", treasuryAddress);
    console.log("[Deposit] MNEE token address:", contracts.mneeToken);
    console.log("[Deposit] Amount:", amount);
    console.log("[Deposit] Parsed amount (wei):", parsedAmount.toString());
    console.log("[Deposit] User wallet:", address);
    
    setError(null);
    setStep("approving");
    
    try {
      console.log("[Deposit] Calling approve on MNEE token...");
      // First approve the treasury to spend tokens
      writeApprove({
        address: contracts.mneeToken as Address,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [treasuryAddress, parsedAmount],
      });
    } catch (err) {
      console.error("[Deposit] Approval failed:", err);
      setError(err instanceof Error ? err.message : "Deposit failed");
      setStep("error");
    }
  };

  const isLoading = step === "approving" || step === "depositing" || isApprovePending || isDepositPending;

  return (
    <div className="bg-[#111] border border-[#333] rounded-xl p-6">
      <h2 className="text-xl font-semibold text-white mb-4">Deposit MNEE</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-[#888] mb-2">Amount</label>
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              disabled={isLoading}
              className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-4 py-3 text-white placeholder-[#666] focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50"
            />
            <button
              onClick={() => mneeBalance && setAmount(formatUnits(mneeBalance.value, 18))}
              disabled={isLoading}
              className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 text-xs text-indigo-400 hover:text-indigo-300 disabled:opacity-50"
            >
              MAX
            </button>
          </div>
          {mneeBalance && (
            <p className="text-sm text-[#666] mt-1">
              Available: {parseFloat(formatUnits(mneeBalance.value, 18)).toFixed(2)} MNEE
            </p>
          )}
        </div>
        
        <button
          onClick={handleDeposit}
          disabled={!amount || parseFloat(amount) <= 0 || isLoading}
          className="w-full py-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-[#1a1a1a] disabled:cursor-not-allowed text-white font-medium transition-colors"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {step === "approving" ? "Step 1/2: Approving..." : "Step 2/2: Depositing..."}
            </span>
          ) : (
            "Deposit"
          )}
        </button>
        
        {step === "success" && (
          <div className="p-3 bg-emerald-900/30 border border-emerald-900/50 rounded-lg">
            <p className="text-emerald-400 text-sm text-center">Deposit successful!</p>
          </div>
        )}
        
        {error && (
          <div className="p-3 bg-red-900/30 border border-red-900/50 rounded-lg">
            <p className="text-red-400 text-sm text-center">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ApiKeyLimitsSection({ 
  treasuryAddress: _treasuryAddress, 
  apiKeys,
  network: _network 
}: { 
  treasuryAddress: Address;
  apiKeys: Array<{ _id: string; name: string; apiKeyPrefix: string; apiKeyHash?: string }>;
  network: EthereumNetwork;
}) {
  // treasuryAddress and network will be used when implementing on-chain limit updates
  void _treasuryAddress;
  void _network;
  
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [limits, setLimits] = useState({
    maxPerTransaction: "100",
    dailyLimit: "1000",
    monthlyLimit: "10000",
  });

  const agentKeys = apiKeys.filter(k => k.apiKeyHash); // Only keys with hash

  return (
    <div className="bg-[#111] border border-[#333] rounded-xl p-6">
      <h2 className="text-xl font-semibold text-white mb-4">API Key Spending Limits</h2>
      <p className="text-[#888] text-sm mb-4">
        Configure on-chain spending limits for each API key. These limits are enforced by the treasury smart contract.
      </p>
      
      {agentKeys.length === 0 ? (
        <div className="text-center py-8 bg-[#1a1a1a] rounded-lg">
          <p className="text-[#888]">No API keys with treasury access.</p>
          <p className="text-sm text-[#666] mt-1">Create an agent API key first.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <select
            value={selectedKey || ""}
            onChange={(e) => setSelectedKey(e.target.value)}
            className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-4 py-2 text-white"
          >
            <option value="">Select an API key...</option>
            {agentKeys.map((key) => (
              <option key={key._id} value={key._id}>
                {key.name} ({key.apiKeyPrefix}...)
              </option>
            ))}
          </select>
          
          {selectedKey && (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-[#888] mb-1">Per Transaction</label>
                <input
                  type="number"
                  value={limits.maxPerTransaction}
                  onChange={(e) => setLimits(l => ({ ...l, maxPerTransaction: e.target.value }))}
                  className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm"
                  placeholder="0 = unlimited"
                />
              </div>
              <div>
                <label className="block text-sm text-[#888] mb-1">Daily Limit</label>
                <input
                  type="number"
                  value={limits.dailyLimit}
                  onChange={(e) => setLimits(l => ({ ...l, dailyLimit: e.target.value }))}
                  className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm"
                  placeholder="0 = unlimited"
                />
              </div>
              <div>
                <label className="block text-sm text-[#888] mb-1">Monthly Limit</label>
                <input
                  type="number"
                  value={limits.monthlyLimit}
                  onChange={(e) => setLimits(l => ({ ...l, monthlyLimit: e.target.value }))}
                  className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm"
                  placeholder="0 = unlimited"
                />
              </div>
            </div>
          )}
          
          {selectedKey && (
            <button className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors">
              Update Limits On-Chain
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function DeployOrSyncTreasurySection({ 
  workspaceId, 
  network,
  adminAddress 
}: { 
  workspaceId: Id<"workspaces">;
  network: EthereumNetwork;
  adminAddress: Address;
}) {
  const contracts = getContractAddresses(network);
  const publicClient = usePublicClient();
  const createTreasury = useMutation(api.treasuries.createTreasury);
  const [existingTreasury, setExistingTreasury] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Check if treasury already exists on-chain
  useEffect(() => {
    async function checkOnChain() {
      if (!publicClient || !contracts.treasuryFactory) {
        setChecking(false);
        return;
      }
      
      try {
        const treasuryAddress = await publicClient.readContract({
          address: contracts.treasuryFactory as Address,
          abi: TREASURY_FACTORY_ABI,
          functionName: "getTreasury",
          args: [workspaceId],
        }) as string;
        
        if (treasuryAddress && treasuryAddress !== "0x0000000000000000000000000000000000000000") {
          setExistingTreasury(treasuryAddress);
        }
      } catch (err) {
        console.error("Error checking on-chain treasury:", err);
      }
      setChecking(false);
    }
    
    checkOnChain();
  }, [publicClient, contracts.treasuryFactory, workspaceId]);

  const handleSync = async () => {
    if (!existingTreasury) return;
    
    setSyncing(true);
    setSyncError(null);
    
    try {
      await createTreasury({
        workspaceId,
        network,
        contractAddress: existingTreasury,
        adminAddress: adminAddress,
        txHash: "synced-from-chain",
      });
    } catch (err) {
      console.error("Sync failed:", err);
      setSyncError(err instanceof Error ? err.message : "Failed to sync treasury");
    }
    setSyncing(false);
  };

  if (checking) {
    return (
      <div className="bg-[#111] border border-[#333] rounded-xl p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-500 mx-auto mb-4" />
        <p className="text-[#888]">Checking for existing treasury...</p>
      </div>
    );
  }

  // If treasury exists on-chain but not in database, show sync option
  if (existingTreasury) {
    return (
      <div className="bg-[#111] border border-[#333] rounded-xl p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">Treasury Found On-Chain</h3>
        <p className="text-[#888] mb-4 max-w-md mx-auto">
          A treasury for this workspace already exists on {network === "mainnet" ? "Ethereum Mainnet" : "Sepolia"}.
        </p>
        
        <div className="bg-[#1a1a1a] rounded-lg p-4 mb-6 text-left max-w-sm mx-auto">
          <div className="flex justify-between text-sm">
            <span className="text-[#888]">Contract</span>
            <a 
              href={`https://${network === "mainnet" ? "" : "sepolia."}etherscan.io/address/${existingTreasury}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 hover:text-indigo-300 font-mono text-xs truncate ml-2"
            >
              {existingTreasury.slice(0, 10)}...{existingTreasury.slice(-8)}
            </a>
          </div>
        </div>
        
        <button
          onClick={handleSync}
          disabled={syncing}
          className="px-6 py-3 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:bg-[#1a1a1a] disabled:cursor-not-allowed text-white font-medium transition-colors"
        >
          {syncing ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Syncing...
            </span>
          ) : (
            "Sync Treasury to Dashboard"
          )}
        </button>
        
        {syncError && (
          <div className="mt-4 p-3 bg-red-900/30 border border-red-900/50 rounded-lg">
            <p className="text-red-400 text-sm">{syncError}</p>
          </div>
        )}
      </div>
    );
  }

  // No treasury exists, show deploy option
  return (
    <DeployTreasurySection
      workspaceId={workspaceId}
      network={network}
      adminAddress={adminAddress}
    />
  );
}

function DeployTreasurySection({ 
  workspaceId, 
  network,
  adminAddress 
}: { 
  workspaceId: Id<"workspaces">;
  network: EthereumNetwork;
  adminAddress: Address;
}) {
  const contracts = getContractAddresses(network);
  const publicClient = usePublicClient();
  const createTreasury = useMutation(api.treasuries.createTreasury);
  const [savedToDb, setSavedToDb] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // When transaction succeeds, extract treasury address and save to Convex
  useEffect(() => {
    async function saveTreasury() {
      if (!isSuccess || !receipt || !txHash || savedToDb) return;
      
      try {
        // Find the TreasuryCreated event in the logs
        const treasuryCreatedEvent = receipt.logs.find(log => {
          try {
            const decoded = decodeEventLog({
              abi: TREASURY_FACTORY_ABI,
              data: log.data,
              topics: log.topics,
            });
            return decoded.eventName === "TreasuryCreated";
          } catch {
            return false;
          }
        });

        let treasuryAddress: string | null = null;
        
        if (treasuryCreatedEvent) {
          const decoded = decodeEventLog({
            abi: TREASURY_FACTORY_ABI,
            data: treasuryCreatedEvent.data,
            topics: treasuryCreatedEvent.topics,
          });
          // The treasury address is the second indexed parameter
          treasuryAddress = (decoded.args as { treasury: string }).treasury;
        }
        
        // If we couldn't get it from events, try reading from factory
        if (!treasuryAddress && publicClient) {
          treasuryAddress = await publicClient.readContract({
            address: contracts.treasuryFactory as Address,
            abi: TREASURY_FACTORY_ABI,
            functionName: "getTreasury",
            args: [workspaceId],
          }) as string;
        }

        if (!treasuryAddress || treasuryAddress === "0x0000000000000000000000000000000000000000") {
          throw new Error("Could not get treasury address from transaction");
        }

        // Save to Convex
        await createTreasury({
          workspaceId,
          network,
          contractAddress: treasuryAddress,
          adminAddress: adminAddress,
          txHash: txHash,
        });
        
        setSavedToDb(true);
      } catch (err) {
        console.error("Failed to save treasury:", err);
        setError(err instanceof Error ? err.message : "Failed to save treasury record");
      }
    }
    
    saveTreasury();
  }, [isSuccess, receipt, txHash, savedToDb, createTreasury, workspaceId, network, adminAddress, publicClient, contracts.treasuryFactory]);

  const handleDeploy = async () => {
    if (!contracts.treasuryFactory) {
      alert("Treasury factory not configured for this network");
      return;
    }
    
    setError(null);
    
    try {
      writeContract({
        address: contracts.treasuryFactory as Address,
        abi: TREASURY_FACTORY_ABI,
        functionName: "createTreasury",
        args: [workspaceId, adminAddress],
      });
    } catch (error) {
      console.error("Deploy failed:", error);
    }
  };

  return (
    <div className="bg-[#111] border border-[#333] rounded-xl p-8 text-center">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">Deploy Treasury Contract</h3>
      <p className="text-[#888] mb-6 max-w-md mx-auto">
        Deploy a new treasury contract for {network === "mainnet" ? "Ethereum Mainnet" : "Sepolia Testnet"}. 
        This is a one-time operation per network.
      </p>
      
      <div className="bg-[#1a1a1a] rounded-lg p-4 mb-6 text-left max-w-sm mx-auto">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-[#888]">Network</span>
          <span className="text-white">{network === "mainnet" ? "Ethereum" : "Sepolia"}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-[#888]">Admin</span>
          <span className="text-white font-mono text-xs truncate ml-2">{adminAddress}</span>
        </div>
      </div>
      
      <button
        onClick={handleDeploy}
        disabled={isPending || isConfirming || !contracts.treasuryFactory}
        className="px-6 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-[#1a1a1a] disabled:cursor-not-allowed text-white font-medium transition-colors"
      >
        {isPending || isConfirming ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Deploying...
          </span>
        ) : !contracts.treasuryFactory ? (
          "Factory Not Deployed"
        ) : (
          "Deploy Treasury"
        )}
      </button>
      
      {isSuccess && savedToDb && (
        <div className="mt-4 p-3 bg-emerald-900/30 border border-emerald-900/50 rounded-lg">
          <p className="text-emerald-400 text-sm">Treasury deployed and saved successfully!</p>
        </div>
      )}
      
      {error && (
        <div className="mt-4 p-3 bg-red-900/30 border border-red-900/50 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}

function QuickStats({ 
  treasury, 
  network 
}: { 
  treasury?: { cachedBalance?: number; status: string } | null;
  network: EthereumNetwork;
}) {
  return (
    <div className="bg-[#111] border border-[#333] rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Quick Stats</h3>
      
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-[#888]">Network</span>
          <span className="text-white">{network === "mainnet" ? "Mainnet" : "Sepolia"}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-[#888]">Treasury Status</span>
          <span className={treasury?.status === "active" ? "text-emerald-400" : "text-[#888]"}>
            {treasury?.status || "Not deployed"}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-[#888]">Balance</span>
          <span className="text-white font-mono">
            {(treasury?.cachedBalance || 0).toFixed(2)} MNEE
          </span>
        </div>
        
        <div className="border-t border-[#333] my-4" />
        
        <div className="flex justify-between items-center">
          <span className="text-[#888]">Custody Model</span>
          <span className="text-emerald-400 text-sm">Non-Custodial ✓</span>
        </div>
      </div>
    </div>
  );
}

function InfoPanel() {
  return (
    <div className="bg-gradient-to-br from-indigo-900/30 to-purple-900/30 border border-indigo-900/50 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-3">About Treasury</h3>
      <ul className="space-y-2 text-sm text-[#ccc]">
        <li className="flex items-start gap-2">
          <span className="text-indigo-400">✓</span>
          <span>You maintain full control of your funds</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-indigo-400">✓</span>
          <span>Spending limits enforced on-chain</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-indigo-400">✓</span>
          <span>Only the x402 gateway can execute payments</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-indigo-400">✓</span>
          <span>Withdraw anytime, no lock-ups</span>
        </li>
      </ul>
      
      <a 
        href="/docs/concepts"
        className="mt-4 inline-flex items-center gap-1 text-sm text-indigo-400 hover:text-indigo-300"
      >
        Learn more
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </a>
    </div>
  );
}
