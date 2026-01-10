import { NextRequest, NextResponse } from "next/server";
import {
  createPublicClient,
  createWalletClient,
  http,
  keccak256,
  toBytes,
  parseUnits,
  type Address,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia, mainnet } from "viem/chains";

/**
 * POST /api/treasury/configure-api-key
 * 
 * Configures an API key on the Treasury contract.
 * Called automatically when API keys are created.
 * 
 * Request body:
 * {
 *   apiKey: string,           // The actual API key (to hash)
 *   treasuryAddress: string,  // Treasury contract address
 *   network: "sepolia" | "mainnet",
 *   spendingLimits?: {
 *     maxPerTransaction: number,  // In MNEE
 *     dailyLimit: number,
 *     monthlyLimit: number,
 *   }
 * }
 */

const TREASURY_ABI = [
  {
    inputs: [
      { name: "apiKeyHash", type: "bytes32" },
      { name: "maxPerTransaction", type: "uint256" },
      { name: "dailyLimit", type: "uint256" },
      { name: "monthlyLimit", type: "uint256" },
      { name: "isActive", type: "bool" },
    ],
    name: "configureApiKey",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "apiKeyHash", type: "bytes32" }],
    name: "apiKeyLimits",
    outputs: [
      { name: "maxPerTransaction", type: "uint256" },
      { name: "dailyLimit", type: "uint256" },
      { name: "monthlyLimit", type: "uint256" },
      { name: "isActive", type: "bool" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

// Default spending limits if none provided
const DEFAULT_LIMITS = {
  maxPerTransaction: 100,  // 100 MNEE per transaction
  dailyLimit: 1000,        // 1000 MNEE per day
  monthlyLimit: 10000,     // 10000 MNEE per month
};

function getRpcUrl(network: "sepolia" | "mainnet"): string {
  if (network === "mainnet") {
    const url = process.env.ETHEREUM_RPC_URL;
    if (!url) throw new Error("ETHEREUM_RPC_URL not configured");
    return url;
  }
  const url = process.env.SEPOLIA_RPC_URL;
  if (!url) throw new Error("SEPOLIA_RPC_URL not configured");
  return url;
}

function getChain(network: "sepolia" | "mainnet") {
  return network === "mainnet" ? mainnet : sepolia;
}

export async function POST(request: NextRequest) {
  const gatewayPrivateKey = process.env.GATEWAY_PRIVATE_KEY;
  if (!gatewayPrivateKey) {
    return NextResponse.json(
      { error: "GATEWAY_PRIVATE_KEY not configured" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { apiKey, treasuryAddress, network, spendingLimits } = body;

    if (!apiKey || !treasuryAddress || !network) {
      return NextResponse.json(
        { error: "Missing required fields: apiKey, treasuryAddress, network" },
        { status: 400 }
      );
    }

    if (network !== "sepolia" && network !== "mainnet") {
      return NextResponse.json(
        { error: "Invalid network. Must be 'sepolia' or 'mainnet'" },
        { status: 400 }
      );
    }

    const rpcUrl = getRpcUrl(network);
    const chain = getChain(network);

    // Hash the API key
    const apiKeyHash = keccak256(toBytes(apiKey));

    // Create clients
    const account = privateKeyToAccount(gatewayPrivateKey as `0x${string}`);
    
    const publicClient = createPublicClient({
      chain,
      transport: http(rpcUrl),
    });

    const walletClient = createWalletClient({
      account,
      chain,
      transport: http(rpcUrl),
    });

    // Check if already configured
    const existingLimits = await publicClient.readContract({
      address: treasuryAddress as Address,
      abi: TREASURY_ABI,
      functionName: "apiKeyLimits",
      args: [apiKeyHash],
    });

    if (existingLimits[3]) { // isActive
      console.log(`API key already configured on treasury ${treasuryAddress}`);
      return NextResponse.json({
        status: "ok",
        message: "API key already configured",
        alreadyConfigured: true,
      });
    }

    // Use provided limits or defaults
    const limits = {
      maxPerTransaction: spendingLimits?.maxPerTransaction ?? DEFAULT_LIMITS.maxPerTransaction,
      dailyLimit: spendingLimits?.dailyLimit ?? DEFAULT_LIMITS.dailyLimit,
      monthlyLimit: spendingLimits?.monthlyLimit ?? DEFAULT_LIMITS.monthlyLimit,
    };

    console.log(`Configuring API key on treasury ${treasuryAddress}...`);
    console.log(`  Hash: ${apiKeyHash}`);
    console.log(`  Limits: ${JSON.stringify(limits)}`);

    // Configure the API key on-chain
    const hash = await walletClient.writeContract({
      address: treasuryAddress as Address,
      abi: TREASURY_ABI,
      functionName: "configureApiKey",
      args: [
        apiKeyHash,
        parseUnits(limits.maxPerTransaction.toString(), 18),
        parseUnits(limits.dailyLimit.toString(), 18),
        parseUnits(limits.monthlyLimit.toString(), 18),
        true, // isActive
      ],
    });

    console.log(`Transaction sent: ${hash}`);

    // Wait for confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    if (receipt.status === "reverted") {
      return NextResponse.json(
        { error: "Transaction reverted" },
        { status: 500 }
      );
    }

    console.log(`✅ API key configured on-chain! TX: ${hash}`);

    return NextResponse.json({
      status: "ok",
      txHash: hash,
      apiKeyHash,
      limits,
    });
  } catch (error) {
    console.error("Failed to configure API key on-chain:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
