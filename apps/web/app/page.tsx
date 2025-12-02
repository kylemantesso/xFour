"use client";

import { useState } from "react";
import { SignedIn, SignedOut, SignInButton, SignUpButton, useAuth } from "@clerk/nextjs";
import { WorkspaceGuard } from "../components/WorkspaceGuard";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import Link from "next/link";
import { useWorkspaceKey } from "../hooks/useWorkspaceKey";
import { useTokenBalance } from "../hooks/useTokenBalance";
import { useTreasuryBalance } from "../hooks/useTreasuryBalance";

export default function Home() {
  const { isLoaded, isSignedIn } = useAuth();

  // Show loading while Clerk is initializing
  if (!isLoaded) {
    return (
      <main className="min-h-[calc(100vh-7rem)] flex items-center justify-center bg-[#0a0a0a]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce" />
          <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
          <div className="w-2 h-2 bg-white/80 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
        </div>
      </main>
    );
  }

  // Show landing page for unauthenticated users
  if (!isSignedIn) {
    return <LandingPage />;
  }

  // Show dashboard for authenticated users
  return (
    <WorkspaceGuard>
      <Dashboard />
    </WorkspaceGuard>
  );
}

function LandingPage() {
  return (
    <main className="min-h-[calc(100vh-7rem)] bg-[#0a0a0a]">
      <div className="max-w-4xl mx-auto px-4 py-20">
        <div className="text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] border border-[#333] text-[#888] rounded-full text-sm font-medium">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            Now in Beta
          </div>

          <h1 className="text-5xl md:text-6xl font-bold text-white tracking-tight">
            AI Payment Gateway
            <span className="block bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
              for Agent Commerce
            </span>
          </h1>

          <p className="text-xl text-[#888] max-w-2xl mx-auto">
            Enable your AI agents to make payments, manage budgets, and transact
            autonomously with x402 Gateway.
          </p>

          <div className="flex items-center justify-center gap-4 pt-4">
            <SignUpButton mode="modal">
              <button className="px-8 py-3 text-lg font-medium text-black bg-white hover:bg-gray-200 rounded-lg transition-colors">
                Get Started Free
              </button>
            </SignUpButton>
            <SignInButton mode="modal">
              <button className="px-8 py-3 text-lg font-medium text-white hover:bg-[#1a1a1a] rounded-lg transition-colors border border-[#333]">
                Sign In
              </button>
            </SignInButton>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 mt-20">
          <FeatureCard
            icon="🔐"
            title="Secure API Keys"
            description="Generate and manage API keys for your AI agents with fine-grained permissions."
          />
          <FeatureCard
            icon="💸"
            title="Payment Policies"
            description="Set spending limits, allowed providers, and budget controls per agent."
          />
          <FeatureCard
            icon="📊"
            title="Real-time Analytics"
            description="Monitor payments, track usage, and audit agent spending in real-time."
          />
        </div>
      </div>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-[#111] p-6 rounded-xl border border-[#333] hover:border-[#555] transition-colors">
      <div className="text-3xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-white mb-2">
        {title}
      </h3>
      <p className="text-[#888] text-sm">{description}</p>
    </div>
  );
}

function Dashboard() {
  const userData = useQuery(api.users.getCurrentUser);
  const apiKeys = useQuery(api.apiKeys.listApiKeys);
  const { workspaceKey } = useWorkspaceKey();
  const { decimals } = useTokenBalance(undefined);
  const { formattedBalance: treasuryBalance, isLoading: treasuryLoading } = useTreasuryBalance(workspaceKey, decimals);

  if (!userData) {
    return (
      <div className="min-h-[calc(100vh-7rem)] flex items-center justify-center bg-[#0a0a0a]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce" />
          <div
            className="w-2 h-2 bg-white/60 rounded-full animate-bounce"
            style={{ animationDelay: "0.1s" }}
          />
          <div
            className="w-2 h-2 bg-white/80 rounded-full animate-bounce"
            style={{ animationDelay: "0.2s" }}
          />
        </div>
      </div>
    );
  }

  const { currentWorkspace } = userData;
  const hasApiKeys = apiKeys && apiKeys.length > 0;

  return (
    <main className="min-h-[calc(100vh-7rem)] bg-[#0a0a0a]">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">
            Welcome back
          </h1>
          <p className="text-[#888] mt-1">
            {currentWorkspace?.name || "Your Workspace"} Dashboard
          </p>
        </div>

        {/* API Keys Section */}
        <div className="bg-[#111] rounded-xl border border-[#333] overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-[#333] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <KeyIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">
                  API Keys
                </h2>
                <p className="text-sm text-[#666]">
                  {apiKeys === undefined ? "Loading..." : `${apiKeys.length} key${apiKeys.length !== 1 ? "s" : ""}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CreateApiKeyButton />
              <Link
                href="/workspace/agents"
                className="px-3 py-2 text-sm font-medium text-[#888] hover:text-white hover:bg-[#1a1a1a] rounded-lg transition-colors"
              >
                Manage all →
              </Link>
            </div>
          </div>
          <div className="p-6">
            <DashboardApiKeysList apiKeys={apiKeys} />
          </div>
        </div>

        {/* Treasury Balance */}
        <div className="bg-[#111] rounded-xl border border-[#333] overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-[#333] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
                <VaultIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Treasury Balance
                </h2>
                <p className="text-sm text-[#666]">
                  Workspace funds available for payments
                </p>
              </div>
            </div>
            <Link
              href="/workspace/treasury"
              className="px-3 py-2 text-sm font-medium text-[#888] hover:text-white hover:bg-[#1a1a1a] rounded-lg transition-colors"
            >
              Manage →
            </Link>
          </div>
          <div className="p-6">
            {treasuryLoading ? (
              <div className="h-10 w-40 bg-[#1a1a1a] rounded animate-pulse" />
            ) : (
              <p className="text-3xl font-bold text-white">
                {parseFloat(treasuryBalance || "0").toLocaleString(undefined, {
                  maximumFractionDigits: 4,
                })}{" "}
                <span className="text-xl text-[#888]">TOKEN</span>
              </p>
            )}
            <p className="text-sm text-[#666] mt-2">
              Deposit tokens to fund your AI agents
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <QuickActionCard
            href="/workspace/settings"
            title="Workspace Settings"
            description="Manage team members and workspace configuration"
            icon={
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            }
          />
          <QuickActionCard
            href="/workspace/treasury"
            title="Treasury"
            description="Manage workspace funds and deposit tokens"
            icon={
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            }
          />
        </div>

        {/* Getting Started - only show if no API keys */}
        {!hasApiKeys && (
          <div className="bg-[#111] rounded-xl border border-[#333] p-6">
            <h2 className="text-lg font-semibold text-white mb-4">
              Getting Started
            </h2>
            <div className="space-y-4">
              <StepItem
                step={1}
                title="Create an API Key"
                description="Generate a secure API key for your AI agent"
                completed={false}
              />
              <StepItem
                step={2}
                title="Configure Payment Policy"
                description="Set spending limits and allowed providers"
                completed={false}
              />
              <StepItem
                step={3}
                title="Integrate with your Agent"
                description="Use our SDK to enable payments in your agent"
                completed={false}
              />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

// ============================================
// API KEY COMPONENTS FOR DASHBOARD
// ============================================

function KeyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
    </svg>
  );
}

function VaultIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
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

type ApiKeyData = {
  _id: Id<"apiKeys">;
  name: string;
  description?: string;
  apiKeyPrefix: string;
  createdByUserId: string;
  lastUsedAt?: number;
  expiresAt?: number;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
};

function CreateApiKeyButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const createApiKey = useMutation(api.apiKeys.createApiKey);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsCreating(true);
    try {
      const result = await createApiKey({
        name: name.trim(),
        description: description.trim() || undefined,
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

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-black bg-white hover:bg-gray-200 rounded-lg transition-colors"
      >
        <PlusIcon className="w-4 h-4" />
        Create Key
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#111] border border-[#333] rounded-xl p-6 w-full max-w-md shadow-2xl">
            {newApiKey ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-emerald-900/50 flex items-center justify-center">
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

                <div className="bg-[#0a0a0a] border border-[#333] rounded-lg p-4">
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

                <div className="bg-amber-900/20 border border-amber-800 rounded-lg p-4">
                  <p className="text-sm text-amber-200">
                    <strong>Important:</strong> This is the only time you'll see this key. 
                    Store it securely — we only save a hash on our servers.
                  </p>
                </div>

                <button
                  onClick={handleClose}
                  className="w-full px-4 py-3 text-sm font-medium text-black bg-white hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreate} className="space-y-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
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
                    className="w-full px-4 py-3 border border-[#333] rounded-lg bg-[#0a0a0a] text-white placeholder-[#666] focus:outline-none focus:border-[#555]"
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
                    className="w-full px-4 py-3 border border-[#333] rounded-lg bg-[#0a0a0a] text-white placeholder-[#666] focus:outline-none focus:border-[#555]"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={isCreating || !name.trim()}
                    className="flex-1 px-4 py-3 text-sm font-medium text-black bg-white hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreating ? "Creating..." : "Create Key"}
                  </button>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 px-4 py-3 text-sm font-medium text-[#888] hover:text-white hover:bg-[#1a1a1a] rounded-lg transition-colors"
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

function DashboardApiKeysList({ apiKeys }: { apiKeys: ApiKeyData[] | undefined }) {
  if (apiKeys === undefined) {
    return (
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
    );
  }

  if (apiKeys.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 rounded-xl bg-[#1a1a1a] flex items-center justify-center mx-auto mb-3">
          <KeyIcon className="w-6 h-6 text-[#666]" />
        </div>
        <p className="text-sm font-medium text-white">
          No API keys yet
        </p>
        <p className="text-xs text-[#666] mt-1">
          Create an API key to connect your agents and SDKs
        </p>
      </div>
    );
  }

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

  // Show max 3 API keys on dashboard
  const displayedKeys = apiKeys.slice(0, 3);
  const remainingCount = apiKeys.length - 3;

  return (
    <div className="divide-y divide-[#333]">
      {displayedKeys.map((apiKey) => (
        <div
          key={apiKey._id}
          className={`flex items-center justify-between py-4 first:pt-0 last:pb-0 ${
            !apiKey.isActive ? "opacity-60" : ""
          }`}
        >
          <div className="flex items-center gap-4 min-w-0">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                apiKey.isActive
                  ? "bg-emerald-900/50"
                  : "bg-[#1a1a1a]"
              }`}
            >
              <KeyIcon
                className={`w-5 h-5 ${
                  apiKey.isActive
                    ? "text-emerald-400"
                    : "text-[#666]"
                }`}
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-white truncate">
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
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <code className="text-xs font-mono text-[#666]">
                  {apiKey.apiKeyPrefix}
                </code>
                {apiKey.lastUsedAt && (
                  <>
                    <span className="text-[#333]">•</span>
                    <span className="text-xs text-[#666]">
                      Last used {formatRelativeTime(apiKey.lastUsedAt)}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
      {remainingCount > 0 && (
        <div className="pt-4 text-center">
          <Link
            href="/workspace/agents"
            className="text-sm text-white hover:text-[#888] font-medium"
          >
            +{remainingCount} more key{remainingCount !== 1 ? "s" : ""}
          </Link>
        </div>
      )}
    </div>
  );
}

function QuickActionCard({
  href,
  title,
  description,
  icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="bg-[#111] p-6 rounded-xl border border-[#333] hover:border-[#555] transition-all group"
    >
      <div className="w-12 h-12 rounded-lg bg-[#1a1a1a] text-[#888] group-hover:text-white flex items-center justify-center mb-4 group-hover:scale-110 transition-all">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-white mb-1">
        {title}
      </h3>
      <p className="text-sm text-[#888]">{description}</p>
    </Link>
  );
}

function StepItem({
  step,
  title,
  description,
  completed,
}: {
  step: number;
  title: string;
  description: string;
  completed: boolean;
}) {
  return (
    <div className="flex items-start gap-4">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          completed
            ? "bg-emerald-900/50 text-emerald-400"
            : "bg-[#1a1a1a] text-[#888]"
        }`}
      >
        {completed ? (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        ) : (
          <span className="text-sm font-medium">{step}</span>
        )}
      </div>
      <div>
        <h4 className="text-sm font-medium text-white">
          {title}
        </h4>
        <p className="text-sm text-[#888]">{description}</p>
      </div>
    </div>
  );
}
