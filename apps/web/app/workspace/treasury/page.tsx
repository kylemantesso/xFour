"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import Image from "next/image";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { WorkspaceGuard } from "../../../components/WorkspaceGuard";
import { BackToDashboard } from "../../../components/BackToDashboard";
import { useToast } from "../../../components/Toast";

// Types
type MneeNetwork = "sandbox" | "mainnet";

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

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
      />
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

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  );
}

function KeyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
    </svg>
  );
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}

function EyeOffIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  );
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
  );
}

function MneeIcon({ className }: { className?: string }) {
  return (
    <Image 
      src="/mnee-logo.png" 
      alt="MNEE" 
      className={className}
      width={24}
      height={24}
    />
  );
}

export default function TreasuryPage() {
  return (
    <WorkspaceGuard>
      <TreasuryContent />
    </WorkspaceGuard>
  );
}

function TreasuryContent() {
  const workspaceData = useQuery(api.workspaces.getCurrentWorkspace);
  const wallets = useQuery(api.wallets.listWallets, {});
  const mneeNetworks = useQuery(api.mneeNetworks.listNetworks, { includeSandbox: true });

  if (!workspaceData) {
    return <LoadingSkeleton />;
  }

  const { role } = workspaceData;
  const canManage = role === "owner" || role === "admin";

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back link */}
        <BackToDashboard />

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/25">
              <WalletIcon className="w-7 h-7 text-white" />
                </div>
                <div>
              <h1 className="text-2xl font-bold text-white">Treasury</h1>
              <p className="text-sm text-[#888] mt-1">
                Manage your MNEE wallets for agent payments
              </p>
                    </div>
                </div>
              </div>

        {/* Info Card */}
        <div className="bg-[#111] border border-[#333] rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-900/50 flex items-center justify-center flex-shrink-0">
              <MneeIcon className="w-4 h-4" />
                </div>
                <div>
              <h3 className="text-sm font-medium text-white">
                MNEE Wallets
              </h3>
              <p className="text-sm text-[#888] mt-1">
                MNEE is a Bitcoin-based stablecoin. Each workspace has a non-custodial MNEE wallet for each network (sandbox and mainnet). 
                Fund your wallet to enable agent payments. You maintain full control of your funds.
                  </p>
                </div>
              </div>
        </div>

        {/* Wallets Section */}
        <div className="space-y-4">
          {!wallets ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-32 bg-[#111] border border-[#333] rounded-xl animate-pulse" />
              ))}
            </div>
          ) : wallets.length === 0 ? (
            <EmptyWalletsState canManage={canManage} networks={mneeNetworks} />
          ) : (
            <>
              {wallets.map((wallet) => (
                <WalletCard key={wallet._id} wallet={wallet} canManage={canManage} />
              ))}
              
              {/* Create wallet button always shown */}
              {canManage && (
                <CreateWalletButton availableNetworks={mneeNetworks} />
              )}
            </>
          )}
        </div>

        {/* Funding Instructions */}
        <div className="mt-8 bg-[#111] border border-[#333] rounded-xl p-6">
          <h3 className="text-sm font-medium text-white mb-4">How to Fund Your Wallet</h3>
          <ol className="space-y-3 text-sm text-[#888]">
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-[#1a1a1a] flex items-center justify-center text-xs text-white flex-shrink-0">1</span>
              <span>Copy your MNEE wallet address from the card above</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-[#1a1a1a] flex items-center justify-center text-xs text-white flex-shrink-0">2</span>
              <span>Send MNEE to this address from your external wallet or exchange</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-[#1a1a1a] flex items-center justify-center text-xs text-white flex-shrink-0">3</span>
              <span>Your agents can now make payments using this wallet</span>
            </li>
          </ol>
          <p className="mt-4 text-xs text-[#666]">
            Note: Use sandbox network for testing. Sandbox MNEE can be obtained from the MNEE faucet.
                    </p>
                  </div>
                </div>
              </div>
  );
}

// ============================================
// WALLET CARD
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

function WalletCard({ wallet, canManage }: { wallet: WalletData; canManage: boolean }) {
  const [copied, setCopied] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(wallet.name);
  const toast = useToast();
  const updateWallet = useMutation(api.wallets.updateWallet);
  const deleteWallet = useMutation(api.wallets.deleteWallet);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(wallet.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate refresh - in a real app, you'd query the MNEE API for balance
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateWallet({
        walletId: wallet._id as Id<"wallets">,
        name: editName.trim(),
      });
      toast.success("Wallet updated successfully");
      setIsEditing(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update wallet");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this wallet? This action cannot be undone.")) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteWallet({ walletId: wallet._id as Id<"wallets"> });
      toast.success("Wallet deleted successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete wallet");
    } finally {
      setIsDeleting(false);
    }
  };

  const isMainnet = wallet.network === "mainnet";

  return (
    <div className={`bg-[#111] border rounded-xl p-6 ${
      isMainnet ? "border-emerald-900/50" : "border-amber-900/50"
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
            isMainnet 
              ? "bg-gradient-to-br from-emerald-500/20 to-teal-600/20 border border-emerald-500/30" 
              : "bg-gradient-to-br from-amber-500/20 to-orange-600/20 border border-amber-500/30"
          }`}>
            <MneeIcon className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            {isEditing ? (
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="text-lg font-semibold text-white bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-1 mb-1 w-full"
                autoFocus
              />
            ) : (
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-white truncate">
                  {wallet.name}
                </h3>
                <span className={`flex-shrink-0 px-2 py-0.5 text-xs font-medium rounded-full ${
                  wallet.isActive 
                    ? "bg-emerald-900/50 text-emerald-400" 
                    : "bg-[#1a1a1a] text-[#666]"
                }`}>
                  {wallet.isActive ? "Active" : "Inactive"}
                </span>
                <span className={`flex-shrink-0 px-2 py-0.5 text-xs font-medium rounded-full capitalize ${
                  isMainnet 
                    ? "bg-emerald-900/50 text-emerald-400" 
                    : "bg-amber-900/50 text-amber-400"
                }`}>
                  {wallet.network}
                </span>
              </div>
            )}
            <p className="text-sm text-[#888] mt-0.5">
              {isMainnet ? "Production payments" : "Testing & development"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                disabled={isSaving || !editName.trim()}
                className="p-2 text-emerald-400 hover:bg-emerald-900/30 rounded-lg transition-colors disabled:opacity-50"
                title="Save"
              >
                <CheckIcon className="w-5 h-5" />
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditName(wallet.name);
                }}
                className="p-2 text-[#666] hover:text-white hover:bg-[#1a1a1a] rounded-lg transition-colors"
                title="Cancel"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-2 text-[#666] hover:text-white hover:bg-[#1a1a1a] rounded-lg transition-colors disabled:opacity-50"
                title="Refresh balance"
              >
                <RefreshIcon className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`} />
              </button>
              {canManage && (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-2 text-[#666] hover:text-white hover:bg-[#1a1a1a] rounded-lg transition-colors"
                    title="Edit wallet"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="p-2 text-red-400 hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50"
                    title="Delete wallet"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Address */}
      <div className="mt-4 p-3 bg-[#0a0a0a] rounded-lg border border-[#333]">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-[#666] mb-1">Wallet Address</p>
            <p className="text-sm font-mono text-white truncate">{wallet.address}</p>
                    </div>
                    <button
            onClick={handleCopy}
            className="flex-shrink-0 p-2 text-[#666] hover:text-white hover:bg-[#1a1a1a] rounded-lg transition-colors"
            title="Copy address"
          >
            {copied ? (
              <CheckIcon className="w-5 h-5 text-emerald-500" />
            ) : (
              <CopyIcon className="w-5 h-5" />
                      )}
                    </button>
                </div>
              </div>

      {/* Balance placeholder - would need MNEE API integration */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="p-3 bg-[#0a0a0a] rounded-lg">
          <p className="text-xs text-[#666] mb-1">Balance</p>
          <p className="text-lg font-semibold text-white">
            -- MNEE
          </p>
          <p className="text-xs text-[#666] mt-1">
            Connect MNEE API for live balance
                    </p>
                  </div>
        <div className="p-3 bg-[#0a0a0a] rounded-lg">
          <p className="text-xs text-[#666] mb-1">Network</p>
          <p className={`text-lg font-semibold ${isMainnet ? "text-emerald-400" : "text-amber-400"}`}>
            {wallet.network}
          </p>
          <p className="text-xs text-[#666] mt-1">
            Created {new Date(wallet.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
  );
}

// ============================================
// EMPTY STATE
// ============================================

function EmptyWalletsState({ 
  canManage, 
  networks 
}: { 
  canManage: boolean; 
  networks: Array<{ _id: string; network: MneeNetwork; name: string }> | undefined;
}) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);

  return (
    <>
      <div className="bg-[#111] border border-[#333] rounded-xl p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#1a1a1a] flex items-center justify-center mx-auto mb-4">
          <WalletIcon className="w-8 h-8 text-[#666]" />
        </div>
        <h3 className="text-lg font-medium text-white mb-2">No Wallets</h3>
        <p className="text-sm text-[#888] max-w-sm mx-auto mb-6">
          Create a new wallet or import an existing one using your private key.
        </p>

        {canManage && (
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setShowCreateDialog(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-black bg-white hover:bg-gray-200 rounded-lg transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              Create Wallet
            </button>
            <button
              onClick={() => setShowImportDialog(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white border border-[#555] hover:bg-[#1a1a1a] rounded-lg transition-colors"
            >
              <UploadIcon className="w-4 h-4" />
              Import Wallet
            </button>
          </div>
        )}
      </div>

      {showCreateDialog && (
        <CreateWalletDialog 
          onClose={() => setShowCreateDialog(false)}
          availableNetworks={networks}
        />
      )}
      
      {showImportDialog && (
        <ImportWalletDialog 
          onClose={() => setShowImportDialog(false)}
          availableNetworks={networks}
        />
      )}
    </>
  );
}

// ============================================
// WALLET ACTION BUTTONS
// ============================================

function CreateWalletButton({ 
  availableNetworks 
}: { 
  availableNetworks: Array<{ _id: string; network: MneeNetwork; name: string }> | undefined;
}) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);

  return (
    <>
      <div className="flex gap-2">
        <button
          onClick={() => setShowCreateDialog(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#888] hover:text-white border border-[#333] hover:border-[#555] rounded-lg transition-colors flex-1"
        >
          <PlusIcon className="w-4 h-4" />
          Create New Wallet
        </button>
        <button
          onClick={() => setShowImportDialog(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#888] hover:text-white border border-[#333] hover:border-[#555] rounded-lg transition-colors flex-1"
        >
          <UploadIcon className="w-4 h-4" />
          Import Wallet
        </button>
      </div>

      {showCreateDialog && (
        <CreateWalletDialog 
          onClose={() => setShowCreateDialog(false)}
          availableNetworks={availableNetworks}
        />
      )}
      
      {showImportDialog && (
        <ImportWalletDialog 
          onClose={() => setShowImportDialog(false)}
          availableNetworks={availableNetworks}
        />
      )}
    </>
  );
}

// ============================================
// CREATE WALLET DIALOG
// ============================================

function CreateWalletDialog({
  onClose,
  availableNetworks,
}: {
  onClose: () => void;
  availableNetworks: Array<{ _id: string; network: MneeNetwork; name: string }> | undefined;
}) {
  const [name, setName] = useState("");
  const [network, setNetwork] = useState<MneeNetwork>("sandbox");
  const [isCreating, setIsCreating] = useState(false);
  const toast = useToast();
  const generateWallet = useMutation(api.wallets.generateWallet);

  // Set default network when availableNetworks loads
  useEffect(() => {
    if (availableNetworks && availableNetworks.length > 0) {
      const sandbox = availableNetworks.find(n => n.network === "sandbox");
      if (sandbox) {
        setNetwork(sandbox.network);
      } else {
        setNetwork(availableNetworks[0].network);
      }
    }
  }, [availableNetworks]);

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
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create wallet");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-[#111] border border-[#333] rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <WalletIcon className="w-5 h-5 text-white" />
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
            >
              {availableNetworks && availableNetworks.length > 0 ? (
                availableNetworks.map((n) => (
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
// IMPORT WALLET DIALOG
// ============================================

function ImportWalletDialog({
  onClose,
  availableNetworks,
}: {
  onClose: () => void;
  availableNetworks: Array<{ _id: string; network: MneeNetwork; name: string }> | undefined;
}) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [network, setNetwork] = useState<MneeNetwork>("sandbox");
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  // Set default network when availableNetworks loads
  useEffect(() => {
    if (availableNetworks && availableNetworks.length > 0) {
      const sandbox = availableNetworks.find(n => n.network === "sandbox");
      if (sandbox) {
        setNetwork(sandbox.network);
      } else {
        setNetwork(availableNetworks[0].network);
      }
    }
  }, [availableNetworks]);

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !address.trim() || !privateKey.trim()) return;

    setIsImporting(true);
    setError(null);

    try {
      const response = await fetch("/api/wallets/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          address: address.trim(),
          privateKey: privateKey.trim(),
          network,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to import wallet");
      }

      toast.success(data.message || "Wallet imported successfully");
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to import wallet";
      setError(message);
      toast.error(message);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-[#111] border border-[#333] rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleImport} className="space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <KeyIcon className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white">
              Import Wallet
            </h3>
          </div>

          <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg p-3">
            <p className="text-sm text-amber-200">
              <strong>Security Notice:</strong> Your private key will be encrypted and stored securely. Never share your private key with anyone.
            </p>
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-3">
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[#888] mb-1">
              Wallet Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., My MNEE Wallet"
              className="w-full px-3 py-2 border border-[#333] rounded-lg bg-[#0a0a0a] text-white placeholder-[#666] focus:outline-none focus:border-[#555]"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#888] mb-1">
              Wallet Address <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g., 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"
              className="w-full px-3 py-2 border border-[#333] rounded-lg bg-[#0a0a0a] text-white placeholder-[#666] focus:outline-none focus:border-[#555] font-mono text-sm"
              required
              autoComplete="off"
              spellCheck="false"
            />
            <p className="text-xs text-[#666] mt-1">
              The Bitcoin address for this wallet
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#888] mb-1">
              Private Key (WIF) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPrivateKey ? "text" : "password"}
                value={privateKey}
                onChange={(e) => setPrivateKey(e.target.value)}
                placeholder="Enter your WIF private key"
                className="w-full px-3 py-2 pr-10 border border-[#333] rounded-lg bg-[#0a0a0a] text-white placeholder-[#666] focus:outline-none focus:border-[#555] font-mono text-sm"
                required
                autoComplete="off"
                spellCheck="false"
              />
              <button
                type="button"
                onClick={() => setShowPrivateKey(!showPrivateKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[#666] hover:text-white transition-colors"
                title={showPrivateKey ? "Hide private key" : "Show private key"}
              >
                {showPrivateKey ? (
                  <EyeOffIcon className="w-5 h-5" />
                ) : (
                  <EyeIcon className="w-5 h-5" />
                )}
              </button>
            </div>
            <p className="text-xs text-[#666] mt-1">
              WIF format starts with 5, K, L, or c (e.g., 5HueCGU8rMjx...)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#888] mb-1">
              Network <span className="text-red-500">*</span>
            </label>
            <select
              value={network}
              onChange={(e) => setNetwork(e.target.value as MneeNetwork)}
              className="w-full px-3 py-2 border border-[#333] rounded-lg bg-[#0a0a0a] text-white focus:outline-none focus:border-[#555]"
            >
              {availableNetworks && availableNetworks.length > 0 ? (
                availableNetworks.map((n) => (
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
              Make sure the network matches your wallet&apos;s network
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={isImporting || !name.trim() || !address.trim() || !privateKey.trim()}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isImporting ? "Importing..." : "Import Wallet"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isImporting}
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
              <div className="h-7 w-32 bg-[#1a1a1a] rounded animate-pulse" />
              <div className="h-4 w-48 bg-[#1a1a1a] rounded animate-pulse mt-2" />
            </div>
          </div>
        </div>
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-48 bg-[#111] border border-[#333] rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
      </div>
  );
}
