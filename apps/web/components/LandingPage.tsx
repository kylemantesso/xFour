"use client";

import { useState, useEffect, useRef } from "react";
import { SignUpButton } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import Link from "next/link";

export function LandingPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] overflow-hidden">
      {/* Hackathon Top Banner - Fixed at very top */}
      <HackathonTopBanner />

      {/* Hero Section with heartbeat visualization */}
      <HeroSection />

      {/* Live Stats + Recent Transactions Combined */}
      <LiveStatsSection />

      {/* Scrolling Transaction Ticker */}
      <TransactionTicker />

      {/* What is x402 Section */}
      <WhatIsX402Section />

      {/* Problem / Solution */}
      <ProblemSolutionSection />

      {/* SDK Examples */}
      <SDKExamplesSection />

      {/* Non-Custodial Treasury Section */}
      <TreasurySection />

      {/* Features Grid */}
      <FeaturesSection />

      {/* Footer CTA */}
      <FooterCTA />
    </main>
  );
}

function HeroSection() {
  const stats = useQuery(api.payments.getPublicStats);
  const isLoading = stats === undefined;
  const displayValue = stats?.totalPayments ?? 0;

  return (
    <section className="relative min-h-[85vh] flex items-center justify-center">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Large gradient blurs that react to payments */}
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-gradient-to-br from-pink-500/20 to-violet-600/20 rounded-full blur-3xl animate-hero-float" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-gradient-to-br from-blue-500/15 to-cyan-500/15 rounded-full blur-3xl animate-hero-float-delayed" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1600px] h-[1600px] bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-full blur-3xl animate-hero-pulse" />
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_70%)]" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 text-center">
        {/* Live Status Badge */}
        <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-[#111]/80 backdrop-blur-sm border border-[#333] rounded-full mb-8 animate-fade-in-up">
          <div className="relative">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full block" />
            <span className="absolute inset-0 w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
          </div>
          <span className="text-sm font-medium text-[#888]">
            Powered by MNEE
          </span>
          <span className="h-4 w-px bg-[#333]" />
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="h-4 w-16 bg-[#1a1a1a] rounded animate-pulse" />
              <span className="text-sm font-medium text-[#666]">payments processed</span>
            </div>
          ) : (
            <span className="text-sm font-medium text-emerald-400">
              {displayValue.toLocaleString()} payments processed
            </span>
          )}
        </div>

        {/* Main Headline */}
        <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tight mb-6 animate-fade-in-up animation-delay-100">
          The Agentic Economy
          <span className="block mt-2 bg-gradient-to-r from-pink-400 via-violet-400 to-blue-400 bg-clip-text text-transparent animate-gradient-x">
            Runs on x402 and MNEE
          </span>
        </h1>

        {/* Subheadline */}
        <p className="text-xl md:text-2xl text-[#888] max-w-3xl mx-auto mb-10 animate-fade-in-up animation-delay-200 leading-relaxed">
          Enable AI agents to <span className="text-white font-medium">make payments</span> for services 
          and <span className="text-white font-medium">accept payments</span> for APIs — 
          all with <span className="text-white font-medium">non-custodial treasuries</span> and MNEE stablecoin.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up animation-delay-300">
          <SignUpButton mode="modal">
            <button className="group relative px-8 py-4 text-lg font-semibold text-black bg-white hover:bg-gray-100 rounded-xl transition-all shadow-lg shadow-white/10 hover:shadow-white/20 hover:scale-105">
              <span className="relative z-10 flex items-center gap-2">
                Get Started Free
                <ArrowRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
            </button>
          </SignUpButton>
          <Link
            href="/docs"
            className="group px-8 py-4 text-lg font-semibold text-white bg-[#111] hover:bg-[#1a1a1a] rounded-xl transition-all border border-[#333] hover:border-[#444]"
          >
            <span className="flex items-center gap-2">
              <BookOpenIcon className="w-5 h-5 text-violet-400" />
              Read the Docs
            </span>
          </Link>
        </div>

        {/* Trust Indicators */}
        <div className="flex items-center justify-center gap-8 mt-12 animate-fade-in-up animation-delay-400">
          <div className="flex items-center gap-2 text-sm text-[#666]">
            <VaultIcon className="w-5 h-5" />
            <span>Non-Custodial</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-[#666]">
            <EthereumIcon className="w-5 h-5" />
            <span>Ethereum</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-[#666]">
            <ShieldCheckIcon className="w-5 h-5" />
            <span>On-Chain Limits</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function LiveStatsSection() {
  const stats = useQuery(api.payments.getPublicStats);
  const [selectedNetwork, setSelectedNetwork] = useState<"sepolia" | "mainnet">("sepolia");

  return (
    <section className="relative py-20 border-t border-b border-[#222]">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#0d0d0d] to-[#0a0a0a]" />

      <div className="relative z-10 max-w-6xl mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full mb-4">
            <div className="relative">
              <span className="w-2 h-2 bg-emerald-500 rounded-full block" />
              <span className="absolute inset-0 w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
            </div>
            <span className="text-sm font-medium text-emerald-400">Live Platform Activity</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Real Traction, Real Payments
          </h2>
          <p className="text-lg text-[#888] max-w-2xl mx-auto">
            Watch AI agents transact in real-time across the x402 network.
          </p>
        </div>

        {/* Network Toggle Switch */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <span className={`text-sm font-medium transition-colors ${
            selectedNetwork === "sepolia" ? "text-amber-400" : "text-[#666]"
          }`}>
            Sepolia
          </span>
          <button
            onClick={() => setSelectedNetwork(selectedNetwork === "sepolia" ? "mainnet" : "sepolia")}
            className="relative w-14 h-7 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0a0a0a] focus:ring-emerald-500"
            style={{
              backgroundColor: selectedNetwork === "sepolia" ? "rgb(245 158 11 / 0.3)" : "rgb(16 185 129 / 0.3)",
            }}
          >
            <span
              className="absolute top-0.5 left-0.5 w-6 h-6 rounded-full shadow-lg transform transition-all duration-300 flex items-center justify-center"
              style={{
                transform: selectedNetwork === "mainnet" ? "translateX(28px)" : "translateX(0)",
                backgroundColor: selectedNetwork === "sepolia" ? "rgb(245 158 11)" : "rgb(16 185 129)",
              }}
            >
              {selectedNetwork === "sepolia" ? (
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

        {/* Activity Chart */}
        <PublicActivityChart network={selectedNetwork} />

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          <StatCard
            label="Total Payments"
            value={stats?.totalPayments ?? 0}
            icon={<ReceiptIcon className="w-5 h-5" />}
            loading={!stats}
          />
          <StatCard
            label="Volume Processed"
            value={stats?.totalVolume ?? 0}
            suffix=" MNEE"
            icon={<CurrencyIcon className="w-5 h-5" />}
            loading={!stats}
            accent="violet"
          />
          <StatCard
            label="Active Workspaces"
            value={stats?.activeWorkspaces ?? 0}
            icon={<UsersIcon className="w-5 h-5" />}
            loading={!stats}
            accent="blue"
          />
          <StatCard
            label="Success Rate"
            value={stats?.successRate ?? 100}
            suffix="%"
            icon={<CheckCircleIcon className="w-5 h-5" />}
            loading={!stats}
            accent="emerald"
          />
        </div>
      </div>
    </section>
  );
}

function PublicActivityChart({ network }: { network: "sepolia" | "mainnet" }) {
  const timeline = useQuery(api.payments.getPublicActivityTimeline, { windowSeconds: 60, network });
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [newEventIds, setNewEventIds] = useState<Set<string>>(new Set());
  const prevEventIdsRef = useRef<Set<string>>(new Set());

  const isLoading = timeline === undefined;
  const windowSeconds = 60;
  const windowMs = windowSeconds * 1000;

  // Update current time frequently for smooth sliding animation
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Detect new events and trigger entrance animation
  useEffect(() => {
    if (!timeline?.events) return;

    const currentIds = new Set(timeline.events.map((e) => e.id));
    const newIds = new Set<string>();

    currentIds.forEach((id) => {
      if (!prevEventIdsRef.current.has(id)) {
        newIds.add(id);
      }
    });

    if (newIds.size > 0) {
      setNewEventIds((prev) => new Set([...prev, ...newIds]));

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

  const getPosition = (timestamp: number) => {
    const age = currentTime - timestamp;
    const position = 100 - (age / windowMs) * 100;
    return Math.max(0, Math.min(100, position));
  };

  const maxAmount = timeline?.maxAmount ?? 1;
  const getHeight = (amount: number) => {
    const normalized = amount / maxAmount;
    return Math.max(15, normalized * 100);
  };

  const events = timeline?.events ?? [];
  const stats = timeline?.stats ?? { total: 0, settled: 0, pending: 0, denied: 0 };

  return (
    <div className="bg-[#111] border border-[#333] rounded-2xl p-6 overflow-hidden">
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
        </div>
      </div>

      {/* Chart */}
      <div className="relative h-40 bg-[#0a0a0a] rounded-xl overflow-hidden">
        {/* Grid lines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="border-b border-[#333] w-full" />
          ))}
        </div>

        {/* "Now" edge glow */}
        <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-emerald-500/20 to-transparent pointer-events-none" />

        {/* Events sliding across */}
        {events.map((event) => {
          const position = getPosition(event.timestamp);
          const height = getHeight(event.amount);
          const colors = getStatusColor(event.status);
          const isNew = newEventIds.has(event.id);

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
              {isNew && (
                <div
                  className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-full ${colors.glow} opacity-40 blur-md animate-pulse`}
                  style={{ height: `${height + 20}%` }}
                />
              )}

              <div
                className={`w-2.5 rounded-t-full bg-gradient-to-t ${colors.bar} transition-all duration-200 ease-out ${isNew ? "animate-activity-bar-pop" : ""}`}
                style={{
                  height: `${height}%`,
                  minHeight: "16px",
                  boxShadow: isNew ? `0 0 12px 2px currentColor` : undefined,
                }}
              />

              {isNew && (
                <div className={`absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 ${colors.glow} rounded-full animate-ping`} />
              )}
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
      <div className="flex justify-between mt-3 text-xs text-[#666]">
        <span>60s ago</span>
        <span>45s</span>
        <span>30s</span>
        <span>15s</span>
        <span className="text-emerald-500 font-medium">now</span>
      </div>
    </div>
  );
}

function TransactionTicker() {
  const transactions = useQuery(api.payments.getPublicRecentTransactions, { limit: 20 });
  const isLoading = transactions === undefined;

  const getBlockExplorerUrl = (network: string, txHash: string) => {
    if (network === "sepolia") {
      return `https://sepolia.etherscan.io/tx/${txHash}`;
    }
    return `https://etherscan.io/tx/${txHash}`;
  };

  const formatTxHash = (hash: string) => {
    return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
  };

  const formatAmount = (amount: number) => {
    if (amount < 0.01) return amount.toFixed(4);
    if (amount < 1) return amount.toFixed(2);
    return amount.toFixed(2);
  };

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  // If no transactions, don't render
  if (!isLoading && (!transactions || transactions.length === 0)) {
    return null;
  }

  // Double the transactions for seamless looping
  const displayTransactions = transactions ? [...transactions, ...transactions] : [];

  return (
    <section className="relative py-4 border-b border-[#222] overflow-hidden bg-[#080808]">
      {/* Gradient masks for smooth fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-[#080808] to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[#080808] to-transparent z-10 pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-center gap-2 mb-3">
        <div className="relative">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full block" />
          <span className="absolute inset-0 w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
        </div>
        <span className="text-xs font-medium text-[#666] uppercase tracking-wider">Live Transactions</span>
      </div>

      {/* Scrolling container */}
      {isLoading ? (
        <div className="flex items-center justify-center h-14">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
            <span className="text-sm text-[#666]">Loading transactions...</span>
          </div>
        </div>
      ) : (
        <div className="relative overflow-hidden">
          <div className="flex items-center gap-4 animate-scroll-left w-max">
            {displayTransactions.map((tx, index) => (
              <a
                key={`${tx.id}-${index}`}
                href={tx.txHash ? getBlockExplorerUrl(tx.network, tx.txHash) : "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 px-4 py-2.5 bg-[#111] border border-[#222] rounded-lg hover:border-emerald-500/30 hover:bg-[#151515] transition-all duration-200 cursor-pointer flex-shrink-0"
              >
                {/* Status indicator */}
                <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                
                {/* Amount */}
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-white tabular-nums">
                    {formatAmount(tx.amount)}
                  </span>
                  <span className="text-xs text-[#666]">MNEE</span>
                </div>

                {/* Divider */}
                <span className="w-px h-4 bg-[#333]" />

                {/* TX Hash with icon */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-[#888] font-mono group-hover:text-emerald-400 transition-colors">
                    {tx.txHash ? formatTxHash(tx.txHash) : "pending"}
                  </span>
                  <ExternalLinkIcon className="w-3 h-3 text-[#555] group-hover:text-emerald-400 transition-colors" />
                </div>

                {/* Network badge */}
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                  tx.network === "mainnet" 
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                    : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                }`}>
                  {tx.network === "mainnet" ? "ETH" : "SEP"}
                </span>

                {/* Time ago */}
                <span className="text-[10px] text-[#555]">
                  {formatTimeAgo(tx.timestamp)}
                </span>
              </a>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  );
}

function StatCard({
  label,
  value,
  suffix,
  icon,
  loading,
  accent,
}: {
  label: string;
  value: number;
  suffix?: string;
  icon: React.ReactNode;
  loading?: boolean;
  accent?: "emerald" | "violet" | "blue";
}) {
  const accentColors = {
    emerald: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/30",
    violet: "from-violet-500/20 to-violet-500/5 border-violet-500/30",
    blue: "from-blue-500/20 to-blue-500/5 border-blue-500/30",
  };

  const iconColors = {
    emerald: "text-emerald-400",
    violet: "text-violet-400",
    blue: "text-blue-400",
  };

  // Format the display value - simple and stable
  const displayValue = typeof value === "number" && value % 1 !== 0
    ? value.toFixed(2)
    : value.toLocaleString();

  return (
    <div className={`bg-gradient-to-br ${accent ? accentColors[accent] : "from-[#1a1a1a] to-[#111] border-[#333]"} border rounded-xl p-5`}>
      <div className={`mb-3 ${accent ? iconColors[accent] : "text-[#666]"}`}>
        {icon}
      </div>
      <p className="text-xs text-[#666] uppercase tracking-wider mb-1">{label}</p>
      {loading ? (
        <div className="space-y-2">
          <div className="h-8 w-20 bg-[#1a1a1a] rounded animate-pulse" />
        </div>
      ) : (
        <p className="text-2xl font-bold text-white tabular-nums">
          {displayValue}
          {suffix && <span className="text-base text-[#888]">{suffix}</span>}
        </p>
      )}
    </div>
  );
}

function SDKExamplesSection() {
  const [activeTab, setActiveTab] = useState<"agent" | "server">("agent");

  return (
    <section className="py-24 border-t border-[#222] bg-gradient-to-b from-[#0a0a0a] via-[#0d0d0d] to-[#0a0a0a]">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-500/10 border border-violet-500/30 rounded-full mb-4">
            <CodeIcon className="w-4 h-4 text-violet-400" />
            <span className="text-sm font-medium text-violet-400">Two Powerful SDKs</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Build on Both Sides of the Protocol
          </h2>
          <p className="text-lg text-[#888] max-w-2xl mx-auto">
            Whether you&apos;re building agents that consume APIs or APIs that serve agents, 
            we&apos;ve got you covered with drop-in SDKs.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <button
            onClick={() => setActiveTab("agent")}
            className={`px-6 py-3 rounded-xl font-medium transition-all ${
              activeTab === "agent"
                ? "bg-emerald-500/20 border-2 border-emerald-500/50 text-emerald-400"
                : "bg-[#111] border-2 border-[#333] text-[#888] hover:border-[#555] hover:text-white"
            }`}
          >
            <span className="flex items-center gap-2">
              <span className="text-lg">🤖</span>
              @x402/agent
            </span>
            <span className="block text-xs mt-0.5 opacity-75">
              For AI agents consuming APIs
            </span>
          </button>
          <button
            onClick={() => setActiveTab("server")}
            className={`px-6 py-3 rounded-xl font-medium transition-all ${
              activeTab === "server"
                ? "bg-blue-500/20 border-2 border-blue-500/50 text-blue-400"
                : "bg-[#111] border-2 border-[#333] text-[#888] hover:border-[#555] hover:text-white"
            }`}
          >
            <span className="flex items-center gap-2">
              <span className="text-lg">🔌</span>
              @x402/server
            </span>
            <span className="block text-xs mt-0.5 opacity-75">
              For API providers accepting payments
            </span>
          </button>
        </div>

        {/* Code Examples */}
        <div className="bg-[#111] border border-[#333] rounded-2xl overflow-hidden">
          {activeTab === "agent" ? (
            <div className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-2xl">
                  🤖
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Agent SDK</h3>
                  <p className="text-sm text-[#888]">
                    Drop-in fetch replacement for autonomous payments
                  </p>
                </div>
              </div>
              
              <pre className="bg-[#0a0a0a] border border-[#333] rounded-xl p-6 overflow-x-auto">
                <code className="text-sm text-[#888] font-mono">
                  <span className="text-pink-400">import</span> <span className="text-white">{'{'} createAgentClient {'}'}</span> <span className="text-pink-400">from</span> <span className="text-emerald-400">&apos;@x402/agent&apos;</span>;<br />
                  <br />
                  <span className="text-blue-400">const</span> <span className="text-white">client</span> = <span className="text-yellow-400">createAgentClient</span>({'{'}
                  <br />
                  {'  '}<span className="text-violet-400">gatewayBaseUrl</span>: <span className="text-emerald-400">&apos;https://gateway.x402.com&apos;</span>,<br />
                  {'  '}<span className="text-violet-400">apiKey</span>: <span className="text-white">process</span>.<span className="text-white">env</span>.<span className="text-white">X402_AGENT_KEY</span>,<br />
                  {'}'});<br />
                  <br />
                  <span className="text-[#666]">{/* // Automatic payment handling - just use like fetch! */}{'// Automatic payment handling - just use like fetch!'}</span><br />
                  <span className="text-blue-400">const</span> <span className="text-white">response</span> = <span className="text-pink-400">await</span> <span className="text-white">client</span>.<span className="text-yellow-400">fetchWithX402</span>(<br />
                  {'  '}<span className="text-emerald-400">&apos;https://api.example.com/ai/complete&apos;</span>,<br />
                  {'  '}{'{'}<br />
                  {'    '}<span className="text-violet-400">method</span>: <span className="text-emerald-400">&apos;POST&apos;</span>,<br />
                  {'    '}<span className="text-violet-400">body</span>: <span className="text-white">JSON</span>.<span className="text-yellow-400">stringify</span>({'{'} <span className="text-violet-400">prompt</span>: <span className="text-emerald-400">&apos;Hello&apos;</span> {'}'}),<br />
                  {'  '}{'}'}<br />
                  );<br />
                  <br />
                  <span className="text-[#666]">{'// If 402 returned, payment happens automatically'}</span><br />
                  <span className="text-blue-400">const</span> <span className="text-white">result</span> = <span className="text-pink-400">await</span> <span className="text-white">response</span>.<span className="text-yellow-400">json</span>();
                </code>
              </pre>

              <div className="mt-6 flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm text-[#888]">
                  <CheckCircleIcon className="w-5 h-5 text-emerald-400" />
                  <span>Auto-detects 402 responses</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-[#888]">
                  <CheckCircleIcon className="w-5 h-5 text-emerald-400" />
                  <span>Handles payment flow</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-[#888]">
                  <CheckCircleIcon className="w-5 h-5 text-emerald-400" />
                  <span>Retries with proof</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-2xl">
                  🔌
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Server SDK</h3>
                  <p className="text-sm text-[#888]">
                    Monetize your API endpoints in minutes
                  </p>
                </div>
              </div>
              
              <pre className="bg-[#0a0a0a] border border-[#333] rounded-xl p-6 overflow-x-auto">
                <code className="text-sm text-[#888] font-mono">
                  <span className="text-pink-400">import</span> <span className="text-white">express</span> <span className="text-pink-400">from</span> <span className="text-emerald-400">&apos;express&apos;</span>;<br />
                  <span className="text-pink-400">import</span> <span className="text-white">{'{'} createX402Middleware {'}'}</span> <span className="text-pink-400">from</span> <span className="text-emerald-400">&apos;@x402/server&apos;</span>;<br />
                  <br />
                  <span className="text-blue-400">const</span> <span className="text-white">app</span> = <span className="text-yellow-400">express</span>();<br />
                  <br />
                  <span className="text-blue-400">const</span> <span className="text-white">x402</span> = <span className="text-yellow-400">createX402Middleware</span>({'{'}
                  <br />
                  {'  '}<span className="text-violet-400">gatewayUrl</span>: <span className="text-emerald-400">&apos;https://gateway.x402.com&apos;</span>,<br />
                  {'  '}<span className="text-violet-400">apiKey</span>: <span className="text-white">process</span>.<span className="text-white">env</span>.<span className="text-white">X402_SERVER_KEY</span>,<br />
                  {'  '}<span className="text-violet-400">payToAddress</span>: <span className="text-emerald-400">&apos;0x123...&apos;</span>, <span className="text-[#666]">{'// Your Ethereum address'}</span><br />
                  {'  '}<span className="text-violet-400">network</span>: <span className="text-emerald-400">&apos;mainnet&apos;</span>,<br />
                  {'}'});<br />
                  <br />
                  <span className="text-[#666]">{'// Protect routes with payment requirement'}</span><br />
                  <span className="text-white">app</span>.<span className="text-yellow-400">post</span>(<br />
                  {'  '}<span className="text-emerald-400">&apos;/api/ai/complete&apos;</span>,<br />
                  {'  '}<span className="text-white">x402</span>.<span className="text-yellow-400">requirePayment</span>(<span className="text-orange-400">0.05</span>), <span className="text-[#666]">{'// 0.05 MNEE per request'}</span><br />
                  {'  '}<span className="text-pink-400">async</span> (<span className="text-white">req</span>, <span className="text-white">res</span>) <span className="text-pink-400">=&gt;</span> {'{'}<br />
                  {'    '}<span className="text-[#666]">{'// Only executes if payment verified!'}</span><br />
                  {'    '}<span className="text-blue-400">const</span> <span className="text-white">result</span> = <span className="text-pink-400">await</span> <span className="text-yellow-400">aiComplete</span>(<span className="text-white">req</span>.<span className="text-white">body</span>);<br />
                  {'    '}<span className="text-white">res</span>.<span className="text-yellow-400">json</span>(<span className="text-white">result</span>);<br />
                  {'  '}{'}'}<br />
                  );
                </code>
              </pre>

              <div className="mt-6 flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm text-[#888]">
                  <CheckCircleIcon className="w-5 h-5 text-blue-400" />
                  <span>Returns 402 if unpaid</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-[#888]">
                  <CheckCircleIcon className="w-5 h-5 text-blue-400" />
                  <span>Verifies payment proof</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-[#888]">
                  <CheckCircleIcon className="w-5 h-5 text-blue-400" />
                  <span>Instant settlement</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="text-center mt-8">
          <p className="text-sm text-[#666]">
            Both SDKs work seamlessly together to enable agent-to-API payments
          </p>
        </div>
      </div>
    </section>
  );
}

function ProblemSolutionSection() {
  return (
    <section className="py-24 relative">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-12">
          {/* The Problem */}
          <div className="relative">
            <div className="absolute -left-4 top-0 w-1 h-full bg-gradient-to-b from-red-500 to-red-500/0 rounded-full" />
            <div className="pl-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/30 rounded-full text-red-400 text-sm font-medium mb-4">
                <XCircleIcon className="w-4 h-4" />
                The Problem
              </div>
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
                AI Commerce is Broken
              </h3>
              <p className="text-[#888] leading-relaxed mb-6">
                AI agents need to both consume and provide paid services. But traditional payment systems 
                require human intervention, and APIs have no easy way to monetize their endpoints.
              </p>
              <ul className="space-y-3">
                {[
                  "Agents can't pay for services autonomously",
                  "APIs have no native way to charge per-request",
                  "Custodial risk — give up control of your funds",
                  "No verifiable spending limits on-chain",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-[#888]">
                    <XCircleIcon className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* The Solution */}
          <div className="relative">
            <div className="absolute -left-4 top-0 w-1 h-full bg-gradient-to-b from-emerald-500 to-emerald-500/0 rounded-full" />
            <div className="pl-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-400 text-sm font-medium mb-4">
                <CheckCircleIcon className="w-4 h-4" />
                The Solution
              </div>
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
                Non-Custodial Smart Contract Treasuries
              </h3>
              <p className="text-[#888] leading-relaxed mb-6">
                Deploy your own treasury contract with full admin control. Set spending limits, 
                enable agents, and withdraw anytime — all enforced on-chain, not by us.
              </p>
              <ul className="space-y-3">
                {[
                  "Your funds stay in YOUR smart contract",
                  "On-chain spending limits (per-tx, daily, monthly)",
                  "Withdraw anytime — no lockups or approvals",
                  "Agents transact via @x402/agent SDK",
                  "APIs monetize via @x402/server SDK",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-[#888]">
                    <CheckCircleIcon className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TreasurySection() {
  return (
    <section className="py-24 border-t border-[#222] bg-gradient-to-b from-[#0a0a0a] via-[#080808] to-[#0a0a0a]">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full mb-4">
            <VaultIcon className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-medium text-emerald-400">Non-Custodial Architecture</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Your Funds. Your Contract. Your Control.
          </h2>
          <p className="text-lg text-[#888] max-w-2xl mx-auto">
            Unlike traditional payment processors, x402 uses smart contract treasuries where 
            <span className="text-white font-medium"> you retain full custody</span> of your funds at all times.
          </p>
        </div>

        {/* Architecture Diagram */}
        <div className="bg-[#111] border border-[#333] rounded-2xl p-8 mb-12">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Your Treasury */}
            <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border border-emerald-500/30 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <VaultIcon className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Your Treasury Contract</h3>
                  <p className="text-xs text-emerald-400/80">Deployed per workspace • You are ADMIN</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircleIcon className="w-4 h-4 text-emerald-400" />
                  <span className="text-[#ccc]">Deposit & withdraw anytime</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircleIcon className="w-4 h-4 text-emerald-400" />
                  <span className="text-[#ccc]">Set per-API-key spending limits</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircleIcon className="w-4 h-4 text-emerald-400" />
                  <span className="text-[#ccc]">Daily & monthly budget caps</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircleIcon className="w-4 h-4 text-emerald-400" />
                  <span className="text-[#ccc]">Pause in emergencies</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircleIcon className="w-4 h-4 text-emerald-400" />
                  <span className="text-[#ccc]">Emergency withdraw when paused</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-emerald-500/20">
                <p className="text-xs text-emerald-400/60 font-mono">
                  ADMIN_ROLE = your wallet address
                </p>
              </div>
            </div>

            {/* Gateway */}
            <div className="bg-[#0a0a0a] border border-[#333] rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <BoltIcon className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">x402 Gateway</h3>
                  <p className="text-xs text-blue-400/80">Limited permissions • Execute only</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircleIcon className="w-4 h-4 text-blue-400" />
                  <span className="text-[#ccc]">Execute payments within YOUR limits</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <XCircleIcon className="w-4 h-4 text-red-400/60" />
                  <span className="text-[#666]">Cannot withdraw your funds</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <XCircleIcon className="w-4 h-4 text-red-400/60" />
                  <span className="text-[#666]">Cannot change your limits</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <XCircleIcon className="w-4 h-4 text-red-400/60" />
                  <span className="text-[#666]">Cannot pause your contract</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <XCircleIcon className="w-4 h-4 text-red-400/60" />
                  <span className="text-[#666]">Cannot exceed spending limits</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-[#333]">
                <p className="text-xs text-blue-400/60 font-mono">
                  GATEWAY_ROLE = limited to executePayment()
                </p>
              </div>
            </div>
          </div>

          {/* Connection Arrow */}
          <div className="flex items-center justify-center my-6">
            <div className="flex items-center gap-4 px-6 py-3 bg-[#0a0a0a] border border-[#333] rounded-full">
              <span className="text-sm text-[#888]">Payments flow through gateway</span>
              <ArrowRightIcon className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-emerald-400 font-medium">Only within your limits</span>
            </div>
          </div>
        </div>

        {/* Benefits Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-[#111] border border-[#333] rounded-xl p-5 hover:border-emerald-500/30 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-4">
              <ShieldCheckIcon className="w-5 h-5 text-emerald-400" />
            </div>
            <h4 className="text-white font-semibold mb-2">Trustless Security</h4>
            <p className="text-sm text-[#888]">
              No need to trust us with your funds. Smart contracts enforce all rules transparently on-chain.
            </p>
          </div>
          <div className="bg-[#111] border border-[#333] rounded-xl p-5 hover:border-emerald-500/30 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-4">
              <ChartIcon className="w-5 h-5 text-emerald-400" />
            </div>
            <h4 className="text-white font-semibold mb-2">Full Transparency</h4>
            <p className="text-sm text-[#888]">
              Every payment, deposit, and withdrawal is recorded on Ethereum. Verify everything yourself.
            </p>
          </div>
          <div className="bg-[#111] border border-[#333] rounded-xl p-5 hover:border-emerald-500/30 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-4">
              <BoltIcon className="w-5 h-5 text-emerald-400" />
            </div>
            <h4 className="text-white font-semibold mb-2">Instant Control</h4>
            <p className="text-sm text-[#888]">
              Change limits, pause payments, or withdraw — all instant, no approval needed from anyone.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  const features = [
    {
      icon: <VaultIcon className="w-6 h-6" />,
      title: "Non-Custodial Treasuries",
      description: "Your funds stay in YOUR smart contract. Deposit, withdraw, and set limits — all under your control.",
      gradient: "from-emerald-500 to-teal-600",
    },
    {
      icon: <ShieldCheckIcon className="w-6 h-6" />,
      title: "On-Chain Spending Limits",
      description: "Per-transaction, daily, and monthly limits enforced by immutable smart contracts. Not our rules — yours.",
      gradient: "from-pink-500 to-rose-600",
    },
    {
      icon: <KeyIcon className="w-6 h-6" />,
      title: "Secure API Keys",
      description: "Generate API keys for each agent with workspace isolation. Keys are hashed — only you see the full key once.",
      gradient: "from-amber-500 to-orange-600",
    },
    {
      icon: <ChartIcon className="w-6 h-6" />,
      title: "Real-time Analytics",
      description: "Monitor payments as they happen. Full audit trail of every transaction across all agents.",
      gradient: "from-violet-500 to-purple-600",
    },
    {
      icon: <EthereumIcon className="w-6 h-6" />,
      title: "Ethereum Network",
      description: "Built on MNEE stablecoin — a USD-backed ERC20 token on Ethereum with robust settlement and wide ecosystem support.",
      gradient: "from-indigo-500 to-violet-600",
    },
    {
      icon: <CodeIcon className="w-6 h-6" />,
      title: "Dual SDKs",
      description: "Complete SDKs for both sides: @x402/agent for consumers and @x402/server for API providers.",
      gradient: "from-indigo-500 to-blue-600",
    },
  ];

  return (
    <section className="py-24 border-t border-[#222]">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Everything Agents Need to Transact
          </h2>
          <p className="text-lg text-[#888] max-w-2xl mx-auto">
            A complete infrastructure layer for autonomous AI commerce, 
            powered by MNEE stablecoin on Ethereum.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <div
              key={i}
              className="group bg-[#111] p-6 rounded-2xl border border-[#333] hover:border-[#444] transition-all hover:-translate-y-1"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center text-white mb-5 group-hover:scale-110 transition-transform`}>
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                {feature.title}
              </h3>
              <p className="text-[#888] leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HackathonTopBanner() {
  return (
    <div className="bg-gradient-to-r from-pink-600 via-violet-600 to-blue-600 text-white">
      <div className="max-w-7xl mx-auto px-4 py-2">
        <div className="flex items-center justify-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <TrophyIcon className="w-4 h-4" />
            <span className="font-semibold">MNEE Hackathon Entry</span>
          </div>
          <span className="hidden sm:inline text-white/60">|</span>
          <span className="hidden sm:inline text-white/90">AI & Agent Payments Track</span>
          <span className="text-white/60">|</span>
          <Link 
            href="/hackathon" 
            className="font-medium hover:underline flex items-center gap-1"
          >
            View Submission
            <ArrowRightIcon className="w-3 h-3" />
          </Link>
          <a 
            href="https://github.com/kylemantesso/x402-gateway" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hidden md:flex items-center gap-1 font-medium hover:underline"
          >
            <GithubIcon className="w-3 h-3" />
            Source
          </a>
        </div>
      </div>
    </div>
  );
}

function WhatIsX402Section() {
  return (
    <section className="py-20 border-b border-[#222]">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-full mb-4">
            <span className="text-lg">💡</span>
            <span className="text-sm font-medium text-blue-400">The Protocol</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            What are x402 Payments?
          </h2>
          <p className="text-lg text-[#888] max-w-3xl mx-auto">
            HTTP status code <span className="text-white font-mono bg-[#1a1a1a] px-2 py-0.5 rounded">402 Payment Required</span> has 
            existed since 1999 but was &ldquo;reserved for future use.&rdquo; That future is now.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* How it works */}
          <div className="bg-[#111] border border-[#333] rounded-2xl p-8">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-2xl">🔄</span> How x402 Works
            </h3>
            <ol className="space-y-4">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 text-sm font-bold flex items-center justify-center">1</span>
                <div>
                  <span className="text-white font-medium">Agent requests paid API</span>
                  <p className="text-sm text-[#888]">AI agent makes a standard HTTP request</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-violet-500/20 text-violet-400 text-sm font-bold flex items-center justify-center">2</span>
                <div>
                  <span className="text-white font-medium">Server returns 402 + payment details</span>
                  <p className="text-sm text-[#888]">Headers include price, pay-to address, network</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-pink-500/20 text-pink-400 text-sm font-bold flex items-center justify-center">3</span>
                <div>
                  <span className="text-white font-medium">Gateway pays in MNEE</span>
                  <p className="text-sm text-[#888]">Instant on-chain payment to provider</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-sm font-bold flex items-center justify-center">4</span>
                <div>
                  <span className="text-white font-medium">Agent retries with proof</span>
                  <p className="text-sm text-[#888]">Request succeeds with payment proof header</p>
                </div>
              </li>
            </ol>
          </div>

          {/* Why MNEE is perfect */}
          <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 rounded-2xl p-8">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-2xl">⚡</span> Why MNEE + Smart Contracts
            </h3>
            <p className="text-[#888] mb-6">
              x402 payments require a currency that&apos;s <span className="text-white">stable</span>, <span className="text-white">programmable</span>, and <span className="text-white">non-custodial</span>. 
              MNEE on Ethereum delivers all three.
            </p>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <VaultIcon className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h4 className="text-white font-semibold">Non-Custodial by Design</h4>
                  <p className="text-sm text-[#888]">Your treasury is YOUR smart contract. We can&apos;t touch your funds — only execute within your limits.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <ShieldCheckIcon className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h4 className="text-white font-semibold">On-Chain Spending Limits</h4>
                  <p className="text-sm text-[#888]">Per-transaction, daily, and monthly limits enforced by immutable contract code.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <CurrencyIcon className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h4 className="text-white font-semibold">USD-Backed Stability</h4>
                  <p className="text-sm text-[#888]">1 MNEE = 1 USD. No volatility risk. Price your API at $0.05 and receive exactly $0.05.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Comparison table */}
        <div className="bg-[#111] border border-[#333] rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[#333]">
            <h4 className="text-white font-semibold">Why Not Other Payment Methods?</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#333]">
                  <th className="text-left py-3 px-6 text-[#888] font-medium">Method</th>
                  <th className="text-center py-3 px-4 text-[#888] font-medium">Speed</th>
                  <th className="text-center py-3 px-4 text-[#888] font-medium">Fees</th>
                  <th className="text-center py-3 px-4 text-[#888] font-medium">Micropayments</th>
                  <th className="text-center py-3 px-4 text-[#888] font-medium">Agent-Ready</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-[#222] bg-emerald-500/5">
                  <td className="py-3 px-6 text-white font-semibold">MNEE on Ethereum</td>
                  <td className="py-3 px-4 text-center text-emerald-400">~12 sec</td>
                  <td className="py-3 px-4 text-center text-emerald-400">~$0.01-0.10</td>
                  <td className="py-3 px-4 text-center text-emerald-400">✓</td>
                  <td className="py-3 px-4 text-center text-emerald-400">✓</td>
                </tr>
                <tr className="border-b border-[#222]">
                  <td className="py-3 px-6 text-[#888]">Credit Card</td>
                  <td className="py-3 px-4 text-center text-[#666]">2-3 days</td>
                  <td className="py-3 px-4 text-center text-red-400">2.9% + $0.30</td>
                  <td className="py-3 px-4 text-center text-red-400">✗</td>
                  <td className="py-3 px-4 text-center text-red-400">✗</td>
                </tr>
                <tr className="border-b border-[#222]">
                  <td className="py-3 px-6 text-[#888]">Native ETH</td>
                  <td className="py-3 px-4 text-center text-[#666]">~12 sec</td>
                  <td className="py-3 px-4 text-center text-amber-400">$0.50-5+</td>
                  <td className="py-3 px-4 text-center text-amber-400">~</td>
                  <td className="py-3 px-4 text-center text-emerald-400">✓</td>
                </tr>
                <tr>
                  <td className="py-3 px-6 text-[#888]">Bitcoin (BTC)</td>
                  <td className="py-3 px-4 text-center text-[#666]">~10 min</td>
                  <td className="py-3 px-4 text-center text-red-400">$1-20+</td>
                  <td className="py-3 px-4 text-center text-red-400">✗</td>
                  <td className="py-3 px-4 text-center text-red-400">✗</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

function FooterCTA() {
  return (
    <section className="py-24 border-t border-[#222]">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
          Ready to Enable Agent Payments?
        </h2>
        <p className="text-lg text-[#888] mb-8 max-w-xl mx-auto">
          Get started in minutes. Create API keys, fund your treasury, 
          and let your AI agents transact autonomously.
        </p>
        <SignUpButton mode="modal">
          <button className="group px-8 py-4 text-lg font-semibold text-black bg-white hover:bg-gray-100 rounded-xl transition-all shadow-lg shadow-white/10 hover:shadow-white/20 hover:scale-105">
            <span className="flex items-center gap-2">
              Start Building Today
              <ArrowRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </span>
          </button>
        </SignUpButton>
      </div>
    </section>
  );
}

// ============================================
// ICONS
// ============================================

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
    </svg>
  );
}

function TrophyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  );
}

function EthereumIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 1.5L5.5 12.25L12 16.5L18.5 12.25L12 1.5Z" opacity="0.6" />
      <path d="M12 16.5L5.5 12.25L12 22.5L18.5 12.25L12 16.5Z" />
      <path d="M12 1.5L5.5 12.25L12 9.5L18.5 12.25L12 1.5Z" />
    </svg>
  );
}

function BoltIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}

function ReceiptIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
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

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
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

function ShieldCheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

function CodeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
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

function VaultIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  );
}

function BookOpenIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  );
}

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}
