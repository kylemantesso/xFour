"use client";

import { useState, useEffect, useRef } from "react";
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

// ============================================
// LANDING PAGE
// ============================================

function LandingPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] overflow-hidden">
      {/* Hero Section */}
      <HeroSection />

      {/* Live Stats Section */}
      <LiveStatsSection />

      {/* Problem / Solution */}
      <ProblemSolutionSection />

      {/* Features Grid */}
      <FeaturesSection />

      {/* MNEE Hackathon Banner */}
      <HackathonBanner />

      {/* Footer CTA */}
      <FooterCTA />
    </main>
  );
}

function HeroSection() {
  const stats = useQuery(api.payments.getPublicStats);

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Gradient Orbs */}
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-gradient-to-br from-pink-500/20 to-violet-600/20 rounded-full blur-3xl animate-hero-float" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-gradient-to-br from-blue-500/15 to-cyan-500/15 rounded-full blur-3xl animate-hero-float-delayed" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-full blur-3xl animate-hero-pulse" />
        
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
            Live on Ethereum
          </span>
          <span className="h-4 w-px bg-[#333]" />
          <span className="text-sm font-medium text-emerald-400">
            {stats?.totalPayments ?? "..."} payments processed
          </span>
        </div>

        {/* Main Headline */}
        <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tight mb-6 animate-fade-in-up animation-delay-100">
          Payment Infrastructure
          <span className="block mt-2 bg-gradient-to-r from-pink-400 via-violet-400 to-blue-400 bg-clip-text text-transparent animate-gradient-x">
            for AI Agents
          </span>
        </h1>

        {/* Subheadline */}
        <p className="text-xl md:text-2xl text-[#888] max-w-3xl mx-auto mb-10 animate-fade-in-up animation-delay-200 leading-relaxed">
          Enable autonomous AI agents to pay for services, manage treasuries, 
          and transact with <span className="text-white font-medium">MNEE stablecoin</span> on Ethereum.
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
            href="/hackathon"
            className="group px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-pink-500/20 to-violet-500/20 hover:from-pink-500/30 hover:to-violet-500/30 rounded-xl transition-all border border-pink-500/30 hover:border-pink-500/50"
          >
            <span className="flex items-center gap-2">
              <TrophyIcon className="w-5 h-5 text-pink-400" />
              MNEE Hackathon Entry
            </span>
          </Link>
        </div>

        {/* Trust Indicators */}
        <div className="flex items-center justify-center gap-8 mt-12 animate-fade-in-up animation-delay-400">
          <div className="flex items-center gap-2 text-sm text-[#666]">
            <EthereumIcon className="w-5 h-5" />
            <span>Ethereum Mainnet</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-[#666]">
            <ShieldIcon className="w-5 h-5" />
            <span>Non-Custodial</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-[#666]">
            <BoltIcon className="w-5 h-5" />
            <span>Real-time</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function LiveStatsSection() {
  const stats = useQuery(api.payments.getPublicStats);

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
            Watch AI agents transact in real-time across the x402 Gateway network.
          </p>
        </div>

        {/* Activity Chart */}
        <PublicActivityChart />

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

function PublicActivityChart() {
  const timeline = useQuery(api.payments.getPublicActivityTimeline, { windowSeconds: 60 });
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

  return (
    <div className={`bg-gradient-to-br ${accent ? accentColors[accent] : "from-[#1a1a1a] to-[#111] border-[#333]"} border rounded-xl p-5`}>
      <div className={`mb-3 ${accent ? iconColors[accent] : "text-[#666]"}`}>
        {icon}
      </div>
      <p className="text-xs text-[#666] uppercase tracking-wider mb-1">{label}</p>
      {loading ? (
        <div className="h-8 w-24 bg-[#1a1a1a] rounded animate-pulse" />
      ) : (
        <p className="text-2xl font-bold text-white">
          {typeof value === "number" && value % 1 !== 0
            ? value.toFixed(2)
            : value.toLocaleString()}
          {suffix && <span className="text-base text-[#888]">{suffix}</span>}
        </p>
      )}
    </div>
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
                AI Agents Can&apos;t Pay for Services
              </h3>
              <p className="text-[#888] leading-relaxed mb-6">
                AI agents need to access APIs, compute resources, and data services to function autonomously. 
                But traditional payment systems require human intervention for every transaction.
              </p>
              <ul className="space-y-3">
                {[
                  "No native payment capability for AI agents",
                  "Manual approval bottlenecks for every transaction",
                  "No budget controls or spending policies",
                  "No real-time visibility into agent spending",
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
                x402 Gateway + MNEE Stablecoin
              </h3>
              <p className="text-[#888] leading-relaxed mb-6">
                A programmable payment gateway that enables AI agents to transact autonomously using MNEE, 
                a USD-backed stablecoin on Ethereum, with full budget controls and real-time analytics.
              </p>
              <ul className="space-y-3">
                {[
                  "Autonomous payments via API keys",
                  "Programmable spending policies and limits",
                  "Non-custodial treasury management",
                  "Real-time analytics and audit trails",
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

function FeaturesSection() {
  const features = [
    {
      icon: <KeyIcon className="w-6 h-6" />,
      title: "Secure API Keys",
      description: "Generate API keys for each agent with workspace isolation. Keys are hashed — only you see the full key once.",
      gradient: "from-amber-500 to-orange-600",
    },
    {
      icon: <ShieldCheckIcon className="w-6 h-6" />,
      title: "Payment Policies",
      description: "Set spending limits, allowed providers, and budget caps. Control exactly what each agent can spend.",
      gradient: "from-emerald-500 to-teal-600",
    },
    {
      icon: <ChartIcon className="w-6 h-6" />,
      title: "Real-time Analytics",
      description: "Monitor payments as they happen. Full audit trail of every transaction across all agents.",
      gradient: "from-violet-500 to-purple-600",
    },
    {
      icon: <SwapIcon className="w-6 h-6" />,
      title: "Token Swaps",
      description: "Pay providers in any token. x402 automatically swaps from your treasury token to the required currency.",
      gradient: "from-blue-500 to-cyan-600",
    },
    {
      icon: <VaultIcon className="w-6 h-6" />,
      title: "Treasury Management",
      description: "Non-custodial smart contract treasuries. Deposit funds that only your agents can access within policy limits.",
      gradient: "from-pink-500 to-rose-600",
    },
    {
      icon: <CodeIcon className="w-6 h-6" />,
      title: "SDK Integration",
      description: "Drop-in SDK for AI agents. Works with any agent framework — just wrap HTTP calls with x402.",
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
            built on Ethereum with MNEE stablecoin.
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

function HackathonBanner() {
  return (
    <section className="py-16">
      <div className="max-w-5xl mx-auto px-4">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-pink-500/20 via-violet-500/20 to-blue-500/20 border border-pink-500/30 p-1">
          <div className="bg-[#0a0a0a]/90 rounded-[calc(1.5rem-4px)] p-8 md:p-12">
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:32px_32px] opacity-50" />

            <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
              {/* Trophy Icon */}
              <div className="flex-shrink-0">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-pink-500 to-violet-600 flex items-center justify-center shadow-lg shadow-pink-500/25">
                  <TrophyIcon className="w-12 h-12 text-white" />
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 text-center md:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-pink-500/20 border border-pink-500/30 rounded-full text-pink-400 text-sm font-medium mb-3">
                  MNEE Hackathon Entry
                </div>
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-3">
                  Building the Future of Agent Commerce
                </h3>
                <p className="text-[#888] mb-6 max-w-xl">
                  x402 Gateway is our submission to the MNEE Hackathon in the 
                  <span className="text-white font-medium"> AI & Agent Payments</span> track. 
                  See how we&apos;re meeting all judging criteria.
                </p>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <Link
                    href="/hackathon"
                    className="group px-6 py-3 bg-white text-black font-semibold rounded-xl hover:bg-gray-100 transition-all flex items-center gap-2"
                  >
                    View Full Submission
                    <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <a
                    href="https://mnee.io"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#888] hover:text-white transition-colors flex items-center gap-2"
                  >
                    Learn about MNEE
                    <ExternalLinkIcon className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {/* Prize Badge */}
              <div className="flex-shrink-0 hidden lg:block">
                <div className="bg-[#111] border border-[#333] rounded-xl p-4 text-center">
                  <p className="text-xs text-[#666] uppercase tracking-wider mb-1">Prize Pool</p>
                  <p className="text-2xl font-bold text-white">$50,000</p>
                  <p className="text-xs text-[#888]">in MNEE</p>
                </div>
              </div>
            </div>
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
// LANDING PAGE ICONS
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
      <path d="M11.944 17.97L4.58 13.62 11.943 24l7.37-10.38-7.372 4.35h.003zM12.056 0L4.69 12.223l7.365 4.354 7.365-4.35L12.056 0z" />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
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

function SwapIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
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

function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
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
