"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { WorkspaceGuard } from "../../../components/WorkspaceGuard";
import { BackToDashboard } from "../../../components/BackToDashboard";
import { useToast } from "../../../components/Toast";
import { Id } from "../../../convex/_generated/dataModel";

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

export default function AgentsPage() {
  return (
    <WorkspaceGuard>
      <AgentsContent />
    </WorkspaceGuard>
  );
}

function AgentsContent() {
  const workspaceData = useQuery(api.workspaces.getCurrentWorkspace);
  const apiKeys = useQuery(api.apiKeys.listApiKeys);
  // Use workspace tokens (tokens the workspace has enabled)
  const workspaceTokens = useQuery(api.tokens.listWorkspaceTokens, {});

  if (!workspaceData) {
    return <LoadingSkeleton />;
  }

  const { role } = workspaceData;
  const isAdmin = role === "owner" || role === "admin";
  const canWrite = role === "owner" || role === "admin" || role === "member";

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back link */}
        <BackToDashboard />

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
          {canWrite && <CreateApiKeyButton workspaceTokens={workspaceTokens as SupportedToken[] | undefined} />}
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
                How API Keys Work
              </h3>
              <p className="text-sm text-[#888] mt-1">
                API keys authenticate your agents when calling the x402 Gateway. Each key is shown only once when created — store it securely. Each key has a preferred payment token that will be used for all payments made with that key.
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
              apiKeys={apiKeys} 
              canManage={isAdmin} 
              workspaceTokens={workspaceTokens as SupportedToken[] | undefined}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// API KEYS COMPONENTS
// ============================================

type ApiKeyData = {
  _id: Id<"apiKeys">;
  name: string;
  description?: string;
  apiKeyPrefix: string;
  preferredPaymentToken?: string; // Optional for backwards compat with old keys
  createdByUserId: string;
  lastUsedAt?: number;
  expiresAt?: number;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
};

