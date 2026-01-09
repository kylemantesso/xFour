export default function ServerSDKPage() {
  return (
    <article className="prose prose-invert max-w-none">
      {/* Hero */}
      <div className="not-prose mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/30 rounded-full text-blue-400 text-sm font-medium mb-4">
          <span className="text-lg">🔌</span>
          Server SDK
        </div>
        <h1 className="text-4xl font-bold text-white mb-4">@x402/server</h1>
        <p className="text-xl text-[#888]">
          TypeScript SDK for API providers who want to receive x402 payments.
          Middleware for Express, Next.js, and other Node.js frameworks.
        </p>
      </div>

      {/* Installation */}
      <section id="installation" className="mb-12 scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-4">Installation</h2>
        <CodeBlock language="bash">{`npm install @x402/server
# or
pnpm add @x402/server
# or
yarn add @x402/server`}</CodeBlock>
      </section>

      {/* Express Middleware */}
      <section id="express" className="mb-12 scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-4">Express.js</h2>
        <p className="text-[#888] leading-relaxed mb-4">
          The SDK provides middleware that integrates seamlessly with Express:
        </p>

        <CodeBlock language="typescript">{`import express from 'express';
import { createX402Middleware } from '@x402/server';

const app = express();
app.use(express.json());

const x402 = createX402Middleware({
  gatewayUrl: 'https://xfour.xyz/api/gateway',
  apiKey: process.env.X402_SERVER_KEY!,
  payToAddress: process.env.MNEE_ADDRESS!, // Your MNEE wallet
  network: 'mainnet',
});

// Protect specific routes
app.post('/api/ai/complete', 
  x402.requirePayment(0.05), // 0.05 MNEE per request
  async (req, res) => {
    // Only executes if payment verified!
    // Payment info available in req.x402Payment
    const result = await processAI(req.body);
    res.json(result);
  }
);

// Protect entire route groups
app.use('/api/premium', x402.middleware(0.10));

app.listen(3000);`}</CodeBlock>

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
                  gatewayUrl
                </td>
                <td className="py-3 px-4 text-violet-400 font-mono text-xs">
                  string
                </td>
                <td className="py-3 px-4 text-emerald-400">Yes</td>
                <td className="py-3 px-4 text-[#888]">
                  x402 Gateway URL
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
                  Your provider API key
                </td>
              </tr>
              <tr className="border-b border-[#222]">
                <td className="py-3 px-4 text-white font-mono text-xs">
                  payToAddress
                </td>
                <td className="py-3 px-4 text-violet-400 font-mono text-xs">
                  string
                </td>
                <td className="py-3 px-4 text-emerald-400">Yes</td>
                <td className="py-3 px-4 text-[#888]">
                  Your MNEE wallet address
                </td>
              </tr>
              <tr className="border-b border-[#222]">
                <td className="py-3 px-4 text-white font-mono text-xs">
                  network
                </td>
                <td className="py-3 px-4 text-violet-400 font-mono text-xs">
                  &apos;sandbox&apos; | &apos;mainnet&apos;
                </td>
                <td className="py-3 px-4 text-[#666]">No</td>
                <td className="py-3 px-4 text-[#888]">
                  MNEE network (default: mainnet)
                </td>
              </tr>
              <tr className="border-b border-[#222]">
                <td className="py-3 px-4 text-white font-mono text-xs">
                  defaultPrice
                </td>
                <td className="py-3 px-4 text-violet-400 font-mono text-xs">
                  number
                </td>
                <td className="py-3 px-4 text-[#666]">No</td>
                <td className="py-3 px-4 text-[#888]">
                  Default price if not specified per-route
                </td>
              </tr>
              <tr className="border-b border-[#222]">
                <td className="py-3 px-4 text-white font-mono text-xs">
                  onPaymentVerified
                </td>
                <td className="py-3 px-4 text-violet-400 font-mono text-xs">
                  function
                </td>
                <td className="py-3 px-4 text-[#666]">No</td>
                <td className="py-3 px-4 text-[#888]">
                  Callback when payment verified
                </td>
              </tr>
              <tr>
                <td className="py-3 px-4 text-white font-mono text-xs">
                  onPaymentRequired
                </td>
                <td className="py-3 px-4 text-violet-400 font-mono text-xs">
                  function
                </td>
                <td className="py-3 px-4 text-[#666]">No</td>
                <td className="py-3 px-4 text-[#888]">
                  Callback when 402 is sent
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Next.js */}
      <section id="nextjs" className="mb-12 scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-4">Next.js API Routes</h2>
        <p className="text-[#888] leading-relaxed mb-4">
          For Next.js App Router, manually handle the payment flow:
        </p>

        <CodeBlock language="typescript">{`// app/api/ai/complete/route.ts
import { createX402Middleware } from '@x402/server';
import type { NextRequest } from 'next/server';

const x402 = createX402Middleware({
  gatewayUrl: process.env.X402_GATEWAY_URL!,
  apiKey: process.env.X402_SERVER_KEY!,
  payToAddress: process.env.MNEE_ADDRESS!,
  network: 'mainnet',
});

export async function POST(request: NextRequest) {
  // Extract payment proof from headers
  const proofHeader = request.headers.get('X-MOCK-PAID-INVOICE');
  
  if (!proofHeader) {
    // No proof - return 402 with invoice headers
    const headers = x402.createInvoiceHeaders(
      0.05,           // amount
      undefined,      // invoiceId (auto-generated)
      'AI Completion' // description
    );
    
    return new Response(
      JSON.stringify({ error: 'Payment Required' }), 
      {
        status: 402,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      }
    );
  }
  
  // Verify payment
  const verification = await x402.verifyPayment(proofHeader);
  
  if (!verification.verified) {
    return new Response(
      JSON.stringify({ 
        error: 'Payment verification failed',
        code: verification.errorCode 
      }), 
      { status: 403 }
    );
  }
  
  // Payment verified - process request
  const body = await request.json();
  const result = await processAI(body);
  
  return Response.json(result);
}`}</CodeBlock>
      </section>

      {/* Pricing Strategies */}
      <section id="pricing" className="mb-12 scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-4">Pricing Strategies</h2>

        <h3 className="text-lg font-semibold text-white mb-3">
          Per-Endpoint Pricing
        </h3>
        <p className="text-[#888] leading-relaxed mb-4">
          Set different prices for each endpoint:
        </p>
        <CodeBlock language="typescript">{`app.post('/api/basic', x402.requirePayment(0.01), basicHandler);
app.post('/api/premium', x402.requirePayment(0.10), premiumHandler);
app.post('/api/enterprise', x402.requirePayment(1.00), enterpriseHandler);`}</CodeBlock>

        <h3 className="text-lg font-semibold text-white mb-3 mt-8">
          Dynamic Pricing
        </h3>
        <p className="text-[#888] leading-relaxed mb-4">
          Calculate price based on request content:
        </p>
        <CodeBlock language="typescript">{`app.post('/api/process', async (req, res, next) => {
  // Calculate price based on request
  const complexity = calculateComplexity(req.body);
  const price = complexity * 0.01;
  
  // Apply dynamic pricing
  return x402.requirePayment(price)(req, res, next);
});`}</CodeBlock>

        <h3 className="text-lg font-semibold text-white mb-3 mt-8">
          Route Group Pricing
        </h3>
        <p className="text-[#888] leading-relaxed mb-4">
          Apply pricing to entire route groups:
        </p>
        <CodeBlock language="typescript">{`// Free tier
app.use('/api/free', freeRoutes);

// Paid tier
app.use('/api/paid', x402.middleware(0.05), paidRoutes);

// Premium tier  
app.use('/api/premium', x402.middleware(0.20), premiumRoutes);`}</CodeBlock>
      </section>

      {/* API Methods */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-4">API Methods</h2>

        <h3 className="text-lg font-semibold text-white mb-3">
          requirePayment(amount | config)
        </h3>
        <p className="text-[#888] leading-relaxed mb-4">
          Returns middleware that requires payment:
        </p>
        <CodeBlock language="typescript">{`// Simple usage with amount
app.post('/api/endpoint', x402.requirePayment(0.05), handler);

// With full config
app.post('/api/endpoint', 
  x402.requirePayment({
    amount: 0.05,
    invoiceId: 'custom-id',  // optional
    description: 'API Call', // optional
  }),
  handler
);`}</CodeBlock>

        <h3 className="text-lg font-semibold text-white mb-3 mt-8">
          verifyPayment(invoiceId)
        </h3>
        <p className="text-[#888] leading-relaxed mb-4">
          Manually verify a payment (for non-middleware usage):
        </p>
        <CodeBlock language="typescript">{`const result = await x402.verifyPayment(invoiceId);

if (result.verified) {
  console.log('Payment verified!');
  console.log('Amount:', result.amount);
  console.log('Tx Hash:', result.txHash);
}`}</CodeBlock>

        <h3 className="text-lg font-semibold text-white mb-3 mt-8">
          createInvoiceHeaders(amount, invoiceId?, description?)
        </h3>
        <p className="text-[#888] leading-relaxed mb-4">
          Generate x402 headers for manual 402 responses:
        </p>
        <CodeBlock language="typescript">{`const headers = x402.createInvoiceHeaders(0.05, undefined, 'AI Completion');
// Returns:
// {
//   'X-402-Invoice-Id': 'inv_...',
//   'X-402-Amount': '0.05',
//   'X-402-Pay-To': '1ABC...',
//   'X-402-Network': 'mainnet',
//   'X-402-Description': 'AI Completion'
// }`}</CodeBlock>

        <h3 className="text-lg font-semibold text-white mb-3 mt-8">
          extractProof(headers)
        </h3>
        <p className="text-[#888] leading-relaxed mb-4">
          Extract payment proof from request headers:
        </p>
        <CodeBlock language="typescript">{`const invoiceId = x402.extractProof(request.headers);`}</CodeBlock>
      </section>

      {/* Request Augmentation */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-4">
          Request Augmentation
        </h2>
        <p className="text-[#888] leading-relaxed mb-4">
          When payment is verified, the middleware adds payment info to the
          request:
        </p>
        <CodeBlock language="typescript">{`app.post('/api/endpoint', x402.requirePayment(0.05), (req, res) => {
  // Payment info is available
  console.log(req.x402Payment);
  // {
  //   verified: true,
  //   invoiceId: 'inv_...',
  //   paymentId: 'payment_...',
  //   amount: 0.05,
  //   paidAt: 1234567890,
  //   txHash: 'abc...'
  // }
});`}</CodeBlock>
      </section>

      {/* Examples */}
      <section id="examples" className="mb-12 scroll-mt-24">
        <h2 className="text-2xl font-bold text-white mb-4">Examples</h2>

        <h3 className="text-lg font-semibold text-white mb-3">
          With Payment Callbacks
        </h3>
        <CodeBlock language="typescript">{`const x402 = createX402Middleware({
  gatewayUrl: process.env.X402_GATEWAY_URL!,
  apiKey: process.env.X402_SERVER_KEY!,
  payToAddress: process.env.MNEE_ADDRESS!,
  
  // Log all payment verifications
  onPaymentVerified: async (payment) => {
    await analytics.track('payment_verified', {
      invoiceId: payment.invoiceId,
      amount: payment.amount,
    });
  },
  
  // Log all 402 responses
  onPaymentRequired: async (invoice) => {
    await analytics.track('payment_required', {
      invoiceId: invoice.invoiceId,
      amount: invoice.amount,
    });
  },
});`}</CodeBlock>

        <h3 className="text-lg font-semibold text-white mb-3 mt-8">
          Error Handling
        </h3>
        <CodeBlock language="typescript">{`app.post('/api/endpoint', 
  x402.requirePayment(0.05),
  async (req, res) => {
    try {
      const result = await processRequest(req.body);
      res.json(result);
    } catch (error) {
      // Your error handling
      res.status(500).json({ error: 'Processing failed' });
    }
  }
);

// Payment verification failures return 403 automatically`}</CodeBlock>
      </section>

      {/* Testing */}
      <section className="not-prose">
        <h2 className="text-2xl font-bold text-white mb-4">Testing</h2>
        <p className="text-[#888] mb-4">
          For testing, use the sandbox network:
        </p>
        <CodeBlock language="typescript">{`const x402 = createX402Middleware({
  gatewayUrl: 'http://localhost:3000/api/gateway',
  apiKey: process.env.X402_SERVER_KEY_TEST!,
  payToAddress: 'test-address',
  network: 'sandbox', // Use sandbox for testing
});`}</CodeBlock>

        <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
          <h4 className="text-sm font-semibold text-blue-400 mb-2">
            Environment Compatibility
          </h4>
          <p className="text-sm text-[#888]">
            This SDK works in Node.js 18+, Express.js 4.x, Next.js 13+ API
            Routes, and any Node.js web framework with standard req/res.
          </p>
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


