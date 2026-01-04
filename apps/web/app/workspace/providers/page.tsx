"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { WorkspaceGuard } from "../../../components/WorkspaceGuard";
import { BackToDashboard } from "../../../components/BackToDashboard";
import { useToast } from "../../../components/Toast";
import { Id } from "../../../convex/_generated/dataModel";

// Types
type MneeNetwork = "sandbox" | "mainnet";

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

export default function ProvidersPage() {
  return (
    <WorkspaceGuard>
      <ProvidersContent />
    </WorkspaceGuard>
  );
}

function ProvidersContent() {
  const workspaceData = useQuery(api.workspaces.getCurrentWorkspace);
  const apiKeys = useQuery(api.apiKeys.listApiKeys, {});
  const wallets = useQuery(api.wallets.listWallets, {});
  const mneeWallets = useQuery(api.mnee.listWorkspaceMneeWallets, {});

  if (!workspaceData) {
    return <LoadingSkeleton />;
  }

  const { role } = workspaceData;
  const isAdmin = role === "owner" || role === "admin";
  const canWrite = role === "owner" || role === "admin" || role === "member";
  // Allow creation if they have either new wallets OR old mneeWallets (backward compatibility)
  const hasWallets = (wallets && wallets.length > 0) || (mneeWallets && mneeWallets.length > 0);

  // Filter to only show provider keys
  const providerKeys = apiKeys?.filter(key => key.type === "provider") ?? [];

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back link */}
        <BackToDashboard />

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/25">
              <KeyIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">
                Provider API Keys
              </h1>
              <p className="text-sm text-[#888] mt-1">
                Create and manage API keys for receiving payments with @x402/server
              </p>
            </div>
          </div>
          {canWrite && <CreateProviderKeyButton hasWallets={hasWallets ?? false} wallets={wallets} />}
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
                How Provider Keys Work
              </h3>
              <p className="text-sm text-[#888] mt-1">
                Provider keys enable your API to receive x402 payments. Each key includes a receiving address where payments will be sent. Use these keys with the <code className="text-purple-400 font-mono text-xs">@x402/server</code> SDK to protect your endpoints.
              </p>
            </div>
          </div>
        </div>

        {/* API Keys List */}
        <div className="bg-[#111] rounded-xl border border-[#333] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#333]">
            <h2 className="text-lg font-semibold text-white">
              Your Provider Keys
            </h2>
          </div>
          <div className="p-6">
            <ProviderKeysList 
              apiKeys={providerKeys} 
              canManage={isAdmin} 
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// CREATE PROVIDER KEY BUTTON
// ============================================

type WalletData = {
  _id: string;
  name: string;
  address: string;
  network: MneeNetwork;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
};

