import { NextRequest, NextResponse } from "next/server";
import {
  createWalletClient,
  createPublicClient,
  http,
  parseUnits,
  keccak256,
  toHex,
  getAddress,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { localhost } from "../../../../lib/wagmi";
import { treasuryAbi } from "../../../../lib/contracts";

/**
 * Gateway /pay endpoint with real on-chain token transfer
 * 
 * Flow:
 * 1. Call Convex /gateway/pay to validate and settle payment in DB
 * 2. Execute on-chain debit from treasury contract
 * 3. Return result with txHash
 */

const TREASURY_ADDRESS = process.env.NEXT_PUBLIC_TREASURY_ADDRESS as `0x${string}`;
const SIGNER_PRIVATE_KEY = process.env.TREASURY_SIGNER_PRIVATE_KEY as `0x${string}`;

// Token decimals (assuming 18 for now, could be fetched dynamically)
const TOKEN_DECIMALS = 18;

export async function POST(request: NextRequest) {
  const convexSiteUrl = process.env.NEXT_PUBLIC_CONVEX_URL?.replace(
    ".cloud",
    ".site"
  );

  if (!convexSiteUrl) {
    return NextResponse.json(
      { error: "CONVEX_URL not configured" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();

    // Step 1: Call Convex to validate and settle the payment in the database
    const convexResponse = await fetch(`${convexSiteUrl}/gateway/pay`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const convexData = await convexResponse.json();

    // If Convex returned an error, pass it through
    if (convexData.status === "error" || !convexResponse.ok) {
      return NextResponse.json(convexData, {
        status: convexResponse.status,
        headers: corsHeaders(),
      });
    }

    // Step 2: Execute on-chain token transfer (if configured)
    let txHash: string | undefined;

    if (TREASURY_ADDRESS && SIGNER_PRIVATE_KEY && convexData.workspaceId && convexData.payTo) {
      try {
        txHash = await executeDebit(
          convexData.workspaceId,
          convexData.payTo,
          convexData.mneeAmount
        );
        console.log(`Treasury debit executed: ${txHash}`);
      } catch (debitError) {
        console.error("Treasury debit failed:", debitError);
        // Return the debit error - payment is recorded but tokens weren't moved
        return NextResponse.json(
          {
            ...convexData,
            status: "error",
            debitError: debitError instanceof Error ? debitError.message : String(debitError),
          },
          {
            status: 500,
            headers: corsHeaders(),
          }
        );
      }
    } else {
      console.log("Treasury debit skipped - missing configuration:", {
        hasTreasury: !!TREASURY_ADDRESS,
        hasSigner: !!SIGNER_PRIVATE_KEY,
        hasWorkspaceId: !!convexData.workspaceId,
        hasPayTo: !!convexData.payTo,
      });
    }

    // Return success with optional txHash
    return NextResponse.json(
      {
        ...convexData,
        txHash,
      },
      {
        status: 200,
        headers: corsHeaders(),
      }
    );
  } catch (err) {
    console.error("Gateway pay error:", err);
    return NextResponse.json(
      { error: "Gateway request failed", details: String(err) },
      { status: 500 }
    );
  }
}

/**
 * Execute the treasury debit transaction on-chain
 */
async function executeDebit(
  workspaceId: string,
  payTo: string,
  mneeAmount: number
): Promise<string> {
  // Derive workspaceKey from workspaceId (same as frontend)
  const workspaceKey = keccak256(toHex(workspaceId));

  // Normalize payTo address to proper checksum format
  const normalizedPayTo = getAddress(payTo);

  // Convert amount to token units (assuming 18 decimals)
  // mneeAmount is in "human" units (e.g., 0.49)
  const amountInUnits = parseUnits(mneeAmount.toString(), TOKEN_DECIMALS);

  console.log("Executing treasury debit:", {
    workspaceId,
    workspaceKey,
    payTo: normalizedPayTo,
    mneeAmount,
    amountInUnits: amountInUnits.toString(),
  });

  // Create wallet client with signer
  const account = privateKeyToAccount(SIGNER_PRIVATE_KEY);
  
  const walletClient = createWalletClient({
    account,
    chain: localhost,
    transport: http("http://127.0.0.1:8545"),
  });

  const publicClient = createPublicClient({
    chain: localhost,
    transport: http("http://127.0.0.1:8545"),
  });

  // Execute the debit transaction
  const hash = await walletClient.writeContract({
    address: TREASURY_ADDRESS,
    abi: treasuryAbi,
    functionName: "debit",
    args: [workspaceKey, normalizedPayTo, amountInUnits],
  });

  // Wait for transaction to be mined
  await publicClient.waitForTransactionReceipt({ hash });

  return hash;
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(),
  });
}
