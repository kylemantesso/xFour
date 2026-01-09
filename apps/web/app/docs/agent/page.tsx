export default function AgentSDKPage() {
  return (
    <article className="prose prose-invert max-w-none">
      {/* Hero */}
      <div className="not-prose mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-400 text-sm font-medium mb-4">
          <span className="text-lg">🤖</span>
          Agent SDK
        </div>
        <h1 className="text-4xl font-bold text-white mb-4">@x402/agent</h1>
        <p className="text-xl text-[#888]">
          TypeScript SDK for AI agents that consume paid APIs. Drop-in{" "}
          <code className="text-sm bg-[#1a1a1a] px-2 py-1 rounded">fetch</code>{" "}
          replacement with automatic x402 payment handling.
        </p>
      </div>

      {/* Installation */}
      <section id="installation" className="mb-12 scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-4">Installation</h2>
        <CodeBlock language="bash">{`npm install @x402/agent
# or
pnpm add @x402/agent
# or
yarn add @x402/agent`}</CodeBlock>
      </section>

      {/* Configuration */}
      <section id="configuration" className="mb-12 scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-4">Configuration</h2>
        <p className="text-[#888] leading-relaxed mb-4">
          Create an agent client with your Gateway URL and API key:
        </p>

        <CodeBlock language="typescript">{`import { createAgentClient, AgentClientConfig } from '@x402/agent';

const config: AgentClientConfig = {
  // Required: Gateway API base URL
  gatewayBaseUrl: 'https://xfour.xyz/api/gateway',
  
  // Required: Your agent API key
  apiKey: process.env.X402_AGENT_KEY!,
  
  // Optional: Custom fetch implementation (default: global fetch)
  fetchImpl: customFetch,
  
  // Optional: Header name for payment proof
  // (default: 'X-MOCK-PAID-INVOICE')
  proofHeaderName: 'X-MOCK-PAID-INVOICE',
};

const client = createAgentClient(config);`}</CodeBlock>

        <h3 className="text-lg font-semibold text-white mb-3 mt-8">
          Configuration Options
        </h3>
        <div className="not-prose overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#333]">
                <th className="text-left py-3 px-4 text-[#888] font-medium">
                  Option
                </th>
                <th className="text-left py-3 px-4 text-[#888] font-medium">
                  Type
                </th>
                <th className="text-left py-3 px-4 text-[#888] font-medium">
                  Required
                </th>
                <th className="text-left py-3 px-4 text-[#888] font-medium">
                  Description
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[#222]">
                <td className="py-3 px-4 text-white font-mono text-xs">
                  gatewayBaseUrl
                </td>
                <td className="py-3 px-4 text-violet-400 font-mono text-xs">
                  string
                </td>
                <td className="py-3 px-4 text-emerald-400">Yes</td>
                <td className="py-3 px-4 text-[#888]">
                  Base URL of the x402 Gateway
                </td>
              </tr>
              <tr className="border-b border-[#222]">
                <td className="py-3 px-4 text-white font-mono text-xs">
                  apiKey
                </td>
                <td className="py-3 px-4 text-violet-400 font-mono text-xs">
                  string
                </td>
                <td className="py-3 px-4 text-emerald-400">Yes</td>
                <td className="py-3 px-4 text-[#888]">
                  Your agent API key
                </td>
              </tr>
              <tr className="border-b border-[#222]">
                <td className="py-3 px-4 text-white font-mono text-xs">
                  fetchImpl
                </td>
                <td className="py-3 px-4 text-violet-400 font-mono text-xs">
                  typeof fetch
                </td>
                <td className="py-3 px-4 text-[#666]">No</td>
                <td className="py-3 px-4 text-[#888]">
                  Custom fetch implementation
                </td>
              </tr>
              <tr>
                <td className="py-3 px-4 text-white font-mono text-xs">
                  proofHeaderName
                </td>
                <td className="py-3 px-4 text-violet-400 font-mono text-xs">
                  string
                </td>
                <td className="py-3 px-4 text-[#666]">No</td>
                <td className="py-3 px-4 text-[#888]">
                  Header name for payment proof
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* fetchWithX402 */}
      <section id="fetch-with-x402" className="mb-12 scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-4">fetchWithX402</h2>
        <p className="text-[#888] leading-relaxed mb-4">
          The main method for making requests. Works exactly like{" "}
          <code className="text-xs bg-[#1a1a1a] px-1.5 py-0.5 rounded">
            fetch
          </code>
          , but automatically handles 402 Payment Required responses.
        </p>

        <CodeBlock language="typescript">{`const response = await client.fetchWithX402(
  'https://api.example.com/ai/complete',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: 'Hello world' }),
  }
);

console.log('Status:', response.status);
console.log('Body:', await response.json());`}</CodeBlock>

        <h3 className="text-lg font-semibold text-white mb-3 mt-8">
          How It Works
        </h3>
        <ol className="space-y-2 text-[#888]">
          <li>
            <strong className="text-white">1. Initial Request</strong> — Makes
            your request normally
          </li>
          <li>
            <strong className="text-white">2. Non-402 Response</strong> — If not
            402, returns immediately
          </li>
          <li>
            <strong className="text-white">3. 402 Response</strong> — Extracts
            X-402-* headers
          </li>
          <li>
            <strong className="text-white">4. Quote</strong> — Calls Gateway
            /quote for authorization
          </li>
          <li>
            <strong className="text-white">5. Payment</strong> — If allowed,
            calls /pay to execute
          </li>
          <li>
            <strong className="text-white">6. Retry</strong> — Retries original
            request with proof header
          </li>
        </ol>
      </section>

      {/* Error Handling */}
      <section id="error-handling" className="mb-12 scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-4">Error Handling</h2>
        <p className="text-[#888] leading-relaxed mb-4">
          The SDK provides typed error classes for payment failures:
        </p>

        <h3 className="text-lg font-semibold text-white mb-3">
          PaymentDeniedError
        </h3>
        <p className="text-[#888] leading-relaxed mb-4">
          Thrown when the Gateway denies a payment quote (policy violation,
          insufficient balance, etc.).
        </p>

        <CodeBlock language="typescript">{`import { PaymentDeniedError } from '@x402/agent';

try {
  await client.fetchWithX402(url);
} catch (err) {
  if (err instanceof PaymentDeniedError) {
    console.log('Denied reason:', err.reason);
    // Possible reasons:
    // - "AGENT_DAILY_LIMIT"
    // - "INSUFFICIENT_BALANCE"
    // - "PROVIDER_NOT_ALLOWED"
    // - "AMOUNT_EXCEEDS_LIMIT"
  }
}`}</CodeBlock>

        <h3 className="text-lg font-semibold text-white mb-3 mt-8">
          PaymentFailedError
        </h3>
        <p className="text-[#888] leading-relaxed mb-4">
          Thrown when a payment execution fails (network error, transaction
          failure, etc.).
        </p>

        <CodeBlock language="typescript">{`import { PaymentFailedError } from '@x402/agent';

try {
  await client.fetchWithX402(url);
} catch (err) {
  if (err instanceof PaymentFailedError) {
    console.log('Error code:', err.code);
    console.log('Details:', err.details);
  }
}`}</CodeBlock>

        <h3 className="text-lg font-semibold text-white mb-3 mt-8">
          Complete Error Handling Example
        </h3>
        <CodeBlock language="typescript">{`import { 
  createAgentClient, 
  PaymentDeniedError, 
  PaymentFailedError 
} from '@x402/agent';

async function makeRequest() {
  const client = createAgentClient({
    gatewayBaseUrl: 'https://xfour.xyz/api/gateway',
    apiKey: process.env.X402_AGENT_KEY!,
  });

  try {
    const res = await client.fetchWithX402(
      'https://api.example.com/ai/complete',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'Hello' }),
      }
    );

    return await res.json();
    
  } catch (err) {
    if (err instanceof PaymentDeniedError) {
      // Handle policy denial
      console.error('Payment denied:', err.reason);
      // Maybe notify admin, show upgrade prompt, etc.
      
    } else if (err instanceof PaymentFailedError) {
      // Handle execution failure
      console.error('Payment failed:', err.message);
      // Maybe retry later, alert monitoring, etc.
      
    } else {
      // Other errors (network, etc.)
      throw err;
    }
  }
}`}</CodeBlock>
      </section>

      {/* Examples */}
      <section id="examples" className="mb-12 scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-4">Examples</h2>

        <h3 className="text-lg font-semibold text-white mb-3">
          Basic AI Completion
        </h3>
        <CodeBlock language="typescript">{`const response = await client.fetchWithX402(
  'https://api.openrouter.ai/v1/complete',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'Hello!' }],
    }),
  }
);

const data = await response.json();
console.log(data.choices[0].message.content);`}</CodeBlock>

        <h3 className="text-lg font-semibold text-white mb-3 mt-8">
          Streaming Response
        </h3>
        <CodeBlock language="typescript">{`const response = await client.fetchWithX402(
  'https://api.example.com/stream',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: 'Write a poem' }),
  }
);

const reader = response.body?.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader!.read();
  if (done) break;
  process.stdout.write(decoder.decode(value));
}`}</CodeBlock>

        <h3 className="text-lg font-semibold text-white mb-3 mt-8">
          Multiple Requests in Parallel
        </h3>
        <CodeBlock language="typescript">{`const [result1, result2, result3] = await Promise.all([
  client.fetchWithX402('https://api.example.com/resource-1'),
  client.fetchWithX402('https://api.example.com/resource-2'),
  client.fetchWithX402('https://api.example.com/resource-3'),
]);

// Each request handles payment independently
console.log(await result1.json());
console.log(await result2.json());
console.log(await result3.json());`}</CodeBlock>
      </section>

      {/* Environment Compatibility */}
      <section className="not-prose">
        <h2 className="text-2xl font-bold text-white mb-4">
          Environment Compatibility
        </h2>
        <p className="text-[#888] mb-6">
          The SDK works in any environment with a global{" "}
          <code className="text-xs bg-[#1a1a1a] px-1.5 py-0.5 rounded">
            fetch
          </code>{" "}
          implementation:
        </p>

        <div className="grid sm:grid-cols-3 gap-4">
          <div className="bg-[#111] border border-[#333] rounded-xl p-5">
            <div className="text-2xl mb-3">💻</div>
            <h4 className="text-base font-semibold text-white mb-1">
              Node.js 18+
            </h4>
            <p className="text-sm text-[#888]">Uses global fetch</p>
          </div>
          <div className="bg-[#111] border border-[#333] rounded-xl p-5">
            <div className="text-2xl mb-3">🌐</div>
            <h4 className="text-base font-semibold text-white mb-1">Browser</h4>
            <p className="text-sm text-[#888]">React, Next.js, etc.</p>
          </div>
          <div className="bg-[#111] border border-[#333] rounded-xl p-5">
            <div className="text-2xl mb-3">⚡</div>
            <h4 className="text-base font-semibold text-white mb-1">Edge</h4>
            <p className="text-sm text-[#888]">Vercel Edge, Cloudflare</p>
          </div>
        </div>

        <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
          <h4 className="text-sm font-semibold text-amber-400 mb-2">
            Older Node.js Versions
          </h4>
          <p className="text-sm text-[#888] mb-3">
            For Node.js &lt; 18, provide a custom fetch implementation:
          </p>
          <CodeBlock language="typescript">{`import nodeFetch from 'node-fetch';

const client = createAgentClient({
  gatewayBaseUrl: '...',
  apiKey: '...',
  fetchImpl: nodeFetch as unknown as typeof fetch,
});`}</CodeBlock>
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


