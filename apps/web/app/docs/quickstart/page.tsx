import Link from "next/link";

export default function QuickstartPage() {
  return (
    <article className="prose prose-invert max-w-none">
      {/* Hero */}
      <div className="not-prose mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-400 text-sm font-medium mb-4">
          <span className="text-lg">🚀</span>
          Quickstart
        </div>
        <h1 className="text-4xl font-bold text-white mb-4">
          Get Started in 5 Minutes
        </h1>
        <p className="text-xl text-[#888]">
          Set up x402 payments in your AI agent or API in just a few steps.
        </p>
      </div>

      {/* Prerequisites */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-4">Prerequisites</h2>
        <ul className="space-y-2 text-[#888]">
          <li>Node.js 18+ installed</li>
          <li>A package manager (npm, pnpm, or yarn)</li>
          <li>
            An x402 Gateway account —{" "}
            <Link href="/" className="text-pink-400 hover:text-pink-300">
              sign up free
            </Link>
          </li>
        </ul>
      </section>

      {/* Choose Your Path */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-4">Choose Your Path</h2>
        <p className="text-[#888] mb-6">
          x402 has two sides. Choose based on what you&apos;re building:
        </p>

        <div className="not-prose grid sm:grid-cols-2 gap-4">
          <Link
            href="#agent-setup"
            className="group block bg-[#111] border border-[#333] hover:border-emerald-500/50 rounded-xl p-6 transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-2xl mb-4">
              🤖
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              I&apos;m building an agent
            </h3>
            <p className="text-sm text-[#888]">
              My agent needs to consume paid APIs and make payments
              automatically.
            </p>
          </Link>

          <Link
            href="#server-setup"
            className="group block bg-[#111] border border-[#333] hover:border-blue-500/50 rounded-xl p-6 transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-2xl mb-4">
              🔌
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              I&apos;m building an API
            </h3>
            <p className="text-sm text-[#888]">
              I want to monetize my API endpoints and receive payments from
              agents.
            </p>
          </Link>
        </div>
      </section>

      {/* Agent Setup */}
      <section id="agent-setup" className="mb-12 scroll-mt-24">
        <div className="not-prose flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-xl">
            🤖
          </div>
          <h2 className="text-2xl font-bold text-white">Agent Setup</h2>
        </div>

        <h3 className="text-lg font-semibold text-white mb-3">
          Step 1: Install the SDK
        </h3>
        <CodeBlock language="bash">{`npm install @x402/agent
# or
pnpm add @x402/agent`}</CodeBlock>

        <h3 className="text-lg font-semibold text-white mb-3 mt-8">
          Step 2: Create an API Key
        </h3>
        <p className="text-[#888] mb-4">
          Log into the x402 Gateway dashboard and navigate to{" "}
          <strong className="text-white">Agents → Create API Key</strong>. Copy
          the key — you&apos;ll only see it once.
        </p>

        <h3 className="text-lg font-semibold text-white mb-3 mt-8">
          Step 3: Initialize the Client
        </h3>
        <CodeBlock language="typescript">{`import { createAgentClient } from '@x402/agent';

const client = createAgentClient({
  gatewayBaseUrl: 'https://xfour.xyz/api/gateway',
  apiKey: process.env.X402_AGENT_KEY!,
});`}</CodeBlock>

        <h3 className="text-lg font-semibold text-white mb-3 mt-8">
          Step 4: Make Paid Requests
        </h3>
        <CodeBlock language="typescript">{`// Use fetchWithX402 just like regular fetch
// x402 payments are handled automatically!
const response = await client.fetchWithX402(
  'https://api.example.com/ai/complete',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: 'Hello world' }),
  }
);

const result = await response.json();
console.log(result);`}</CodeBlock>

        <div className="not-prose mt-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
          <p className="text-sm text-emerald-400">
            <strong>That&apos;s it!</strong> When the API returns 402, the SDK
            automatically handles the payment flow and retries with proof.
          </p>
        </div>
      </section>

      {/* Server Setup */}
      <section id="server-setup" className="mb-12 scroll-mt-24">
        <div className="not-prose flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xl">
            🔌
          </div>
          <h2 className="text-2xl font-bold text-white">Server Setup</h2>
        </div>

        <h3 className="text-lg font-semibold text-white mb-3">
          Step 1: Install the SDK
        </h3>
        <CodeBlock language="bash">{`npm install @x402/server
# or
pnpm add @x402/server`}</CodeBlock>

        <h3 className="text-lg font-semibold text-white mb-3 mt-8">
          Step 2: Register as a Provider
        </h3>
        <p className="text-[#888] mb-4">
          Log into the x402 Gateway dashboard and navigate to{" "}
          <strong className="text-white">Providers → Register</strong>. You&apos;ll
          receive your provider API key and MNEE wallet address.
        </p>

        <h3 className="text-lg font-semibold text-white mb-3 mt-8">
          Step 3: Add Middleware (Express)
        </h3>
        <CodeBlock language="typescript">{`import express from 'express';
import { createX402Middleware } from '@x402/server';

const app = express();
app.use(express.json());

const x402 = createX402Middleware({
  gatewayUrl: 'https://xfour.xyz/api/gateway',
  apiKey: process.env.X402_SERVER_KEY!,
  payToAddress: process.env.MNEE_ADDRESS!,
  network: 'mainnet',
});

// Protect your paid endpoints
app.post('/api/ai/complete',
  x402.requirePayment(0.05), // 0.05 MNEE per request
  async (req, res) => {
    // Only executes if payment verified!
    const result = await processAI(req.body);
    res.json(result);
  }
);

app.listen(3000);`}</CodeBlock>

        <div className="not-prose mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
          <p className="text-sm text-blue-400">
            <strong>Done!</strong> Your endpoint now returns 402 for unpaid
            requests and verifies payment proofs automatically.
          </p>
        </div>
      </section>

      {/* What&apos;s Next */}
      <section className="not-prose">
        <h2 className="text-2xl font-bold text-white mb-6">What&apos;s Next?</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <Link
            href="/docs/concepts"
            className="block bg-[#111] border border-[#333] hover:border-[#444] rounded-xl p-5 transition-all hover:-translate-y-0.5"
          >
            <h3 className="text-base font-semibold text-white mb-1">
              Understand the Concepts
            </h3>
            <p className="text-sm text-[#888]">
              Learn how x402 protocol and MNEE payments work
            </p>
          </Link>
          <Link
            href="/docs/agent"
            className="block bg-[#111] border border-[#333] hover:border-[#444] rounded-xl p-5 transition-all hover:-translate-y-0.5"
          >
            <h3 className="text-base font-semibold text-white mb-1">
              Agent SDK Deep Dive
            </h3>
            <p className="text-sm text-[#888]">
              Full API reference and advanced usage
            </p>
          </Link>
          <Link
            href="/docs/server"
            className="block bg-[#111] border border-[#333] hover:border-[#444] rounded-xl p-5 transition-all hover:-translate-y-0.5"
          >
            <h3 className="text-base font-semibold text-white mb-1">
              Server SDK Deep Dive
            </h3>
            <p className="text-sm text-[#888]">
              Pricing strategies and advanced patterns
            </p>
          </Link>
          <Link
            href="/docs/api"
            className="block bg-[#111] border border-[#333] hover:border-[#444] rounded-xl p-5 transition-all hover:-translate-y-0.5"
          >
            <h3 className="text-base font-semibold text-white mb-1">
              API Reference
            </h3>
            <p className="text-sm text-[#888]">
              Gateway endpoints and error codes
            </p>
          </Link>
        </div>
      </section>
    </article>
  );
}

function CodeBlock({
  children,
  language,
}: {
  children: string;
  language: string;
}) {
  return (
    <div className="not-prose bg-[#0a0a0a] border border-[#333] rounded-xl overflow-hidden mb-4">
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#333]">
        <span className="text-xs text-[#666] font-mono">{language}</span>
        <button className="text-xs text-[#888] hover:text-white transition-colors">
          Copy
        </button>
      </div>
      <pre className="p-4 overflow-x-auto">
        <code className="text-sm text-[#888] font-mono whitespace-pre">
          {children}
        </code>
      </pre>
    </div>
  );
}

