# @x402/server

TypeScript SDK for API providers who want to receive x402 payments. Provides middleware and utilities for Express, Next.js, and other Node.js frameworks.

## Installation

```bash
npm install @x402/server
# or
pnpm add @x402/server
# or
yarn add @x402/server
```

## Quick Start

### Express.js

```typescript
import express from 'express';
import { createX402Middleware } from '@x402/server';

const app = express();
app.use(express.json());

const x402 = createX402Middleware({
  gatewayUrl: 'https://gateway.x402.com',
  apiKey: process.env.X402_SERVER_KEY!,
  payToAddress: '0x123...', // Your Ethereum wallet address
  network: 'mainnet',
});

// Protect specific routes
app.post('/api/ai/complete', 
  x402.requirePayment(0.05), // 0.05 MNEE per request
  async (req, res) => {
    // Only executes if payment verified
    // Payment info available in req.x402Payment
    const result = await processAI(req.body);
    res.json(result);
  }
);

// Protect entire route groups
app.use('/api/premium', x402.middleware(0.10));

app.listen(3000);
```

### Next.js API Routes

```typescript
import { createX402Middleware } from '@x402/server';
import type { NextRequest, NextResponse } from 'next/server';

const x402 = createX402Middleware({
  gatewayUrl: process.env.X402_GATEWAY_URL!,
  apiKey: process.env.X402_SERVER_KEY!,
  payToAddress: process.env.MNEE_ADDRESS!,
  network: 'mainnet',
});

export async function POST(request: NextRequest) {
  // Extract payment proof
  const proofHeader = request.headers.get('X-MOCK-PAID-INVOICE');
  
  if (!proofHeader) {
    // No proof - return 402 with invoice headers
    const headers = x402.createInvoiceHeaders(0.05, undefined, 'AI Completion');
    return new Response(
      JSON.stringify({ error: 'Payment Required' }), 
      {
        status: 402,
        headers: Object.entries(headers).reduce((acc, [k, v]) => {
          acc.set(k, v);
          return acc;
        }, new Headers({ 'Content-Type': 'application/json' })),
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
}
```

## API Reference

### `createX402Middleware(config)`

Creates middleware factory with payment verification.

```typescript
interface MiddlewareConfig {
  // Required: Gateway URL
  gatewayUrl: string;
  
  // Required: Your provider API key
  apiKey: string;
  
  // Required: Your Ethereum wallet address
  payToAddress: string;
  
  // Optional: Ethereum network (default: 'mainnet')
  network?: 'sepolia' | 'mainnet';
  
  // Optional: Default price if not specified per-route
  defaultPrice?: number;
  
  // Optional: Payment proof header name (default: 'X-MOCK-PAID-INVOICE')
  proofHeaderName?: string;
  
  // Optional: Custom fetch implementation
  fetchImpl?: typeof fetch;
  
  // Optional: Callback when payment is verified
  onPaymentVerified?: (payment) => void | Promise<void>;
  
  // Optional: Callback when 402 is sent
  onPaymentRequired?: (invoice) => void | Promise<void>;
}

const x402 = createX402Middleware(config);
```

### Middleware Methods

#### `requirePayment(amount | config)`

Returns Express/Next.js middleware that requires payment.

```typescript
// Simple usage with amount
app.post('/api/endpoint', x402.requirePayment(0.05), handler);

// With full config
app.post('/api/endpoint', 
  x402.requirePayment({
    amount: 0.05,
    invoiceId: 'custom-id', // optional
    description: 'API Call', // optional
  }),
  handler
);
```

#### `middleware(price?)`

Alias for `requirePayment` - protects all requests.

```typescript
// Protect entire route group
app.use('/api/paid', x402.middleware(0.10));
```

#### `verifyPayment(invoiceId)`

Manually verify a payment (for non-middleware usage).

```typescript
const result = await x402.verifyPayment(invoiceId);

if (result.verified) {
  console.log('Payment verified!');
  console.log('Amount:', result.amount);
  console.log('Tx Hash:', result.txHash);
}
```

#### `createInvoiceHeaders(amount, invoiceId?, description?)`

Generate x402 headers for manual 402 responses.

```typescript
const headers = x402.createInvoiceHeaders(0.05, undefined, 'AI Completion');
// Returns:
// {
//   'X-402-Invoice-Id': 'inv_...',
//   'X-402-Amount': '0.05',
//   'X-402-Pay-To': '0x123...',
//   'X-402-Network': 'mainnet',
//   'X-402-Description': 'AI Completion'
// }
```

#### `extractProof(headers)`

Extract payment proof from request headers.

```typescript
const invoiceId = x402.extractProof(request.headers);
```

## Request Augmentation

When payment is verified, the middleware adds payment info to the request:

```typescript
app.post('/api/endpoint', x402.requirePayment(0.05), (req, res) => {
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
});
```

## Pricing Strategies

### Per-Endpoint Pricing

```typescript
app.post('/api/basic', x402.requirePayment(0.01), basicHandler);
app.post('/api/premium', x402.requirePayment(0.10), premiumHandler);
app.post('/api/enterprise', x402.requirePayment(1.00), enterpriseHandler);
```

### Dynamic Pricing

```typescript
app.post('/api/process', async (req, res, next) => {
  // Calculate price based on request
  const complexity = calculateComplexity(req.body);
  const price = complexity * 0.01;
  
  // Apply dynamic pricing
  return x402.requirePayment(price)(req, res, next);
});
```

### Route Group Pricing

```typescript
// Free tier
app.use('/api/free', freeRoutes);

// Paid tier
app.use('/api/paid', x402.middleware(0.05), paidRoutes);

// Premium tier
app.use('/api/premium', x402.middleware(0.20), premiumRoutes);
```

## Advanced Usage

### Custom Payment Callbacks

```typescript
const x402 = createX402Middleware({
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
});
```

### Error Handling

```typescript
app.post('/api/endpoint', 
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

// Payment verification failures return 403 automatically
```

## Testing

For testing, use the Sepolia testnet:

```typescript
const x402 = createX402Middleware({
  gatewayUrl: 'http://localhost:3000/api/gateway',
  apiKey: process.env.X402_SERVER_KEY_TEST!,
  payToAddress: '0xYourTestAddress',
  network: 'sepolia', // Use Sepolia testnet for testing
});
```

## Environment Compatibility

This SDK works in:

- **Node.js 18+** (uses global `fetch`)
- **Express.js 4.x**
- **Next.js 13+ API Routes**
- **Any Node.js web framework with standard req/res**

## License

MIT



