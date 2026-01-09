export default function ConceptsPage() {
  return (
    <article className="prose prose-invert max-w-none">
      {/* Hero */}
      <div className="not-prose mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-violet-500/10 border border-violet-500/30 rounded-full text-violet-400 text-sm font-medium mb-4">
          <span className="text-lg">💡</span>
          Concepts
        </div>
        <h1 className="text-4xl font-bold text-white mb-4">
          How x402 Works
        </h1>
        <p className="text-xl text-[#888]">
          Understand the protocol, payment flow, and key concepts behind x402.
        </p>
      </div>

      {/* HTTP 402 */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-4">
          The HTTP 402 Status Code
        </h2>
        <p className="text-[#888] leading-relaxed mb-4">
          HTTP 402 &quot;Payment Required&quot; was defined in 1999 as part of the HTTP
          specification, reserved for future use in digital payment systems.
          After 25 years, x402 finally puts it to work.
        </p>
        <p className="text-[#888] leading-relaxed">
          When a server returns 402, it signals that the requested resource
          requires payment. The response includes headers that describe how to
          make that payment.
        </p>

        <div className="not-prose mt-6 bg-[#111] border border-[#333] rounded-xl overflow-hidden">
          <div className="px-4 py-2 border-b border-[#333] flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500" />
            <span className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="w-3 h-3 rounded-full bg-green-500" />
            <span className="ml-2 text-xs text-[#666] font-mono">
              Response Headers
            </span>
          </div>
          <pre className="p-4 overflow-x-auto">
            <code className="text-sm font-mono">
              <span className="text-red-400">HTTP/1.1 402 Payment Required</span>
              {"\n"}
              <span className="text-violet-400">X-402-Invoice-Id:</span>{" "}
              <span className="text-emerald-400">inv_abc123xyz</span>
              {"\n"}
              <span className="text-violet-400">X-402-Amount:</span>{" "}
              <span className="text-emerald-400">0.05</span>
              {"\n"}
              <span className="text-violet-400">X-402-Pay-To:</span>{" "}
              <span className="text-emerald-400">1ABC...xyz</span>
              {"\n"}
              <span className="text-violet-400">X-402-Network:</span>{" "}
              <span className="text-emerald-400">mainnet</span>
              {"\n"}
              <span className="text-violet-400">X-402-Description:</span>{" "}
              <span className="text-emerald-400">AI Completion API</span>
            </code>
          </pre>
        </div>
      </section>

      {/* Payment Flow */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-4">The Payment Flow</h2>
        <p className="text-[#888] leading-relaxed mb-6">
          When an agent makes a request to a paid API, here&apos;s what happens:
        </p>

        <div className="not-prose space-y-4">
          <FlowStep
            number={1}
            title="Initial Request"
            description="Agent makes a request to the API endpoint"
            color="blue"
          />
          <FlowStep
            number={2}
            title="402 Response"
            description="API returns 402 Payment Required with X-402 headers"
            color="amber"
          />
          <FlowStep
            number={3}
            title="Quote Request"
            description="Agent SDK calls Gateway /quote with the payment details"
            color="violet"
          />
          <FlowStep
            number={4}
            title="Policy Check"
            description="Gateway checks agent policies (limits, allowed providers, etc.)"
            color="pink"
          />
          <FlowStep
            number={5}
            title="Payment Execution"
            description="If allowed, Gateway executes MNEE payment and returns proof"
            color="emerald"
          />
          <FlowStep
            number={6}
            title="Retry with Proof"
            description="Agent SDK retries original request with payment proof header"
            color="blue"
          />
          <FlowStep
            number={7}
            title="Success"
            description="API verifies proof and returns the requested resource"
            color="emerald"
          />
        </div>
      </section>

      {/* Key Entities */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-4">Key Entities</h2>

        <div className="not-prose grid sm:grid-cols-2 gap-4">
          <EntityCard
            icon="🏢"
            title="Workspace"
            description="An isolated environment containing agents, wallets, and policies. Each workspace has its own MNEE treasury."
          />
          <EntityCard
            icon="🤖"
            title="Agent"
            description="An AI system or application that consumes paid APIs. Each agent has an API key and can have individual spending policies."
          />
          <EntityCard
            icon="🔌"
            title="Provider"
            description="An API that accepts x402 payments. Providers receive MNEE directly to their wallet address."
          />
          <EntityCard
            icon="💰"
            title="Treasury"
            description="The workspace's MNEE wallet. Agents draw from this balance when making payments."
          />
          <EntityCard
            icon="📋"
            title="Policy"
            description="Rules that govern agent spending: daily limits, per-request limits, allowed providers, etc."
          />
          <EntityCard
            icon="🧾"
            title="Invoice"
            description="A unique identifier for a payment request, generated by the provider and verified after payment."
          />
        </div>
      </section>

      {/* MNEE */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-4">About MNEE</h2>
        <p className="text-[#888] leading-relaxed mb-4">
          MNEE is a USD-backed stablecoin built on Bitcoin (BSV). It provides
          the payment layer for x402 with several key advantages:
        </p>

        <ul className="space-y-3 text-[#888]">
          <li className="flex items-start gap-3">
            <CheckIcon className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <span>
              <strong className="text-white">Instant Settlement</strong> —
              Payments settle in seconds, not minutes or days
            </span>
          </li>
          <li className="flex items-start gap-3">
            <CheckIcon className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <span>
              <strong className="text-white">Near-Zero Fees</strong> —
              Transaction costs are fractions of a cent
            </span>
          </li>
          <li className="flex items-start gap-3">
            <CheckIcon className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <span>
              <strong className="text-white">USD-Backed</strong> — 1 MNEE = $1
              USD, fully backed and redeemable
            </span>
          </li>
          <li className="flex items-start gap-3">
            <CheckIcon className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <span>
              <strong className="text-white">Programmable</strong> — Native
              support for micropayments and automation
            </span>
          </li>
        </ul>

        <div className="not-prose mt-6 p-4 bg-[#111] border border-[#333] rounded-xl">
          <p className="text-sm text-[#888]">
            Learn more about MNEE at{" "}
            <a
              href="https://mnee.io"
              target="_blank"
              rel="noopener noreferrer"
              className="text-pink-400 hover:text-pink-300"
            >
              mnee.io
            </a>
          </p>
        </div>
      </section>

      {/* Security */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-4">Security Model</h2>
        
        <h3 className="text-lg font-semibold text-white mb-3">Non-Custodial Wallets</h3>
        <p className="text-[#888] leading-relaxed mb-4">
          Each workspace generates its own MNEE wallet. The private key is
          encrypted with a key only the workspace controls. The Gateway never
          has direct access to wallet private keys.
        </p>

        <h3 className="text-lg font-semibold text-white mb-3">API Key Security</h3>
        <p className="text-[#888] leading-relaxed mb-4">
          Agent API keys are hashed before storage. The full key is only shown
          once at creation time. Keys can be rotated or revoked at any time.
        </p>

        <h3 className="text-lg font-semibold text-white mb-3">Payment Verification</h3>
        <p className="text-[#888] leading-relaxed">
          Providers verify payment proofs through the Gateway. Each proof is
          cryptographically signed and includes the transaction hash for
          on-chain verification.
        </p>
      </section>

      {/* Gateway Architecture */}
      <section className="not-prose">
        <h2 className="text-2xl font-bold text-white mb-6">
          Gateway Architecture
        </h2>

        <div className="bg-[#111] border border-[#333] rounded-xl p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            {/* Agent Side */}
            <div className="flex-1">
              <div className="text-center mb-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-3xl mb-2">
                  🤖
                </div>
                <h4 className="text-sm font-semibold text-white">Agents</h4>
                <p className="text-xs text-[#666]">@x402/agent SDK</p>
              </div>
            </div>

            {/* Arrow */}
            <div className="hidden md:block">
              <ArrowIcon className="w-8 h-8 text-[#444]" />
            </div>

            {/* Gateway */}
            <div className="flex-1">
              <div className="text-center mb-4">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-pink-500 to-violet-600 text-4xl mb-2">
                  ⚡
                </div>
                <h4 className="text-sm font-semibold text-white">x402 Gateway</h4>
                <p className="text-xs text-[#666]">Policy & Payment Engine</p>
              </div>
              <div className="text-center">
                <span className="inline-block px-3 py-1 bg-[#1a1a1a] rounded-full text-xs text-[#888]">
                  Quotes • Payments • Verification
                </span>
              </div>
            </div>

            {/* Arrow */}
            <div className="hidden md:block">
              <ArrowIcon className="w-8 h-8 text-[#444]" />
            </div>

            {/* Provider Side */}
            <div className="flex-1">
              <div className="text-center mb-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-3xl mb-2">
                  🔌
                </div>
                <h4 className="text-sm font-semibold text-white">Providers</h4>
                <p className="text-xs text-[#666]">@x402/server SDK</p>
              </div>
            </div>
          </div>

          {/* MNEE Layer */}
          <div className="mt-6 pt-6 border-t border-[#333] text-center">
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-full">
              <span className="text-lg">💎</span>
              <span className="text-sm font-medium text-amber-400">
                MNEE Stablecoin Layer (BSV)
              </span>
            </span>
          </div>
        </div>
      </section>
    </article>
  );
}

function FlowStep({
  number,
  title,
  description,
  color,
}: {
  number: number;
  title: string;
  description: string;
  color: "blue" | "amber" | "violet" | "pink" | "emerald";
}) {
  const colors = {
    blue: "from-blue-500 to-blue-600",
    amber: "from-amber-500 to-amber-600",
    violet: "from-violet-500 to-violet-600",
    pink: "from-pink-500 to-pink-600",
    emerald: "from-emerald-500 to-emerald-600",
  };

  return (
    <div className="flex items-start gap-4">
      <div
        className={`w-8 h-8 rounded-full bg-gradient-to-br ${colors[color]} flex items-center justify-center flex-shrink-0`}
      >
        <span className="text-sm font-bold text-white">{number}</span>
      </div>
      <div>
        <h4 className="text-base font-semibold text-white">{title}</h4>
        <p className="text-sm text-[#888]">{description}</p>
      </div>
    </div>
  );
}

function EntityCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-[#111] border border-[#333] rounded-xl p-5">
      <div className="text-2xl mb-3">{icon}</div>
      <h4 className="text-base font-semibold text-white mb-1">{title}</h4>
      <p className="text-sm text-[#888]">{description}</p>
    </div>
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

function ArrowIcon({ className }: { className?: string }) {
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


