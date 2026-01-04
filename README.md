# xFour

**Payment Infrastructure for AI Agents** | [xfour.xyz](https://xfour.xyz)

xFour is a programmable payment gateway that enables AI agents to transact autonomously using MNEE stablecoin (USD-backed on Bitcoin), with full budget controls, policy enforcement, and real-time analytics.

## Features

- 🔑 **Secure API Keys** - Generate API keys for each agent with workspace isolation
- 🛡️ **Payment Policies** - Set spending limits, allowed providers, and budget caps
- 📊 **Real-time Analytics** - Monitor payments as they happen with full audit trails
- 🏦 **MNEE Wallets** - Automatically generated wallets per workspace for agent payments
- ₿ **Bitcoin-Based** - Built on MNEE stablecoin with instant settlement and near-zero fees
- 🔌 **SDK Integration** - Drop-in SDK for any AI agent framework

## Tech Stack

- **Frontend**: Next.js 15, React, Tailwind CSS
- **Backend**: Convex (real-time database & server logic)
- **Auth**: Clerk
- **Blockchain**: Bitcoin (BSV), MNEE Stablecoin

## Project Structure

```
├── apps/
│   └── web/           # Next.js web application
│       ├── app/       # App router pages
│       ├── components/ # React components
│       ├── convex/    # Convex backend functions
│       └── lib/       # MNEE wallet utilities
└── packages/
    └── sdk/           # TypeScript SDK (@xfour/sdk)
```

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- A Convex account
- A Clerk account
- MNEE API credentials (for MNEE wallet operations)

### Installation

```bash
# Install dependencies
pnpm install

# Start Convex dev server
cd apps/web
pnpm convex dev

# Start Next.js dev server (in another terminal)
pnpm dev
```

### Environment Variables

Create `.env.local` in `apps/web/`:

```env
NEXT_PUBLIC_CONVEX_URL=your-convex-url
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your-clerk-key
CLERK_SECRET_KEY=your-clerk-secret
MNEE_API_KEY=your-mnee-api-key
MNEE_ENCRYPTION_KEY=your-encryption-key-for-wallets
```

## SDK Usage

```typescript
import { createGatewayClient } from '@xfour/sdk';

const client = createGatewayClient({
  gatewayBaseUrl: 'https://xfour.xyz/api/gateway',
  apiKey: 'your-api-key',
});

// Payments are handled automatically!
const response = await client.fetchWithX402('https://api.example.com/paid-resource', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ data: 'test' }),
});
```

## MNEE Integration

xFour uses MNEE, a USD-backed stablecoin on Bitcoin (BSV), for all payments:

- **Instant Settlement**: Payments settle in seconds, not minutes
- **Near-Zero Fees**: Transaction fees are fractions of a cent
- **USD-Backed**: 1 MNEE = 1 USD, fully backed and redeemable
- **Non-Custodial**: Workspaces control their own MNEE wallets

## License

MIT
