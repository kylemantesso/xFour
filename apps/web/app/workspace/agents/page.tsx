"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { WorkspaceGuard } from "../../../components/WorkspaceGuard";
import { BackToDashboard } from "../../../components/BackToDashboard";
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
                      Copy your key now — you won't see it again!
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
                    <strong>Important:</strong> This is the only time you'll see this key. 
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
    <div className="divide-y divide-[#333]">
      {apiKeys.map((apiKey) => (
        <div
          key={apiKey._id}
          className={`flex items-center justify-between py-5 first:pt-0 last:pb-0 ${
            !apiKey.isActive ? "opacity-60" : ""
          }`}
        >
          <div className="flex items-center gap-4 min-w-0">
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
            <div className="min-w-0">
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
      ))}
    </div>
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
