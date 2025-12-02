"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useUser } from "@clerk/nextjs";

// Icons
function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
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

function ChainIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  );
}

function EditIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
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

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

// Fallback chain names (used if chains not loaded from DB)
const defaultChainNames: Record<number, string> = {
  1: "Ethereum Mainnet",
  137: "Polygon",
  8453: "Base",
  84532: "Base Sepolia",
  31337: "Localhost",
};

type SupportedToken = {
  _id: Id<"supportedTokens">;
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  chainId: number;
  isActive: boolean;
  createdAt: number;
};

type SupportedChain = {
  _id: Id<"supportedChains">;
  chainId: number;
  name: string;
  networkName: string;
  rpcUrl: string;
  explorerUrl?: string;
  nativeCurrency: { name: string; symbol: string; decimals: number };
  treasuryAddress?: string;
  swapRouterAddress?: string;
  zeroxApiUrl?: string;
  isTestnet: boolean;
  isActive: boolean;
  createdAt: number;
};

export default function AdminPage() {
  const { user } = useUser();
  const isAdmin = useQuery(api.tokens.checkIsAdmin);

  // Show loading while checking admin status
  if (isAdmin === undefined) {
    return <LoadingSkeleton />;
  }

  // Bootstrap button if not admin
  if (!isAdmin) {
    return <BootstrapAdmin />;
  }

  return <AdminDashboard />;
}