function CreateApiKeyButton({ workspaceTokens }: { workspaceTokens: SupportedToken[] | undefined }) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedToken, setSelectedToken] = useState<SupportedToken | null>(null);
  const [isTokenDropdownOpen, setIsTokenDropdownOpen] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const createApiKey = useMutation(api.apiKeys.createApiKey);

  // Set default token when workspaceTokens loads
  useEffect(() => {
    if (workspaceTokens && workspaceTokens.length > 0 && !selectedToken) {
      setSelectedToken(workspaceTokens[0]);
    }
  }, [workspaceTokens, selectedToken]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !selectedToken) return;

    setIsCreating(true);
    try {
      const result = await createApiKey({
        name: name.trim(),
        description: description.trim() || undefined,
        preferredPaymentToken: selectedToken.address,
      });
      setNewApiKey(result.apiKey);
      setName("");
      setDescription("");
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
  };

  const noTokensAvailable = !workspaceTokens || workspaceTokens.length === 0;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        disabled={noTokensAvailable}
        className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-black bg-white hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title={noTokensAvailable ? "No payment tokens configured" : undefined}
      >
        <PlusIcon className="w-5 h-5" />
        Create API Key
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#111] border border-[#333] rounded-2xl p-6 w-full max-w-md shadow-2xl">
            {newApiKey ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-emerald-900/50 flex items-center justify-center">
                    <CheckIcon className="w-6 h-6 text-emerald-400" />
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

                <div className="bg-[#0a0a0a] border border-[#333] rounded-xl p-4">
                  <div className="flex items-center justify-between gap-3">
                    <code className="text-sm font-mono text-white break-all">
                      {newApiKey}
                    </code>
                    <button
                      onClick={handleCopy}
                      className="flex-shrink-0 p-2.5 text-[#888] hover:text-white hover:bg-[#1a1a1a] rounded-lg transition-colors"
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

                <div className="bg-amber-900/20 border border-amber-800 rounded-xl p-4">
                  <p className="text-sm text-amber-200">
                    <strong>Important:</strong> This is the only time you&apos;ll see this key. 
                    Store it securely — we only save a hash on our servers.
                  </p>
                </div>

                <button
                  onClick={handleClose}
                  className="w-full px-4 py-3 text-sm font-medium text-black bg-white hover:bg-gray-200 rounded-xl transition-colors"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreate} className="space-y-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                    <KeyIcon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">
                    Create API Key
                  </h3>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#888] mb-2">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., dev-bot-1, production-agent"
                    className="w-full px-4 py-3 border border-[#333] rounded-xl bg-[#0a0a0a] text-white placeholder-[#666] focus:outline-none focus:border-[#555]"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#888] mb-2">
                    Description <span className="text-[#666]">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What is this key used for?"
                    className="w-full px-4 py-3 border border-[#333] rounded-xl bg-[#0a0a0a] text-white placeholder-[#666] focus:outline-none focus:border-[#555]"
                  />
                </div>

                {/* Payment Token Selector */}
                <div>
                  <label className="block text-sm font-medium text-[#888] mb-2">
                    Payment Token <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsTokenDropdownOpen(!isTokenDropdownOpen)}
                      className="w-full flex items-center justify-between px-4 py-3 border border-[#333] rounded-xl bg-[#0a0a0a] text-white focus:outline-none focus:border-[#555]"
                    >
                      {selectedToken ? (
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-xs font-bold text-white">
                            {selectedToken.symbol.slice(0, 2)}
                          </div>
                          <span>{selectedToken.symbol}</span>
                          <span className="text-[#666]">-</span>
                          <span className="text-[#888] text-sm">{selectedToken.name}</span>
                        </div>
                      ) : (
                        <span className="text-[#666]">Select a payment token</span>
                      )}
                      <ChevronDownIcon className="w-5 h-5 text-[#888]" />
                    </button>

                    {isTokenDropdownOpen && workspaceTokens && (
                      <div className="absolute z-10 mt-2 w-full bg-[#111] border border-[#333] rounded-xl shadow-lg max-h-48 overflow-y-auto">
                        {workspaceTokens.map((token) => (
                          <button
                            key={token._id}
                            type="button"
                            onClick={() => {
                              setSelectedToken(token);
                              setIsTokenDropdownOpen(false);
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-[#1a1a1a] transition-colors ${
                              selectedToken?._id === token._id ? "bg-[#1a1a1a]" : ""
                            }`}
                          >
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-xs font-bold text-white">
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
                  <p className="text-xs text-[#666] mt-2">
                    All payments made with this API key will use this token
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={isCreating || !name.trim() || !selectedToken}
                    className="flex-1 px-4 py-3 text-sm font-medium text-black bg-white hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreating ? "Creating..." : "Create Key"}
                  </button>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 px-4 py-3 text-sm font-medium text-[#888] hover:text-white hover:bg-[#1a1a1a] rounded-xl transition-colors"
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

function ApiKeysList({
  apiKeys,
  canManage,
  workspaceTokens,
}: {
  apiKeys: ApiKeyData[] | undefined;
  canManage: boolean;
  workspaceTokens: SupportedToken[] | undefined;
}) {
  const updateApiKey = useMutation(api.apiKeys.updateApiKey);
  const deleteApiKey = useMutation(api.apiKeys.deleteApiKey);
  const [togglingId, setTogglingId] = useState<Id<"apiKeys"> | null>(null);
  const [deletingId, setDeletingId] = useState<Id<"apiKeys"> | null>(null);
  const [editingPolicyId, setEditingPolicyId] = useState<Id<"apiKeys"> | null>(null);

  // Helper to get token symbol from address
  const getTokenSymbol = (tokenAddress: string) => {
    const token = workspaceTokens?.find(t => t.address.toLowerCase() === tokenAddress.toLowerCase());
    return token?.symbol || tokenAddress.slice(0, 6) + "...";
  };

  if (apiKeys === undefined) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="animate-pulse flex items-center gap-4 py-4">
            <div className="w-12 h-12 bg-[#1a1a1a] rounded-xl" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 bg-[#1a1a1a] rounded" />
              <div className="h-3 w-48 bg-[#1a1a1a] rounded" />
            </div>
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
        <p className="text-lg font-medium text-white">
          No API keys yet
        </p>
        <p className="text-sm text-[#888] mt-1 max-w-sm mx-auto">
          Create your first API key to connect your agents and SDKs to the x402 Gateway
        </p>
      </div>
    );
  }

  const handleToggle = async (apiKey: ApiKeyData) => {
    setTogglingId(apiKey._id);
    try {
      await updateApiKey({
        apiKeyId: apiKey._id,
        isActive: !apiKey.isActive,
      });
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (apiKey: ApiKeyData) => {
    if (!confirm(`Are you sure you want to delete the API key "${apiKey.name}"? This cannot be undone.`)) {
      return;
    }
    setDeletingId(apiKey._id);
    try {
      await deleteApiKey({ apiKeyId: apiKey._id });
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatRelativeTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return formatDate(timestamp);
  };

  return (
    <>
      <div className="divide-y divide-[#333]">
        {apiKeys.map((apiKey) => (
          <div
            key={apiKey._id}
            className={`py-5 first:pt-0 last:pb-0 ${
              !apiKey.isActive ? "opacity-60" : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    apiKey.isActive
                      ? "bg-emerald-900/50"
                      : "bg-[#1a1a1a]"
                  }`}
                >
                  <KeyIcon
                    className={`w-6 h-6 ${
                      apiKey.isActive
                        ? "text-emerald-400"
                        : "text-[#666]"
                    }`}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-white">
                      {apiKey.name}
                    </p>
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        apiKey.isActive
                          ? "bg-emerald-900/50 text-emerald-400"
                          : "bg-[#1a1a1a] text-[#666]"
                      }`}
                    >
                      {apiKey.isActive ? "Active" : "Disabled"}
                    </span>
                    {/* Payment Token Badge */}
                    {apiKey.preferredPaymentToken ? (
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-900/50 text-blue-400">
                        {getTokenSymbol(apiKey.preferredPaymentToken)}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-900/50 text-amber-400">
                        No token set
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <code className="text-xs font-mono text-[#666] bg-[#1a1a1a] px-2 py-0.5 rounded">
                      {apiKey.apiKeyPrefix}
                    </code>
                    <span className="text-[#333]">•</span>
                    <span className="text-xs text-[#666]">
                      Created {formatDate(apiKey.createdAt)}
                    </span>
                    {apiKey.lastUsedAt && (
                      <>
                        <span className="text-[#333]">•</span>
                        <span className="text-xs text-[#666]">
                          Last used {formatRelativeTime(apiKey.lastUsedAt)}
                        </span>
                      </>
                    )}
                  </div>
                  {apiKey.description && (
                    <p className="text-xs text-[#666] mt-1">
                      {apiKey.description}
                    </p>
                  )}
                </div>
              </div>

              {canManage && (
                <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                  <button
                    onClick={() => setEditingPolicyId(apiKey._id)}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg text-blue-400 hover:bg-blue-900/30 transition-colors"
                  >
                    Spend Policy
                  </button>
                  <button
                    onClick={() => handleToggle(apiKey)}
                    disabled={togglingId === apiKey._id}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 ${
                      apiKey.isActive
                        ? "text-amber-400 hover:bg-amber-900/30"
                        : "text-emerald-400 hover:bg-emerald-900/30"
                    }`}
                  >
                    {togglingId === apiKey._id
                      ? "..."
                      : apiKey.isActive
                      ? "Disable"
                      : "Enable"}
                  </button>
                  <button
                    onClick={() => handleDelete(apiKey)}
                    disabled={deletingId === apiKey._id}
                    className="p-2 text-[#666] hover:text-red-400 rounded-lg hover:bg-[#1a1a1a] transition-colors disabled:opacity-50"
                    title="Delete API key"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              )}
            </div>
            {/* Spend Policy Section */}
            <SpendPolicySection apiKeyId={apiKey._id} canManage={canManage} />
          </div>
        ))}
      </div>
      {editingPolicyId && canManage && (
        <SpendPolicyModal
          apiKeyId={editingPolicyId}
          onClose={() => setEditingPolicyId(null)}
        />
      )}
    </>
  );
}

// ============================================
// SPEND POLICY COMPONENTS
// ============================================

function SpendPolicySection({
  apiKeyId,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  canManage,
}: {
  apiKeyId: Id<"apiKeys">;
  canManage: boolean;
}) {
  const policyLimits = useQuery(api.apiKeys.listAgentPolicyLimits, { apiKeyId });
  const chains = useQuery(api.chains.listSupportedChains, { includeTestnets: true });
  const tokens = useQuery(api.tokens.listWorkspaceTokens, {});
  const policy = useQuery(api.apiKeys.getAgentPolicy, { apiKeyId });

  if (policyLimits === undefined || chains === undefined || tokens === undefined || policy === undefined) {
    return (
      <div className="mt-4 pt-4 border-t border-[#333]">
        <div className="animate-pulse h-4 w-32 bg-[#1a1a1a] rounded" />
      </div>
    );
  }

  // Show warning if no limits exist
  if (!policyLimits || policyLimits.length === 0) {
    return (
      <div className="mt-4 pt-4 border-t border-[#333]">
        <div className="bg-amber-900/20 border border-amber-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-200">
                No spending limits configured
              </p>
              <p className="text-xs text-amber-300/80 mt-1">
                This agent has no spending limits set. Add per-chain/token limits to control spending for specific tokens.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 pt-4 border-t border-[#333]">
      <div className="bg-[#0a0a0a] border border-[#333] rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-semibold text-white uppercase tracking-wide">
            Spend Limits
          </h4>
          {policy && !policy.isActive && (
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-[#1a1a1a] text-[#666]">
              Policy Inactive
            </span>
          )}
        </div>
        <div className="space-y-3">
          {policyLimits.map((limit) => (
            <LimitRowWithSpend
              key={limit._id}
              limit={limit}
              chains={chains}
              tokens={tokens}
              apiKeyId={apiKeyId}
            />
          ))}
        </div>
        {/* Allowed Providers */}
        {policy && policy.allowedProviders && policy.allowedProviders.length > 0 && (
          <div className="mt-4 pt-4 border-t border-[#333]">
            <span className="text-xs text-[#888]">Allowed Providers: </span>
            <span className="text-xs text-white">
              {policy.allowedProviders.length} provider{policy.allowedProviders.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function LimitRowWithSpend({
  limit,
  chains,
  tokens,
  apiKeyId,
}: {
  limit: ChainTokenLimit;
  chains: Array<{ chainId: number; name: string }> | undefined;
  tokens: SupportedToken[] | undefined;
  apiKeyId: Id<"apiKeys">;
}) {
  const chain = chains?.find((c) => c.chainId === limit.chainId);
  const token = tokens?.find((t) => t.address.toLowerCase() === limit.tokenAddress.toLowerCase());
  const spend = useQuery(api.usage.getAgentSpend, {
    apiKeyId,
    chainId: limit.chainId,
    tokenAddress: limit.tokenAddress,
  });

  if (spend === undefined) {
    return (
      <div className="bg-[#111] border border-[#333] rounded-lg p-3">
        <div className="animate-pulse h-4 w-32 bg-[#1a1a1a] rounded" />
      </div>
    );
  }

  return (
    <div className="bg-[#111] border border-[#333] rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">
            {chain?.name || `Chain ${limit.chainId}`}
          </span>
          <span className="text-[#666]">•</span>
          <span className="text-sm text-[#888]">
            {token?.symbol || limit.tokenAddress.slice(0, 8) + "..."}
          </span>
          {!limit.isActive && (
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-[#1a1a1a] text-[#666]">
              Inactive
            </span>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {limit.dailyLimit !== undefined && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-[#888]">Daily</span>
              <span className="text-xs text-white font-medium">
                {spend.dailySpend.toFixed(6)} / {limit.dailyLimit.toFixed(6)}
              </span>
            </div>
            <div className="w-full bg-[#1a1a1a] rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full ${
                  spend.dailySpend >= limit.dailyLimit
                    ? "bg-red-500"
                    : spend.dailySpend >= limit.dailyLimit * 0.8
                    ? "bg-amber-500"
                    : "bg-emerald-500"
                }`}
                style={{
                  width: `${Math.min((spend.dailySpend / limit.dailyLimit) * 100, 100)}%`,
                }}
              />
            </div>
          </div>
        )}
        {limit.monthlyLimit !== undefined && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-[#888]">Monthly</span>
              <span className="text-xs text-white font-medium">
                {spend.monthlySpend.toFixed(6)} / {limit.monthlyLimit.toFixed(6)}
              </span>
            </div>
            <div className="w-full bg-[#1a1a1a] rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full ${
                  spend.monthlySpend >= limit.monthlyLimit
                    ? "bg-red-500"
                    : spend.monthlySpend >= limit.monthlyLimit * 0.8
                    ? "bg-amber-500"
                    : "bg-emerald-500"
                }`}
                style={{
                  width: `${Math.min((spend.monthlySpend / limit.monthlyLimit) * 100, 100)}%`,
                }}
              />
            </div>
          </div>
        )}
        {limit.maxRequest !== undefined && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-[#888]">Max Request</span>
              <span className="text-xs text-white font-medium">
                {limit.maxRequest.toFixed(6)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SpendPolicyModal({
  apiKeyId,
  onClose,
}: {
  apiKeyId: Id<"apiKeys">;
  onClose: () => void;
}) {
  const policy = useQuery(api.apiKeys.getAgentPolicy, { apiKeyId });
  const policyLimits = useQuery(api.apiKeys.listAgentPolicyLimits, { apiKeyId });
  const chains = useQuery(api.chains.listSupportedChains, { includeTestnets: true });
  const workspaceTokens = useQuery(api.tokens.listWorkspaceTokens, {});
  const providers = useQuery(api.gateway.listProviders);
  const createPolicy = useMutation(api.apiKeys.createAgentPolicy);
  const updatePolicy = useMutation(api.apiKeys.updateAgentPolicy);
  const deletePolicy = useMutation(api.apiKeys.deleteAgentPolicy);
  const upsertLimit = useMutation(api.apiKeys.upsertAgentPolicyLimit);
  const deleteLimit = useMutation(api.apiKeys.deleteAgentPolicyLimit);
  const toast = useToast();

  const [allowedProviders, setAllowedProviders] = useState<Id<"providers">[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Initialize form with existing policy
  useEffect(() => {
    if (policy) {
      setAllowedProviders(policy.allowedProviders || []);
      setIsActive(policy.isActive);
    }
  }, [policy]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const args = {
        apiKeyId,
        allowedProviders: allowedProviders.length > 0 ? allowedProviders : undefined,
        isActive,
      };

      if (policy) {
        await updatePolicy(args);
      } else {
        await createPolicy(args);
      }
      toast.success("Policy updated successfully");
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save policy");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!policy) return;
    if (!confirm("Are you sure you want to delete this policy? This will allow unlimited spending.")) {
      return;
    }
    setIsDeleting(true);
    try {
      await deletePolicy({ apiKeyId });
      toast.success("Policy deleted successfully");
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete policy");
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleProvider = (providerId: Id<"providers">) => {
    setAllowedProviders((prev) =>
      prev.includes(providerId)
        ? prev.filter((id) => id !== providerId)
        : [...prev, providerId]
    );
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#111] border border-[#333] rounded-2xl p-6 w-full max-w-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-white">
              Spend Limits & Policy
            </h3>
            <p className="text-sm text-[#888] mt-1">
              Configure per-chain/token spending limits and provider restrictions
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[#666] hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          {/* Policy Active Toggle */}
          <div className="flex items-center justify-between p-4 bg-[#0a0a0a] border border-[#333] rounded-xl">
            <div>
              <label className="text-sm font-medium text-white">Policy Active</label>
              <p className="text-xs text-[#888] mt-1">
                When inactive, all requests will be allowed regardless of limits
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isActive ? "bg-emerald-500" : "bg-[#333]"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isActive ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Per-Chain/Token Limits Section */}
          <div>
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-white mb-1">Per-Chain/Token Limits</h4>
              <p className="text-xs text-[#666]">
                Set spending limits for specific chain and token combinations. Limits are enforced per token, so you can have different limits for USDC vs ETH, etc.
              </p>
            </div>

            {/* Existing Limits List */}
            {policyLimits && policyLimits.length > 0 && (
              <div className="space-y-2 mb-4">
                {policyLimits.map((limit) => (
                  <ChainTokenLimitRow
                    key={limit._id}
                    limit={limit}
                    chains={chains}
                    tokens={workspaceTokens}
                    onDelete={async () => {
                      try {
                        await deleteLimit({ limitId: limit._id });
                        toast.success("Limit deleted successfully");
                      } catch (error) {
                        toast.error(error instanceof Error ? error.message : "Failed to delete limit");
                      }
                    }}
                  />
                ))}
              </div>
            )}

            {/* Add New Limit Form */}
            <AddChainTokenLimitForm
              chains={chains}
              tokens={workspaceTokens}
              onAdd={async (chainId, tokenAddress, dailyLimit, monthlyLimit, maxRequest) => {
                try {
                  await upsertLimit({
                    apiKeyId,
                    chainId,
                    tokenAddress,
                    dailyLimit: dailyLimit ? parseFloat(dailyLimit) : undefined,
                    monthlyLimit: monthlyLimit ? parseFloat(monthlyLimit) : undefined,
                    maxRequest: maxRequest ? parseFloat(maxRequest) : undefined,
                    isActive: true,
                  });
                  toast.success("Limit added successfully");
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Failed to add limit");
                }
              }}
            />
          </div>

          {/* Allowed Providers */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Allowed Providers <span className="text-[#666]">(optional)</span>
            </label>
            {providers && providers.length > 0 ? (
              <div className="border border-[#333] rounded-xl bg-[#0a0a0a] p-3 max-h-48 overflow-y-auto">
                {providers.map((provider) => (
                  <label
                    key={provider._id}
                    className="flex items-center gap-3 p-2 hover:bg-[#1a1a1a] rounded-lg cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={allowedProviders.includes(provider._id)}
                      onChange={() => toggleProvider(provider._id)}
                      className="w-4 h-4 rounded border-[#333] bg-[#0a0a0a] text-emerald-500 focus:ring-emerald-500"
                    />
                    <div className="flex-1">
                      <p className="text-sm text-white">{provider.name}</p>
                      <p className="text-xs text-[#666]">{provider.host}</p>
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              <div className="border border-[#333] rounded-xl bg-[#0a0a0a] p-4 text-center">
                <p className="text-sm text-[#666]">
                  No providers found. Providers will be created automatically when payments are made.
                </p>
              </div>
            )}
            <p className="text-xs text-[#666] mt-2">
              If specified, only payments to these providers will be allowed. Leave empty to allow all providers.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-[#333]">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSaving}
              className="flex-1 px-4 py-3 text-sm font-medium text-black bg-white hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? "Saving..." : policy ? "Update Policy" : "Create Policy"}
            </button>
            {policy && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-3 text-sm font-medium text-red-400 hover:bg-red-900/30 rounded-xl transition-colors disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-3 text-sm font-medium text-[#888] hover:text-white hover:bg-[#1a1a1a] rounded-xl transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Per-chain/token limit components
type ChainTokenLimit = {
  _id: Id<"agentPolicyLimits">;
  chainId: number;
  tokenAddress: string;
  dailyLimit?: number;
  monthlyLimit?: number;
  maxRequest?: number;
  isActive: boolean;
};

function ChainTokenLimitRow({
  limit,
  chains,
  tokens,
  onDelete,
}: {
  limit: ChainTokenLimit;
  chains: Array<{ chainId: number; name: string }> | undefined;
  tokens: SupportedToken[] | undefined;
  onDelete: () => void;
}) {
  const chain = chains?.find((c) => c.chainId === limit.chainId);
  const token = tokens?.find((t) => t.address.toLowerCase() === limit.tokenAddress.toLowerCase());

  return (
    <div className="bg-[#0a0a0a] border border-[#333] rounded-xl p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-white">
              {chain?.name || `Chain ${limit.chainId}`}
            </span>
            <span className="text-[#666]">•</span>
            <span className="text-sm text-[#888]">
              {token?.symbol || limit.tokenAddress.slice(0, 8) + "..."}
            </span>
            {!limit.isActive && (
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-[#1a1a1a] text-[#666]">
                Inactive
              </span>
            )}
          </div>
          <div className="grid grid-cols-3 gap-3 text-xs">
            {limit.dailyLimit !== undefined && (
              <div>
                <span className="text-[#666]">Daily: </span>
                <span className="text-white">{limit.dailyLimit.toFixed(6)}</span>
              </div>
            )}
            {limit.monthlyLimit !== undefined && (
              <div>
                <span className="text-[#666]">Monthly: </span>
                <span className="text-white">{limit.monthlyLimit.toFixed(6)}</span>
              </div>
            )}
            {limit.maxRequest !== undefined && (
              <div>
                <span className="text-[#666]">Max Request: </span>
                <span className="text-white">{limit.maxRequest.toFixed(6)}</span>
              </div>
            )}
          </div>
        </div>
        <button
          onClick={onDelete}
          className="p-2 text-[#666] hover:text-red-400 rounded-lg hover:bg-[#1a1a1a] transition-colors"
          title="Delete limit"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

function AddChainTokenLimitForm({
  chains,
  tokens,
  onAdd,
}: {
  chains: Array<{ chainId: number; name: string }> | undefined;
  tokens: SupportedToken[] | undefined;
  onAdd: (chainId: number, tokenAddress: string, dailyLimit: string, monthlyLimit: string, maxRequest: string) => Promise<void>;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedChainId, setSelectedChainId] = useState<number | null>(null);
  const [selectedTokenAddress, setSelectedTokenAddress] = useState<string>("");
  const [dailyLimit, setDailyLimit] = useState<string>("");
  const [monthlyLimit, setMonthlyLimit] = useState<string>("");
  const [maxRequest, setMaxRequest] = useState<string>("");
  const [isAdding, setIsAdding] = useState(false);

  // Filter tokens by selected chain
  const availableTokens = selectedChainId
    ? tokens?.filter((t) => t.chainId === selectedChainId)
    : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChainId || !selectedTokenAddress) return;

    setIsAdding(true);
    try {
      await onAdd(selectedChainId, selectedTokenAddress, dailyLimit, monthlyLimit, maxRequest);
      // Reset form
      setSelectedChainId(null);
      setSelectedTokenAddress("");
      setDailyLimit("");
      setMonthlyLimit("");
      setMaxRequest("");
      setIsExpanded(false);
    } catch {
      // Error already handled in onAdd
    } finally {
      setIsAdding(false);
    }
  };

  if (!isExpanded) {
    return (
      <button
        type="button"
        onClick={() => setIsExpanded(true)}
        className="w-full px-4 py-2 text-sm font-medium text-blue-400 hover:bg-blue-900/30 border border-[#333] rounded-xl transition-colors"
      >
        + Add Chain/Token Limit
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-[#0a0a0a] border border-[#333] rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h5 className="text-sm font-medium text-white">Add New Limit</h5>
        <button
          type="button"
          onClick={() => setIsExpanded(false)}
          className="text-[#666] hover:text-white"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Chain Selection */}
      <div>
        <label className="block text-xs font-medium text-[#888] mb-2">
          Chain <span className="text-red-500">*</span>
        </label>
        <select
          value={selectedChainId || ""}
          onChange={(e) => {
            setSelectedChainId(parseInt(e.target.value));
            setSelectedTokenAddress(""); // Reset token when chain changes
          }}
          className="w-full px-4 py-2 border border-[#333] rounded-xl bg-[#111] text-white focus:outline-none focus:border-[#555]"
          required
        >
          <option value="">Select a chain</option>
          {chains?.map((chain) => (
            <option key={chain.chainId} value={chain.chainId}>
              {chain.name} ({chain.chainId})
            </option>
          ))}
        </select>
      </div>

      {/* Token Selection */}
      {selectedChainId && (
        <div>
          <label className="block text-xs font-medium text-[#888] mb-2">
            Token <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedTokenAddress}
            onChange={(e) => setSelectedTokenAddress(e.target.value)}
            className="w-full px-4 py-2 border border-[#333] rounded-xl bg-[#111] text-white focus:outline-none focus:border-[#555]"
            required
          >
            <option value="">Select a token</option>
            {availableTokens?.map((token) => (
              <option key={token._id} value={token.address}>
                {token.symbol} - {token.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Limits */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-[#888] mb-2">Daily Limit</label>
          <input
            type="number"
            step="any"
            value={dailyLimit}
            onChange={(e) => setDailyLimit(e.target.value)}
            placeholder="Optional"
            className="w-full px-3 py-2 border border-[#333] rounded-lg bg-[#111] text-white placeholder-[#666] focus:outline-none focus:border-[#555] text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[#888] mb-2">Monthly Limit</label>
          <input
            type="number"
            step="any"
            value={monthlyLimit}
            onChange={(e) => setMonthlyLimit(e.target.value)}
            placeholder="Optional"
            className="w-full px-3 py-2 border border-[#333] rounded-lg bg-[#111] text-white placeholder-[#666] focus:outline-none focus:border-[#555] text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[#888] mb-2">Max Request</label>
          <input
            type="number"
            step="any"
            value={maxRequest}
            onChange={(e) => setMaxRequest(e.target.value)}
            placeholder="Optional"
            className="w-full px-3 py-2 border border-[#333] rounded-lg bg-[#111] text-white placeholder-[#666] focus:outline-none focus:border-[#555] text-sm"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isAdding || !selectedChainId || !selectedTokenAddress}
          className="flex-1 px-4 py-2 text-sm font-medium text-black bg-white hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isAdding ? "Adding..." : "Add Limit"}
        </button>
        <button
          type="button"
          onClick={() => setIsExpanded(false)}
          className="px-4 py-2 text-sm font-medium text-[#888] hover:text-white hover:bg-[#1a1a1a] rounded-xl transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="h-4 w-32 bg-[#1a1a1a] rounded animate-pulse mb-6" />
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 bg-[#1a1a1a] rounded-2xl animate-pulse" />
          <div className="space-y-2">
            <div className="h-6 w-48 bg-[#1a1a1a] rounded animate-pulse" />
            <div className="h-4 w-64 bg-[#1a1a1a] rounded animate-pulse" />
          </div>
        </div>
        <div className="bg-[#111] rounded-xl border border-[#333] p-6">
          <div className="h-6 w-32 bg-[#1a1a1a] rounded animate-pulse mb-6" />
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="animate-pulse flex items-center gap-4">
                <div className="w-12 h-12 bg-[#1a1a1a] rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-[#1a1a1a] rounded" />
                  <div className="h-3 w-48 bg-[#1a1a1a] rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
