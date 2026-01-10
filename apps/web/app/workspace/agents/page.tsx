"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { WorkspaceGuard } from "../../../components/WorkspaceGuard";
import { useToast } from "../../../components/Toast";
import { Id } from "../../../convex/_generated/dataModel";

// Types
type EthereumNetwork = "sepolia" | "mainnet";

// Icons
function KeyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
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

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
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

function ChevronUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
    </svg>
  );
}

export default function AgentsPage() {
  return (
    <WorkspaceGuard>
      <AgentsContent />
    </WorkspaceGuard>
  );
}

function AgentsContent() {
  const workspaceData = useQuery(api.workspaces.getCurrentWorkspace);
  const apiKeys = useQuery(api.apiKeys.listApiKeys, {});
  const treasuries = useQuery(
    api.treasuries.listTreasuries,
    workspaceData?.workspace?._id ? { workspaceId: workspaceData.workspace._id } : "skip"
  );

  if (!workspaceData) {
    return <LoadingSkeleton />;
  }

  const { role } = workspaceData;
  const isAdmin = role === "owner" || role === "admin";
  const canWrite = role === "owner" || role === "admin" || role === "member";
  // Allow creation if they have active treasuries
  const activeTreasuries = treasuries?.filter(t => t.status === "active") ?? [];
  const hasTreasuries = activeTreasuries.length > 0;

  // Filter to only show agent keys
  const agentKeys = apiKeys?.filter(key => key.type === "agent" || !key.type) ?? [];

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <KeyIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">
                Agents & API Keys
              </h1>
              <p className="text-sm text-[#888] mt-1">
                Create and manage API keys for your agents and SDKs
              </p>
            </div>
          </div>
          {canWrite && <CreateApiKeyButton hasTreasuries={hasTreasuries} treasuries={activeTreasuries} />}
        </div>

        {/* Info Card */}
        <div className="bg-[#111] border border-[#333] rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#1a1a1a] flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-[#888]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-white">
                How Agent Keys Work
              </h3>
              <p className="text-sm text-[#888] mt-1">
                Agent keys authenticate your AI agents when making payments through the x402 Gateway. Each key is shown only once when created — store it securely. Looking for provider keys? Visit the <a href="/workspace/providers" className="text-purple-400 hover:text-purple-300 underline">Provider Keys</a> page.
              </p>
            </div>
          </div>
        </div>

        {/* API Keys List */}
        <div className="bg-[#111] rounded-xl border border-[#333] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#333]">
            <h2 className="text-lg font-semibold text-white">
              Your API Keys
            </h2>
          </div>
          <div className="p-6">
            <ApiKeysList 
              apiKeys={agentKeys} 
              canManage={isAdmin} 
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// CREATE API KEY BUTTON
// ============================================

type TreasuryData = {
  _id: Id<"treasuries">;
  network: EthereumNetwork;
  contractAddress: string;
  adminAddresses: string[];
  status: "pending" | "active" | "paused" | "disabled";
  cachedBalance?: number;
  createdAt: number;
};

function CreateApiKeyButton({ 
  hasTreasuries, 
  treasuries 
}: { 
  hasTreasuries: boolean; 
  treasuries: TreasuryData[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTreasuryId, setSelectedTreasuryId] = useState<string>("");
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  // Spending limits (synced to treasury contract)
  const [maxPerTransaction, setMaxPerTransaction] = useState("");
  const [dailyLimit, setDailyLimit] = useState("");
  const [monthlyLimit, setMonthlyLimit] = useState("");
  const [showLimits, setShowLimits] = useState(false);
  const createApiKey = useMutation(api.apiKeys.createApiKey);
  const markSynced = useMutation(api.apiKeys.markSpendingLimitsSynced);
  const toast = useToast();

  // Set default treasury when treasuries load
  useEffect(() => {
    if (treasuries && treasuries.length > 0 && !selectedTreasuryId) {
      setSelectedTreasuryId(treasuries[0]._id);
    }
  }, [treasuries, selectedTreasuryId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !selectedTreasuryId) return;

    setIsCreating(true);
    try {
      const spendingLimits = (maxPerTransaction || dailyLimit || monthlyLimit) ? {
        maxPerTransaction: maxPerTransaction ? parseFloat(maxPerTransaction) : 0,
        dailyLimit: dailyLimit ? parseFloat(dailyLimit) : 0,
        monthlyLimit: monthlyLimit ? parseFloat(monthlyLimit) : 0,
      } : undefined;

      // Get the selected treasury details
      const selectedTreasury = treasuries?.find(t => t._id === selectedTreasuryId);

      const result = await createApiKey({
        name: name.trim(),
        description: description.trim() || undefined,
        type: "agent",
        treasuryId: selectedTreasuryId as Id<"treasuries">,
        spendingLimits,
      });

      // Auto-configure API key on-chain
      if (selectedTreasury && spendingLimits) {
        try {
          console.log("Auto-configuring API key on Treasury contract...");
          const configResponse = await fetch("/api/treasury/configure-api-key", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              apiKey: result.apiKey,
              treasuryAddress: selectedTreasury.contractAddress,
              network: selectedTreasury.network,
              spendingLimits: spendingLimits,
            }),
          });
          const configResult = await configResponse.json();
          if (configResult.status === "ok") {
            console.log("✅ API key configured on-chain:", configResult.txHash || "already configured");
            // Mark as synced in the database
            await markSynced({ apiKeyId: result.apiKeyId });
            toast.success("API key created and synced on-chain!");
          } else {
            console.warn("⚠️ Failed to configure on-chain:", configResult.error);
            toast.warning("API key created but on-chain sync failed. Click 'Sync on-chain' to retry.");
          }
        } catch (syncError) {
          console.error("Failed to sync API key on-chain:", syncError);
          toast.warning("API key created but on-chain sync failed. Click 'Sync on-chain' to retry.");
        }
      }

      setNewApiKey(result.apiKey);
      setName("");
      setDescription("");
      setMaxPerTransaction("");
      setDailyLimit("");
      setMonthlyLimit("");
      setShowLimits(false);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopy = async () => {
    if (newApiKey) {
      await navigator.clipboard.writeText(newApiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setNewApiKey(null);
    setCopied(false);
    setName("");
    setDescription("");
    setMaxPerTransaction("");
    setDailyLimit("");
    setMonthlyLimit("");
    setShowLimits(false);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        disabled={!hasTreasuries}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-black bg-white hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title={!hasTreasuries ? "Deploy a treasury first in the Treasury page" : undefined}
      >
        <PlusIcon className="w-4 h-4" />
        Create API Key
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[#111] border border-[#333] rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl">
            {newApiKey ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-900/50 flex items-center justify-center">
                    <CheckIcon className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      API Key Created
                    </h3>
                    <p className="text-sm text-[#888]">
                      Copy your key now — you won&apos;t see it again!
                    </p>
                  </div>
                </div>

                <div className="bg-[#0a0a0a] border border-[#333] rounded-lg p-4">
                  <div className="flex items-center justify-between gap-3">
                    <code className="text-sm font-mono text-white break-all">
                      {newApiKey}
                    </code>
                    <button
                      onClick={handleCopy}
                      className="flex-shrink-0 p-2 text-[#888] hover:text-white hover:bg-[#1a1a1a] rounded-lg transition-colors"
                      title="Copy to clipboard"
                    >
                      {copied ? (
                        <CheckIcon className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <CopyIcon className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="bg-amber-900/20 border border-amber-800 rounded-lg p-3">
                  <p className="text-sm text-amber-200">
                    <strong>Important:</strong> This is the only time you&apos;ll see this key. 
                    Store it securely — we only save a hash on our servers.
                  </p>
                </div>

                <button
                  onClick={handleClose}
                  className="w-full px-4 py-2.5 text-sm font-medium text-black bg-white hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                    <KeyIcon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">
                    Create API Key
                  </h3>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#888] mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., dev-bot-1, production-agent"
                    className="w-full px-3 py-2 border border-[#333] rounded-lg bg-[#0a0a0a] text-white placeholder-[#666] focus:outline-none focus:border-[#555]"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#888] mb-1">
                    Description <span className="text-[#666]">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What is this key used for?"
                    className="w-full px-3 py-2 border border-[#333] rounded-lg bg-[#0a0a0a] text-white placeholder-[#666] focus:outline-none focus:border-[#555]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#888] mb-1">
                    Treasury <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedTreasuryId}
                    onChange={(e) => setSelectedTreasuryId(e.target.value)}
                    className="w-full px-3 py-2 border border-[#333] rounded-lg bg-[#0a0a0a] text-white focus:outline-none focus:border-[#555]"
                    required
                  >
                    <option value="">Select a treasury</option>
                    {treasuries?.map((treasury) => (
                      <option key={treasury._id} value={treasury._id}>
                        {treasury.contractAddress.slice(0, 6)}...{treasury.contractAddress.slice(-4)} ({treasury.network})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-[#666] mt-1">
                    Payments with this API key will be funded from this treasury contract.{" "}
                    <a href="/workspace/treasury" className="text-emerald-400 hover:underline">
                      Manage treasuries →
                    </a>
                  </p>
                </div>

                {/* Usage Limits Section */}
                <div>
                  <button
                    type="button"
                    onClick={() => setShowLimits(!showLimits)}
                    className="flex items-center gap-2 text-sm text-[#888] hover:text-white transition-colors"
                  >
                    <svg
                      className={`w-4 h-4 transition-transform ${showLimits ? "rotate-90" : ""}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <span>Usage Limits</span>
                    <span className="text-[#666]">(optional)</span>
                  </button>
                  
                  {showLimits && (
                    <div className="mt-3 p-3 bg-[#1a1a1a] rounded-lg border border-[#333] space-y-3">
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs text-[#666] mb-1">Max Per TX</label>
                          <input
                            type="number"
                            value={maxPerTransaction}
                            onChange={(e) => setMaxPerTransaction(e.target.value)}
                            placeholder="No limit"
                            className="w-full px-2 py-1.5 text-sm border border-[#333] rounded-lg bg-[#0a0a0a] text-white placeholder-[#666] focus:outline-none focus:border-[#555]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-[#666] mb-1">Daily Limit</label>
                          <input
                            type="number"
                            value={dailyLimit}
                            onChange={(e) => setDailyLimit(e.target.value)}
                            placeholder="No limit"
                            className="w-full px-2 py-1.5 text-sm border border-[#333] rounded-lg bg-[#0a0a0a] text-white placeholder-[#666] focus:outline-none focus:border-[#555]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-[#666] mb-1">Monthly Limit</label>
                          <input
                            type="number"
                            value={monthlyLimit}
                            onChange={(e) => setMonthlyLimit(e.target.value)}
                            placeholder="No limit"
                            className="w-full px-2 py-1.5 text-sm border border-[#333] rounded-lg bg-[#0a0a0a] text-white placeholder-[#666] focus:outline-none focus:border-[#555]"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-[#666]">
                        Set MNEE spending limits for this API key. These will be enforced on-chain.
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={isCreating || !name.trim() || !selectedTreasuryId}
                    className="flex-1 px-4 py-2.5 text-sm font-medium text-black bg-white hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreating ? "Creating..." : "Create Key"}
                  </button>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 px-4 py-2.5 text-sm font-medium text-[#888] hover:text-white hover:bg-[#1a1a1a] rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ============================================
// API KEYS LIST
// ============================================

type ApiKeyData = {
  _id: Id<"apiKeys">;
  name: string;
  description?: string;
  apiKeyPrefix: string;
  type: "agent" | "provider";
  treasuryId?: Id<"treasuries">;
  ethereumNetwork?: EthereumNetwork;
  receivingAddress?: string;
  receivingNetwork?: EthereumNetwork;
  spendingLimits?: {
    maxPerTransaction: number;
    dailyLimit: number;
    monthlyLimit: number;
    isSyncedOnChain?: boolean;
  };
  createdByUserId: string;
  lastUsedAt?: number;
  expiresAt?: number;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
};

function ApiKeysList({
  apiKeys,
  canManage,
}: {
  apiKeys: ApiKeyData[] | undefined;
  canManage: boolean;
}) {
  const toast = useToast();
  const deleteApiKey = useMutation(api.apiKeys.deleteApiKey);
  const updateApiKey = useMutation(api.apiKeys.updateApiKey);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const handleDelete = async (apiKeyId: string) => {
    if (!confirm("Are you sure you want to delete this API key? This action cannot be undone.")) {
      return;
    }

    setDeletingId(apiKeyId);
    try {
      await deleteApiKey({ apiKeyId: apiKeyId as Id<"apiKeys"> });
      toast.success("API key deleted successfully");
    } catch {
      toast.error("Failed to delete API key");
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleActive = async (apiKey: ApiKeyData) => {
    setTogglingId(apiKey._id);
    try {
      await updateApiKey({
        apiKeyId: apiKey._id,
        isActive: !apiKey.isActive,
      });
      toast.success(apiKey.isActive ? "API key deactivated" : "API key activated");
    } catch {
      toast.error("Failed to update API key");
    } finally {
      setTogglingId(null);
    }
  };

  if (apiKeys === undefined) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-20 bg-[#1a1a1a] rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  if (apiKeys.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 rounded-2xl bg-[#1a1a1a] flex items-center justify-center mx-auto mb-4">
          <KeyIcon className="w-8 h-8 text-[#666]" />
        </div>
        <h3 className="text-lg font-medium text-white mb-2">No API Keys Yet</h3>
        <p className="text-sm text-[#888] max-w-sm mx-auto">
          Create your first API key to start using the x402 Gateway with your agents.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {apiKeys.map((apiKey) => {
        const isExpanded = expandedId === apiKey._id;
        const isDeleting = deletingId === apiKey._id;
        const isToggling = togglingId === apiKey._id;

  return (
          <div
            key={apiKey._id}
            className={`border rounded-xl transition-all ${
              apiKey.isActive
                ? "border-[#333] bg-[#0a0a0a]"
                : "border-[#333]/50 bg-[#0a0a0a]/50 opacity-60"
            }`}
          >
            <div
              className="flex items-center justify-between p-4 cursor-pointer"
              onClick={() => setExpandedId(isExpanded ? null : apiKey._id)}
            >
              <div className="flex items-center gap-4 min-w-0">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    apiKey.isActive
                      ? "bg-gradient-to-br from-emerald-500/20 to-teal-600/20 border border-emerald-500/30"
                      : "bg-[#1a1a1a]"
                  }`}
                >
                  <KeyIcon
                    className={`w-5 h-5 ${
                      apiKey.isActive ? "text-emerald-400" : "text-[#666]"
                    }`}
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-white truncate">
                      {apiKey.name}
                    </h3>
                    {!apiKey.isActive && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-[#1a1a1a] text-[#666] rounded-full">
                        Inactive
                      </span>
                    )}
                    {(apiKey.ethereumNetwork || apiKey.receivingNetwork) && (
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${
                        (apiKey.ethereumNetwork || apiKey.receivingNetwork) === "mainnet"
                          ? "bg-emerald-900/50 text-emerald-400"
                          : "bg-amber-900/50 text-amber-400"
                      }`}>
                        {apiKey.ethereumNetwork || apiKey.receivingNetwork}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#888] font-mono mt-1">
                    {apiKey.apiKeyPrefix}...
                  </p>
                      </div>
                    </div>
              <div className="flex items-center gap-2">
                {isExpanded ? (
                  <ChevronUpIcon className="w-5 h-5 text-[#666]" />
                ) : (
                  <ChevronDownIcon className="w-5 h-5 text-[#666]" />
                      )}
                    </div>
            </div>

            {isExpanded && (
              <div className="px-4 pb-4 pt-0 space-y-4 border-t border-[#333]">
                  {apiKey.description && (
                  <div className="pt-4">
                    <p className="text-xs text-[#666] uppercase tracking-wider mb-1">Description</p>
                    <p className="text-sm text-[#888]">{apiKey.description}</p>
                  </div>
                )}

                {/* Show linked treasury info */}
                {apiKey.treasuryId && (
                  <div className="pt-4">
                    <p className="text-xs text-[#666] uppercase tracking-wider mb-1">Linked Treasury</p>
                    <TreasuryInfo treasuryId={apiKey.treasuryId} />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <p className="text-xs text-[#666] uppercase tracking-wider mb-1">Created</p>
                    <p className="text-sm text-[#888]">
                      {new Date(apiKey.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#666] uppercase tracking-wider mb-1">Last Used</p>
                    <p className="text-sm text-[#888]">
                      {apiKey.lastUsedAt
                        ? new Date(apiKey.lastUsedAt).toLocaleDateString()
                        : "Never"}
                    </p>
                </div>
              </div>

                {/* Spending Limits Editor */}
                <PolicyEditor 
                  apiKeyId={apiKey._id} 
                  spendingLimits={apiKey.spendingLimits} 
                  canManage={canManage} 
                  treasuryId={apiKey.treasuryId}
                />

                {/* Actions */}
              {canManage && (
                  <div className="flex items-center gap-2 pt-2 border-t border-[#333]">
                  <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleActive(apiKey);
                      }}
                      disabled={isToggling}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 ${
                      apiKey.isActive
                        ? "text-amber-400 hover:bg-amber-900/30"
                        : "text-emerald-400 hover:bg-emerald-900/30"
                    }`}
                  >
                      {isToggling
                      ? "..."
                      : apiKey.isActive
                        ? "Deactivate"
                        : "Activate"}
                  </button>
                  <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(apiKey._id);
                      }}
                      disabled={isDeleting}
                      className="px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {isDeleting ? "Deleting..." : "Delete"}
                  </button>
                </div>
              )}
            </div>
            )}
          </div>
        );
      })}
      </div>
  );
}

// ============================================
// POLICY EDITOR
// ============================================

function PolicyEditor({
  apiKeyId,
  spendingLimits,
  canManage,
  treasuryId,
}: {
  apiKeyId: Id<"apiKeys">;
  spendingLimits?: {
    maxPerTransaction: number;
    dailyLimit: number;
    monthlyLimit: number;
    isSyncedOnChain?: boolean;
  };
  canManage: boolean;
  treasuryId?: Id<"treasuries">;
}) {
  const updateApiKey = useMutation(api.apiKeys.updateApiKey);
  const markSynced = useMutation(api.apiKeys.markSpendingLimitsSynced);
  const treasury = useQuery(
    api.treasuries.getTreasuryById,
    treasuryId ? { treasuryId } : "skip"
  );
  const apiKeyData = useQuery(api.apiKeys.getApiKey, { apiKeyId });
  const toast = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [maxPerTransaction, setMaxPerTransaction] = useState("");
  const [dailyLimit, setDailyLimit] = useState("");
  const [monthlyLimit, setMonthlyLimit] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (spendingLimits) {
      setMaxPerTransaction(spendingLimits.maxPerTransaction?.toString() ?? "");
      setDailyLimit(spendingLimits.dailyLimit?.toString() ?? "");
      setMonthlyLimit(spendingLimits.monthlyLimit?.toString() ?? "");
    }
  }, [spendingLimits]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateApiKey({
        apiKeyId,
        spendingLimits: {
          maxPerTransaction: maxPerTransaction ? parseFloat(maxPerTransaction) : 0,
          dailyLimit: dailyLimit ? parseFloat(dailyLimit) : 0,
          monthlyLimit: monthlyLimit ? parseFloat(monthlyLimit) : 0,
        },
      });
      toast.success("Spending limits saved");
      setIsEditing(false);
    } catch {
      toast.error("Failed to save spending limits");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSyncOnChain = async () => {
    if (!treasury || !apiKeyData || !spendingLimits) {
      toast.error("Missing treasury or API key data");
      return;
    }

    setIsSyncing(true);
    try {
      const response = await fetch("/api/treasury/configure-api-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: apiKeyData.apiKey,
          treasuryAddress: treasury.contractAddress,
          network: treasury.network,
          spendingLimits: {
            maxPerTransaction: spendingLimits.maxPerTransaction / 100, // Convert from cents to MNEE
            dailyLimit: spendingLimits.dailyLimit / 100,
            monthlyLimit: spendingLimits.monthlyLimit / 100,
          },
        }),
      });

      const result = await response.json();

      if (result.status === "ok") {
        // Mark as synced in the database
        await markSynced({ apiKeyId });
        toast.success(result.alreadyConfigured 
          ? "API key already configured on-chain" 
          : "Spending limits synced on-chain!"
        );
      } else {
        toast.error(result.error || "Failed to sync on-chain");
      }
    } catch (error) {
      console.error("Sync error:", error);
      toast.error("Failed to sync on-chain");
    } finally {
      setIsSyncing(false);
    }
  };

  const needsSync = spendingLimits && !spendingLimits.isSyncedOnChain;

    return (
    <div className="pt-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-white">Spending Limits</h4>
        <div className="flex items-center gap-3">
          {canManage && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="text-xs text-[#888] hover:text-white transition-colors"
            >
              Edit
            </button>
          )}
          {needsSync && treasuryId && (
            <button
              onClick={handleSyncOnChain}
              disabled={isSyncing || !apiKeyData}
              className="text-xs text-amber-400 hover:text-amber-300 transition-colors disabled:opacity-50 flex items-center gap-1"
            >
              {isSyncing ? (
                <>
                  <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Syncing...
                </>
              ) : (
                "Sync on-chain"
              )}
            </button>
          )}
          {spendingLimits?.isSyncedOnChain && (
            <span className="text-xs text-emerald-400 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Synced
            </span>
          )}
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-3 bg-[#1a1a1a] rounded-lg p-4">
      <div className="grid grid-cols-3 gap-3">
        <div>
              <label className="block text-xs text-[#666] mb-1">Max Per TX</label>
          <input
            type="number"
            value={maxPerTransaction}
            onChange={(e) => setMaxPerTransaction(e.target.value)}
                placeholder="No limit"
                className="w-full px-3 py-2 text-sm border border-[#333] rounded-lg bg-[#0a0a0a] text-white placeholder-[#666] focus:outline-none focus:border-[#555]"
          />
        </div>
        <div>
              <label className="block text-xs text-[#666] mb-1">Daily Limit</label>
          <input
            type="number"
            value={dailyLimit}
            onChange={(e) => setDailyLimit(e.target.value)}
                placeholder="No limit"
                className="w-full px-3 py-2 text-sm border border-[#333] rounded-lg bg-[#0a0a0a] text-white placeholder-[#666] focus:outline-none focus:border-[#555]"
          />
        </div>
        <div>
              <label className="block text-xs text-[#666] mb-1">Monthly Limit</label>
          <input
            type="number"
            value={monthlyLimit}
            onChange={(e) => setMonthlyLimit(e.target.value)}
                placeholder="No limit"
                className="w-full px-3 py-2 text-sm border border-[#333] rounded-lg bg-[#0a0a0a] text-white placeholder-[#666] focus:outline-none focus:border-[#555]"
          />
        </div>
      </div>
          <div className="flex items-center gap-2 pt-2">
        <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-3 py-1.5 text-xs font-medium text-black bg-white hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save"}
        </button>
        <button
              onClick={() => setIsEditing(false)}
              className="px-3 py-1.5 text-xs font-medium text-[#888] hover:text-white transition-colors"
        >
          Cancel
        </button>
      </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#1a1a1a] rounded-lg p-3">
            <p className="text-xs text-[#666] mb-1">Max Per TX</p>
            <p className="text-sm text-white font-medium">
              {spendingLimits?.maxPerTransaction
                ? `$${(spendingLimits.maxPerTransaction / 100).toFixed(2)}`
                : "No limit"}
            </p>
          </div>
          <div className="bg-[#1a1a1a] rounded-lg p-3">
            <p className="text-xs text-[#666] mb-1">Daily</p>
            <p className="text-sm text-white font-medium">
              {spendingLimits?.dailyLimit
                ? `$${(spendingLimits.dailyLimit / 100).toFixed(2)}`
                : "No limit"}
            </p>
          </div>
          <div className="bg-[#1a1a1a] rounded-lg p-3">
            <p className="text-xs text-[#666] mb-1">Monthly</p>
            <p className="text-sm text-white font-medium">
              {spendingLimits?.monthlyLimit
                ? `$${(spendingLimits.monthlyLimit / 100).toFixed(2)}`
                : "No limit"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// WALLET INFO COMPONENT
// ============================================

function TreasuryInfo({ treasuryId }: { treasuryId: Id<"treasuries"> }) {
  const treasury = useQuery(api.treasuries.getTreasuryById, { treasuryId });

  if (!treasury) {
    return (
      <div className="bg-[#1a1a1a] rounded-lg p-3 animate-pulse">
        <div className="h-4 bg-[#333] rounded w-32"></div>
      </div>
    );
  }

  const isMainnet = treasury.network === "mainnet";

  return (
    <div className="bg-[#1a1a1a] rounded-lg p-3 border border-[#333]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-white font-mono">
            {treasury.contractAddress.slice(0, 6)}...{treasury.contractAddress.slice(-4)}
          </p>
          <p className="text-xs text-[#666] mt-1">
            Balance: {treasury.cachedBalance ? `$${(treasury.cachedBalance / 100).toFixed(2)}` : "—"}
          </p>
        </div>
        <span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${
          isMainnet 
            ? "bg-emerald-900/50 text-emerald-400" 
            : "bg-amber-900/50 text-amber-400"
        }`}>
          {treasury.network}
        </span>
      </div>
    </div>
  );
}

// ============================================
// LOADING SKELETON
// ============================================

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="h-8 w-32 bg-[#1a1a1a] rounded mb-8 animate-pulse" />
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#1a1a1a] animate-pulse" />
            <div>
              <div className="h-7 w-48 bg-[#1a1a1a] rounded animate-pulse" />
              <div className="h-4 w-64 bg-[#1a1a1a] rounded animate-pulse mt-2" />
            </div>
          </div>
        </div>
        <div className="bg-[#111] rounded-xl border border-[#333] p-6">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-[#1a1a1a] rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