function BootstrapAdmin() {
  const bootstrapAdmin = useMutation(api.tokens.bootstrapAdmin);
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleBootstrap = async () => {
    setIsBootstrapping(true);
    setError(null);
    try {
      await bootstrapAdmin({});
      setSuccess(true);
      // Reload to refresh admin status
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to bootstrap admin");
    } finally {
      setIsBootstrapping(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#111] rounded-2xl border border-[#333] p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-900/50 flex items-center justify-center mx-auto mb-6">
          <ShieldIcon className="w-8 h-8 text-amber-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">
          Admin Access Required
        </h1>
        <p className="text-[#888] mb-6">
          You don't have platform admin access. If this is a new installation, you can bootstrap yourself as the first admin.
        </p>

        {error && (
          <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 mb-4">
            <p className="text-sm text-red-200">{error}</p>
          </div>
        )}

        {success ? (
          <div className="bg-emerald-900/20 border border-emerald-800 rounded-lg p-3">
            <p className="text-sm text-emerald-200">
              Success! You are now a platform admin. Redirecting...
            </p>
          </div>
        ) : (
          <button
            onClick={handleBootstrap}
            disabled={isBootstrapping}
            className="w-full px-4 py-3 text-sm font-medium text-black bg-white hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isBootstrapping ? "Setting up..." : "Become First Admin"}
          </button>
        )}

        <p className="text-xs text-[#666] mt-4">
          This only works if no admins exist yet
        </p>
      </div>
    </div>
  );
}

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<"chains" | "tokens" | "admins">("chains");

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/25">
            <ShieldIcon className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">
              Platform Admin
            </h1>
            <p className="text-sm text-[#888] mt-1">
              Manage chains, tokens, and platform administrators
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("chains")}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === "chains"
                ? "bg-white text-black"
                : "text-[#888] hover:text-white hover:bg-[#1a1a1a]"
            }`}
          >
            <span className="flex items-center gap-2">
              <ChainIcon className="w-4 h-4" />
              Chains
            </span>
          </button>
          <button
            onClick={() => setActiveTab("tokens")}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === "tokens"
                ? "bg-white text-black"
                : "text-[#888] hover:text-white hover:bg-[#1a1a1a]"
            }`}
          >
            <span className="flex items-center gap-2">
              <TokenIcon className="w-4 h-4" />
              Tokens
            </span>
          </button>
          <button
            onClick={() => setActiveTab("admins")}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === "admins"
                ? "bg-white text-black"
                : "text-[#888] hover:text-white hover:bg-[#1a1a1a]"
            }`}
          >
            <span className="flex items-center gap-2">
              <UserIcon className="w-4 h-4" />
              Admins
            </span>
          </button>
        </div>

        {/* Content */}
        {activeTab === "chains" && <ChainsManagement />}
        {activeTab === "tokens" && <TokensManagement />}
        {activeTab === "admins" && <AdminsManagement />}
      </div>
    </div>
  );
}

function ChainsManagement() {
  const chains = useQuery(api.chains.listAllChains, {});
  const addChain = useMutation(api.chains.addSupportedChain);
  const updateChain = useMutation(api.chains.updateSupportedChain);
  const deleteChain = useMutation(api.chains.deleteSupportedChain);
  const seedChains = useMutation(api.chains.seedDefaultChains);

  const [isAdding, setIsAdding] = useState(false);
  const [editingChain, setEditingChain] = useState<SupportedChain | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);

  // Form state
  const [chainId, setChainId] = useState("");
  const [name, setName] = useState("");
  const [networkName, setNetworkName] = useState("");
  const [rpcUrl, setRpcUrl] = useState("");
  const [explorerUrl, setExplorerUrl] = useState("");
  const [treasuryAddress, setTreasuryAddress] = useState("");
  const [swapRouterAddress, setSwapRouterAddress] = useState("");
  const [zeroxApiUrl, setZeroxApiUrl] = useState("");
  const [isTestnet, setIsTestnet] = useState(false);
  const [nativeName, setNativeName] = useState("Ether");
  const [nativeSymbol, setNativeSymbol] = useState("ETH");
  const [nativeDecimals, setNativeDecimals] = useState("18");

  const resetForm = () => {
    setChainId("");
    setName("");
    setNetworkName("");
    setRpcUrl("");
    setExplorerUrl("");
    setTreasuryAddress("");
    setSwapRouterAddress("");
    setZeroxApiUrl("");
    setIsTestnet(false);
    setNativeName("Ether");
    setNativeSymbol("ETH");
    setNativeDecimals("18");
    setEditingChain(null);
    setIsAdding(false);
    setError(null);
  };

  const startEditing = (chain: SupportedChain) => {
    setEditingChain(chain);
    setChainId(chain.chainId.toString());
    setName(chain.name);
    setNetworkName(chain.networkName);
    setRpcUrl(chain.rpcUrl);
    setExplorerUrl(chain.explorerUrl || "");
    setTreasuryAddress(chain.treasuryAddress || "");
    setSwapRouterAddress(chain.swapRouterAddress || "");
    setZeroxApiUrl(chain.zeroxApiUrl || "");
    setIsTestnet(chain.isTestnet);
    setNativeName(chain.nativeCurrency.name);
    setNativeSymbol(chain.nativeCurrency.symbol);
    setNativeDecimals(chain.nativeCurrency.decimals.toString());
    setIsAdding(true);
  };

  const handleSeedChains = async () => {
    setIsSeeding(true);
    try {
      const result = await seedChains({});
      if (result.added.length > 0) {
        alert(`Added: ${result.added.join(", ")}`);
      } else {
        alert("All default chains already exist");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to seed chains");
    } finally {
      setIsSeeding(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chainId || !name || !networkName || !rpcUrl) return;

    setIsSubmitting(true);
    setError(null);

    try {
      if (editingChain) {
        // Update existing chain
        await updateChain({
          chainId: parseInt(chainId),
          name,
          rpcUrl,
          explorerUrl: explorerUrl || undefined,
          treasuryAddress: treasuryAddress || undefined,
          swapRouterAddress: swapRouterAddress || undefined,
          zeroxApiUrl: zeroxApiUrl || undefined,
          isTestnet,
        });
      } else {
        // Add new chain
        await addChain({
          chainId: parseInt(chainId),
          name,
          networkName: networkName.toLowerCase(),
          rpcUrl,
          explorerUrl: explorerUrl || undefined,
          nativeCurrency: {
            name: nativeName,
            symbol: nativeSymbol,
            decimals: parseInt(nativeDecimals),
          },
          treasuryAddress: treasuryAddress || undefined,
          swapRouterAddress: swapRouterAddress || undefined,
          zeroxApiUrl: zeroxApiUrl || undefined,
          isTestnet,
        });
      }
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (chain: SupportedChain) => {
    setTogglingId(chain.chainId);
    try {
      await updateChain({
        chainId: chain.chainId,
        isActive: !chain.isActive,
      });
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (chain: SupportedChain) => {
    if (!confirm(`Delete chain "${chain.name}"? This cannot be undone.`)) return;

    setDeletingId(chain.chainId);
    try {
      await deleteChain({ chainId: chain.chainId });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete chain");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#111] rounded-xl border border-[#333] p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Supported Chains</h2>
            <p className="text-sm text-[#888]">
              Blockchain networks with deployed treasury contracts
            </p>
          </div>
          <div className="flex gap-2">
            {!isAdding && (
              <>
                <button
                  onClick={handleSeedChains}
                  disabled={isSeeding}
                  className="px-4 py-2 text-sm font-medium text-[#888] hover:text-white hover:bg-[#1a1a1a] rounded-lg transition-colors disabled:opacity-50"
                >
                  {isSeeding ? "Seeding..." : "Seed Defaults"}
                </button>
                <button
                  onClick={() => setIsAdding(true)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-black bg-white hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <PlusIcon className="w-4 h-4" />
                  Add Chain
                </button>
              </>
            )}
          </div>
        </div>

        {/* Add/Edit Chain Form */}
        {isAdding && (
          <div className="bg-[#0a0a0a] rounded-lg border border-[#333] p-4 mb-6">
            <h3 className="text-sm font-medium text-white mb-4">
              {editingChain ? `Edit ${editingChain.name}` : "Add New Chain"}
            </h3>

            {error && (
              <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 mb-4">
                <p className="text-sm text-red-200">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#888] mb-2">
                    Chain ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={chainId}
                    onChange={(e) => setChainId(e.target.value)}
                    placeholder="8453"
                    disabled={!!editingChain}
                    className="w-full px-4 py-3 border border-[#333] rounded-lg bg-[#111] text-white placeholder-[#666] focus:outline-none focus:border-[#555] disabled:opacity-50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#888] mb-2">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Base"
                    className="w-full px-4 py-3 border border-[#333] rounded-lg bg-[#111] text-white placeholder-[#666] focus:outline-none focus:border-[#555]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#888] mb-2">
                    Network Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={networkName}
                    onChange={(e) => setNetworkName(e.target.value)}
                    placeholder="base"
                    disabled={!!editingChain}
                    className="w-full px-4 py-3 border border-[#333] rounded-lg bg-[#111] text-white placeholder-[#666] focus:outline-none focus:border-[#555] disabled:opacity-50"
                    required
                  />
                  <p className="text-xs text-[#666] mt-1">Used in x402 invoice</p>
                </div>
              </div>

              {/* URLs */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#888] mb-2">
                    RPC URL <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="url"
                    value={rpcUrl}
                    onChange={(e) => setRpcUrl(e.target.value)}
                    placeholder="https://mainnet.base.org"
                    className="w-full px-4 py-3 border border-[#333] rounded-lg bg-[#111] text-white placeholder-[#666] focus:outline-none focus:border-[#555] font-mono text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#888] mb-2">
                    Explorer URL
                  </label>
                  <input
                    type="url"
                    value={explorerUrl}
                    onChange={(e) => setExplorerUrl(e.target.value)}
                    placeholder="https://basescan.org"
                    className="w-full px-4 py-3 border border-[#333] rounded-lg bg-[#111] text-white placeholder-[#666] focus:outline-none focus:border-[#555] font-mono text-sm"
                  />
                </div>
              </div>

              {/* Contract Addresses */}
              <div className="border border-[#333] rounded-lg p-4">
                <h4 className="text-xs font-medium text-[#666] uppercase tracking-wider mb-3">
                  Contract Addresses
                </h4>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#888] mb-2">
                      Treasury Address
                    </label>
                    <input
                      type="text"
                      value={treasuryAddress}
                      onChange={(e) => setTreasuryAddress(e.target.value)}
                      placeholder="0x..."
                      className="w-full px-4 py-3 border border-[#333] rounded-lg bg-[#111] text-white placeholder-[#666] focus:outline-none focus:border-[#555] font-mono text-sm"
                    />
                    <p className="text-xs text-[#666] mt-1">ERC20WorkspaceTreasury contract deployed on this chain</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[#888] mb-2">
                        Swap Router (localhost)
                      </label>
                      <input
                        type="text"
                        value={swapRouterAddress}
                        onChange={(e) => setSwapRouterAddress(e.target.value)}
                        placeholder="0x..."
                        className="w-full px-4 py-3 border border-[#333] rounded-lg bg-[#111] text-white placeholder-[#666] focus:outline-none focus:border-[#555] font-mono text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#888] mb-2">
                        0x API URL (production)
                      </label>
                      <input
                        type="url"
                        value={zeroxApiUrl}
                        onChange={(e) => setZeroxApiUrl(e.target.value)}
                        placeholder="https://base.api.0x.org"
                        className="w-full px-4 py-3 border border-[#333] rounded-lg bg-[#111] text-white placeholder-[#666] focus:outline-none focus:border-[#555] font-mono text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Native Currency (only for new chains) */}
              {!editingChain && (
                <div className="border border-[#333] rounded-lg p-4">
                  <h4 className="text-xs font-medium text-[#666] uppercase tracking-wider mb-3">
                    Native Currency
                  </h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[#888] mb-2">Name</label>
                      <input
                        type="text"
                        value={nativeName}
                        onChange={(e) => setNativeName(e.target.value)}
                        placeholder="Ether"
                        className="w-full px-4 py-3 border border-[#333] rounded-lg bg-[#111] text-white placeholder-[#666] focus:outline-none focus:border-[#555]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#888] mb-2">Symbol</label>
                      <input
                        type="text"
                        value={nativeSymbol}
                        onChange={(e) => setNativeSymbol(e.target.value)}
                        placeholder="ETH"
                        className="w-full px-4 py-3 border border-[#333] rounded-lg bg-[#111] text-white placeholder-[#666] focus:outline-none focus:border-[#555]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#888] mb-2">Decimals</label>
                      <input
                        type="number"
                        value={nativeDecimals}
                        onChange={(e) => setNativeDecimals(e.target.value)}
                        placeholder="18"
                        className="w-full px-4 py-3 border border-[#333] rounded-lg bg-[#111] text-white placeholder-[#666] focus:outline-none focus:border-[#555]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Testnet toggle */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsTestnet(!isTestnet)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    isTestnet ? "bg-amber-500" : "bg-[#333]"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                      isTestnet ? "translate-x-6" : ""
                    }`}
                  />
                </button>
                <span className="text-sm text-[#888]">
                  {isTestnet ? "Testnet" : "Mainnet"}
                </span>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || !chainId || !name || !networkName || !rpcUrl}
                  className="px-4 py-2 text-sm font-medium text-black bg-white hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Saving..." : editingChain ? "Update Chain" : "Add Chain"}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-sm font-medium text-[#888] hover:text-white hover:bg-[#1a1a1a] rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Chains List */}
        {chains === undefined ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse flex items-center gap-4 py-3">
                <div className="w-10 h-10 bg-[#1a1a1a] rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-[#1a1a1a] rounded" />
                  <div className="h-3 w-48 bg-[#1a1a1a] rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : chains.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-[#1a1a1a] flex items-center justify-center mx-auto mb-4">
              <ChainIcon className="w-8 h-8 text-[#666]" />
            </div>
            <p className="text-lg font-medium text-white">No chains configured</p>
            <p className="text-sm text-[#888] mt-1">
              Click "Seed Defaults" to add standard chains, or add a custom chain
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#333] bg-[#0a0a0a] rounded-lg border border-[#333]">
            {chains.map((chain) => (
              <div
                key={chain._id}
                className={`p-4 ${!chain.isActive ? "opacity-60" : ""}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        chain.isActive
                          ? chain.isTestnet
                            ? "bg-gradient-to-br from-amber-500/20 to-orange-600/20 border border-amber-500/30"
                            : "bg-gradient-to-br from-emerald-500/20 to-teal-600/20 border border-emerald-500/30"
                          : "bg-[#1a1a1a]"
                      }`}
                    >
                      <ChainIcon
                        className={`w-5 h-5 ${
                          chain.isActive
                            ? chain.isTestnet
                              ? "text-amber-400"
                              : "text-emerald-400"
                            : "text-[#666]"
                        }`}
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-white">{chain.name}</p>
                        <span className="text-xs text-[#666] font-mono">#{chain.chainId}</span>
                        {chain.isTestnet && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-amber-900/50 text-amber-400 rounded-full">
                            Testnet
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                            chain.isActive
                              ? "bg-emerald-900/50 text-emerald-400"
                              : "bg-[#1a1a1a] text-[#666]"
                          }`}
                        >
                          {chain.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <p className="text-xs text-[#888]">
                        Network: <span className="font-mono">{chain.networkName}</span>
                      </p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                        {chain.treasuryAddress ? (
                          <span className="text-emerald-400">
                            ✓ Treasury: <span className="font-mono text-[#666]">{chain.treasuryAddress.slice(0, 10)}...</span>
                          </span>
                        ) : (
                          <span className="text-red-400">✗ No treasury</span>
                        )}
                        {chain.swapRouterAddress && (
                          <span className="text-[#888]">
                            Swap Router: <span className="font-mono text-[#666]">{chain.swapRouterAddress.slice(0, 10)}...</span>
                          </span>
                        )}
                        {chain.zeroxApiUrl && (
                          <span className="text-[#888]">0x API configured</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => startEditing(chain as SupportedChain)}
                      className="p-2 text-[#666] hover:text-white rounded-lg hover:bg-[#1a1a1a] transition-colors"
                      title="Edit chain"
                    >
                      <EditIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleActive(chain as SupportedChain)}
                      disabled={togglingId === chain.chainId}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 ${
                        chain.isActive
                          ? "text-amber-400 hover:bg-amber-900/30"
                          : "text-emerald-400 hover:bg-emerald-900/30"
                      }`}
                    >
                      {togglingId === chain.chainId
                        ? "..."
                        : chain.isActive
                        ? "Deactivate"
                        : "Activate"}
                    </button>
                    <button
                      onClick={() => handleDelete(chain as SupportedChain)}
                      disabled={deletingId === chain.chainId}
                      className="p-2 text-[#666] hover:text-red-400 rounded-lg hover:bg-[#1a1a1a] transition-colors disabled:opacity-50"
                      title="Delete chain"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TokensManagement() {
  const tokens = useQuery(api.tokens.listSupportedTokens, {});
  const chains = useQuery(api.chains.listAllChains, {});
  const addToken = useMutation(api.tokens.addSupportedToken);
  const updateToken = useMutation(api.tokens.updateSupportedToken);
  const deleteToken = useMutation(api.tokens.deleteSupportedToken);

  const [isAdding, setIsAdding] = useState(false);
  const [address, setAddress] = useState("");
  const [symbol, setSymbol] = useState("");
  const [name, setName] = useState("");
  const [decimals, setDecimals] = useState("18");
  const [chainId, setChainId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [deletingId, setDeletingId] = useState<Id<"supportedTokens"> | null>(null);
  const [togglingId, setTogglingId] = useState<Id<"supportedTokens"> | null>(null);

  // Build chain name lookup from database
  const chainNamesFromDb: Record<number, string> = {};
  if (chains) {
    chains.forEach((c) => {
      chainNamesFromDb[c.chainId] = c.name;
    });
  }

  // Lookup token info from chain
  const handleLookupToken = async () => {
    if (!address || !chainId) return;

    setIsLookingUp(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/token-lookup?address=${encodeURIComponent(address)}&chainId=${chainId}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to lookup token");
      }

      // Prefill the form
      setSymbol(data.symbol);
      setName(data.name);
      setDecimals(data.decimals.toString());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Token lookup failed");
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleAddToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address || !symbol || !name) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await addToken({
        address: address.trim(),
        symbol: symbol.trim().toUpperCase(),
        name: name.trim(),
        decimals: parseInt(decimals),
        chainId: parseInt(chainId),
      });
      // Reset form
      setAddress("");
      setSymbol("");
      setName("");
      setDecimals("18");
      setIsAdding(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add token");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (token: SupportedToken) => {
    setTogglingId(token._id);
    try {
      await updateToken({
        tokenId: token._id,
        isActive: !token.isActive,
      });
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (token: SupportedToken) => {
    if (!confirm(`Delete token ${token.symbol}? This will also remove it from all workspaces.`)) return;
    
    setDeletingId(token._id);
    try {
      await deleteToken({ tokenId: token._id });
    } finally {
      setDeletingId(null);
    }
  };

  // Group tokens by chain
  const tokensByChain = (tokens || []).reduce((acc, token) => {
    const chain = token.chainId;
    if (!acc[chain]) acc[chain] = [];
    acc[chain].push(token as SupportedToken);
    return acc;
  }, {} as Record<number, SupportedToken[]>);

  return (
    <div className="space-y-6">
      {/* Add Token Section */}
      <div className="bg-[#111] rounded-xl border border-[#333] p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Supported Tokens</h2>
            <p className="text-sm text-[#888]">
              Global list of tokens that workspaces can add to their treasury
            </p>
          </div>
          {!isAdding && (
            <button
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-black bg-white hover:bg-gray-200 rounded-lg transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              Add Token
            </button>
          )}
        </div>

        {/* Add Token Form */}
        {isAdding && (
          <div className="bg-[#0a0a0a] rounded-lg border border-[#333] p-4 mb-6">
            <h3 className="text-sm font-medium text-white mb-4">Add New Token</h3>
            
            {error && (
              <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 mb-4">
                <p className="text-sm text-red-200">{error}</p>
              </div>
            )}

            <form onSubmit={handleAddToken} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#888] mb-2">
                    Chain
                  </label>
                  <select
                    value={chainId}
                    onChange={(e) => setChainId(e.target.value)}
                    className="w-full px-4 py-3 border border-[#333] rounded-lg bg-[#111] text-white focus:outline-none focus:border-[#555]"
                    required
                  >
                    <option value="">Select a chain...</option>
                    {chains?.map((c) => (
                      <option key={c.chainId} value={c.chainId}>
                        {c.name} ({c.chainId})
                      </option>
                    ))}
                  </select>
                  {chains?.length === 0 && (
                    <p className="text-xs text-amber-400 mt-1">
                      No chains configured. Add chains first.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#888] mb-2">
                    Token Address <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="0x..."
                      className="flex-1 px-4 py-3 border border-[#333] rounded-lg bg-[#111] text-white placeholder-[#666] focus:outline-none focus:border-[#555] font-mono text-sm"
                      required
                    />
                    <button
                      type="button"
                      onClick={handleLookupToken}
                      disabled={!address || !chainId || isLookingUp}
                      className="px-4 py-3 text-sm font-medium text-white bg-[#333] hover:bg-[#444] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      {isLookingUp ? "Looking up..." : "Lookup"}
                    </button>
                  </div>
                  <p className="text-xs text-[#666] mt-1">
                    Enter address and click Lookup to auto-fill token details
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#888] mb-2">
                    Symbol <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                    placeholder="USDC"
                    className="w-full px-4 py-3 border border-[#333] rounded-lg bg-[#111] text-white placeholder-[#666] focus:outline-none focus:border-[#555]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#888] mb-2">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="USD Coin"
                    className="w-full px-4 py-3 border border-[#333] rounded-lg bg-[#111] text-white placeholder-[#666] focus:outline-none focus:border-[#555]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#888] mb-2">
                    Decimals
                  </label>
                  <input
                    type="number"
                    value={decimals}
                    onChange={(e) => setDecimals(e.target.value)}
                    placeholder="18"
                    min="0"
                    max="24"
                    className="w-full px-4 py-3 border border-[#333] rounded-lg bg-[#111] text-white placeholder-[#666] focus:outline-none focus:border-[#555]"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isSubmitting || !address || !symbol || !name}
                  className="px-4 py-2 text-sm font-medium text-black bg-white hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Adding..." : "Add Token"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    setError(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-[#888] hover:text-white hover:bg-[#1a1a1a] rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tokens List */}
        {tokens === undefined ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse flex items-center gap-4 py-3">
                <div className="w-10 h-10 bg-[#1a1a1a] rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-[#1a1a1a] rounded" />
                  <div className="h-3 w-48 bg-[#1a1a1a] rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : tokens.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-[#1a1a1a] flex items-center justify-center mx-auto mb-4">
              <TokenIcon className="w-8 h-8 text-[#666]" />
            </div>
            <p className="text-lg font-medium text-white">No tokens configured</p>
            <p className="text-sm text-[#888] mt-1">
              Add your first token to get started
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(tokensByChain).map(([chain, chainTokens]) => (
              <div key={chain}>
                <h4 className="text-xs font-medium text-[#666] uppercase tracking-wider mb-3">
                  {chainNamesFromDb[Number(chain)] || defaultChainNames[Number(chain)] || `Chain ${chain}`}
                </h4>
                <div className="divide-y divide-[#333] bg-[#0a0a0a] rounded-lg border border-[#333]">
                  {chainTokens.map((token) => (
                    <div
                      key={token._id}
                      className={`flex items-center justify-between p-4 ${
                        !token.isActive ? "opacity-60" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          token.isActive
                            ? "bg-gradient-to-br from-emerald-500/20 to-teal-600/20 border border-emerald-500/30"
                            : "bg-[#1a1a1a]"
                        }`}>
                          <span className={`text-sm font-bold ${
                            token.isActive ? "text-emerald-400" : "text-[#666]"
                          }`}>
                            {token.symbol.slice(0, 2)}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-white">
                              {token.symbol}
                            </p>
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                              token.isActive
                                ? "bg-emerald-900/50 text-emerald-400"
                                : "bg-[#1a1a1a] text-[#666]"
                            }`}>
                              {token.isActive ? "Active" : "Inactive"}
                            </span>
                          </div>
                          <p className="text-xs text-[#888]">
                            {token.name} • {token.decimals} decimals
                          </p>
                          <p className="text-xs text-[#666] font-mono">
                            {token.address}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleActive(token)}
                          disabled={togglingId === token._id}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 ${
                            token.isActive
                              ? "text-amber-400 hover:bg-amber-900/30"
                              : "text-emerald-400 hover:bg-emerald-900/30"
                          }`}
                        >
                          {togglingId === token._id
                            ? "..."
                            : token.isActive
                            ? "Deactivate"
                            : "Activate"}
                        </button>
                        <button
                          onClick={() => handleDelete(token)}
                          disabled={deletingId === token._id}
                          className="p-2 text-[#666] hover:text-red-400 rounded-lg hover:bg-[#1a1a1a] transition-colors disabled:opacity-50"
                          title="Delete token"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AdminsManagement() {
  const admins = useQuery(api.tokens.listAdmins);
  const grantAdmin = useMutation(api.tokens.grantAdminByEmail);
  const revokeAdmin = useMutation(api.tokens.revokeAdmin);

  const [email, setEmail] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<Id<"users"> | null>(null);

  const handleGrantAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsAdding(true);
    setError(null);

    try {
      await grantAdmin({ email: email.trim() });
      setEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to grant admin access");
    } finally {
      setIsAdding(false);
    }
  };

  const handleRevokeAdmin = async (userId: Id<"users">, name: string | undefined) => {
    if (!confirm(`Revoke admin access from ${name || "this user"}?`)) return;

    setRevokingId(userId);
    try {
      await revokeAdmin({ userId });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to revoke admin");
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <div className="bg-[#111] rounded-xl border border-[#333] p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-white">Platform Admins</h2>
        <p className="text-sm text-[#888]">
          Users with full access to manage global tokens and other admins
        </p>
      </div>

      {/* Add Admin Form */}
      <div className="bg-[#0a0a0a] rounded-lg border border-[#333] p-4 mb-6">
        <h3 className="text-sm font-medium text-white mb-3">Add Admin</h3>
        
        {error && (
          <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 mb-4">
            <p className="text-sm text-red-200">{error}</p>
          </div>
        )}

        <form onSubmit={handleGrantAdmin} className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            className="flex-1 px-4 py-2 border border-[#333] rounded-lg bg-[#111] text-white placeholder-[#666] focus:outline-none focus:border-[#555]"
            required
          />
          <button
            type="submit"
            disabled={isAdding || !email.trim()}
            className="px-4 py-2 text-sm font-medium text-black bg-white hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAdding ? "Adding..." : "Add Admin"}
          </button>
        </form>
        <p className="text-xs text-[#666] mt-2">
          User must have an account already. Enter their email address.
        </p>
      </div>

      {/* Admins List */}
      {admins === undefined ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse flex items-center gap-4 py-3">
              <div className="w-10 h-10 bg-[#1a1a1a] rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 bg-[#1a1a1a] rounded" />
                <div className="h-3 w-48 bg-[#1a1a1a] rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : admins.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-[#888]">No admins found</p>
        </div>
      ) : (
        <div className="divide-y divide-[#333]">
          {admins.map((admin) => (
            <div
              key={admin._id}
              className="flex items-center justify-between py-4 first:pt-0 last:pb-0"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-900/50 flex items-center justify-center">
                  <span className="text-sm font-bold text-amber-400">
                    {(admin.name || admin.email).charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-white">
                    {admin.name || admin.email}
                  </p>
                  {admin.name && (
                    <p className="text-xs text-[#888]">{admin.email}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleRevokeAdmin(admin._id, admin.name ?? undefined)}
                disabled={revokingId === admin._id}
                className="px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50"
              >
                {revokingId === admin._id ? "..." : "Revoke"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full" />
    </div>
  );
}

