# xFour

**Payment Infrastructure for AI Agents** | [xfour.xyz](https://xfour.xyz)

xFour is a programmable payment gateway that enables AI agents to transact autonomously using MNEE stablecoin (USD-backed ERC20 on Ethereum), with full budget controls, policy enforcement, and real-time analytics.

## Features

- 🔐 **Non-Custodial Treasuries** - Smart contract treasuries where YOU control the keys. Withdraw anytime.
- 🔑 **Secure API Keys** - Generate API keys for each agent with workspace isolation
- 🛡️ **On-Chain Spending Limits** - Per-transaction, daily, and monthly limits enforced by smart contracts
- 📊 **Real-time Analytics** - Monitor payments as they happen with full audit trails
- ⟠ **Ethereum-Based** - Built on MNEE stablecoin (ERC20) with robust settlement and wide ecosystem support
- 🔌 **SDK Integration** - Drop-in SDK for any AI agent framework

## Non-Custodial Architecture

xFour uses a non-custodial treasury system where each workspace deploys their own smart contract:

```
┌─────────────────────────────────────────────────────────────┐
│                    Your Treasury Contract                    │
│  ┌─────────────────┐  ┌─────────────────────────────────┐  │
│  │   Your Wallet   │  │     On-Chain Spending Limits    │  │
│  │   (ADMIN_ROLE)  │  │  - Per-transaction max          │  │
│  │                 │  │  - Daily budget caps            │  │
│  │  ✓ Deposit      │  │  - Monthly budget caps          │  │
│  │  ✓ Withdraw     │  │  - Per-API-key controls         │  │
│  │  ✓ Set limits   │  └─────────────────────────────────┘  │
│  │  ✓ Pause        │                                       │
│  └─────────────────┘                                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ GATEWAY_ROLE (execute only)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     x402 Gateway                             │
│  Can ONLY execute payments within YOUR defined limits        │
│  Cannot withdraw, cannot change limits, cannot pause         │
└─────────────────────────────────────────────────────────────┘
```

**Why Non-Custodial Matters:**

- ✅ **You Own Your Funds** - Tokens stay in YOUR contract, not ours
- ✅ **Withdraw Anytime** - No lockups, no approval needed
- ✅ **On-Chain Guarantees** - Spending limits enforced by immutable smart contracts
- ✅ **Transparent Audit Trail** - Every payment verifiable on-chain
- ✅ **Emergency Controls** - Pause your treasury instantly if needed

## Tech Stack

- **Frontend**: Next.js 15, React, Tailwind CSS
- **Backend**: Convex (real-time database & server logic)
- **Auth**: Clerk
- **Smart Contracts**: Solidity (OpenZeppelin), Hardhat
- **Blockchain**: Ethereum (Mainnet & Sepolia), MNEE ERC20 Stablecoin

## Project Structure

```
├── apps/
│   └── web/              # Next.js web application
│       ├── app/          # App router pages
│       ├── components/   # React components
│       ├── convex/       # Convex backend functions
│       └── lib/          # Ethereum client utilities
├── contracts/            # Solidity smart contracts
│   ├── Treasury.sol      # Non-custodial treasury contract
│   ├── TreasuryFactory.sol # Factory for deploying treasuries
│   └── X402Gateway.sol   # Payment gateway contract
└── packages/
    ├── agent/            # Agent SDK (@x402/agent)
    └── server/           # Server SDK (@x402/server)
```

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- A Convex account
- A Clerk account
- Ethereum RPC URLs (for wallet operations)

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
ETHEREUM_RPC_URL=your-mainnet-rpc-url
SEPOLIA_RPC_URL=your-sepolia-rpc-url
WALLET_ENCRYPTION_KEY=your-encryption-key-for-wallets
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

xFour uses MNEE, a USD-backed ERC20 stablecoin on Ethereum, for all payments:

- **Fast Settlement**: Payments settle in ~12 seconds on Ethereum
- **Wide Ecosystem**: Built on the most widely adopted smart contract platform
- **USD-Backed**: 1 MNEE = 1 USD, fully backed and redeemable
- **Non-Custodial**: Funds stay in your treasury contract, not ours

### MNEE Contract Addresses

- **Mainnet**: `0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF`
- **Sepolia (TestMNEE)**: Deploy your own using the contracts folder

## Smart Contract Architecture

### Treasury Contract

Each workspace gets their own `Treasury.sol` contract with:

| Feature | Description |
|---------|-------------|
| **Deposit/Withdraw** | Admin can deposit and withdraw MNEE at any time |
| **API Key Limits** | Configure per-key spending limits (per-tx, daily, monthly) |
| **On-Chain Enforcement** | All limits checked and enforced by the contract |
| **Pause/Unpause** | Admin can pause the treasury in emergencies |
| **Emergency Withdraw** | Withdraw all funds when paused |

### TreasuryFactory Contract

Deploys and tracks all treasury contracts:

- One treasury per workspace
- Registry of all deployed treasuries
- Gateway address configuration

### Security Model

```solidity
// Only the workspace admin can:
ADMIN_ROLE → deposit, withdraw, setLimits, pause

// Only the gateway can:
GATEWAY_ROLE → executePayment (within admin-defined limits)
```

The gateway **cannot** withdraw funds or change limits — it can only execute payments that respect the spending limits you've configured.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
