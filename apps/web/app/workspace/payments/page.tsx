"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { WorkspaceGuard } from "../../../components/WorkspaceGuard";

export default function PaymentsPage() {
  return (
    <WorkspaceGuard>
      <PaymentsContent />
    </WorkspaceGuard>
  );
}

function PaymentsContent() {
  const [activeTab, setActiveTab] = useState<"sent" | "received">("sent");
  
  // Sent payments (payments made by this workspace)
  const sentPayments = useQuery(api.gateway.listWorkspacePayments, { limit: 100 });
  const sentStats = useQuery(api.gateway.getWorkspacePaymentStats);
  
  // Received payments (payments received to provider API keys)
  const receivedPayments = useQuery(api.gateway.listReceivedPayments, { limit: 100 });
  const receivedStats = useQuery(api.gateway.getReceivedPaymentStats);
  const providerKeys = useQuery(api.apiKeys.listApiKeys, { type: "provider" });
  
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  const payments = activeTab === "sent" ? sentPayments : receivedPayments;
  const stats = activeTab === "sent" ? sentStats : receivedStats;

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
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
            <CurrencyIcon className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Payments</h1>
            <p className="text-sm text-[#888] mt-1">
              Track payments sent and received by your workspace
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("sent")}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === "sent"
                ? "bg-white text-black"
                : "text-[#888] hover:text-white hover:bg-[#1a1a1a]"
            }`}
          >
            <span className="flex items-center gap-2">
              <ArrowUpIcon className="w-4 h-4" />
              Payments Sent
            </span>
          </button>
          <button
            onClick={() => setActiveTab("received")}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === "received"
                ? "bg-white text-black"
                : "text-[#888] hover:text-white hover:bg-[#1a1a1a]"
            }`}
          >
            <span className="flex items-center gap-2">
              <ArrowDownIcon className="w-4 h-4" />
              Payments Received
            </span>
          </button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-[#111] rounded-xl border border-[#333] p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-[#888]">
                  {activeTab === "sent" ? "Total Spent" : "Total Earned"}
                </p>
                <CurrencyIcon className="w-5 h-5 text-violet-400" />
              </div>
              <p className="text-2xl font-bold text-white">
                {formatMnee(activeTab === "sent" ? (stats as { totalSpent: number }).totalSpent : (stats as { totalEarned: number }).totalEarned)} MNEE
              </p>
              <p className="text-xs text-[#666] mt-1">{stats.settledCount} payments</p>
            </div>

            <div className="bg-[#111] rounded-xl border border-[#333] p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-[#888]">This Month</p>
                <CheckCircleIcon className="w-5 h-5 text-emerald-400" />
              </div>
              <p className="text-2xl font-bold text-white">
                {formatMnee(activeTab === "sent" ? (stats as { monthSpent: number }).monthSpent : (stats as { monthEarned: number }).monthEarned)} MNEE
              </p>
              <p className="text-xs text-[#666] mt-1">
                {(stats as { monthPayments: number }).monthPayments} payments
              </p>
            </div>

            <div className="bg-[#111] rounded-xl border border-[#333] p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-[#888]">Today</p>
                <ClockIcon className="w-5 h-5 text-amber-400" />
              </div>
              <p className="text-2xl font-bold text-white">
                {formatMnee(activeTab === "sent" ? (stats as { todaySpent: number }).todaySpent : (stats as { todayEarned: number }).todayEarned)} MNEE
              </p>
              <p className="text-xs text-[#666] mt-1">
                {(stats as { todayPayments: number }).todayPayments} payments
              </p>
            </div>

            <div className="bg-[#111] rounded-xl border border-[#333] p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-[#888]">Status</p>
                <NetworkIcon className="w-5 h-5 text-[#666]" />
              </div>
              <div className="flex gap-2 mt-2 flex-wrap">
                <span className="text-xs text-emerald-400">{stats.settledCount} ✓</span>
                <span className="text-xs text-amber-400">{stats.pendingCount} ⏳</span>
                <span className="text-xs text-red-400">{stats.failedCount} ✗</span>
              </div>
            </div>
          </div>
        )}

        {/* Provider API Keys Info (for received tab) */}
        {activeTab === "received" && (
          <div className="bg-[#111] rounded-xl border border-amber-900/50 p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                <NetworkIcon className="w-5 h-5 text-amber-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-white mb-1">Provider API Keys</h3>
                {providerKeys && providerKeys.length > 0 ? (
                  <div className="space-y-2">
                    {providerKeys.map((key) => (
                      <div key={key._id} className="flex items-center gap-2 text-sm">
                        <span className="text-xs text-white font-medium">{key.name}</span>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          key.receivingNetwork === "mainnet"
                            ? "bg-emerald-900/50 text-emerald-400"
                            : "bg-amber-900/50 text-amber-400"
                        }`}>
                          {key.receivingNetwork}
                        </span>
                        {key.receivingAddress && (
                          <code className="font-mono text-xs text-[#888]">
                            {key.receivingAddress.substring(0, 12)}...{key.receivingAddress.substring(key.receivingAddress.length - 8)}
                          </code>
                        )}
                      </div>
                    ))}
                    <p className="text-xs text-[#666] mt-2">
                      Tracking payments received to these provider API keys.
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-[#888] mb-2">
                      No provider API keys configured. Create a provider API key with a receiving address to track payments as an API provider.
                    </p>
                    <a
                      href="/workspace/agents"
                      className="text-xs text-amber-400 hover:text-amber-300 underline"
                    >
                      Create Provider API Key →
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Payments Table */}
        <div className="bg-[#111] rounded-xl border border-[#333] p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-white">
                {activeTab === "sent" ? "Payments Sent" : "Payments Received"}
              </h2>
              <p className="text-sm text-[#888]">
                {activeTab === "sent"
                  ? "All payments made by your workspace agents"
                  : "All payments received to your provider addresses"}
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
                  : "Payments will appear here once your agents make transactions"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#333]">
                    <th className="text-left text-xs font-medium text-[#888] pb-3 px-2">Status</th>
                    <th className="text-left text-xs font-medium text-[#888] pb-3 px-2">Amount</th>
                    <th className="text-left text-xs font-medium text-[#888] pb-3 px-2">
                      {activeTab === "sent" ? "Agent" : "From"}
                    </th>
                    <th className="text-left text-xs font-medium text-[#888] pb-3 px-2">Provider</th>
                    <th className="text-left text-xs font-medium text-[#888] pb-3 px-2">Network</th>
                    <th className="text-left text-xs font-medium text-[#888] pb-3 px-2">Date</th>
                    <th className="text-left text-xs font-medium text-[#888] pb-3 px-2">Details</th>
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
                        <div className="text-sm text-white">
                          {activeTab === "sent"
                            ? (payment.apiKeyName || "Unknown")
                            : ((payment as { payerWorkspaceName?: string }).payerWorkspaceName || "Unknown")}
                        </div>
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
                          {payment.invoiceId.substring(0, 16)}...
                        </div>
                        {payment.txHash && (
                          <div className="text-xs font-mono text-[#666] max-w-xs truncate" title={payment.txHash}>
                            {payment.txHash.substring(0, 16)}...
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
    </div>
  );
}

// ============================================
// Icons
// ============================================

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

function NetworkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
    </svg>
  );
}

function ArrowUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
    </svg>
  );
}

function ArrowDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
    </svg>
  );
}

