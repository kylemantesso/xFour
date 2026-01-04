export default function APIReferencePage() {
  return (
    <article className="prose prose-invert max-w-none">
      {/* Hero */}
      <div className="not-prose mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-pink-500/10 border border-pink-500/30 rounded-full text-pink-400 text-sm font-medium mb-4">
          <span className="text-lg">📚</span>
          Reference
        </div>
        <h1 className="text-4xl font-bold text-white mb-4">API Reference</h1>
        <p className="text-xl text-[#888]">
          Complete reference for x402 Gateway endpoints and error codes.
        </p>
      </div>

      {/* Base URL */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-4">Base URL</h2>
        <div className="not-prose bg-[#111] border border-[#333] rounded-xl p-4">
          <code className="text-sm font-mono text-emerald-400">
            https://xfour.xyz/api/gateway
          </code>
        </div>
        <p className="text-[#888] mt-4">
          All API endpoints are relative to this base URL. For local
          development, use{" "}
          <code className="text-xs bg-[#1a1a1a] px-1.5 py-0.5 rounded">
            http://localhost:3000/api/gateway
          </code>
        </p>
      </section>

      {/* Authentication */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-4">Authentication</h2>
        <p className="text-[#888] leading-relaxed mb-4">
          All requests require an API key passed in the{" "}
          <code className="text-xs bg-[#1a1a1a] px-1.5 py-0.5 rounded">
            Authorization
          </code>{" "}
          header:
        </p>
        <CodeBlock language="http">{`Authorization: Bearer x402_agent_xxxxxxxxxxxxx`}</CodeBlock>
      </section>

      {/* Endpoints */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-6">Endpoints</h2>

        {/* POST /quote */}
        <div className="not-prose mb-8 bg-[#111] border border-[#333] rounded-xl overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[#333] bg-[#0d0d0d]">
            <span className="px-2 py-0.5 text-xs font-bold text-white bg-emerald-600 rounded">
              POST
            </span>
            <code className="text-sm font-mono text-white">/quote</code>
          </div>
          <div className="p-4">
            <p className="text-sm text-[#888] mb-4">
              Request a quote for a payment. Returns whether the payment is
              allowed based on agent policies.
            </p>

            <h4 className="text-sm font-semibold text-white mb-2">
              Request Body
            </h4>
            <CodeBlock language="json">{`{
  "invoiceId": "inv_abc123xyz",
  "amount": 0.05,
  "payTo": "1ABC...xyz",
  "network": "mainnet",
  "description": "AI Completion API",
  "providerUrl": "https://api.example.com"
}`}</CodeBlock>

            <h4 className="text-sm font-semibold text-white mb-2 mt-4">
              Response (Allowed)
            </h4>
            <CodeBlock language="json">{`{
  "allowed": true,
  "quoteId": "quote_xyz789"
}`}</CodeBlock>

            <h4 className="text-sm font-semibold text-white mb-2 mt-4">
              Response (Denied)
            </h4>
            <CodeBlock language="json">{`{
  "allowed": false,
  "reason": "AGENT_DAILY_LIMIT",
  "message": "Agent has exceeded daily spending limit"
}`}</CodeBlock>
          </div>
        </div>

        {/* POST /pay */}
        <div className="not-prose mb-8 bg-[#111] border border-[#333] rounded-xl overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[#333] bg-[#0d0d0d]">
            <span className="px-2 py-0.5 text-xs font-bold text-white bg-emerald-600 rounded">
              POST
            </span>
            <code className="text-sm font-mono text-white">/pay</code>
          </div>
          <div className="p-4">
            <p className="text-sm text-[#888] mb-4">
              Execute a payment. Requires a valid quote ID.
            </p>

            <h4 className="text-sm font-semibold text-white mb-2">
              Request Body
            </h4>
            <CodeBlock language="json">{`{
  "quoteId": "quote_xyz789"
}`}</CodeBlock>

            <h4 className="text-sm font-semibold text-white mb-2 mt-4">
              Response (Success)
            </h4>
            <CodeBlock language="json">{`{
  "success": true,
  "paymentId": "payment_abc123",
  "invoiceId": "inv_abc123xyz",
  "txHash": "0x...",
  "proof": "eyJhbGciOiJIUzI1NiIs..."
}`}</CodeBlock>

            <h4 className="text-sm font-semibold text-white mb-2 mt-4">
              Response (Failure)
            </h4>
            <CodeBlock language="json">{`{
  "success": false,
  "error": "INSUFFICIENT_BALANCE",
  "message": "Workspace treasury has insufficient balance"
}`}</CodeBlock>
          </div>
        </div>

        {/* POST /verify */}
        <div className="not-prose mb-8 bg-[#111] border border-[#333] rounded-xl overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[#333] bg-[#0d0d0d]">
            <span className="px-2 py-0.5 text-xs font-bold text-white bg-emerald-600 rounded">
              POST
            </span>
            <code className="text-sm font-mono text-white">/verify</code>
          </div>
          <div className="p-4">
            <p className="text-sm text-[#888] mb-4">
              Verify a payment proof. Used by providers to confirm payment.
            </p>

            <h4 className="text-sm font-semibold text-white mb-2">
              Request Body
            </h4>
            <CodeBlock language="json">{`{
  "proof": "eyJhbGciOiJIUzI1NiIs...",
  "invoiceId": "inv_abc123xyz"
}`}</CodeBlock>

            <h4 className="text-sm font-semibold text-white mb-2 mt-4">
              Response (Valid)
            </h4>
            <CodeBlock language="json">{`{
  "verified": true,
  "paymentId": "payment_abc123",
  "amount": 0.05,
  "paidAt": 1704067200000,
  "txHash": "0x..."
}`}</CodeBlock>

            <h4 className="text-sm font-semibold text-white mb-2 mt-4">
              Response (Invalid)
            </h4>
            <CodeBlock language="json">{`{
  "verified": false,
  "errorCode": "INVALID_PROOF",
  "message": "Proof signature is invalid"
}`}</CodeBlock>
          </div>
        </div>
      </section>

      {/* X-402 Headers */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-4">X-402 Headers</h2>
        <p className="text-[#888] leading-relaxed mb-4">
          These headers are returned by providers in 402 responses and used by
          agents to initiate payment:
        </p>

        <div className="not-prose overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#333]">
                <th className="text-left py-3 px-4 text-[#888] font-medium">
                  Header
                </th>
                <th className="text-left py-3 px-4 text-[#888] font-medium">
                  Description
                </th>
                <th className="text-left py-3 px-4 text-[#888] font-medium">
                  Example
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[#222]">
                <td className="py-3 px-4 text-white font-mono text-xs">
                  X-402-Invoice-Id
                </td>
                <td className="py-3 px-4 text-[#888]">
                  Unique identifier for this payment request
                </td>
                <td className="py-3 px-4 text-emerald-400 font-mono text-xs">
                  inv_abc123xyz
                </td>
              </tr>
              <tr className="border-b border-[#222]">
                <td className="py-3 px-4 text-white font-mono text-xs">
                  X-402-Amount
                </td>
                <td className="py-3 px-4 text-[#888]">
                  Payment amount in MNEE
                </td>
                <td className="py-3 px-4 text-emerald-400 font-mono text-xs">
                  0.05
                </td>
              </tr>
              <tr className="border-b border-[#222]">
                <td className="py-3 px-4 text-white font-mono text-xs">
                  X-402-Pay-To
                </td>
                <td className="py-3 px-4 text-[#888]">
                  Provider&apos;s MNEE wallet address
                </td>
                <td className="py-3 px-4 text-emerald-400 font-mono text-xs">
                  1ABC...xyz
                </td>
              </tr>
              <tr className="border-b border-[#222]">
                <td className="py-3 px-4 text-white font-mono text-xs">
                  X-402-Network
                </td>
                <td className="py-3 px-4 text-[#888]">
                  MNEE network (sandbox or mainnet)
                </td>
                <td className="py-3 px-4 text-emerald-400 font-mono text-xs">
                  mainnet
                </td>
              </tr>
              <tr>
                <td className="py-3 px-4 text-white font-mono text-xs">
                  X-402-Description
                </td>
                <td className="py-3 px-4 text-[#888]">
                  Human-readable description (optional)
                </td>
                <td className="py-3 px-4 text-emerald-400 font-mono text-xs">
                  AI Completion
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Error Codes */}
      <section id="error-codes" className="mb-12 scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-4">Error Codes</h2>
        <p className="text-[#888] leading-relaxed mb-4">
          Standard error codes returned by the Gateway:
        </p>

        <h3 className="text-lg font-semibold text-white mb-3">Quote Errors</h3>
        <div className="not-prose overflow-x-auto mb-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#333]">
                <th className="text-left py-3 px-4 text-[#888] font-medium">
                  Code
                </th>
                <th className="text-left py-3 px-4 text-[#888] font-medium">
                  Description
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[#222]">
                <td className="py-3 px-4 text-amber-400 font-mono text-xs">
                  AGENT_DAILY_LIMIT
                </td>
                <td className="py-3 px-4 text-[#888]">
                  Agent has exceeded daily spending limit
                </td>
              </tr>
              <tr className="border-b border-[#222]">
                <td className="py-3 px-4 text-amber-400 font-mono text-xs">
                  AGENT_REQUEST_LIMIT
                </td>
                <td className="py-3 px-4 text-[#888]">
                  Amount exceeds per-request limit
                </td>
              </tr>
              <tr className="border-b border-[#222]">
                <td className="py-3 px-4 text-amber-400 font-mono text-xs">
                  PROVIDER_NOT_ALLOWED
                </td>
                <td className="py-3 px-4 text-[#888]">
                  Provider is not in agent&apos;s allowed list
                </td>
              </tr>
              <tr className="border-b border-[#222]">
                <td className="py-3 px-4 text-amber-400 font-mono text-xs">
                  WORKSPACE_BUDGET_EXCEEDED
                </td>
                <td className="py-3 px-4 text-[#888]">
                  Workspace has exceeded its budget cap
                </td>
              </tr>
              <tr>
                <td className="py-3 px-4 text-amber-400 font-mono text-xs">
                  AGENT_DISABLED
                </td>
                <td className="py-3 px-4 text-[#888]">
                  Agent API key has been disabled
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="text-lg font-semibold text-white mb-3">Payment Errors</h3>
        <div className="not-prose overflow-x-auto mb-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#333]">
                <th className="text-left py-3 px-4 text-[#888] font-medium">
                  Code
                </th>
                <th className="text-left py-3 px-4 text-[#888] font-medium">
                  Description
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[#222]">
                <td className="py-3 px-4 text-red-400 font-mono text-xs">
                  INSUFFICIENT_BALANCE
                </td>
                <td className="py-3 px-4 text-[#888]">
                  Workspace treasury has insufficient MNEE balance
                </td>
              </tr>
              <tr className="border-b border-[#222]">
                <td className="py-3 px-4 text-red-400 font-mono text-xs">
                  QUOTE_EXPIRED
                </td>
                <td className="py-3 px-4 text-[#888]">
                  Quote has expired (quotes valid for 60 seconds)
                </td>
              </tr>
              <tr className="border-b border-[#222]">
                <td className="py-3 px-4 text-red-400 font-mono text-xs">
                  QUOTE_NOT_FOUND
                </td>
                <td className="py-3 px-4 text-[#888]">
                  Quote ID is invalid or does not exist
                </td>
              </tr>
              <tr className="border-b border-[#222]">
                <td className="py-3 px-4 text-red-400 font-mono text-xs">
                  TRANSACTION_FAILED
                </td>
                <td className="py-3 px-4 text-[#888]">
                  MNEE transaction failed on-chain
                </td>
              </tr>
              <tr>
                <td className="py-3 px-4 text-red-400 font-mono text-xs">
                  WALLET_ERROR
                </td>
                <td className="py-3 px-4 text-[#888]">
                  Error accessing workspace wallet
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="text-lg font-semibold text-white mb-3">
          Verification Errors
        </h3>
        <div className="not-prose overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#333]">
                <th className="text-left py-3 px-4 text-[#888] font-medium">
                  Code
                </th>
                <th className="text-left py-3 px-4 text-[#888] font-medium">
                  Description
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[#222]">
                <td className="py-3 px-4 text-red-400 font-mono text-xs">
                  INVALID_PROOF
                </td>
                <td className="py-3 px-4 text-[#888]">
                  Proof signature is invalid or malformed
                </td>
              </tr>
              <tr className="border-b border-[#222]">
                <td className="py-3 px-4 text-red-400 font-mono text-xs">
                  PAYMENT_NOT_FOUND
                </td>
                <td className="py-3 px-4 text-[#888]">
                  Payment ID in proof does not exist
                </td>
              </tr>
              <tr className="border-b border-[#222]">
                <td className="py-3 px-4 text-red-400 font-mono text-xs">
                  INVOICE_MISMATCH
                </td>
                <td className="py-3 px-4 text-[#888]">
                  Proof invoice ID doesn&apos;t match expected invoice
                </td>
              </tr>
              <tr>
                <td className="py-3 px-4 text-red-400 font-mono text-xs">
                  PROOF_EXPIRED
                </td>
                <td className="py-3 px-4 text-[#888]">
                  Proof has expired (valid for 24 hours)
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Rate Limits */}
      <section className="not-prose">
        <h2 className="text-2xl font-bold text-white mb-4">Rate Limits</h2>
        <p className="text-[#888] mb-6">
          The Gateway enforces rate limits to ensure fair usage:
        </p>

        <div className="grid sm:grid-cols-3 gap-4">
          <div className="bg-[#111] border border-[#333] rounded-xl p-5">
            <h4 className="text-2xl font-bold text-white mb-1">1,000</h4>
            <p className="text-sm text-[#888]">Requests per minute</p>
          </div>
          <div className="bg-[#111] border border-[#333] rounded-xl p-5">
            <h4 className="text-2xl font-bold text-white mb-1">100</h4>
            <p className="text-sm text-[#888]">Concurrent connections</p>
          </div>
          <div className="bg-[#111] border border-[#333] rounded-xl p-5">
            <h4 className="text-2xl font-bold text-white mb-1">60s</h4>
            <p className="text-sm text-[#888]">Quote expiration</p>
          </div>
        </div>

        <div className="mt-6 p-4 bg-[#111] border border-[#333] rounded-xl">
          <p className="text-sm text-[#888]">
            Rate limit headers are included in all responses:
          </p>
          <ul className="mt-2 text-sm text-[#666] space-y-1">
            <li>
              <code className="text-xs text-white">X-RateLimit-Limit</code> —
              Requests allowed per window
            </li>
            <li>
              <code className="text-xs text-white">X-RateLimit-Remaining</code>{" "}
              — Requests remaining in current window
            </li>
            <li>
              <code className="text-xs text-white">X-RateLimit-Reset</code> —
              Unix timestamp when window resets
            </li>
          </ul>
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

