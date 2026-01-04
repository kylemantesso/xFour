"use client";

import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useToast } from "../../components/Toast";

// Icons
function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

function NetworkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
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

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function CurrencyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function XCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

type MneeNetwork = {
  _id: Id<"mneeNetworks">;
  network: "sandbox" | "mainnet";
  name: string;
  apiUrl: string;
  explorerUrl?: string;
  decimals: number;
  isActive: boolean;
  createdAt: number;
};

export default function AdminPage() {
  const isAdmin = useQuery(api.users.checkIsAdmin);

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
  const bootstrapAdmin = useMutation(api.users.bootstrapAdmin);
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
          You don&apos;t have platform admin access. If this is a new installation, you can bootstrap yourself as the first admin.
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

function WrenchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function LockOpenIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
    </svg>
  );
}

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<"payments" | "networks" | "admins" | "tools">("payments");

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="max-w-7xl mx-auto px-4 py-8">
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
              Manage payments, MNEE networks, and platform administrators
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("payments")}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === "payments"
                ? "bg-white text-black"
                : "text-[#888] hover:text-white hover:bg-[#1a1a1a]"
            }`}
          >
            <span className="flex items-center gap-2">
              <CurrencyIcon className="w-4 h-4" />
              Payments
            </span>
          </button>
          <button
            onClick={() => setActiveTab("networks")}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === "networks"
                ? "bg-white text-black"
                : "text-[#888] hover:text-white hover:bg-[#1a1a1a]"
            }`}
          >
            <span className="flex items-center gap-2">
              <NetworkIcon className="w-4 h-4" />
              MNEE Networks
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
          <button
            onClick={() => setActiveTab("tools")}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === "tools"
                ? "bg-white text-black"
                : "text-[#888] hover:text-white hover:bg-[#1a1a1a]"
            }`}
          >
            <span className="flex items-center gap-2">
              <WrenchIcon className="w-4 h-4" />
              Tools
            </span>
          </button>
        </div>

        {/* Content */}
        {activeTab === "payments" && <PaymentsManagement />}
        {activeTab === "networks" && <MneeNetworksManagement />}
        {activeTab === "admins" && <AdminsManagement />}
        {activeTab === "tools" && <AdminTools />}
      </div>
    </div>
  );
}

function MneeNetworksManagement() {
  const networks = useQuery(api.mneeNetworks.listNetworks, { includeSandbox: true });
  const seedNetworksMutation = useMutation(api.mneeNetworks.seedNetworks);
  const updateNetworkMutation = useMutation(api.mneeNetworks.updateNetwork);
  const toast = useToast();

  const [editingNetwork, setEditingNetwork] = useState<MneeNetwork | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [togglingNetwork, setTogglingNetwork] = useState<"sandbox" | "mainnet" | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [apiUrl, setApiUrl] = useState("");
  const [explorerUrl, setExplorerUrl] = useState("");

  const resetForm = () => {
    setName("");
    setApiUrl("");
    setExplorerUrl("");
    setEditingNetwork(null);
    setError(null);
  };

  const startEditing = (network: MneeNetwork) => {
    setEditingNetwork(network);
    setName(network.name);
    setApiUrl(network.apiUrl);
    setExplorerUrl(network.explorerUrl || "");
  };

  const handleSeedNetworks = async () => {
    setIsSeeding(true);
    try {
      const result = await seedNetworksMutation({});
      if (result.added.length > 0) {
        toast.success(`Added networks: ${result.added.join(", ")}`);
      } else {
        toast.info("All default MNEE networks already exist");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to seed networks");
    } finally {
      setIsSeeding(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNetwork || !name || !apiUrl) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await updateNetworkMutation({
        network: editingNetwork.network,
        name,
        apiUrl,
        explorerUrl: explorerUrl || undefined,
      });
      resetForm();
      toast.success("Network updated successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (network: MneeNetwork) => {
    setTogglingNetwork(network.network);
    try {
      await updateNetworkMutation({
        network: network.network,
        isActive: !network.isActive,
      });
    } finally {
      setTogglingNetwork(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#111] rounded-xl border border-[#333] p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">MNEE Networks</h2>
            <p className="text-sm text-[#888]">
              Configure MNEE network endpoints (sandbox and mainnet)
            </p>
          </div>
          <div className="flex gap-2">
            {!editingNetwork && (
              <button
                onClick={handleSeedNetworks}
                disabled={isSeeding}
                className="px-4 py-2 text-sm font-medium text-[#888] hover:text-white hover:bg-[#1a1a1a] rounded-lg transition-colors disabled:opacity-50"
              >
                {isSeeding ? "Seeding..." : "Seed Defaults"}
              </button>
            )}
          </div>
        </div>

        {/* Edit Network Form */}
        {editingNetwork && (
          <div className="bg-[#0a0a0a] rounded-lg border border-[#333] p-4 mb-6">
            <h3 className="text-sm font-medium text-white mb-4">
              Edit {editingNetwork.name}
            </h3>

            {error && (
              <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 mb-4">
                <p className="text-sm text-red-200">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#888] mb-2">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="MNEE Mainnet"
                    className="w-full px-4 py-3 border border-[#333] rounded-lg bg-[#111] text-white placeholder-[#666] focus:outline-none focus:border-[#555]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#888] mb-2">
                    Network Type
                  </label>
                  <input
                    type="text"
                    value={editingNetwork.network}
                    disabled
                    className="w-full px-4 py-3 border border-[#333] rounded-lg bg-[#111] text-[#666] focus:outline-none disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#888] mb-2">
                    API URL <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="url"
                    value={apiUrl}
                    onChange={(e) => setApiUrl(e.target.value)}
                    placeholder="https://api.mnee.io"
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
                    placeholder="https://whatsonchain.com"
                    className="w-full px-4 py-3 border border-[#333] rounded-lg bg-[#111] text-white placeholder-[#666] focus:outline-none focus:border-[#555] font-mono text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || !name || !apiUrl}
                  className="px-4 py-2 text-sm font-medium text-black bg-white hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Saving..." : "Update Network"}
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

        {/* Networks List */}
        {networks === undefined ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="animate-pulse flex items-center gap-4 py-3">
                <div className="w-10 h-10 bg-[#1a1a1a] rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-[#1a1a1a] rounded" />
                  <div className="h-3 w-48 bg-[#1a1a1a] rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : networks.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-[#1a1a1a] flex items-center justify-center mx-auto mb-4">
              <NetworkIcon className="w-8 h-8 text-[#666]" />
            </div>
            <p className="text-lg font-medium text-white">No MNEE networks configured</p>
            <p className="text-sm text-[#888] mt-1">
              Click &quot;Seed Defaults&quot; to add sandbox and mainnet networks
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#333] bg-[#0a0a0a] rounded-lg border border-[#333]">
            {networks.map((network) => (
              <div
                key={network._id}
                className={`p-4 ${!network.isActive ? "opacity-60" : ""}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        network.isActive
                          ? network.network === "mainnet"
                            ? "bg-gradient-to-br from-emerald-500/20 to-teal-600/20 border border-emerald-500/30"
                            : "bg-gradient-to-br from-amber-500/20 to-orange-600/20 border border-amber-500/30"
                          : "bg-[#1a1a1a]"
                      }`}
                    >
                      <NetworkIcon
                        className={`w-5 h-5 ${
                          network.isActive
                            ? network.network === "mainnet"
                              ? "text-emerald-400"
                              : "text-amber-400"
                            : "text-[#666]"
                        }`}
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-white">{network.name}</p>
                        {network.network === "sandbox" && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-amber-900/50 text-amber-400 rounded-full">
                            Sandbox
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                            network.isActive
                              ? "bg-emerald-900/50 text-emerald-400"
                              : "bg-[#1a1a1a] text-[#666]"
                          }`}
                        >
                          {network.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <p className="text-xs text-[#888]">
                        Decimals: <span className="font-mono">{network.decimals}</span>
                      </p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                        <span className="text-[#888]">
                          API: <span className="font-mono text-[#666]">{network.apiUrl}</span>
                        </span>
                        {network.explorerUrl && (
                          <span className="text-[#888]">
                            Explorer: <span className="font-mono text-[#666]">{network.explorerUrl}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => startEditing(network as MneeNetwork)}
                      className="p-2 text-[#666] hover:text-white rounded-lg hover:bg-[#1a1a1a] transition-colors"
                      title="Edit network"
                    >
                      <EditIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleActive(network as MneeNetwork)}
                      disabled={togglingNetwork === network.network}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 ${
                        network.isActive
                          ? "text-amber-400 hover:bg-amber-900/30"
                          : "text-emerald-400 hover:bg-emerald-900/30"
                      }`}
                    >
                      {togglingNetwork === network.network
                        ? "..."
                        : network.isActive
                        ? "Deactivate"
                        : "Activate"}
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

function AdminsManagement() {
  const admins = useQuery(api.users.listAdmins);
  const grantAdmin = useMutation(api.users.grantAdminByEmail);
  const revokeAdmin = useMutation(api.users.revokeAdmin);
  const toast = useToast();

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
      toast.success("Admin access granted");
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
      toast.success(`Admin access revoked from ${name || "user"}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to revoke admin");
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <div className="bg-[#111] rounded-xl border border-[#333] p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-white">Platform Admins</h2>
        <p className="text-sm text-[#888]">
          Users with full access to manage MNEE networks and other admins
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

function PaymentsManagement() {
  const payments = useQuery(api.gateway.listAllPaymentsForAdmin, { limit: 100 });
  const stats = useQuery(api.gateway.getPaymentStatsForAdmin);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredPayments = payments
    ? statusFilter === "all"
      ? payments
      : payments.filter((p) => p.status === statusFilter)
    : [];

  const formatMnee = (amount: number) => {
    return (amount / 100000).toFixed(5);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "settled":
      case "completed":
        return "text-emerald-400 bg-emerald-900/30";
      case "pending":
        return "text-amber-400 bg-amber-900/30";
      case "failed":
        return "text-red-400 bg-red-900/30";
      case "denied":
        return "text-red-400 bg-red-900/30";
      case "allowed":
        return "text-blue-400 bg-blue-900/30";
      default:
        return "text-[#888] bg-[#1a1a1a]";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "settled":
      case "completed":
        return <CheckCircleIcon className="w-4 h-4" />;
      case "pending":
        return <ClockIcon className="w-4 h-4" />;
      case "failed":
      case "denied":
        return <XCircleIcon className="w-4 h-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#111] rounded-xl border border-[#333] p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-[#888]">Total Payments</p>
              <CurrencyIcon className="w-5 h-5 text-[#666]" />
            </div>
            <p className="text-2xl font-bold text-white">{stats.totalPayments}</p>
            <p className="text-xs text-[#666] mt-1">All time</p>
          </div>

          <div className="bg-[#111] rounded-xl border border-[#333] p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-[#888]">Total Revenue</p>
              <CheckCircleIcon className="w-5 h-5 text-emerald-400" />
            </div>
            <p className="text-2xl font-bold text-white">{formatMnee(stats.totalRevenue)} MNEE</p>
            <p className="text-xs text-[#666] mt-1">{stats.settledCount} settled payments</p>
          </div>

          <div className="bg-[#111] rounded-xl border border-[#333] p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-[#888]">Today&apos;s Payments</p>
              <ClockIcon className="w-5 h-5 text-amber-400" />
            </div>
            <p className="text-2xl font-bold text-white">{stats.todayPayments}</p>
            <p className="text-xs text-[#666] mt-1">{formatMnee(stats.todayRevenue)} MNEE revenue</p>
          </div>

          <div className="bg-[#111] rounded-xl border border-[#333] p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-[#888]">Status Overview</p>
              <NetworkIcon className="w-5 h-5 text-[#666]" />
            </div>
            <div className="flex gap-2 mt-2">
              <span className="text-xs text-emerald-400">{stats.settledCount} ✓</span>
              <span className="text-xs text-amber-400">{stats.pendingCount} ⏳</span>
              <span className="text-xs text-red-400">{stats.failedCount} ✗</span>
            </div>
          </div>
        </div>
      )}

      {/* Payments Table */}
      <div className="bg-[#111] rounded-xl border border-[#333] p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-white">All Payments</h2>
            <p className="text-sm text-[#888]">
              View and track all payment transactions across workspaces
            </p>
          </div>
          
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-[#333] rounded-lg bg-[#0a0a0a] text-white text-sm focus:outline-none focus:border-[#555]"
          >
            <option value="all">All Statuses</option>
            <option value="settled">Settled</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="allowed">Allowed</option>
            <option value="failed">Failed</option>
            <option value="denied">Denied</option>
          </select>
        </div>

        {/* Payments List */}
        {payments === undefined ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse flex items-center gap-4 py-3">
                <div className="w-10 h-10 bg-[#1a1a1a] rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-48 bg-[#1a1a1a] rounded" />
                  <div className="h-3 w-32 bg-[#1a1a1a] rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-[#1a1a1a] flex items-center justify-center mx-auto mb-4">
              <CurrencyIcon className="w-8 h-8 text-[#666]" />
            </div>
            <p className="text-lg font-medium text-white">No payments found</p>
            <p className="text-sm text-[#888] mt-1">
              {statusFilter !== "all"
                ? `No payments with status: ${statusFilter}`
                : "Payments will appear here once transactions are made"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#333]">
                  <th className="text-left text-xs font-medium text-[#888] pb-3 px-2">Status</th>
                  <th className="text-left text-xs font-medium text-[#888] pb-3 px-2">Amount</th>
                  <th className="text-left text-xs font-medium text-[#888] pb-3 px-2">Workspace</th>
                  <th className="text-left text-xs font-medium text-[#888] pb-3 px-2">Provider</th>
                  <th className="text-left text-xs font-medium text-[#888] pb-3 px-2">Network</th>
                  <th className="text-left text-xs font-medium text-[#888] pb-3 px-2">Date</th>
                  <th className="text-left text-xs font-medium text-[#888] pb-3 px-2">Invoice ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#333]">
                {filteredPayments.map((payment) => (
                  <tr key={payment._id} className="hover:bg-[#1a1a1a]/50 transition-colors">
                    <td className="py-3 px-2">
                      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium w-fit ${getStatusColor(payment.status)}`}>
                        {getStatusIcon(payment.status)}
                        {payment.status}
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <div className="text-sm font-semibold text-white">
                        {formatMnee(payment.amount)}
                      </div>
                      <div className="text-xs text-[#666]">MNEE</div>
                    </td>
                    <td className="py-3 px-2">
                      <div className="text-sm text-white">{payment.workspaceName || "Unknown"}</div>
                      <div className="text-xs text-[#666]">{payment.apiKeyName || "No key"}</div>
                    </td>
                    <td className="py-3 px-2">
                      <div className="text-sm text-white">{payment.providerName || payment.providerHost}</div>
                    </td>
                    <td className="py-3 px-2">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        payment.network === "mainnet"
                          ? "bg-emerald-900/50 text-emerald-400"
                          : "bg-amber-900/50 text-amber-400"
                      }`}>
                        {payment.network}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <div className="text-xs text-[#888]">{formatDate(payment.createdAt)}</div>
                      {payment.completedAt && (
                        <div className="text-xs text-[#666]">Completed: {formatDate(payment.completedAt)}</div>
                      )}
                    </td>
                    <td className="py-3 px-2">
                      <div className="text-xs font-mono text-[#888] max-w-xs truncate" title={payment.invoiceId}>
                        {payment.invoiceId}
                      </div>
                      {payment.txHash && (
                        <div className="text-xs font-mono text-[#666] max-w-xs truncate" title={payment.txHash}>
                          {payment.txHash}
                        </div>
                      )}
                      {payment.denialReason && (
                        <div className="text-xs text-red-400 mt-1">
                          {payment.denialReason}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function AdminTools() {
  const [encryptedWif, setEncryptedWif] = useState("");
  const [decryptedWif, setDecryptedWif] = useState<string | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const decryptWifAction = useAction(api.mneeActions.decryptWifForAdmin);

  const handleDecrypt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!encryptedWif.trim()) return;

    setIsDecrypting(true);
    setError(null);
    setDecryptedWif(null);

    try {
      const result = await decryptWifAction({ encryptedWif: encryptedWif.trim() });

      if (!result.success) {
        throw new Error(result.error || "Failed to decrypt WIF");
      }

      setDecryptedWif(result.decryptedWif || null);
      toast.success("WIF decrypted successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Decryption failed");
    } finally {
      setIsDecrypting(false);
    }
  };

  const handleCopy = () => {
    if (decryptedWif) {
      navigator.clipboard.writeText(decryptedWif);
      toast.success("Copied to clipboard");
    }
  };

  const handleClear = () => {
    setEncryptedWif("");
    setDecryptedWif(null);
    setError(null);
  };

  return (
    <div className="space-y-6">
      {/* Decrypt WIF Tool */}
      <div className="bg-[#111] rounded-xl border border-[#333] p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-600/20 border border-violet-500/30 flex items-center justify-center">
            <LockOpenIcon className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Decrypt WIF</h2>
            <p className="text-sm text-[#888]">
              Paste an encrypted WIF to decrypt it using your MNEE_ENCRYPTION_KEY
            </p>
          </div>
        </div>

        <form onSubmit={handleDecrypt} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#888] mb-2">
              Encrypted WIF
            </label>
            <textarea
              value={encryptedWif}
              onChange={(e) => setEncryptedWif(e.target.value)}
              placeholder="Paste encrypted WIF here (format: iv:authTag:salt:encryptedData)"
              rows={3}
              className="w-full px-4 py-3 border border-[#333] rounded-lg bg-[#0a0a0a] text-white placeholder-[#666] focus:outline-none focus:border-[#555] font-mono text-sm resize-none"
            />
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-800 rounded-lg p-3">
              <p className="text-sm text-red-200">{error}</p>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isDecrypting || !encryptedWif.trim()}
              className="px-4 py-2 text-sm font-medium text-black bg-white hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDecrypting ? "Decrypting..." : "Decrypt WIF"}
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="px-4 py-2 text-sm font-medium text-[#888] hover:text-white hover:bg-[#1a1a1a] rounded-lg transition-colors"
            >
              Clear
            </button>
          </div>
        </form>

        {/* Decrypted Result */}
        {decryptedWif && (
          <div className="mt-6 bg-emerald-900/10 border border-emerald-800/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-emerald-400">Decrypted WIF</p>
              <button
                onClick={handleCopy}
                className="px-3 py-1 text-xs font-medium text-emerald-400 hover:bg-emerald-900/30 rounded transition-colors"
              >
                Copy
              </button>
            </div>
            <p className="font-mono text-sm text-white break-all bg-[#0a0a0a] rounded p-3">
              {decryptedWif}
            </p>
            <p className="text-xs text-[#666] mt-2">
              ⚠️ Keep this private key secure. Never share it with anyone.
            </p>
          </div>
        )}
      </div>

      {/* Additional Info */}
      <div className="bg-[#111] rounded-xl border border-[#333] p-6">
        <h3 className="text-sm font-semibold text-white mb-3">About WIF Encryption</h3>
        <div className="text-sm text-[#888] space-y-2">
          <p>
            WIF (Wallet Import Format) keys are encrypted using AES-256-GCM with a master key
            from the <code className="text-violet-400 bg-violet-900/20 px-1 rounded">MNEE_ENCRYPTION_KEY</code> environment variable.
          </p>
          <p>
            Encrypted format: <code className="text-[#666] font-mono">iv:authTag:salt:encryptedData</code>
          </p>
          <p>
            The decryption will only work if the encrypted WIF was created with the same
            encryption key that is currently set in your environment.
          </p>
        </div>
      </div>
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
