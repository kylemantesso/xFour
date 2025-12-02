"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { WorkspaceGuard } from "../../../components/WorkspaceGuard";
import { BackToDashboard } from "../../../components/BackToDashboard";

// Status filter type
type StatusFilter = "all" | "settled" | "allowed" | "denied" | "failed";

export default function ActivityPage() {
  return (
    <WorkspaceGuard>
      <ActivityContent />
    </WorkspaceGuard>
  );
}

function ActivityContent() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const payments = useQuery(api.payments.listPayments, { limit: 100 });
  const stats = useQuery(api.payments.getPaymentStats);

  const filteredPayments = payments?.filter((p) => {
    if (statusFilter === "all") return true;
    return p.status === statusFilter;
  });

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Back link */}
        <BackToDashboard />

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
              <ActivityIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Activity</h1>
              <p className="text-sm text-[#888] mt-1">
                View all payment transactions and gateway activity
              </p>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Total Payments"
            value={stats?.totalPayments ?? 0}
            loading={!stats}
          />
          <StatCard
            label="Settled"
            value={stats?.settledCount ?? 0}
            loading={!stats}
            accent="emerald"
          />
          <StatCard
            label="Last 24h"
            value={stats?.recentPayments ?? 0}
            subtitle="payments"
            loading={!stats}
          />
          <StatCard
            label="Swaps"
            value={stats?.swapCount ?? 0}
            subtitle="conversions"
            loading={!stats}
            accent="violet"
          />
        </div>

        {/* Token Spend Breakdown */}
        {stats && (stats.spendByToken?.length > 0 || stats.paidByToken?.length > 0) && (
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            {/* Spent from Treasury */}
            {stats.spendByToken && stats.spendByToken.length > 0 && (
              <div className="bg-[#111] border border-[#333] rounded-xl p-4">
                <h3 className="text-sm font-medium text-[#888] mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Spent from Treasury
                </h3>
                <div className="space-y-2">
                  {stats.spendByToken.map((token) => (
                    <div key={token.address} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-amber-900/50 flex items-center justify-center">
                          <span className="text-xs font-bold text-amber-400">
                            {token.symbol.slice(0, 2)}
                          </span>
                        </div>
                        <span className="text-sm text-white">{token.symbol}</span>
                        <span className="text-xs text-[#666]">({token.count} txns)</span>
                      </div>
                      <span className="text-sm font-medium text-white">
                        {token.amount.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Paid to Providers */}
            {stats.paidByToken && stats.paidByToken.length > 0 && (
              <div className="bg-[#111] border border-[#333] rounded-xl p-4">
                <h3 className="text-sm font-medium text-[#888] mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Paid to Providers
                </h3>
                <div className="space-y-2">
                  {stats.paidByToken.map((token) => (
                    <div key={token.address} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-emerald-900/50 flex items-center justify-center">
                          <span className="text-xs font-bold text-emerald-400">
                            {token.symbol.slice(0, 2)}
                          </span>
                        </div>
                        <span className="text-sm text-white">{token.symbol}</span>
                        <span className="text-xs text-[#666]">({token.count} txns)</span>
                      </div>
                      <span className="text-sm font-medium text-white">
                        {token.amount.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-2 mb-6">
          <span className="text-sm text-[#888]">Filter:</span>
          <FilterButton
            active={statusFilter === "all"}
            onClick={() => setStatusFilter("all")}
          >
            All
          </FilterButton>
          <FilterButton
            active={statusFilter === "settled"}
            onClick={() => setStatusFilter("settled")}
          >
            Settled
          </FilterButton>
          <FilterButton
            active={statusFilter === "allowed"}
            onClick={() => setStatusFilter("allowed")}
          >
            Pending
          </FilterButton>
          <FilterButton
            active={statusFilter === "denied"}
            onClick={() => setStatusFilter("denied")}
          >
            Denied
          </FilterButton>
        </div>

        {/* Payments List */}
        <div className="bg-[#111] border border-[#333] rounded-xl overflow-hidden">
          {/* Table Header - Hidden on mobile */}
          <div className="hidden md:grid md:grid-cols-12 gap-4 px-6 py-3 border-b border-[#333] text-xs font-medium text-[#888] uppercase tracking-wider">
            <div className="col-span-3">Invoice</div>
            <div className="col-span-2">Agent</div>
            <div className="col-span-2">Provider</div>
            <div className="col-span-2 text-right">Amount</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-1 text-right">Time</div>
          </div>

          {/* Table Body */}
          {!filteredPayments ? (
            <LoadingSkeleton />
          ) : filteredPayments.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="divide-y divide-[#222]">
              {filteredPayments.map((payment) => (
                <PaymentRow key={payment._id} payment={payment} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface PaymentData {
  _id: string;
  invoiceId: string;
  apiKeyName: string;
  providerName: string;
  providerHost: string;
  originalAmount: number;
  originalCurrency: string;
  originalNetwork: string;
  treasuryAmount: number;
  status: string;
  createdAt: number;
  txHash?: string;
  payTo: string;
  // Token info
  paymentToken?: string;
  treasuryTokenSymbol: string;
  paidTokenSymbol: string;
  hadSwap: boolean;
  // Swap details
  swapTxHash?: string;
  swapSellAmount?: number;
  swapSellToken?: string;
  swapBuyAmount?: number;
  swapBuyToken?: string;
  swapFee?: number;
}

function PaymentRow({ payment }: { payment: PaymentData }) {
  const [expanded, setExpanded] = useState(false);

  const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
    settled: { color: "text-emerald-400", bg: "bg-emerald-900/30", label: "Settled" },
    allowed: { color: "text-blue-400", bg: "bg-blue-900/30", label: "Pending" },
    denied: { color: "text-red-400", bg: "bg-red-900/30", label: "Denied" },
    failed: { color: "text-red-400", bg: "bg-red-900/30", label: "Failed" },
    pending: { color: "text-yellow-400", bg: "bg-yellow-900/30", label: "Processing" },
    completed: { color: "text-emerald-400", bg: "bg-emerald-900/30", label: "Completed" },
    refunded: { color: "text-orange-400", bg: "bg-orange-900/30", label: "Refunded" },
  };

  const status = statusConfig[payment.status] ?? {
    color: "text-[#888]",
    bg: "bg-[#1a1a1a]",
    label: payment.status,
  };

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <>
      {/* Desktop Row */}
      <div
        className="hidden md:grid md:grid-cols-12 gap-4 px-6 py-4 hover:bg-[#1a1a1a] cursor-pointer transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Invoice ID */}
        <div className="col-span-3 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#1a1a1a] flex items-center justify-center flex-shrink-0">
            <ReceiptIcon className="w-4 h-4 text-[#666]" />
          </div>
          <div className="min-w-0">
            <p className="text-sm text-white font-mono truncate">
              {payment.invoiceId.slice(0, 20)}...
            </p>
            {payment.hadSwap && (
              <span className="text-xs text-violet-400 flex items-center gap-1">
                <SwapIcon className="w-3 h-3" />
                Swapped
              </span>
            )}
          </div>
        </div>

        {/* Agent */}
        <div className="col-span-2 flex items-center">
          <p className="text-sm text-[#888] truncate">{payment.apiKeyName}</p>
        </div>

        {/* Provider */}
        <div className="col-span-2 flex items-center">
          <p className="text-sm text-[#888] truncate">{payment.providerName}</p>
        </div>

        {/* Amount */}
        <div className="col-span-2 flex items-center justify-end">
          <div className="text-right">
            {payment.hadSwap ? (
              <>
                <p className="text-sm text-white font-medium">
                  {payment.originalAmount.toLocaleString(undefined, { maximumFractionDigits: 4 })} {payment.originalCurrency}
                </p>
                <p className="text-xs text-amber-400 flex items-center justify-end gap-1">
                  <span>from</span>
                  {payment.swapSellAmount?.toLocaleString(undefined, { maximumFractionDigits: 4 })} {payment.treasuryTokenSymbol}
                </p>
              </>
            ) : (
              <>
                <p className="text-sm text-white font-medium">
                  {payment.treasuryAmount.toLocaleString(undefined, { maximumFractionDigits: 4 })} {payment.treasuryTokenSymbol}
                </p>
                <p className="text-xs text-[#666]">
                  {payment.originalAmount} {payment.originalCurrency}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Status */}
        <div className="col-span-2 flex items-center">
          <span
            className={`px-2 py-1 text-xs font-medium rounded-full ${status.bg} ${status.color}`}
          >
            {status.label}
          </span>
        </div>

        {/* Time */}
        <div className="col-span-1 flex items-center justify-end">
          <span className="text-sm text-[#666]">{formatTime(payment.createdAt)}</span>
        </div>
      </div>

      {/* Mobile Row */}
      <div
        className="md:hidden px-4 py-4 hover:bg-[#1a1a1a] cursor-pointer transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-[#1a1a1a] flex items-center justify-center flex-shrink-0">
              <ReceiptIcon className="w-5 h-5 text-[#666]" />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-white font-mono truncate">
                {payment.invoiceId.slice(0, 16)}...
              </p>
              <p className="text-xs text-[#666] mt-0.5">{payment.apiKeyName}</p>
              <p className="text-xs text-[#666]">{payment.providerName}</p>
              {payment.hadSwap && (
                <span className="text-xs text-violet-400 flex items-center gap-1 mt-1">
                  <SwapIcon className="w-3 h-3" />
                  Swapped
                </span>
              )}
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            {payment.hadSwap ? (
              <>
                <p className="text-sm text-white font-medium">
                  {payment.originalAmount.toLocaleString(undefined, { maximumFractionDigits: 4 })} {payment.originalCurrency}
                </p>
                <p className="text-xs text-amber-400">
                  from {payment.swapSellAmount?.toLocaleString(undefined, { maximumFractionDigits: 2 })} {payment.treasuryTokenSymbol}
                </p>
              </>
            ) : (
              <p className="text-sm text-white font-medium">
                {payment.treasuryAmount.toLocaleString(undefined, { maximumFractionDigits: 4 })} {payment.treasuryTokenSymbol}
              </p>
            )}
            <span
              className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full ${status.bg} ${status.color}`}
            >
              {status.label}
            </span>
            <p className="text-xs text-[#666] mt-1">{formatTime(payment.createdAt)}</p>
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="px-4 md:px-6 py-4 bg-[#0a0a0a] border-t border-[#222]">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-[#666] mb-1">Invoice ID</p>
              <p className="text-white font-mono text-xs break-all">
                {payment.invoiceId}
              </p>
            </div>
            <div>
              <p className="text-[#666] mb-1">Pay To</p>
              <p className="text-white font-mono text-xs break-all">
                {payment.payTo}
              </p>
            </div>
            <div>
              <p className="text-[#666] mb-1">Provider Host</p>
              <p className="text-white">{payment.providerHost}</p>
            </div>
            <div>
              <p className="text-[#666] mb-1">Network</p>
              <p className="text-white">{payment.originalNetwork}</p>
            </div>

            {/* Swap Details */}
            {payment.hadSwap && (
              <>
                <div className="col-span-1 sm:col-span-2 md:col-span-4 border-t border-[#333] pt-4 mt-2">
                  <h4 className="text-xs font-medium text-violet-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <SwapIcon className="w-4 h-4" />
                    Token Swap Details
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-amber-900/20 border border-amber-900/50 rounded-lg p-3">
                      <p className="text-xs text-amber-400 mb-1">Sold from Treasury</p>
                      <p className="text-white font-medium">
                        {payment.swapSellAmount?.toLocaleString(undefined, { maximumFractionDigits: 6 })} {payment.treasuryTokenSymbol}
                      </p>
                    </div>
                    <div className="flex items-center justify-center">
                      <ArrowRightIcon className="w-6 h-6 text-[#666]" />
                    </div>
                    <div className="bg-emerald-900/20 border border-emerald-900/50 rounded-lg p-3">
                      <p className="text-xs text-emerald-400 mb-1">Paid to Provider</p>
                      <p className="text-white font-medium">
                        {payment.swapBuyAmount?.toLocaleString(undefined, { maximumFractionDigits: 6 })} {payment.paidTokenSymbol}
                      </p>
                    </div>
                  </div>
                  {payment.swapFee !== undefined && payment.swapFee > 0 && (
                    <p className="text-xs text-[#666] mt-2">
                      Swap fee: {payment.swapFee.toLocaleString(undefined, { maximumFractionDigits: 6 })} {payment.treasuryTokenSymbol}
                    </p>
                  )}
                </div>
              </>
            )}

            <div>
              <p className="text-[#666] mb-1">Created</p>
              <p className="text-white">
                {new Date(payment.createdAt).toLocaleString()}
              </p>
            </div>

            {payment.txHash && (
              <div className="col-span-1 sm:col-span-2 md:col-span-3">
                <p className="text-[#666] mb-1">Payment Transaction</p>
                <a
                  href={`https://basescan.org/tx/${payment.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-violet-400 hover:text-violet-300 font-mono text-xs break-all"
                >
                  {payment.txHash}
                </a>
              </div>
            )}

            {payment.swapTxHash && (
              <div className="col-span-1 sm:col-span-2 md:col-span-4">
                <p className="text-[#666] mb-1">Swap Transaction</p>
                <a
                  href={`https://basescan.org/tx/${payment.swapTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-violet-400 hover:text-violet-300 font-mono text-xs break-all"
                >
                  {payment.swapTxHash}
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function StatCard({
  label,
  value,
  suffix,
  subtitle,
  loading,
  accent,
}: {
  label: string;
  value: number;
  suffix?: string;
  subtitle?: string;
  loading?: boolean;
  accent?: "emerald" | "violet" | "amber";
}) {
  const accentColors = {
    emerald: "border-emerald-900/50",
    violet: "border-violet-900/50",
    amber: "border-amber-900/50",
  };

  return (
    <div className={`bg-[#111] border rounded-xl p-4 ${accent ? accentColors[accent] : "border-[#333]"}`}>
      <p className="text-xs text-[#666] uppercase tracking-wider mb-1">{label}</p>
      {loading ? (
        <div className="h-7 w-20 bg-[#1a1a1a] rounded animate-pulse" />
      ) : (
        <p className="text-xl font-bold text-white">
          {typeof value === "number" && value % 1 !== 0
            ? value.toFixed(4)
            : value}
          {suffix && <span className="text-sm text-[#888]">{suffix}</span>}
          {subtitle && <span className="text-sm text-[#888] ml-1">{subtitle}</span>}
        </p>
      )}
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
        active
          ? "bg-white text-black"
          : "bg-[#1a1a1a] text-[#888] hover:text-white hover:bg-[#222]"
      }`}
    >
      {children}
    </button>
  );
}

function LoadingSkeleton() {
  return (
    <div className="divide-y divide-[#222]">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="px-4 md:px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-[#1a1a1a] rounded-lg animate-pulse flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="h-4 w-48 max-w-full bg-[#1a1a1a] rounded animate-pulse" />
              <div className="h-3 w-32 max-w-full bg-[#1a1a1a] rounded animate-pulse mt-2" />
            </div>
            <div className="hidden md:block flex-shrink-0">
              <div className="h-4 w-16 bg-[#1a1a1a] rounded animate-pulse" />
            </div>
            <div className="flex-shrink-0">
              <div className="h-6 w-16 bg-[#1a1a1a] rounded-full animate-pulse" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="px-6 py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-[#1a1a1a] flex items-center justify-center mx-auto mb-4">
        <ActivityIcon className="w-8 h-8 text-[#666]" />
      </div>
      <h3 className="text-lg font-medium text-white mb-2">No payments yet</h3>
      <p className="text-sm text-[#888] max-w-sm mx-auto">
        When your agents make payments through the gateway, they&apos;ll appear here.
      </p>
    </div>
  );
}

// Icons
function ActivityIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    </svg>
  );
}

function ReceiptIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z"
      />
    </svg>
  );
}

function SwapIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
      />
    </svg>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M14 5l7 7m0 0l-7 7m7-7H3"
      />
    </svg>
  );
}
