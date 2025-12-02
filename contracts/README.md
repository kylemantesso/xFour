# x402-gateway Contracts

Smart contracts for the x402-gateway treasury system.

## Overview

This package contains the `ERC20WorkspaceTreasury` contract - a generic treasury that:

- Holds a specific ERC-20 token (address provided at deployment)
- Tracks balances per workspace using a `bytes32` workspaceKey
- Allows any user to deposit tokens into a workspace's balance
- Allows the owner (treasury operator) to debit tokens and send to recipients

## Setup

```bash
pnpm install
```

## Commands

```bash
# Compile contracts
pnpm compile

# Run tests
pnpm test

# Run test coverage
pnpm coverage

# Start local Hardhat node
pnpm node

# Deploy to local network
TOKEN_ADDRESS=0x... pnpm deploy:local

# Deploy to Sepolia testnet (configure hardhat.config.ts first)
TOKEN_ADDRESS=0x... pnpm deploy:sepolia
```

## Contract Details

### ERC20WorkspaceTreasury

**Constructor:**
- `_token`: Address of the ERC-20 token this treasury will manage

**Key Functions:**
- `deposit(bytes32 workspaceKey, uint256 amount)` - Anyone can deposit tokens
- `debit(bytes32 workspaceKey, address to, uint256 amount)` - Owner only, sends tokens to recipient
- `workspaceBalance(bytes32 workspaceKey)` - View workspace balance
- `transferOwnership(address newOwner)` - Transfer owner role

**Events:**
- `Deposited(bytes32 indexed workspaceKey, address indexed from, uint256 amount)`
- `Debited(bytes32 indexed workspaceKey, address indexed to, uint256 amount)`
- `OwnershipTransferred(address indexed previousOwner, address indexed newOwner)`

## Workspace Keys

The `workspaceKey` is a `bytes32` identifier derived off-chain. Example:

```typescript
import { ethers } from "ethers";

// From a workspace ID string
const workspaceKey = ethers.keccak256(ethers.toUtf8Bytes("workspace-123"));

// Or from a UUID
const workspaceKey = ethers.keccak256(ethers.toUtf8Bytes("550e8400-e29b-41d4-a716-446655440000"));
```

## Deployment

1. Set up your `.env` file with required values:
   ```
   PRIVATE_KEY=your_private_key
   SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
   ```

2. Configure the network in `hardhat.config.ts`

3. Deploy:
   ```bash
   TOKEN_ADDRESS=0xYourTokenAddress pnpm deploy:sepolia
   ```

## Security

- Uses Solidity 0.8.20+ for built-in overflow protection
- Simple ownership pattern with transfer capability
- Clear revert messages on all validation failures
- All token transfers are checked for success


