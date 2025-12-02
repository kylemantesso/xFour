# @x402/sdk

TypeScript SDK for the x402 payment gateway. Provides a drop-in `fetch` replacement that automatically handles x402 payment flows.

## Installation

```bash
npm install @x402/sdk
# or
pnpm add @x402/sdk
# or
yarn add @x402/sdk
```

## Quick Start

```typescript
import { createGatewayClient } from '@x402/sdk';

// Initialize the client
const client = createGatewayClient({
  gatewayBaseUrl: 'http://localhost:3000/api/gateway',
  apiKey: process.env.GATEWAY_API_KEY!,
});

// Use fetchWithX402 just like regular fetch
// x402 payments are handled automatically!
const response = await client.fetchWithX402('https://api.example.com/paid-resource', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ data: 'test' }),
});

console.log('Status:', response.status);
console.log('Body:', await response.text());
```

## How It Works

When you call `fetchWithX402`:

1. **Initial Request**: The SDK makes your request as normal
2. **Non-402 Response**: If the response is not 402, it's returned immediately
3. **402 Response**: If 402 Payment Required:
   - Extracts `X-402-*` headers from the response
   - Calls `/quote` to get payment authorization
   - If denied, throws `PaymentDeniedError`
   - If allowed, calls `/pay` to execute payment
   - Retries the original request with proof header
4. **Final Response**: Returns the successful response

## API Reference

### `createGatewayClient(config)`

Creates a new gateway client instance.

```typescript
import { createGatewayClient, GatewayClientConfig } from '@x402/sdk';

const config: GatewayClientConfig = {
  // Required: Gateway API base URL
  gatewayBaseUrl: 'http://localhost:3000/api/gateway',
  
  // Required: Your API key
  apiKey: 'your-api-key',
  
  // Optional: Custom fetch implementation (default: global fetch)
  fetchImpl: customFetch,
  
  // Optional: Header name for payment proof (default: 'X-MOCK-PAID-INVOICE')
  proofHeaderName: 'X-MOCK-PAID-INVOICE',
};

const client = createGatewayClient(config);
```

### `GatewayClient`

The client interface returned by `createGatewayClient`.

#### `fetchWithX402(input, init?)`

Drop-in replacement for `fetch` with automatic x402 payment handling.

```typescript
const response = await client.fetchWithX402('https://api.example.com/resource', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ code: 'console.log("hello")' }),
});
```

#### `quoteFromResponse(response, requestUrl, method)`

Lower-level helper to manually get a quote from a 402 response.

```typescript
const res = await fetch('https://api.example.com/resource');
if (res.status === 402) {
  const quote = await client.quoteFromResponse(res, 'https://api.example.com/resource', 'GET');
  if (quote.status === 'allowed') {
    console.log(`Amount: ${quote.amount} ${quote.tokenSymbol}`);
  }
}
```

#### `pay(paymentId)`

Lower-level helper to manually execute a payment.

```typescript
const result = await client.pay('payment-id-from-quote');
if (result.status === 'ok') {
  console.log(`Paid ${result.amount} ${result.tokenSymbol}`);
}
```

### Error Classes

#### `GatewayError`

Base error class for all gateway-related errors.

```typescript
import { GatewayError } from '@x402/sdk';

try {
  await client.fetchWithX402(url);
} catch (err) {
  if (err instanceof GatewayError) {
    console.log('Code:', err.code);
    console.log('Details:', err.details);
  }
}
```

#### `PaymentDeniedError`

Thrown when the gateway denies a payment quote.

```typescript
import { PaymentDeniedError } from '@x402/sdk';

try {
  await client.fetchWithX402(url);
} catch (err) {
  if (err instanceof PaymentDeniedError) {
    console.log('Denied reason:', err.reason);
    // e.g., "AGENT_DAILY_LIMIT", "INSUFFICIENT_BALANCE"
  }
}
```

#### `PaymentFailedError`

Thrown when a payment execution fails.

```typescript
import { PaymentFailedError } from '@x402/sdk';

try {
  await client.fetchWithX402(url);
} catch (err) {
  if (err instanceof PaymentFailedError) {
    console.log('Error code:', err.code);
    console.log('Details:', err.details);
  }
}
```

### Utility Functions

#### `extractInvoiceHeaders(response)`

Extract and normalize x402 headers from a Response.

```typescript
import { extractInvoiceHeaders } from '@x402/sdk';

const res = await fetch('https://api.example.com/resource');
const headers = extractInvoiceHeaders(res);
// { 'X-402-Invoice-Id': '...', 'X-402-Amount': '...', ... }
```

#### `isPaymentRequired(response)`

Check if a response is 402 Payment Required.

```typescript
import { isPaymentRequired } from '@x402/sdk';

const res = await fetch('https://api.example.com/resource');
if (isPaymentRequired(res)) {
  // Handle payment flow
}
```

## Types

```typescript
// Client configuration
type GatewayClientConfig = {
  gatewayBaseUrl: string;
  apiKey: string;
  fetchImpl?: typeof fetch;
  proofHeaderName?: string;
};

// Quote result
type QuoteResult =
  | {
      status: 'allowed';
      paymentId: string;
      invoiceId: string;
      amount: string;      // Token amount as string
      tokenSymbol: string; // e.g., "MNEE"
      fxRate: string;      // Exchange rate as string
    }
  | {
      status: 'denied';
      reason: string;      // e.g., "AGENT_DAILY_LIMIT"
    };

// Pay result
type PayResult = {
  status: 'ok' | 'error';
  paymentId?: string;
  invoiceId?: string;
  amount?: string;
  tokenSymbol?: string;
  txHash?: string;
  errorCode?: string;
  errorMessage?: string;
};

// Invoice headers from 402 response
type InvoiceHeaders = Record<string, string>;
```

## Complete Example

```typescript
import { createGatewayClient, PaymentDeniedError, PaymentFailedError } from '@x402/sdk';

async function main() {
  const client = createGatewayClient({
    gatewayBaseUrl: 'http://localhost:3000/api/gateway',
    apiKey: process.env.GATEWAY_API_KEY!,
  });

  try {
    // Make request to x402-protected API
    const res = await client.fetchWithX402('http://localhost:3000/api/mock-nova/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'console.log("hello")' }),
    });

    console.log('Final status:', res.status);
    console.log('Body:', await res.text());
    
  } catch (err) {
    if (err instanceof PaymentDeniedError) {
      console.error('Payment denied:', err.reason);
      // Handle denial (e.g., show upgrade prompt, notify admin)
    } else if (err instanceof PaymentFailedError) {
      console.error('Payment failed:', err.message);
      // Handle failure (e.g., retry later, alert)
    } else {
      throw err;
    }
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
```

## Environment Compatibility

This SDK works in:

- **Node.js 18+** (uses global `fetch`)
- **Browser environments** (React, Next.js, etc.)
- **Edge runtimes** (Vercel Edge, Cloudflare Workers)

For older Node.js versions, provide a custom fetch implementation:

```typescript
import nodeFetch from 'node-fetch';

const client = createGatewayClient({
  gatewayBaseUrl: '...',
  apiKey: '...',
  fetchImpl: nodeFetch as unknown as typeof fetch,
});
```

## License

MIT
