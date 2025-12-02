# Token Swap Integration

The x402 Gateway supports automatic token swapping when the treasury token differs from the provider's required payment token.

## Overview

When an API provider requires payment in USDC but the workspace treasury holds MNEE, the gateway will:

1. Withdraw MNEE from the treasury
2. Swap MNEE → USDC via DEX
3. Pay the provider in USDC

## Architecture

```
┌─────────────┐     ┌──────────────────────┐     ┌────────────────┐
│  /pay API   │ ──► │  Swap Service        │ ──► │  Treasury      │
│             │     │  (0x/Mock)           │     │  Contract      │
└─────────────┘     └──────────────────────┘     └────────────────┘
                           │
                           ▼
                    ┌──────────────────┐
                    │  DEX             │
                    │  (0x / MockRouter)│
                    └──────────────────┘
```

## Token Configuration

**Token addresses are stored in Convex**, not environment variables. The admin manages supported tokens through the `supportedTokens` table.

### Adding Tokens via Convex Dashboard

1. Go to Convex Dashboard → Data → supportedTokens
2. Add tokens with: `address`, `symbol`, `name`, `decimals`, `chainId`

### Or via the seed function

```typescript
// Call tokens.seedDefaultTokens mutation with your tokens
await convex.mutation(api.tokens.seedDefaultTokens, {
  tokens: [
    { address: "0x...", symbol: "MNEE", name: "MNEE Token", decimals: 18, chainId: 31337 },
    { address: "0x...", symbol: "USDC", name: "USD Coin", decimals: 6, chainId: 31337 },
  ]
});
```

## Environment Configuration

### Required Environment Variables

```bash
# ==============================================
# CHAIN CONFIGURATION
# ==============================================
# Chain ID: 31337 (localhost), 8453 (Base), 84532 (Base Sepolia)
NEXT_PUBLIC_CHAIN_ID=31337

# RPC URLs (optional - defaults provided)
NEXT_PUBLIC_BASE_RPC_URL=https://mainnet.base.org
NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL=https://sepolia.base.org

# ==============================================
# CONTRACT ADDRESSES
# ==============================================
# Treasury contract
NEXT_PUBLIC_TREASURY_ADDRESS=0x...

# Mock swap router (localhost only)
NEXT_PUBLIC_SWAP_ROUTER_ADDRESS=0x...

# ==============================================
# SWAP CONFIGURATION (Production)
# ==============================================
# 0x Swap API key (required for Base mainnet/Sepolia)
# Get your API key at https://0x.org/
ZEROX_API_KEY=your_0x_api_key

# ==============================================
# TREASURY SIGNER
# ==============================================
# Private key for executing treasury operations
# WARNING: Keep this secret!
TREASURY_SIGNER_PRIVATE_KEY=0x...
```

**Note:** Token addresses (MNEE, USDC, etc.) are **NOT** stored in environment variables.
They are looked up from Convex `supportedTokens` table by symbol.

## Local Development Setup

### 1. Start Hardhat Node

```bash
cd contracts
npx hardhat node
```

### 2. Deploy Contracts

```bash
npx hardhat run scripts/deploy-local.ts --network localhost
```

This will deploy:
- MockERC20 (MNEE) - 18 decimals
- MockERC20 (USDC) - 6 decimals
- ERC20WorkspaceTreasury
- MockSwapRouter (with liquidity)

Copy the output addresses to your `.env.local` file.

### 3. Default Test Account

The default Hardhat account #0 private key:
```
0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

## Production Setup (Base Mainnet/Sepolia)

### 1. Get 0x API Key

Sign up at https://0x.org/ to get an API key.

### 2. Configure Environment

```bash
NEXT_PUBLIC_CHAIN_ID=8453  # or 84532 for Sepolia
ZEROX_API_KEY=your_key
```

### 3. Deploy Treasury

Deploy the treasury contract to Base:

```bash
cd contracts
npx hardhat run scripts/deploy.ts --network base
```

## Swap Service API

### SwapService Class

```typescript
import { SwapService, createSwapService } from "@/lib/swap";

// Create service for current chain
const swapService = createSwapService(chainId);

// Check if swap is needed
const needsSwap = swapService.isSwapNeeded(sellToken, buyToken);

// Get quote
const quote = await swapService.getQuote({
  sellToken: "0x...",      // Token to sell
  buyToken: "0x...",       // Token to buy
  buyAmount: 1000000n,     // Amount to receive (in token units)
  sellTokenDecimals: 18,
  buyTokenDecimals: 6,
  fromAddress: "0x...",
});

// Execute swap
const result = await swapService.executeSwap(params, quote);
```

## Treasury Contract Functions

### withdrawForSwap

Withdraws tokens from a workspace balance for external swap:

```solidity
function withdrawForSwap(
    address token,
    bytes32 workspaceKey,
    address to,
    uint256 amount
) external onlyOwner
```

### creditFromSwap

Credits swapped tokens back to workspace (if needed):

```solidity
function creditFromSwap(
    address token,
    bytes32 workspaceKey,
    uint256 amount
) external onlyOwner
```

## Payment Flow with Swap

1. **Quote Phase** (`/gateway/quote`)
   - Receives x402 invoice with `originalCurrency` (e.g., USDC)
   - Records `paymentToken` from API key (e.g., MNEE address)
   - Calculates FX rate and stores in payment record

2. **Pay Phase** (`/gateway/pay`)
   - Checks if `paymentToken` matches required token
   - If different:
     - Calls `withdrawForSwap()` to get tokens from treasury
     - Executes swap via SwapService
     - Transfers swapped tokens to provider
   - If same:
     - Calls `debit()` directly

3. **Record Keeping**
   - `swapTxHash`: Transaction hash of the swap
   - `swapSellAmount`: Amount sold
   - `swapBuyAmount`: Amount received
   - `swapFee`: Fee paid (if any)

## Supported Chains

| Chain | ID | Swap Method |
|-------|-----|-------------|
| Localhost | 31337 | MockSwapRouter |
| Base Mainnet | 8453 | 0x Swap API |
| Base Sepolia | 84532 | 0x Swap API |

## Testing

### Mock Swap Router

The MockSwapRouter provides 1:1 swaps (adjusted for decimals) for testing:

```solidity
// Get amount needed to buy
uint256 amountIn = router.getAmountIn(tokenIn, tokenOut, amountOut);

// Execute swap
uint256 amountOut = router.swap(
    tokenIn,
    tokenOut,
    amountIn,
    minAmountOut,
    recipient
);
```

### Adding Liquidity

For local testing, the deploy script automatically adds liquidity. To add more:

```bash
npx hardhat run scripts/mint.ts --network localhost
```

## Troubleshooting

### "Insufficient liquidity"
- For localhost: Run deploy script again or add liquidity manually
- For production: Check 0x quote - may need to adjust slippage

### "0x API error"
- Verify ZEROX_API_KEY is set
- Check if token pair is supported on 0x
- Verify token addresses are correct for the chain

### "Token transfer failed"
- Ensure treasury has sufficient balance
- Check token approvals
- Verify signer has owner role on treasury

