"use client";

import Link from "next/link";
import { SignUpButton } from "@clerk/nextjs";

export default function HackathonPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a]">
      {/* Hero Section */}
      <HeroSection />

      {/* Project Overview */}
      <ProjectOverview />

      {/* Track Alignment */}
      <TrackAlignment />

      {/* Judging Criteria */}
      <JudgingCriteria />

      {/* Technical Architecture */}
      <TechnicalArchitecture />

      {/* MNEE Integration */}
      <MNEEIntegration />

      {/* Demo & Links */}
      <DemoSection />

      {/* CTA */}
      <CTASection />
    </main>
  );
}

function HeroSection() {
  return (
    <section className="relative py-20 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-gradient-to-br from-pink-500/20 to-violet-600/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-gradient-to-br from-blue-500/15 to-cyan-500/15 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_70%)]" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4">
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[#888] hover:text-white transition-colors mb-8"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Back to Home
        </Link>

        {/* Badge */}
        <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-gradient-to-r from-pink-500/20 to-violet-500/20 border border-pink-500/30 rounded-full mb-6">
          <TrophyIcon className="w-5 h-5 text-pink-400" />
          <span className="text-sm font-medium text-white">MNEE Hackathon Submission</span>
          <span className="h-4 w-px bg-pink-500/30" />
          <span className="text-sm font-medium text-pink-400">AI & Agent Payments Track</span>
        </div>

        {/* Title */}
        <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
          xFour
          <span className="block mt-2 text-3xl md:text-4xl bg-gradient-to-r from-pink-400 to-violet-400 bg-clip-text text-transparent">
            Programmable Payments for AI Agents
          </span>
        </h1>

        {/* Description */}
        <p className="text-xl text-[#888] max-w-3xl mb-8 leading-relaxed">
          A non-custodial payment gateway enabling AI agents to autonomously transact 
          using MNEE stablecoin on Ethereum. Built for the future of agent commerce.
        </p>

        {/* Quick Stats */}
        <div className="flex flex-wrap gap-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-[#888]">Live on Ethereum</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-[#888]">MNEE Integrated</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-violet-500" />
            <span className="text-[#888]">Open Source</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProjectOverview() {
  return (
    <section className="py-16 border-t border-[#222]">
      <div className="max-w-5xl mx-auto px-4">
        <SectionHeader
          badge="Project Overview"
          title="What is xFour?"
          description="A complete infrastructure layer for autonomous AI payments"
        />

        <div className="grid md:grid-cols-2 gap-8 mt-12">
          <div className="bg-[#111] border border-[#333] rounded-2xl p-8">
            <h3 className="text-xl font-semibold text-white mb-4">The Problem</h3>
            <p className="text-[#888] leading-relaxed mb-4">
              AI agents are becoming autonomous economic actors, but they lack the infrastructure 
              to transact. Traditional payment systems require human intervention for every transaction, 
              creating bottlenecks in AI workflows.
            </p>
            <ul className="space-y-2 text-[#888]">
              <li className="flex items-start gap-2">
                <XIcon className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                No native payment capability for AI agents
              </li>
              <li className="flex items-start gap-2">
                <XIcon className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                Manual approval creates workflow friction
              </li>
              <li className="flex items-start gap-2">
                <XIcon className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                No programmable spending controls
              </li>
            </ul>
          </div>

          <div className="bg-[#111] border border-[#333] rounded-2xl p-8">
            <h3 className="text-xl font-semibold text-white mb-4">Our Solution</h3>
            <p className="text-[#888] leading-relaxed mb-4">
              xFour is a programmable payment infrastructure that enables AI agents to 
              autonomously transact using MNEE stablecoin, with full budget controls, 
              policy enforcement, and real-time analytics.
            </p>
            <ul className="space-y-2 text-[#888]">
              <li className="flex items-start gap-2">
                <CheckIcon className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                API keys for autonomous agent payments
              </li>
              <li className="flex items-start gap-2">
                <CheckIcon className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                Programmable spending policies
              </li>
              <li className="flex items-start gap-2">
                <CheckIcon className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                Non-custodial smart contract treasury
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function TrackAlignment() {
  return (
    <section className="py-16 border-t border-[#222]">
      <div className="max-w-5xl mx-auto px-4">
        <SectionHeader
          badge="Track Alignment"
          title="AI & Agent Payments"
          description="How xFour fits the hackathon track"
        />

        <div className="mt-12 bg-gradient-to-br from-pink-500/10 to-violet-500/10 border border-pink-500/20 rounded-2xl p-8">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-violet-600 flex items-center justify-center flex-shrink-0">
              <BotIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">
                &ldquo;AI & Agent Payments – agents or automated systems paying for services or data&rdquo;
              </h3>
              <p className="text-[#888]">Official MNEE Hackathon Track Description</p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <AlignmentCard
              title="Autonomous Transactions"
              description="Agents can make payments without human approval using API keys with configurable policies"
              icon={<BoltIcon className="w-5 h-5" />}
            />
            <AlignmentCard
              title="Service Payments"
              description="Built specifically for AI agents to pay for APIs, compute, data services, and other resources"
              icon={<ServerIcon className="w-5 h-5" />}
            />
            <AlignmentCard
              title="Automated Systems"
              description="Works with any agent framework or automated system via our SDK and HTTP API"
              icon={<CodeIcon className="w-5 h-5" />}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function AlignmentCard({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-[#0a0a0a]/50 rounded-xl p-5">
      <div className="text-pink-400 mb-3">{icon}</div>
      <h4 className="text-white font-semibold mb-2">{title}</h4>
      <p className="text-sm text-[#888]">{description}</p>
    </div>
  );
}

function JudgingCriteria() {
  const criteria = [
    {
      title: "Technological Implementation",
      weight: "How well does the solution work?",
      points: [
        "Smart contract treasury with non-custodial design",
        "Real-time Convex backend for instant updates",
        "Secure API key system with hashed storage",
        "Token swap integration for flexible payments",
        "Production-ready on Ethereum mainnet",
      ],
      icon: <CodeIcon className="w-6 h-6" />,
      color: "from-blue-500 to-cyan-600",
    },
    {
      title: "Design & User Experience",
      weight: "Is the product intuitive and well-designed?",
      points: [
        "Clean, modern dashboard for workspace management",
        "Real-time activity visualization",
        "Simple SDK integration for developers",
        "Clear onboarding flow",
        "Mobile-responsive interface",
      ],
      icon: <PaletteIcon className="w-6 h-6" />,
      color: "from-violet-500 to-purple-600",
    },
    {
      title: "Impact Potential",
      weight: "Could this project make a real difference?",
      points: [
        "Enables new AI commerce use cases",
        "Reduces friction in agent workflows",
        "Scalable to millions of transactions",
        "Works with any AI agent framework",
        "Open source for community adoption",
      ],
      icon: <RocketIcon className="w-6 h-6" />,
      color: "from-emerald-500 to-teal-600",
    },
    {
      title: "Originality & Quality of Idea",
      weight: "Is the concept fresh and compelling?",
      points: [
        "First payment gateway designed for AI agents",
        "Novel use of MNEE for programmable money",
        "Unique policy-based spending controls",
        "Treasury abstraction for team budgets",
        "SDK-first developer experience",
      ],
      icon: <SparklesIcon className="w-6 h-6" />,
      color: "from-amber-500 to-orange-600",
    },
    {
      title: "Solves Real Coordination Problems",
      weight: "Does it improve collective decision-making?",
      points: [
        "Treasury transparency for organizations",
        "Shared budgeting across agents",
        "Audit trails for all transactions",
        "Policy enforcement at transaction time",
        "Multi-agent coordination via workspaces",
      ],
      icon: <NetworkIcon className="w-6 h-6" />,
      color: "from-pink-500 to-rose-600",
    },
  ];

  return (
    <section className="py-16 border-t border-[#222]">
      <div className="max-w-5xl mx-auto px-4">
        <SectionHeader
          badge="Judging Criteria"
          title="How We Meet Each Criterion"
          description="Detailed breakdown of our submission against hackathon requirements"
        />

        <div className="mt-12 space-y-6">
          {criteria.map((criterion, i) => (
            <div
              key={i}
              className="bg-[#111] border border-[#333] rounded-2xl p-6 hover:border-[#444] transition-colors"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${criterion.color} flex items-center justify-center flex-shrink-0 text-white`}>
                  {criterion.icon}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">{criterion.title}</h3>
                  <p className="text-sm text-[#888]">{criterion.weight}</p>
                </div>
              </div>
              <ul className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {criterion.points.map((point, j) => (
                  <li key={j} className="flex items-start gap-2 text-[#888] text-sm">
                    <CheckIcon className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TechnicalArchitecture() {
  return (
    <section className="py-16 border-t border-[#222]">
      <div className="max-w-5xl mx-auto px-4">
        <SectionHeader
          badge="Technical Architecture"
          title="Built for Scale & Security"
          description="A modern stack designed for production AI commerce"
        />

        <div className="mt-12 grid md:grid-cols-2 gap-8">
          {/* Architecture Diagram */}
          <div className="bg-[#111] border border-[#333] rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-6">System Architecture</h3>
            <div className="space-y-4">
              <ArchitectureLayer
                label="AI Agents / SDKs"
                description="Any agent framework using x402 SDK"
                color="from-violet-500 to-purple-600"
              />
              <div className="flex justify-center">
                <ArrowDownIcon className="w-5 h-5 text-[#666]" />
              </div>
              <ArchitectureLayer
              label="xFour Gateway API"
              description="Next.js API routes with policy enforcement"
                color="from-blue-500 to-cyan-600"
              />
              <div className="flex justify-center">
                <ArrowDownIcon className="w-5 h-5 text-[#666]" />
              </div>
              <ArchitectureLayer
                label="Convex Backend"
                description="Real-time database & business logic"
                color="from-emerald-500 to-teal-600"
              />
              <div className="flex justify-center">
                <ArrowDownIcon className="w-5 h-5 text-[#666]" />
              </div>
              <ArchitectureLayer
                label="Ethereum + MNEE"
                description="Smart contract treasury & stablecoin payments"
                color="from-pink-500 to-rose-600"
              />
            </div>
          </div>

          {/* Tech Stack */}
          <div className="space-y-6">
            <div className="bg-[#111] border border-[#333] rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Tech Stack</h3>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { name: "Next.js 15", category: "Frontend" },
                  { name: "Convex", category: "Backend" },
                  { name: "Ethereum", category: "Blockchain" },
                  { name: "MNEE", category: "Stablecoin" },
                  { name: "Clerk", category: "Auth" },
                  { name: "TypeScript", category: "Language" },
                  { name: "Tailwind CSS", category: "Styling" },
                  { name: "Hardhat", category: "Contracts" },
                ].map((tech, i) => (
                  <div key={i} className="bg-[#0a0a0a] rounded-lg p-3">
                    <p className="text-white font-medium">{tech.name}</p>
                    <p className="text-xs text-[#666]">{tech.category}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#111] border border-[#333] rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Key Features</h3>
              <ul className="space-y-3">
                {[
                  "Non-custodial smart contract treasury",
                  "Real-time payment tracking",
                  "Policy-based spending controls",
                  "Automatic token swaps",
                  "Full audit trail",
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-[#888]">
                    <CheckIcon className="w-4 h-4 text-emerald-400" />
                    {feature}
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

function ArchitectureLayer({
  label,
  description,
  color,
}: {
  label: string;
  description: string;
  color: string;
}) {
  return (
    <div className={`bg-gradient-to-r ${color} p-[1px] rounded-lg`}>
      <div className="bg-[#111] rounded-lg p-4">
        <p className="text-white font-medium">{label}</p>
        <p className="text-xs text-[#888]">{description}</p>
      </div>
    </div>
  );
}

function MNEEIntegration() {
  return (
    <section className="py-16 border-t border-[#222]">
      <div className="max-w-5xl mx-auto px-4">
        <SectionHeader
          badge="MNEE Integration"
          title="Built on MNEE Stablecoin"
          description="Using the official MNEE contract for programmable payments"
        />

        <div className="mt-12 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-2xl p-8">
          <div className="flex flex-col md:flex-row items-start gap-8">
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-white mb-4">
                Contract Address
              </h3>
              <div className="bg-[#0a0a0a] border border-[#333] rounded-lg p-4 font-mono text-sm break-all mb-6">
                <span className="text-[#888]">Ethereum Mainnet:</span>
                <br />
                <span className="text-blue-400">0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF</span>
              </div>

              <h3 className="text-xl font-semibold text-white mb-4">
                How We Use MNEE
              </h3>
              <ul className="space-y-3">
                {[
                  "Treasury deposits and withdrawals in MNEE",
                  "Agent payments to service providers",
                  "Automatic swaps from other tokens to MNEE",
                  "Non-custodial escrow in smart contracts",
                  "Real-time balance tracking",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-[#888]">
                    <CheckIcon className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex-shrink-0 w-full md:w-auto">
              <div className="bg-[#0a0a0a] border border-[#333] rounded-xl p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center mx-auto mb-4">
                  <CurrencyIcon className="w-8 h-8 text-white" />
                </div>
                <p className="text-2xl font-bold text-white mb-1">MNEE</p>
                <p className="text-sm text-[#888]">USD-backed Stablecoin</p>
                <p className="text-xs text-[#666] mt-2">on Ethereum</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function DemoSection() {
  return (
    <section className="py-16 border-t border-[#222]">
      <div className="max-w-5xl mx-auto px-4">
        <SectionHeader
          badge="Try It Out"
          title="Demo & Resources"
          description="Everything you need to evaluate our submission"
        />

        <div className="mt-12 grid md:grid-cols-3 gap-6">
          <DemoCard
            title="Live Demo"
            description="Try the full xFour platform with test transactions"
            href="/sdk-demo"
            icon={<PlayIcon className="w-6 h-6" />}
            gradient="from-emerald-500 to-teal-600"
            internal
          />
          <DemoCard
            title="Source Code"
            description="View the full open-source codebase on GitHub"
            href="https://github.com/x402-gateway"
            icon={<GithubIcon className="w-6 h-6" />}
            gradient="from-[#333] to-[#111]"
          />
          <DemoCard
            title="Documentation"
            description="Technical docs, API reference, and integration guides"
            href="/docs"
            icon={<BookIcon className="w-6 h-6" />}
            gradient="from-violet-500 to-purple-600"
            internal
          />
        </div>

        {/* Submission Checklist */}
        <div className="mt-12 bg-[#111] border border-[#333] rounded-2xl p-8">
          <h3 className="text-xl font-semibold text-white mb-6">
            Submission Checklist
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { item: "Project Description", done: true },
              { item: "Demo Video (up to 5 minutes)", done: true },
              { item: "Working Demo / Live URL", done: true },
              { item: "Public Code Repository", done: true },
              { item: "Setup Instructions", done: true },
              { item: "Open-source License", done: true },
              { item: "English Language", done: true },
              { item: "MNEE Contract Integration", done: true },
            ].map((check, i) => (
              <div
                key={i}
                className="flex items-center gap-3 bg-[#0a0a0a] rounded-lg p-3"
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${check.done ? "bg-emerald-500/20" : "bg-[#1a1a1a]"}`}>
                  {check.done ? (
                    <CheckIcon className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <div className="w-3 h-3 rounded-full bg-[#333]" />
                  )}
                </div>
                <span className={check.done ? "text-white" : "text-[#666]"}>
                  {check.item}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function DemoCard({
  title,
  description,
  href,
  icon,
  gradient,
  internal,
}: {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  gradient: string;
  internal?: boolean;
}) {
  const content = (
    <div className="group bg-[#111] border border-[#333] rounded-2xl p-6 hover:border-[#444] transition-all hover:-translate-y-1 h-full">
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-[#888]">{description}</p>
    </div>
  );

  if (internal) {
    return <Link href={href}>{content}</Link>;
  }

  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {content}
    </a>
  );
}

function CTASection() {
  return (
    <section className="py-16 border-t border-[#222]">
      <div className="max-w-3xl mx-auto px-4 text-center">
        <h2 className="text-3xl font-bold text-white mb-4">
          Experience the Future of Agent Payments
        </h2>
        <p className="text-lg text-[#888] mb-8">
          Sign up to try xFour and see how AI agents can transact autonomously with MNEE stablecoin.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <SignUpButton mode="modal">
            <button className="group px-8 py-4 text-lg font-semibold text-black bg-white hover:bg-gray-100 rounded-xl transition-all flex items-center gap-2">
              Get Started Free
              <ArrowRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </SignUpButton>
          <a
            href="https://mnee.io"
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-4 text-lg font-semibold text-[#888] hover:text-white transition-colors flex items-center gap-2"
          >
            Learn about MNEE
            <ExternalLinkIcon className="w-5 h-5" />
          </a>
        </div>
      </div>
    </section>
  );
}

function SectionHeader({
  badge,
  title,
  description,
}: {
  badge: string;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] border border-[#333] rounded-full text-sm font-medium text-[#888] mb-4">
        {badge}
      </div>
      <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">{title}</h2>
      <p className="text-lg text-[#888] max-w-2xl mx-auto">{description}</p>
    </div>
  );
}

// Icons
function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
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

function TrophyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
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

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function BotIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
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

function ServerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
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

function PaletteIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
    </svg>
  );
}

function RocketIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
    </svg>
  );
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
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

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

function BookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
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

function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  );
}

