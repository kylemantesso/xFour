# xFour

**Payment Infrastructure for AI Agents** | [xfour.xyz](https://xfour.xyz)

xFour is a programmable payment gateway that enables AI agents to transact autonomously using stablecoins on Ethereum, with full budget controls, policy enforcement, and real-time analytics.

## Features

- 🔑 **Secure API Keys** - Generate API keys for each agent with workspace isolation
- 🛡️ **Payment Policies** - Set spending limits, allowed providers, and budget caps
- 📊 **Real-time Analytics** - Monitor payments as they happen with full audit trails
- 🔄 **Token Swaps** - Automatic swaps from your treasury token to provider's required currency
- 🏦 **Treasury Management** - Non-custodial smart contract treasuries
- 🔌 **SDK Integration** - Drop-in SDK for any AI agent framework

## Tech Stack

- **Frontend**: Next.js 15, React, Tailwind CSS
- **Backend**: Convex (real-time database & server logic)
- **Auth**: Clerk
- **Blockchain**: Ethereum, MNEE Stablecoin
- **Contracts**: Hardhat, Solidity

## Project Structure

```
├── apps/
│   └── web/           # Next.js web application
│       ├── app/       # App router pages
│       ├── components/ # React components
│       ├── convex/    # Convex backend functions
│       └── hooks/     # Custom React hooks
├── contracts/         # Solidity smart contracts
└── packages/
    └── sdk/           # TypeScript SDK (@xfour/sdk)
```

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- A Convex account
- A Clerk account

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

## License

MIT