function CreateProviderKeyButton({ 
  hasWallets,
  wallets 
}: { 
  hasWallets: boolean;
  wallets: WalletData[] | undefined;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedWalletId, setSelectedWalletId] = useState<string>("");
  const [showCreateWallet, setShowCreateWallet] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  // Usage limits
  const [dailyLimit, setDailyLimit] = useState("");
  const [monthlyLimit, setMonthlyLimit] = useState("");
  const [maxRequest, setMaxRequest] = useState("");
  const [showLimits, setShowLimits] = useState(false);
  const createApiKey = useMutation(api.apiKeys.createApiKey);

  // Set default wallet when wallets load
  useEffect(() => {
    if (wallets && wallets.length > 0 && !selectedWalletId) {
      setSelectedWalletId(wallets[0]._id);
    }
  }, [wallets, selectedWalletId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !selectedWalletId) return;

    setIsCreating(true);
    try {
      const result = await createApiKey({
        name: name.trim(),
        description: description.trim() || undefined,
        type: "provider",
        walletId: selectedWalletId as Id<"wallets">,
        dailyLimit: dailyLimit ? parseFloat(dailyLimit) : undefined,
        monthlyLimit: monthlyLimit ? parseFloat(monthlyLimit) : undefined,
        maxRequest: maxRequest ? parseFloat(maxRequest) : undefined,
      });
      setNewApiKey(result.apiKey);
      setName("");
      setDescription("");
      setDailyLimit("");
      setMonthlyLimit("");
      setMaxRequest("");
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
    setDailyLimit("");
    setMonthlyLimit("");
    setMaxRequest("");
    setShowLimits(false);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        disabled={!hasWallets}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-black bg-white hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title={!hasWallets ? "Create a wallet in the Treasury page first" : undefined}
      >
        <PlusIcon className="w-4 h-4" />
        Create Provider Key
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[#111] border border-[#333] rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl">
            {newApiKey ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-900/50 flex items-center justify-center">
                    <CheckIcon className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      Provider Key Created
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
                        <CheckIcon className="w-5 h-5 text-purple-500" />
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
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                    <KeyIcon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">
                    Create Provider Key
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
                    placeholder="e.g., my-api-prod, weather-api"
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
                    Wallet <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={selectedWalletId}
                      onChange={(e) => setSelectedWalletId(e.target.value)}
                      className="flex-1 px-3 py-2 border border-[#333] rounded-lg bg-[#0a0a0a] text-white focus:outline-none focus:border-[#555]"
                      required
                    >
                      <option value="">Select a wallet</option>
                      {wallets?.map((wallet) => (
                        <option key={wallet._id} value={wallet._id}>
                          {wallet.name} ({wallet.network})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowCreateWallet(true)}
                      className="px-3 py-2 text-sm font-medium text-[#888] hover:text-white border border-[#333] hover:border-[#555] rounded-lg transition-colors"
                      title="Create new wallet"
                    >
                      <PlusIcon className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-[#666] mt-1">
                    Payments will be sent to this wallet&apos;s address.
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
                        <div>
                          <label className="block text-xs text-[#666] mb-1">Max Request</label>
                          <input
                            type="number"
                            value={maxRequest}
                            onChange={(e) => setMaxRequest(e.target.value)}
                            placeholder="No limit"
                            className="w-full px-2 py-1.5 text-sm border border-[#333] rounded-lg bg-[#0a0a0a] text-white placeholder-[#666] focus:outline-none focus:border-[#555]"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-[#666]">
                        Set MNEE spending limits for this API key. You can edit these later.
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={isCreating || !name.trim() || !selectedWalletId}
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

      {showCreateWallet && (
        <CreateWalletDialogForProviders 
          onClose={() => setShowCreateWallet(false)}
          onWalletCreated={(walletId) => {
            setSelectedWalletId(walletId);
            setShowCreateWallet(false);
          }}
        />
      )}
    </>
  );
}

// ============================================
// CREATE WALLET DIALOG (FOR PROVIDERS PAGE)
// ============================================

function CreateWalletDialogForProviders({
  onClose,
  onWalletCreated,
}: {
  onClose: () => void;
  onWalletCreated: (walletId: string) => void;
}) {
  const [name, setName] = useState("");
  const [network, setNetwork] = useState<MneeNetwork>("mainnet");
  const [isCreating, setIsCreating] = useState(false);
  const toast = useToast();
  const generateWallet = useMutation(api.wallets.generateWallet);
  const mneeNetworks = useQuery(api.mneeNetworks.listNetworks, { includeSandbox: true });
  const wallets = useQuery(api.wallets.listWallets, {});

  // Set default network when mneeNetworks loads
  useEffect(() => {
    if (mneeNetworks && mneeNetworks.length > 0) {
      const mainnet = mneeNetworks.find(n => n.network === "mainnet");
      if (mainnet) {
        setNetwork(mainnet.network);
      } else {
        setNetwork(mneeNetworks[0].network);
      }
    }
  }, [mneeNetworks]);

  // Poll for the new wallet after creation
  useEffect(() => {
    if (isCreating && wallets) {
      const newWallet = wallets.find(w => w.name === name.trim() && w.network === network);
      if (newWallet) {
        onWalletCreated(newWallet._id);
        setIsCreating(false);
      }
    }
  }, [wallets, isCreating, name, network, onWalletCreated]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsCreating(true);
    try {
      const result = await generateWallet({
        name: name.trim(),
        network,
      });
      toast.success(result.message);
      // The useEffect will handle selecting the wallet once it appears
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create wallet");
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-[#111] border border-[#333] rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white">
              Create Wallet
            </h3>
          </div>

          <div className="bg-[#1a1a1a] border border-[#333] rounded-lg p-3">
            <p className="text-sm text-[#888]">
              A new MNEE wallet will be automatically generated with a secure address and encrypted private key.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#888] mb-1">
              Wallet Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Main Wallet, Dev Wallet"
              className="w-full px-3 py-2 border border-[#333] rounded-lg bg-[#0a0a0a] text-white placeholder-[#666] focus:outline-none focus:border-[#555]"
              required
              autoFocus
              disabled={isCreating}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#888] mb-1">
              Network <span className="text-red-500">*</span>
            </label>
            <select
              value={network}
              onChange={(e) => setNetwork(e.target.value as MneeNetwork)}
              className="w-full px-3 py-2 border border-[#333] rounded-lg bg-[#0a0a0a] text-white focus:outline-none focus:border-[#555]"
              disabled={isCreating}
            >
              {mneeNetworks && mneeNetworks.length > 0 ? (
                mneeNetworks.map((n) => (
                  <option key={n._id} value={n.network}>
                    {n.name}
                  </option>
                ))
              ) : (
                <>
                  <option value="sandbox">MNEE Sandbox</option>
                  <option value="mainnet">MNEE Mainnet</option>
                </>
              )}
            </select>
            <p className="text-xs text-[#666] mt-1">
              Choose sandbox for testing or mainnet for production
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={isCreating || !name.trim()}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-black bg-white hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? "Generating..." : "Generate Wallet"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isCreating}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-[#888] hover:text-white hover:bg-[#1a1a1a] rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================
// PROVIDER KEYS LIST
// ============================================

type ApiKeyData = {
  _id: Id<"apiKeys">;
  name: string;
  description?: string;
  apiKeyPrefix: string;
  type: "agent" | "provider";
  walletId?: Id<"wallets">;
  receivingAddress?: string;
  receivingNetwork?: MneeNetwork;
  createdByUserId: string;
  lastUsedAt?: number;
  expiresAt?: number;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
};

function ProviderKeysList({
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
    if (!confirm("Are you sure you want to delete this provider key? This action cannot be undone.")) {
      return;
    }

    setDeletingId(apiKeyId);
    try {
      await deleteApiKey({ apiKeyId: apiKeyId as Id<"apiKeys"> });
      toast.success("Provider key deleted successfully");
    } catch {
      toast.error("Failed to delete provider key");
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
      toast.success(apiKey.isActive ? "Provider key deactivated" : "Provider key activated");
    } catch {
      toast.error("Failed to update provider key");
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
        <h3 className="text-lg font-medium text-white mb-2">No Provider Keys Yet</h3>
        <p className="text-sm text-[#888] max-w-sm mx-auto">
          Create your first provider key to start receiving x402 payments with the @x402/server SDK.
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
                      ? "bg-gradient-to-br from-purple-500/20 to-pink-600/20 border border-purple-500/30"
                      : "bg-[#1a1a1a]"
                  }`}
                >
                  <KeyIcon
                    className={`w-5 h-5 ${
                      apiKey.isActive ? "text-purple-400" : "text-[#666]"
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
                    {apiKey.receivingNetwork && (
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${
                        apiKey.receivingNetwork === "mainnet"
                          ? "bg-emerald-900/50 text-emerald-400"
                          : "bg-amber-900/50 text-amber-400"
                      }`}>
                        {apiKey.receivingNetwork}
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

                {/* Show linked wallet info */}
                {apiKey.walletId && (
                  <div className="pt-4">
                    <p className="text-xs text-[#666] uppercase tracking-wider mb-1">Linked Wallet</p>
                    <WalletInfo walletId={apiKey.walletId} />
                  </div>
                )}

                {/* Legacy: Show receiving address if no wallet linked */}
                {!apiKey.walletId && apiKey.receivingAddress && (
                  <div className="pt-4">
                    <p className="text-xs text-[#666] uppercase tracking-wider mb-1">Receiving Address (Legacy)</p>
                    <div className="bg-[#0a0a0a] border border-[#333] rounded-lg p-3">
                      <code className="text-sm font-mono text-white break-all">
                        {apiKey.receivingAddress}
                      </code>
                    </div>
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
// WALLET INFO COMPONENT
// ============================================

function WalletInfo({ walletId }: { walletId: Id<"wallets"> }) {
  const wallet = useQuery(api.wallets.getWallet, { walletId });

  if (!wallet) {
    return (
      <div className="bg-[#1a1a1a] rounded-lg p-3 animate-pulse">
        <div className="h-4 bg-[#333] rounded w-32"></div>
      </div>
    );
  }

  const isMainnet = wallet.network === "mainnet";

  return (
    <div className="bg-[#1a1a1a] rounded-lg p-3 border border-[#333]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-white">{wallet.name}</p>
          <p className="text-xs text-[#666] font-mono mt-1">{wallet.address}</p>
        </div>
        <span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${
          isMainnet 
            ? "bg-emerald-900/50 text-emerald-400" 
            : "bg-amber-900/50 text-amber-400"
        }`}>
          {wallet.network}
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

