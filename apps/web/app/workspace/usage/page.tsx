"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { WorkspaceGuard } from "../../../components/WorkspaceGuard";
import { BackToDashboard } from "../../../components/BackToDashboard";

type TimeRange = 7 | 14 | 30 | 90;

export default function UsagePage() {
  return (
    <WorkspaceGuard>
      <UsageContent />
    </WorkspaceGuard>
  );
}

function UsageContent() {
  const [timeRange, setTimeRange] = useState<TimeRange>(30);

  const summary = useQuery(api.usage.getUsageSummary, { days: timeRange });
  const usageOverTime = useQuery(api.usage.getUsageOverTime, { days: timeRange });
  const usageByAgent = useQuery(api.usage.getUsageByAgent, { days: timeRange });
  const usageByProvider = useQuery(api.usage.getUsageByProvider, { days: timeRange });

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Back link */}
        <BackToDashboard />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/25">
              <ChartIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Usage Analytics</h1>
              <p className="text-sm text-[#888] mt-1">
                Track spending, monitor agents, and analyze payment patterns
              </p>
            </div>
          </div>

          {/* Time Range Selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#666]">Period:</span>
            {([7, 14, 30, 90] as TimeRange[]).map((days) => (
              <button
                key={days}
                onClick={() => setTimeRange(days)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  timeRange === days
                    ? "bg-white text-black"
                    : "bg-[#1a1a1a] text-[#888] hover:text-white hover:bg-[#222]"
                }`}
              >
                {days}d
              </button>
            ))}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <SummaryCard
            label="Total Spent"
            value={summary?.totalSpent ?? 0}
            format="currency"
            change={summary?.spentChange}
            loading={!summary}
            accent="cyan"
          />
          <SummaryCard
            label="Payments"
            value={summary?.totalPayments ?? 0}
            change={summary?.paymentsChange}
            loading={!summary}
          />
          <SummaryCard
            label="Success Rate"
            value={summary?.successRate ?? 0}
            suffix="%"
            loading={!summary}
            accent={
              (summary?.successRate ?? 0) >= 90
                ? "emerald"
                : (summary?.successRate ?? 0) >= 70
                  ? "amber"
                  : "red"
            }
          />
          <SummaryCard
            label="Avg Payment"
            value={summary?.avgPaymentSize ?? 0}
            format="currency"
            loading={!summary}
          />
        </div>

        {/* Secondary Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <MiniStat
            label="Active Agents"
            value={summary?.uniqueAgents ?? 0}
            icon={<AgentIcon className="w-4 h-4" />}
            loading={!summary}
          />
          <MiniStat
            label="Providers Used"
            value={summary?.uniqueProviders ?? 0}
            icon={<ProviderIcon className="w-4 h-4" />}
            loading={!summary}
          />
          <MiniStat
            label="Settled"
            value={summary?.settledPayments ?? 0}
            icon={<CheckIcon className="w-4 h-4" />}
            loading={!summary}
          />
          <MiniStat
            label="Denied"
            value={summary?.deniedPayments ?? 0}
            icon={<XIcon className="w-4 h-4" />}
            loading={!summary}
          />
        </div>

        {/* Charts Grid */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Spending Over Time */}
          <div className="bg-[#111] border border-[#333] rounded-xl p-6">
            <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-500" />
              Spending Over Time
            </h3>
            {!usageOverTime ? (
              <ChartSkeleton />
            ) : usageOverTime.length === 0 ? (
              <EmptyChart message="No payment data yet" />
            ) : (
              <SpendingChart data={usageOverTime} />
            )}
          </div>

          {/* Payments Over Time */}
          <div className="bg-[#111] border border-[#333] rounded-xl p-6">
            <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-violet-500" />
              Payment Volume
            </h3>
            {!usageOverTime ? (
              <ChartSkeleton />
            ) : usageOverTime.length === 0 ? (
              <EmptyChart message="No payment data yet" />
            ) : (
              <PaymentVolumeChart data={usageOverTime} />
            )}
          </div>
        </div>

        {/* Breakdown Tables */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* By Agent */}
          <div className="bg-[#111] border border-[#333] rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#333]">
              <h3 className="text-sm font-medium text-white flex items-center gap-2">
                <AgentIcon className="w-4 h-4 text-emerald-400" />
                Usage by Agent
              </h3>
            </div>
            {!usageByAgent ? (
              <TableSkeleton rows={3} />
            ) : usageByAgent.length === 0 ? (
              <EmptyTable message="No agent activity yet" />
            ) : (
              <AgentTable data={usageByAgent} />
            )}
          </div>

          {/* By Provider */}
          <div className="bg-[#111] border border-[#333] rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#333]">
              <h3 className="text-sm font-medium text-white flex items-center gap-2">
                <ProviderIcon className="w-4 h-4 text-amber-400" />
                Usage by Provider
              </h3>
            </div>
            {!usageByProvider ? (
              <TableSkeleton rows={3} />
            ) : usageByProvider.length === 0 ? (
              <EmptyTable message="No provider activity yet" />
            ) : (
              <ProviderTable data={usageByProvider} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Summary Components
// ============================================

function SummaryCard({
  label,
  value,
  suffix,
  format,
  change,
  loading,
  accent,
}: {
  label: string;
  value: number;
  suffix?: string;
  format?: "currency" | "number";
  change?: number;
  loading?: boolean;
  accent?: "cyan" | "emerald" | "amber" | "red" | "violet";
}) {
  const accentColors = {
    cyan: "border-cyan-900/50",
    emerald: "border-emerald-900/50",
    amber: "border-amber-900/50",
    red: "border-red-900/50",
    violet: "border-violet-900/50",
  };

  const formatValue = (val: number) => {
    if (format === "currency") {
      return val.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 4,
      });
    }
    return val.toLocaleString();
  };

  return (
    <div
      className={`bg-[#111] border rounded-xl p-4 ${accent ? accentColors[accent] : "border-[#333]"}`}
    >
      <p className="text-xs text-[#666] uppercase tracking-wider mb-1">{label}</p>
      {loading ? (
        <div className="h-8 w-24 bg-[#1a1a1a] rounded animate-pulse" />
      ) : (
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-bold text-white">
            {formatValue(value)}
            {suffix && <span className="text-sm text-[#888] ml-1">{suffix}</span>}
          </p>
          {change !== undefined && change !== 0 && (
            <span
              className={`text-xs font-medium ${
                change > 0 ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {change > 0 ? "↑" : "↓"} {Math.abs(change)}%
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function MiniStat({
  label,
  value,
  format,
  icon,
  loading,
}: {
  label: string;
  value: number;
  format?: "currency" | "number";
  icon: React.ReactNode;
  loading?: boolean;
}) {
  const formatValue = (val: number) => {
    if (format === "currency") {
      return val.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 4,
      });
    }
    return val.toLocaleString();
  };

  return (
    <div className="bg-[#111] border border-[#333] rounded-xl p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-[#1a1a1a] flex items-center justify-center text-[#666]">
        {icon}
      </div>
      <div>
        <p className="text-xs text-[#666]">{label}</p>
        {loading ? (
          <div className="h-5 w-12 bg-[#1a1a1a] rounded animate-pulse mt-1" />
        ) : (
          <p className="text-lg font-semibold text-white">{formatValue(value)}</p>
        )}
      </div>
    </div>
  );
}

// ============================================
// Chart Components
// ============================================

interface TimeSeriesData {
  date: string;
  totalPayments: number;
  settledPayments: number;
  deniedPayments: number;
  totalSpent: number;
}

function SpendingChart({ data }: { data: TimeSeriesData[] }) {
  const maxSpent = Math.max(...data.map((d) => d.totalSpent), 0.001);
  const recentData = data.slice(-14); // Show last 14 days
  const chartHeight = 160; // pixels

  return (
    <div>
      <div className="flex items-end justify-between gap-1" style={{ height: chartHeight }}>
        {recentData.map((day) => {
          const barHeight = Math.max((day.totalSpent / maxSpent) * chartHeight, day.totalSpent > 0 ? 4 : 0);
          return (
            <div key={day.date} className="flex-1 flex flex-col justify-end items-center group relative h-full">
              <div
                className="w-full bg-gradient-to-t from-cyan-600 to-cyan-400 rounded-t transition-all hover:from-cyan-500 hover:to-cyan-300 cursor-pointer"
                style={{ height: barHeight }}
              />
              {/* Tooltip */}
              <div className="absolute bottom-full mb-2 hidden group-hover:block z-10 pointer-events-none">
                <div className="bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-xs whitespace-nowrap shadow-xl">
                  <p className="text-white font-medium">{day.totalSpent.toFixed(4)}</p>
                  <p className="text-[#666]">{formatShortDate(day.date)}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {/* X-axis labels */}
      <div className="flex justify-between mt-2 text-[10px] text-[#666]">
        <span>{formatShortDate(recentData[0]?.date)}</span>
        <span>{formatShortDate(recentData[recentData.length - 1]?.date)}</span>
      </div>
    </div>
  );
}

function PaymentVolumeChart({ data }: { data: TimeSeriesData[] }) {
  const maxPayments = Math.max(...data.map((d) => d.totalPayments), 1);
  const recentData = data.slice(-14);
  const chartHeight = 140; // pixels

  return (
    <div>
      <div className="flex items-end justify-between gap-1" style={{ height: chartHeight }}>
        {recentData.map((day) => {
          const settledHeight = Math.max((day.settledPayments / maxPayments) * chartHeight, day.settledPayments > 0 ? 4 : 0);
          const deniedHeight = Math.max((day.deniedPayments / maxPayments) * chartHeight, day.deniedPayments > 0 ? 4 : 0);

          return (
            <div key={day.date} className="flex-1 flex flex-col justify-end items-center group relative h-full">
              {/* Stacked bars */}
              <div className="w-full flex flex-col">
                {/* Denied (top) */}
                {day.deniedPayments > 0 && (
                  <div
                    className="w-full bg-gradient-to-t from-red-600 to-red-400 rounded-t"
                    style={{ height: deniedHeight }}
                  />
                )}
                {/* Settled (bottom) */}
                {day.settledPayments > 0 && (
                  <div
                    className={`w-full bg-gradient-to-t from-emerald-600 to-emerald-400 ${day.deniedPayments === 0 ? 'rounded-t' : ''}`}
                    style={{ height: settledHeight }}
                  />
                )}
              </div>
              {/* Tooltip */}
              <div className="absolute bottom-full mb-2 hidden group-hover:block z-10 pointer-events-none">
                <div className="bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-xs whitespace-nowrap shadow-xl">
                  <p className="text-emerald-400">{day.settledPayments} settled</p>
                  <p className="text-red-400">{day.deniedPayments} denied</p>
                  <p className="text-[#666] mt-1">{formatShortDate(day.date)}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-2 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-[#888]">Settled</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-[#888]">Denied</span>
        </span>
      </div>
    </div>
  );
}

// ============================================
// Table Components
// ============================================

interface AgentData {
  apiKeyId: string;
  apiKeyName: string;
  totalPayments: number;
  settledPayments: number;
  deniedPayments: number;
  totalSpent: number;
  lastUsed?: number;
}

function AgentTable({ data }: { data: AgentData[] }) {
  const maxSpent = Math.max(...data.map((d) => d.totalSpent), 1);

  return (
    <div className="divide-y divide-[#222]">
      {data.slice(0, 5).map((agent) => {
        const barWidth = (agent.totalSpent / maxSpent) * 100;
        return (
          <div key={agent.apiKeyId} className="px-6 py-4 hover:bg-[#1a1a1a] transition-colors">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-900/30 flex items-center justify-center">
                  <span className="text-xs font-bold text-emerald-400">
                    {agent.apiKeyName.slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-white font-medium">{agent.apiKeyName}</p>
                  <p className="text-xs text-[#666]">
                    {agent.totalPayments} payments • {agent.settledPayments} settled
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-white">
                  {agent.totalSpent.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                </p>
                {agent.lastUsed && (
                  <p className="text-xs text-[#666]">{formatRelativeTime(agent.lastUsed)}</p>
                )}
              </div>
            </div>
            {/* Progress bar */}
            <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all"
                style={{ width: `${barWidth}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface ProviderData {
  providerHost: string;
  providerName: string;
  totalPayments: number;
  settledPayments: number;
  deniedPayments: number;
  totalSpent: number;
}

function ProviderTable({ data }: { data: ProviderData[] }) {
  const maxSpent = Math.max(...data.map((d) => d.totalSpent), 1);

  return (
    <div className="divide-y divide-[#222]">
      {data.slice(0, 5).map((provider) => {
        const barWidth = (provider.totalSpent / maxSpent) * 100;
        return (
          <div
            key={provider.providerHost}
            className="px-6 py-4 hover:bg-[#1a1a1a] transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-900/30 flex items-center justify-center">
                  <span className="text-xs font-bold text-amber-400">
                    {provider.providerName.slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-white font-medium">{provider.providerName}</p>
                  <p className="text-xs text-[#666]">
                    {provider.totalPayments} payments
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-white">
                  {provider.totalSpent.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                </p>
                <p className="text-xs text-[#666]">
                  {provider.settledPayments}/{provider.totalPayments} success
                </p>
              </div>
            </div>
            {/* Progress bar */}
            <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full transition-all"
                style={{ width: `${barWidth}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================
// Skeleton & Empty States
// ============================================

function ChartSkeleton() {
  // Pre-generate heights to avoid hydration mismatch
  const heights = [45, 85, 35, 110, 75, 50, 95, 40, 80, 60, 100, 55, 70, 90];
  return (
    <div>
      <div className="flex items-end justify-between gap-1" style={{ height: 160 }}>
        {heights.map((h, i) => (
          <div
            key={i}
            className="flex-1 bg-[#1a1a1a] rounded-t animate-pulse"
            style={{ height: h }}
          />
        ))}
      </div>
      {/* Placeholder for x-axis labels */}
      <div className="flex justify-between mt-2">
        <div className="h-3 w-12 bg-[#1a1a1a] rounded animate-pulse" />
        <div className="h-3 w-12 bg-[#1a1a1a] rounded animate-pulse" />
      </div>
    </div>
  );
}

function TableSkeleton({ rows }: { rows: number }) {
  return (
    <div className="divide-y divide-[#222]">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#1a1a1a] animate-pulse" />
            <div className="flex-1">
              <div className="h-4 w-32 bg-[#1a1a1a] rounded animate-pulse" />
              <div className="h-3 w-24 bg-[#1a1a1a] rounded animate-pulse mt-2" />
            </div>
            <div className="h-4 w-16 bg-[#1a1a1a] rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center" style={{ height: 160 }}>
      <p className="text-sm text-[#666]">{message}</p>
    </div>
  );
}

function EmptyTable({ message }: { message: string }) {
  return (
    <div className="px-6 py-12 text-center">
      <p className="text-sm text-[#666]">{message}</p>
    </div>
  );
}

// ============================================
// Helpers
// ============================================

function formatShortDate(dateStr: string | undefined) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatRelativeTime(timestamp: number) {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

// ============================================
// Icons
// ============================================

function ChartIcon({ className }: { className?: string }) {
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

function AgentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  );
}

function ProviderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

