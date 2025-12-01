"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { WorkspaceGuard } from "../../../components/WorkspaceGuard";
import { BackToDashboard } from "../../../components/BackToDashboard";
import { Id } from "../../../convex/_generated/dataModel";

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

// ============================================
// API KEYS COMPONENTS
// ============================================

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
        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
      >
        <PlusIcon className="w-4 h-4" />
        Create API Key
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl">
            {newApiKey ? (
              // Success state - show the API key
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                    <CheckIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                      API Key Created
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Copy your key now — you won't see it again!
                    </p>
                  </div>
                </div>

                <div className="bg-slate-100 dark:bg-slate-900 rounded-lg p-4">
                  <div className="flex items-center justify-between gap-3">
                    <code className="text-sm font-mono text-slate-800 dark:text-slate-200 break-all">
                      {newApiKey}
                    </code>
                    <button
                      onClick={handleCopy}
                      className="flex-shrink-0 p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
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

                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    <strong>Important:</strong> This is the only time you'll see this key. 
                    Store it securely — we only save a hash on our servers.
                  </p>
                </div>

                <button
                  onClick={handleClose}
                  className="w-full px-4 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
                >
                  Done
                </button>
              </div>
            ) : (
              // Form state
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                    <KeyIcon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Create API Key
                  </h3>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., dev-bot-1, production-agent"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Description <span className="text-slate-400">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What is this key used for?"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={isCreating || !name.trim()}
                    className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreating ? "Creating..." : "Create Key"}
                  </button>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
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
}: {
  apiKeys: ApiKeyData[] | undefined;
  canManage: boolean;
}) {
  const updateApiKey = useMutation(api.apiKeys.updateApiKey);
  const deleteApiKey = useMutation(api.apiKeys.deleteApiKey);
  const [togglingId, setTogglingId] = useState<Id<"apiKeys"> | null>(null);
  const [deletingId, setDeletingId] = useState<Id<"apiKeys"> | null>(null);

  if (apiKeys === undefined) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="animate-pulse flex items-center gap-4 py-3">
            <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-lg" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (apiKeys.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-3">
          <KeyIcon className="w-6 h-6 text-slate-400" />
        </div>
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
          No API keys yet
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Create an API key to connect your agents and SDKs
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
    <div className="divide-y divide-slate-200 dark:divide-slate-700">
      {apiKeys.map((apiKey) => (
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
                  ? "bg-emerald-100 dark:bg-emerald-900/50"
                  : "bg-slate-100 dark:bg-slate-700"
              }`}
            >
              <KeyIcon
                className={`w-5 h-5 ${
                  apiKey.isActive
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-slate-400"
                }`}
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                  {apiKey.name}
                </p>
                <span
                  className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                    apiKey.isActive
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400"
                      : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                  }`}
                >
                  {apiKey.isActive ? "Active" : "Disabled"}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <code className="text-xs font-mono text-slate-500 dark:text-slate-400">
                  {apiKey.apiKeyPrefix}
                </code>
                <span className="text-slate-300 dark:text-slate-600">•</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Created {formatDate(apiKey.createdAt)}
                </span>
                {apiKey.lastUsedAt && (
                  <>
                    <span className="text-slate-300 dark:text-slate-600">•</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Last used {formatRelativeTime(apiKey.lastUsedAt)}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {canManage && (
            <div className="flex items-center gap-2 flex-shrink-0 ml-4">
              <button
                onClick={() => handleToggle(apiKey)}
                disabled={togglingId === apiKey._id}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 ${
                  apiKey.isActive
                    ? "text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/30"
                    : "text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/30"
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
                className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
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

export default function WorkspaceSettingsPage() {
  return (
    <WorkspaceGuard>
      <WorkspaceSettings />
    </WorkspaceGuard>
  );
}

function WorkspaceSettings() {
  const workspaceData = useQuery(api.workspaces.getCurrentWorkspace);
  const members = useQuery(api.workspaces.listMembers);
  const invites = useQuery(api.invites.listInvites);
  const apiKeys = useQuery(api.apiKeys.listApiKeys);

  if (!workspaceData || !members) {
    return <LoadingSkeleton />;
  }

  const { workspace, role } = workspaceData;
  const isAdmin = role === "owner" || role === "admin";
  const canWrite = role === "owner" || role === "admin" || role === "member";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back link */}
        <BackToDashboard />

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Workspace Settings
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Manage your workspace configuration and team members
          </p>
        </div>

        {/* General Settings */}
        <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
            General
          </h2>
          <WorkspaceNameEditor workspace={workspace} isAdmin={isAdmin} />
        </section>

        {/* Agents & API Keys Section */}
        <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <KeyIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Agents & API Keys
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Manage API keys for your agents and SDKs
                </p>
              </div>
            </div>
            {canWrite && <CreateApiKeyButton />}
          </div>
          <ApiKeysList apiKeys={apiKeys} canManage={isAdmin} />
        </section>

        {/* Members Section */}
        <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Members ({members.length})
            </h2>
            {isAdmin && <InviteMemberButton />}
          </div>
          <MembersList members={members} currentRole={role} />
        </section>

        {/* Pending Invites */}
        {isAdmin && invites && invites.length > 0 && (
          <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 mb-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Pending Invites ({invites.filter((i) => i.status === "pending").length})
            </h2>
            <InvitesList invites={invites} />
          </section>
        )}

        {/* Danger Zone */}
        {role === "owner" && (
          <section className="bg-white dark:bg-slate-800 rounded-xl border border-red-200 dark:border-red-900 p-6">
            <h2 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-4">
              Danger Zone
            </h2>
            <DeleteWorkspaceButton workspaceId={workspace._id} workspaceName={workspace.name} />
          </section>
        )}
      </div>
    </div>
  );
}

function WorkspaceNameEditor({
  workspace,
  isAdmin,
}: {
  workspace: { _id: Id<"workspaces">; name: string; slug?: string };
  isAdmin: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(workspace.name);
  const updateWorkspace = useMutation(api.workspaces.updateWorkspace);

  const handleSave = async () => {
    if (name.trim() && name !== workspace.name) {
      await updateWorkspace({ name: name.trim() });
    }
    setIsEditing(false);
  };

  return (
    <div className="flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold">
        {workspace.name.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoFocus
            />
            <button
              onClick={handleSave}
              className="px-3 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
            >
              Save
            </button>
            <button
              onClick={() => {
                setName(workspace.name);
                setIsEditing(false);
              }}
              className="px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {workspace.name}
            </h3>
            {isAdmin && (
              <button
                onClick={() => setIsEditing(true)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                  />
                </svg>
              </button>
            )}
          </div>
        )}
        {workspace.slug && (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Slug: {workspace.slug}
          </p>
        )}
      </div>
    </div>
  );
}

function MembersList({
  members,
  currentRole,
}: {
  members: Array<{
    _id: Id<"workspaceMembers">;
    userId: string;
    role: string;
    email: string;
    name: string | null;
  }>;
  currentRole: string;
}) {
  const updateRole = useMutation(api.workspaces.updateMemberRole);
  const removeMember = useMutation(api.workspaces.removeMember);
  const [removingId, setRemovingId] = useState<Id<"workspaceMembers"> | null>(null);

  const handleRemove = async (memberId: Id<"workspaceMembers">) => {
    if (confirm("Are you sure you want to remove this member?")) {
      setRemovingId(memberId);
      await removeMember({ memberId });
      setRemovingId(null);
    }
  };

  const roleColors: Record<string, string> = {
    owner: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400",
    admin: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-400",
    member: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
    viewer: "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400",
  };

  return (
    <div className="divide-y divide-slate-200 dark:divide-slate-700">
      {members.map((member) => (
        <div
          key={member._id}
          className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 font-medium">
              {member.name?.charAt(0).toUpperCase() || member.email.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {member.name || member.email}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{member.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-1 text-xs font-medium rounded-full ${roleColors[member.role] || roleColors.viewer}`}
            >
              {member.role}
            </span>
            {currentRole === "owner" && member.role !== "owner" && (
              <button
                onClick={() => handleRemove(member._id)}
                disabled={removingId === member._id}
                className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50"
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
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function InviteMemberButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member" | "viewer">("member");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const createInvite = useMutation(api.invites.createInvite);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    const result = await createInvite({ email: email.trim(), role });
    // Generate invite link (in a real app, you'd send this via email)
    const link = `${window.location.origin}/invite/${result.token}`;
    setInviteLink(link);
    setEmail("");
  };

  const handleCopyLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
          />
        </svg>
        Invite
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Invite Team Member
            </h3>

            {inviteLink ? (
              <div className="space-y-4">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Share this invite link with your team member:
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={inviteLink}
                    readOnly
                    className="flex-1 px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="px-3 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
                  >
                    Copy
                  </button>
                </div>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setInviteLink(null);
                  }}
                  className="w-full px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleInvite} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="teammate@example.com"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Role
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as "admin" | "member" | "viewer")}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="admin">Admin - Can manage settings and members</option>
                    <option value="member">Member - Can view and use the workspace</option>
                    <option value="viewer">Viewer - Read-only access</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
                  >
                    Send Invite
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="flex-1 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
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

function InvitesList({
  invites,
}: {
  invites: Array<{
    _id: Id<"workspaceInvites">;
    email: string;
    role: string;
    status: string;
    isExpired: boolean;
    createdAt: number;
  }>;
}) {
  const revokeInvite = useMutation(api.invites.revokeInvite);

  const pendingInvites = invites.filter((i) => i.status === "pending" && !i.isExpired);

  if (pendingInvites.length === 0) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">No pending invites</p>
    );
  }

  return (
    <div className="divide-y divide-slate-200 dark:divide-slate-700">
      {pendingInvites.map((invite) => (
        <div
          key={invite._id}
          className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
        >
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
              {invite.email}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Invited as {invite.role} • {new Date(invite.createdAt).toLocaleDateString()}
            </p>
          </div>
          <button
            onClick={() => revokeInvite({ inviteId: invite._id })}
            className="px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
          >
            Revoke
          </button>
        </div>
      ))}
    </div>
  );
}

function DeleteWorkspaceButton({
  workspaceId,
  workspaceName,
}: {
  workspaceId: Id<"workspaces">;
  workspaceName: string;
}) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const deleteWorkspace = useMutation(api.workspaces.deleteWorkspace);

  const handleDelete = async () => {
    if (confirmText === workspaceName) {
      await deleteWorkspace({ workspaceId });
      window.location.href = "/";
    }
  };

  return (
    <div>
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
        Once you delete a workspace, there is no going back. All data will be permanently deleted.
      </p>
      {isConfirming ? (
        <div className="space-y-3">
          <p className="text-sm text-red-600 dark:text-red-400">
            Type <strong>{workspaceName}</strong> to confirm:
          </p>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="w-full px-3 py-2 border border-red-300 dark:border-red-900 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-500"
            placeholder={workspaceName}
          />
          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              disabled={confirmText !== workspaceName}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Delete Workspace
            </button>
            <button
              onClick={() => {
                setIsConfirming(false);
                setConfirmText("");
              }}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsConfirming(true)}
          className="px-4 py-2 text-sm font-medium text-red-600 border border-red-300 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-900/30 rounded-lg"
        >
          Delete this workspace
        </button>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="h-8 w-48 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse mb-8" />
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 mb-6">
          <div className="h-6 w-24 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-4" />
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse" />
            <div className="h-6 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

