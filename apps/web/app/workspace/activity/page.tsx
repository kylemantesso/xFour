"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { WorkspaceGuard } from "../../../components/WorkspaceGuard";
import { BackToDashboard } from "../../../components/BackToDashboard";

// Status filter type
type StatusFilter = "all" | "settled" | "allowed" | "denied" | "failed";

const ITEMS_PER_PAGE = 15;

export default function ActivityPage() {
  return (
    <WorkspaceGuard>
      <ActivityContent />
    </WorkspaceGuard>
  );
}

function ActivityContent() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedNetwork, setSelectedNetwork] = useState<"sandbox" | "mainnet">("sandbox");
  const payments = useQuery(api.payments.listPayments, { limit: 100 });
  const receivedStats = useQuery(api.gateway.getReceivedPaymentStats);
  const stats = useQuery(api.payments.getPaymentStats);

  const filteredPayments = payments?.filter((p) => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (p.network !== selectedNetwork) return false;
    return true;
  });

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);

  // Pagination calculations
  const totalItems = filteredPayments?.length ?? 0;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedPayments = filteredPayments?.slice(startIndex, endIndex);

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

        {/* Network Toggle Switch */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <span className={`text-sm font-medium transition-colors ${
            selectedNetwork === "sandbox" ? "text-amber-400" : "text-[#666]"
          }`}>
            Sandbox
          </span>
          <button
            onClick={() => setSelectedNetwork(selectedNetwork === "sandbox" ? "mainnet" : "sandbox")}
            className="relative w-14 h-7 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0a0a0a] focus:ring-emerald-500"
            style={{
              backgroundColor: selectedNetwork === "sandbox" ? "rgb(245 158 11 / 0.3)" : "rgb(16 185 129 / 0.3)",
            }}
          >
            <span
              className="absolute top-0.5 left-0.5 w-6 h-6 rounded-full shadow-lg transform transition-all duration-300 flex items-center justify-center"
              style={{
                transform: selectedNetwork === "mainnet" ? "translateX(28px)" : "translateX(0)",
                backgroundColor: selectedNetwork === "sandbox" ? "rgb(245 158 11)" : "rgb(16 185 129)",
              }}
            >
              {selectedNetwork === "sandbox" ? (
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.672 1.911a1 1 0 10-1.932.518l.259.966a1 1 0 001.932-.518l-.26-.966zM2.429 4.74a1 1 0 10-.517 1.932l.966.259a1 1 0 00.517-1.932l-.966-.26zm8.814-.569a1 1 0 00-1.415-1.414l-.707.707a1 1 0 101.415 1.415l.707-.708zm-7.071 7.072l.707-.707A1 1 0 003.465 9.12l-.708.707a1 1 0 001.415 1.415zm3.2-5.171a1 1 0 00-1.3 1.3l4 10a1 1 0 001.823.075l1.38-2.759 3.018 3.02a1 1 0 001.414-1.415l-3.019-3.02 2.76-1.379a1 1 0 00-.076-1.822l-10-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
            </span>
          </button>
          <span className={`text-sm font-medium transition-colors ${
            selectedNetwork === "mainnet" ? "text-emerald-400" : "text-[#666]"
          }`}>
            Mainnet
          </span>
        </div>

        {/* Real-time Activity Chart */}
        <ActivityTimelineChart network={selectedNetwork} />

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Payments Sent"
            value={stats?.totalPayments ?? 0}
            loading={!stats}
          />
          <StatCard
            label="Payments Received"
            value={receivedStats?.totalPayments ?? 0}
            loading={!receivedStats}
            accent="violet"
          />
          <StatCard
            label="Volume Sent"
            value={stats?.totalSpent ?? 0}
            suffix=" MNEE"
            loading={!stats}
            accent="emerald"
          />
          <StatCard
            label="Volume Received"
            value={receivedStats?.totalEarned ?? 0}
            suffix=" MNEE"
            loading={!receivedStats}
            accent="violet"
          />
        </div>

        {/* Network Spend Breakdown */}
        {stats && stats.spendByNetwork && stats.spendByNetwork.length > 0 && (
          <div className="bg-[#111] border border-[#333] rounded-xl p-4 mb-6">
            <h3 className="text-sm font-medium text-[#888] mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Spend by Network
            </h3>
            <div className="space-y-2">
              {stats.spendByNetwork.map((network) => (
                <div key={network.network} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-amber-900/50 flex items-center justify-center">
                      <span className="text-xs font-bold text-amber-400">
                        {network.network === "mainnet" ? "M" : "S"}
                      </span>
                    </div>
                    <span className="text-sm text-white">{network.network === "mainnet" ? "MNEE Mainnet" : "MNEE Sandbox"}</span>
                    <span className="text-xs text-[#666]">({network.count} txns)</span>
                  </div>
                  <span className="text-sm font-medium text-white">
                    {network.amount.toLocaleString(undefined, { maximumFractionDigits: 4 })} MNEE
                  </span>
                </div>
              ))}
            </div>
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
          {!paginatedPayments ? (
            <LoadingSkeleton />
          ) : paginatedPayments.length === 0 ? (
            <EmptyState network={selectedNetwork} />
          ) : (
            <div className="divide-y divide-[#222]">
              {paginatedPayments.map((payment) => (
                <PaymentRow key={payment._id} payment={payment} />
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {paginatedPayments && totalItems > ITEMS_PER_PAGE && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              startIndex={startIndex}
              endIndex={Math.min(endIndex, totalItems)}
              onPageChange={setCurrentPage}
            />
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
  amount: number; // Amount in MNEE
  network: "sandbox" | "mainnet"; // MNEE network
  status: string;
  createdAt: number;
  txHash?: string;
  payTo: string;
  denialReason?: string;
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

  const formatDenialReason = (reason: string | undefined): string => {
    if (!reason) return "";
    const reasonMap: Record<string, string> = {
      AGENT_POLICY_INACTIVE: "Agent policy is inactive",
      AGENT_MAX_REQUEST_EXCEEDED: "Request exceeds max per-request limit",
      AGENT_PROVIDER_NOT_ALLOWED: "Provider not allowed by agent policy",
      AGENT_DAILY_LIMIT_EXCEEDED: "Daily spending limit exceeded",
      AGENT_MONTHLY_LIMIT_EXCEEDED: "Monthly spending limit exceeded",
    };
    return reasonMap[reason] || reason.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
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
            <p className="text-sm text-white font-medium">
              {payment.amount.toLocaleString(undefined, { maximumFractionDigits: 5 })} MNEE
            </p>
            <p className="text-xs text-[#666] capitalize">
              {payment.network}
            </p>
          </div>
        </div>

        {/* Status */}
        <div className="col-span-2 flex items-center gap-2">
          <span
            className={`px-2 py-1 text-xs font-medium rounded-full ${status.bg} ${status.color}`}
          >
            {status.label}
          </span>
          {payment.status === "denied" && payment.denialReason && (
            <span className="text-xs text-red-400 truncate" title={formatDenialReason(payment.denialReason)}>
              {formatDenialReason(payment.denialReason)}
            </span>
          )}
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
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-sm text-white font-medium">
              {payment.amount.toLocaleString(undefined, { maximumFractionDigits: 5 })} MNEE
            </p>
            <span
              className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full ${status.bg} ${status.color}`}
            >
              {status.label}
            </span>
            {payment.status === "denied" && payment.denialReason && (
              <p className="text-xs text-red-400 mt-1" title={formatDenialReason(payment.denialReason)}>
                {formatDenialReason(payment.denialReason)}
              </p>
            )}
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
              <p className="text-white capitalize">{payment.network}</p>
            </div>

            <div>
              <p className="text-[#666] mb-1">Created</p>
              <p className="text-white">
                {new Date(payment.createdAt).toLocaleString()}
              </p>
            </div>

            {payment.txHash && (
              <div className="col-span-1 sm:col-span-2 md:col-span-2">
                <p className="text-[#666] mb-1">Transaction</p>
                <p className="text-violet-400 font-mono text-xs break-all">
                  {payment.txHash}
                </p>
              </div>
            )}

            {/* Denial Reason */}
            {payment.status === "denied" && payment.denialReason && (
              <div className="col-span-1 sm:col-span-2 md:col-span-4">
                <p className="text-[#666] mb-1">Denial Reason</p>
                <div className="bg-red-900/20 border border-red-900/50 rounded-lg p-3">
                  <p className="text-sm text-red-400 font-medium">{formatDenialReason(payment.denialReason)}</p>
                  <p className="text-xs text-red-400/60 mt-1 font-mono">{payment.denialReason}</p>
                </div>
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
  accent?: "emerald" | "violet" | "amber" | "red";
}) {
  const accentColors = {
    emerald: "border-emerald-900/50",
    violet: "border-violet-900/50",
    amber: "border-amber-900/50",
    red: "border-red-900/50",
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

function EmptyState({ network }: { network: "sandbox" | "mainnet" }) {
  return (
    <div className="px-6 py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-[#1a1a1a] flex items-center justify-center mx-auto mb-4">
        <ActivityIcon className="w-8 h-8 text-[#666]" />
      </div>
      <h3 className="text-lg font-medium text-white mb-2">
        0 payments on {network === "sandbox" ? "Sandbox" : "Mainnet"}
      </h3>
      <p className="text-sm text-[#888] max-w-sm mx-auto">
        When your agents make payments through the gateway on {network === "sandbox" ? "sandbox" : "mainnet"}, they&apos;ll appear here.
      </p>
    </div>
  );
}

function Pagination({
  currentPage,
  totalPages,
  totalItems,
  startIndex,
  endIndex,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  startIndex: number;
  endIndex: number;
  onPageChange: (page: number) => void;
}) {
  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    const showEllipsisStart = currentPage > 3;
    const showEllipsisEnd = currentPage < totalPages - 2;

    if (totalPages <= 7) {
      // Show all pages if 7 or fewer
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (showEllipsisStart) {
        pages.push("ellipsis");
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) {
          pages.push(i);
        }
      }

      if (showEllipsisEnd) {
        pages.push("ellipsis");
      }

      // Always show last page
      if (!pages.includes(totalPages)) {
        pages.push(totalPages);
      }
    }

    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-[#333] bg-[#0a0a0a]">
      {/* Results info */}
      <div className="text-sm text-[#666]">
        Showing <span className="text-[#888] font-medium">{startIndex + 1}</span> to{" "}
        <span className="text-[#888] font-medium">{endIndex}</span> of{" "}
        <span className="text-[#888] font-medium">{totalItems}</span> results
      </div>

      {/* Page controls */}
      <div className="flex items-center gap-1">
        {/* Previous button */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 rounded-lg text-[#888] hover:text-white hover:bg-[#1a1a1a] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[#888] transition-colors"
          aria-label="Previous page"
        >
          <ChevronLeftIcon className="w-4 h-4" />
        </button>

        {/* Page numbers */}
        <div className="flex items-center gap-1">
          {getPageNumbers().map((page, idx) =>
            page === "ellipsis" ? (
              <span key={`ellipsis-${idx}`} className="px-2 text-[#666]">
                …
              </span>
            ) : (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={`min-w-[36px] h-9 px-3 rounded-lg text-sm font-medium transition-colors ${
                  currentPage === page
                    ? "bg-white text-black"
                    : "text-[#888] hover:text-white hover:bg-[#1a1a1a]"
                }`}
              >
                {page}
              </button>
            )
          )}
        </div>

        {/* Next button */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-lg text-[#888] hover:text-white hover:bg-[#1a1a1a] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[#888] transition-colors"
          aria-label="Next page"
        >
          <ChevronRightIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ============================================
// Real-time Activity Timeline Chart
// ============================================

function ActivityTimelineChart({ network }: { network: "sandbox" | "mainnet" }) {
  const timeline = useQuery(api.payments.getActivityTimeline, { windowSeconds: 60, network });
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [newEventIds, setNewEventIds] = useState<Set<string>>(new Set());
  const prevEventIdsRef = useRef<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  
  const isLoading = timeline === undefined;
  const windowSeconds = 60;
  const windowMs = windowSeconds * 1000;

  // Update current time frequently for smooth sliding animation
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 50); // Update every 50ms for smooth animation
    return () => clearInterval(interval);
  }, []);

  // Detect new events and trigger entrance animation
  useEffect(() => {
    if (!timeline?.events) return;

    const currentIds = new Set(timeline.events.map((e) => e.id));
    const newIds = new Set<string>();

    // Find events that weren't in the previous set
    currentIds.forEach((id) => {
      if (!prevEventIdsRef.current.has(id)) {
        newIds.add(id);
      }
    });

    if (newIds.size > 0) {
      setNewEventIds((prev) => new Set([...prev, ...newIds]));
      
      // Clear the "new" status after animation completes
      setTimeout(() => {
        setNewEventIds((prev) => {
          const next = new Set(prev);
          newIds.forEach((id) => next.delete(id));
          return next;
        });
      }, 800);
    }

    prevEventIdsRef.current = currentIds;
  }, [timeline]);

  // Get status color
  const getStatusColor = (status: string) => {
    if (status === "settled" || status === "completed") {
      return { bar: "from-emerald-500 to-emerald-300", glow: "bg-emerald-500" };
    }
    if (status === "allowed" || status === "pending") {
      return { bar: "from-blue-500 to-blue-300", glow: "bg-blue-500" };
    }
    if (status === "denied" || status === "failed") {
      return { bar: "from-red-500 to-red-300", glow: "bg-red-500" };
    }
    return { bar: "from-gray-500 to-gray-300", glow: "bg-gray-500" };
  };

  // Calculate position (0% = left/old, 100% = right/now)
  const getPosition = (timestamp: number) => {
    const age = currentTime - timestamp;
    const position = 100 - (age / windowMs) * 100;
    return Math.max(0, Math.min(100, position));
  };

  // Calculate height based on amount
  const maxAmount = timeline?.maxAmount ?? 1;
  const getHeight = (amount: number) => {
    const normalized = amount / maxAmount;
    return Math.max(15, normalized * 100); // Min 15% height for visibility
  };

  const events = timeline?.events ?? [];
  const stats = timeline?.stats ?? { total: 0, settled: 0, pending: 0, denied: 0 };

  return (
    <div className="bg-[#111] border border-[#333] rounded-xl p-6 mb-6 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={`w-3 h-3 rounded-full ${isLoading ? "bg-yellow-500" : "bg-emerald-500"} animate-pulse`} />
            <div className={`absolute inset-0 w-3 h-3 rounded-full ${isLoading ? "bg-yellow-500" : "bg-emerald-500"} animate-ping opacity-75`} />
          </div>
          <h3 className="text-sm font-medium text-white">Live Activity</h3>
          <span className="text-xs text-[#666]">
            {isLoading ? "Connecting..." : "60 second window"}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs text-[#888]">Settled ({stats.settled})</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-xs text-[#888]">Pending ({stats.pending})</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-xs text-[#888]">Denied ({stats.denied})</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div ref={containerRef} className="relative h-32 bg-[#0a0a0a] rounded-lg overflow-hidden">
        {/* Grid lines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-30">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="border-b border-[#333] w-full" />
          ))}
        </div>

        {/* Vertical time markers */}
        <div className="absolute inset-0 flex justify-between pointer-events-none opacity-20">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="border-l border-[#333] h-full" />
          ))}
        </div>

        {/* "Now" edge glow */}
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-emerald-500/10 to-transparent pointer-events-none" />

        {/* Events sliding across */}
        {events.map((event) => {
          const position = getPosition(event.timestamp);
          const height = getHeight(event.amount);
          const colors = getStatusColor(event.status);
          const isNew = newEventIds.has(event.id);
          const secondsAgo = Math.round((currentTime - event.timestamp) / 1000);

          // Don't render if off-screen
          if (position <= 0) return null;

          return (
            <div
              key={event.id}
              className="absolute bottom-0 group"
              style={{
                left: `${position}%`,
                transform: "translateX(-50%)",
                transition: "left 50ms linear",
              }}
            >
              {/* Glow effect for new events */}
              {isNew && (
                <div
                  className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-full ${colors.glow} opacity-40 blur-md animate-pulse`}
                  style={{ height: `${height + 20}%` }}
                />
              )}

              {/* The bar itself */}
              <div
                className={`
                  w-2 rounded-t-full bg-gradient-to-t ${colors.bar}
                  transition-all duration-200 ease-out
                  ${isNew ? "animate-activity-bar-pop" : ""}
                `}
                style={{
                  height: `${height}%`,
                  minHeight: "12px",
                  boxShadow: isNew ? `0 0 12px 2px currentColor` : undefined,
                }}
              />

              {/* Peak dot for new events */}
              {isNew && (
                <div className={`absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 ${colors.glow} rounded-full animate-ping`} />
              )}

              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                <div className="bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-xs whitespace-nowrap shadow-xl">
                  <div className="text-white font-medium">{event.amount.toFixed(4)}</div>
                  <div className="text-[#888] capitalize">{event.status}</div>
                  <div className="text-[#666]">{secondsAgo}s ago</div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Empty state */}
        {events.length === 0 && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-[#666] text-sm">Waiting for transactions...</div>
          </div>
        )}
      </div>

      {/* Time axis */}
      <div className="flex justify-between mt-2 text-xs text-[#666]">
        <span>60s ago</span>
        <span>45s</span>
        <span>30s</span>
        <span>15s</span>
        <span className="text-emerald-500 font-medium">now</span>
      </div>

      {/* Stats footer */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#222]">
        <div className="text-sm">
          <span className="text-[#888]">Transactions in window:</span>
          <span className="text-white font-medium ml-2">{stats.total}</span>
        </div>
        <div className="text-sm">
          <span className="text-[#888]">Max amount:</span>
          <span className="text-white font-medium ml-2">{maxAmount.toFixed(4)}</span>
        </div>
      </div>
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

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 19l-7-7 7-7"
      />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5l7 7-7 7"
      />
    </svg>
  );
}
