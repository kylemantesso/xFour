import Link from "next/link";

export default function DocsIntroductionPage() {
  return (
    <article className="prose prose-invert max-w-none">
      {/* Hero */}
      <div className="not-prose mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-400 text-sm font-medium mb-4">
          <span className="w-2 h-2 bg-emerald-500 rounded-full" />
          Documentation
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
          x402 Gateway
        </h1>
        <p className="text-xl text-[#888] max-w-2xl">
          Payment infrastructure for AI agents. Enable autonomous payments with
          MNEE stablecoin on Bitcoin.
        </p>
      </div>

      {/* Quick Links */}
      <div className="not-prose grid sm:grid-cols-2 gap-4 mb-12">
        <QuickLinkCard
          href="/docs/quickstart"
          title="Quickstart"
          description="Get up and running in under 5 minutes"
          icon="🚀"
          gradient="from-emerald-500 to-teal-600"
        />
        <QuickLinkCard
          href="/docs/concepts"
          title="Concepts"
          description="Understand how x402 protocol works"
          icon="💡"
          gradient="from-violet-500 to-purple-600"
        />
        <QuickLinkCard
          href="/docs/agent"
          title="Agent SDK"
          description="Build agents that consume paid APIs"
          icon="🤖"
          gradient="from-pink-500 to-rose-600"
        />
        <QuickLinkCard
          href="/docs/server"
          title="Server SDK"
          description="Monetize your APIs with x402"
          icon="🔌"
          gradient="from-blue-500 to-indigo-600"
        />
      </div>

      {/* What is x402? */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-4">What is x402?</h2>
        <p className="text-[#888] leading-relaxed mb-4">
          x402 is a payment protocol that enables AI agents to make and receive
          payments autonomously. Built on the HTTP 402 status code (&quot;Payment
          Required&quot;), it provides a standardized way for APIs to request payment
          and for agents to fulfill those requests.
        </p>
        <p className="text-[#888] leading-relaxed">
          The x402 Gateway handles all payment logic, policy enforcement, and
          settlement using MNEE — a USD-backed stablecoin on Bitcoin (BSV) with
          instant finality and near-zero fees.
        </p>
      </section>

      {/* Two SDKs */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-4">Two Sides of the Protocol</h2>
        
        <div className="not-prose grid sm:grid-cols-2 gap-6">
          <div className="bg-[#111] border border-[#333] rounded-xl p-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-2xl mb-4">
              🤖
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              @x402/agent
            </h3>
            <p className="text-sm text-[#888] mb-4">
              For AI agents and applications that consume paid APIs. Drop-in
              replacement for <code className="text-xs bg-[#1a1a1a] px-1.5 py-0.5 rounded">fetch</code> that
              automatically handles x402 payment flows.
            </p>
            <Link
              href="/docs/agent"
              className="inline-flex items-center gap-2 text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              Learn more
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
          </div>

          <div className="bg-[#111] border border-[#333] rounded-xl p-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-2xl mb-4">
              🔌
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              @x402/server
            </h3>
            <p className="text-sm text-[#888] mb-4">
              For API providers who want to receive x402 payments. Middleware
              for Express, Next.js, and other Node.js frameworks.
            </p>
            <Link
              href="/docs/server"
              className="inline-flex items-center gap-2 text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors"
            >
              Learn more
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Key Features */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-4">Key Features</h2>
        <ul className="space-y-3 text-[#888]">
          <li className="flex items-start gap-3">
            <CheckIcon className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <span>
              <strong className="text-white">Autonomous Payments</strong> — Agents make
              payments without human intervention
            </span>
          </li>
          <li className="flex items-start gap-3">
            <CheckIcon className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <span>
              <strong className="text-white">Policy Controls</strong> — Set spending
              limits, allowed providers, and budget caps
            </span>
          </li>
          <li className="flex items-start gap-3">
            <CheckIcon className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <span>
              <strong className="text-white">MNEE Stablecoin</strong> — USD-backed with
              instant settlement and near-zero fees
            </span>
          </li>
          <li className="flex items-start gap-3">
            <CheckIcon className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <span>
              <strong className="text-white">Real-time Analytics</strong> — Monitor
              payments as they happen with full audit trails
            </span>
          </li>
          <li className="flex items-start gap-3">
            <CheckIcon className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <span>
              <strong className="text-white">Non-Custodial</strong> — Workspaces control
              their own MNEE wallets
            </span>
          </li>
        </ul>
      </section>

      {/* Next Steps */}
      <section className="not-prose">
        <div className="bg-gradient-to-r from-pink-500/10 via-violet-500/10 to-blue-500/10 border border-[#333] rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-2">
            Ready to get started?
          </h3>
          <p className="text-sm text-[#888] mb-4">
            Follow our quickstart guide to set up x402 payments in under 5
            minutes.
          </p>
          <Link
            href="/docs/quickstart"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white text-black font-medium rounded-lg hover:bg-gray-100 transition-colors"
          >
            Start the Quickstart
            <ArrowRightIcon className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </article>
  );
}

function QuickLinkCard({
  href,
  title,
  description,
  icon,
  gradient,
}: {
  href: string;
  title: string;
  description: string;
  icon: string;
  gradient: string;
}) {
  return (
    <Link
      href={href}
      className="group block bg-[#111] border border-[#333] hover:border-[#444] rounded-xl p-5 transition-all hover:-translate-y-0.5"
    >
      <div
        className={`w-10 h-10 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center text-xl mb-3 group-hover:scale-110 transition-transform`}
      >
        {icon}
      </div>
      <h3 className="text-base font-semibold text-white mb-1">{title}</h3>
      <p className="text-sm text-[#888]">{description}</p>
    </Link>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M14 5l7 7m0 0l-7 7m7-7H3"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}


