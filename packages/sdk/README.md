# @x402/sdk

TypeScript SDK for the x402 payment gateway.

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
import { X402Client, parseX402Headers, isPaymentRequired } from '@x402/sdk';

// Initialize the client with your API key
const client = new X402Client({
  apiKey: 'x402_your_api_key_here',
});

// When you receive a 402 response, parse the headers and get a quote
const response = await fetch('https://api.example.com/paid-resource');

if (isPaymentRequired(response)) {
  const invoiceHeaders = parseX402Headers(response);
  
  if (invoiceHeaders) {
    const quote = await client.getQuote({
      requestUrl: 'https://api.example.com/paid-resource',
      invoiceHeaders,
    });
    
    if (quote.status === 'allowed') {
      console.log(`Payment approved! Amount: ${quote.mneeAmount} MNEE`);
      // Proceed with payment...
    } else {
      console.log(`Payment denied: ${quote.reason}`);
    }
  }
}
```

## API Reference

### `X402Client`

The main client for interacting with the x402 gateway.

#### Constructor

```typescript
new X402Client(config: X402ClientConfig)
```

- `config.apiKey` (required): Your x402 API key
- `config.baseUrl` (optional): Gateway base URL (defaults to production)

#### Methods

##### `getQuote(request: QuoteRequest): Promise<QuoteResponse>`

Get a quote for an x402 payment.

### Utilities

#### `parseX402Headers(response: Response): X402InvoiceHeaders | null`

Parse x402 invoice headers from a fetch Response.

#### `isPaymentRequired(response: Response): boolean`

Check if a response is a 402 Payment Required.

## Types

```typescript
interface X402InvoiceHeaders {
  "X-402-Invoice-Id"?: string;
  "X-402-Amount"?: string;
  "X-402-Currency"?: string;
  "X-402-Network"?: string;
  "X-402-Pay-To"?: string;
}

interface QuoteResponseAllowed {
  status: "allowed";
  paymentId: string;
  invoiceId: string;
  mneeAmount: number;
  fxRate: number;
}

interface QuoteResponseDenied {
  status: "denied";
  reason: string;
  invoiceId: string | null;
  mneeAmount: number | null;
  fxRate: number | null;
}
```

## License

MIT

