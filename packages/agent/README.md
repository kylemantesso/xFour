# @x402/agent

TypeScript SDK for AI agents and applications that consume paid APIs. Provides a drop-in `fetch` replacement that automatically handles x402 payment flows.

## Installation

```bash
npm install @x402/agent
# or
pnpm add @x402/agent
# or
yarn add @x402/agent
```

## Quick Start

```typescript
import { createAgentClient } from '@x402/agent';

// Initialize the client
const client = createAgentClient({
  gatewayBaseUrl: 'http://localhost:3000/api/gateway',
  apiKey: process.env.X402_AGENT_KEY!,
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

### `createAgentClient(config)`

Creates a new agent client instance.

```typescript
import { createAgentClient, AgentClientConfig } from '@x402/agent';

const config: AgentClientConfig = {
  // Required: Gateway API base URL
  gatewayBaseUrl: 'http://localhost:3000/api/gateway',
  
  // Required: Your API key
  apiKey: 'your-api-key',
  
  // Optional: Custom fetch implementation (default: global fetch)
  fetchImpl: customFetch,
  
  // Optional: Header name for payment proof (default: 'X-MOCK-PAID-INVOICE')
  proofHeaderName: 'X-MOCK-PAID-INVOICE',
};

const client = createAgentClient(config);
```

### Error Classes

#### `PaymentDeniedError`

Thrown when the gateway denies a payment quote.

```typescript
import { PaymentDeniedError } from '@x402/agent';

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
import { PaymentFailedError } from '@x402/agent';

try {
  await client.fetchWithX402(url);
} catch (err) {
  if (err instanceof PaymentFailedError) {
    console.log('Error code:', err.code);
    console.log('Details:', err.details);
  }
}
```

## Complete Example

```typescript
import { createAgentClient, PaymentDeniedError, PaymentFailedError } from '@x402/agent';

async function main() {
  const client = createAgentClient({
    gatewayBaseUrl: 'http://localhost:3000/api/gateway',
    apiKey: process.env.X402_AGENT_KEY!,
  });

  try {
    // Make request to x402-protected API
    const res = await client.fetchWithX402('http://localhost:3000/api/ai/complete', {
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

const client = createAgentClient({
  gatewayBaseUrl: '...',
  apiKey: '...',
  fetchImpl: nodeFetch as unknown as typeof fetch,
});
```

## License

MIT


