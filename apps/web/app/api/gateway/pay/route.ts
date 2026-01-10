import { NextRequest, NextResponse } from "next/server";
import { executeGatewayPayment, hashApiKey } from "@/lib/ethereum/treasury";
import type { Address, Hex } from "viem";

/**
 * Gateway /pay endpoint for MNEE ERC20 payments on Ethereum
 * 
 * TREASURY-BASED (Non-Custodial) Flow:
 * 
 * This route executes payments through the X402Gateway smart contract,
 * which pulls funds from the user's Treasury contract.
 * 
 * Benefits:
 * - Users maintain full control of their funds
 * - Spending limits enforced on-chain
 * - No private keys stored on server
 * - Auditable on-chain transactions
 * 
 * Flow:
 * 1. Call Convex /gateway/pay to validate API key and get treasury info
 * 2. Execute payment via X402Gateway contract (requires GATEWAY_PRIVATE_KEY)
 * 3. Mark payment as settled/failed in Convex
 * 4. Return result with txHash
 * 
 * Required Environment Variables:
 * - GATEWAY_PRIVATE_KEY: Private key of the gateway signer (has GATEWAY_ROLE on X402Gateway)
 * - ETHEREUM_RPC_URL / SEPOLIA_RPC_URL: RPC endpoints for contract interactions
 */

interface ConvexPayResponse {
  status: "ok" | "error";
  paymentId?: string;
  invoiceId?: string;
  amount?: number; // Amount in MNEE (18 decimals, stored as float)
  workspaceId?: string;
  payTo?: string; // Ethereum address (0x...)
  // Treasury info for payment execution
  treasuryAddress?: string;
  apiKey?: string; // For hashing to get on-chain identifier
  network?: "sepolia" | "mainnet";
  code?: string;
}

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

  // Gateway private key for executing payments through the X402Gateway contract
  const gatewayPrivateKey = process.env.GATEWAY_PRIVATE_KEY;
  if (!gatewayPrivateKey) {
    return NextResponse.json(
      { error: "GATEWAY_PRIVATE_KEY not configured" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();

    // Step 1: Call Convex to validate and get payment info
    const convexResponse = await fetch(`${convexSiteUrl}/gateway/pay`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const convexData: ConvexPayResponse = await convexResponse.json();

    // If Convex returned an error, pass it through
    if (convexData.status === "error" || !convexResponse.ok) {
      return NextResponse.json(convexData, {
        status: convexResponse.status,
        headers: corsHeaders(),
      });
    }

    // Step 2: Execute payment through treasury
    let txHash: string | undefined;

    const hasTreasuryInfo = convexData.treasuryAddress && convexData.apiKey && convexData.network;
    
    if (convexData.workspaceId && convexData.payTo && hasTreasuryInfo) {
      try {
        console.log("Executing treasury-based payment...");
        
        const result = await executeGatewayPayment(
          convexData.network!,
          gatewayPrivateKey,
          {
            treasuryAddress: convexData.treasuryAddress as Address,
            apiKeyHash: hashApiKey(convexData.apiKey!) as Hex,
            recipient: convexData.payTo as Address,
            amount: convexData.amount || 0,
            invoiceId: convexData.invoiceId || "",
          }
        );

        if (!result.success) {
          throw new Error(result.error || "Treasury payment failed");
        }

        txHash = result.txHash;
        console.log(`Treasury payment executed: ${txHash}`);

        // Mark payment as settled in Convex
        if (convexData.paymentId) {
          await markPaymentStatus(convexSiteUrl, convexData.paymentId, "settled", txHash);
        }
      } catch (paymentError) {
        console.error("Treasury payment execution failed:", paymentError);
        
        // Mark payment as failed in Convex
        if (convexData.paymentId) {
          await markPaymentStatus(
            convexSiteUrl,
            convexData.paymentId,
            "failed",
            undefined,
            paymentError instanceof Error ? paymentError.message : String(paymentError)
          );
        }
        
        return NextResponse.json(
          {
            ...convexData,
            status: "error",
            paymentError: paymentError instanceof Error ? paymentError.message : String(paymentError),
          },
          { status: 500, headers: corsHeaders() }
        );
      }
    } else {
      console.warn("Payment skipped - missing treasury configuration:", {
        hasWorkspaceId: !!convexData.workspaceId,
        hasPayTo: !!convexData.payTo,
        hasTreasuryInfo,
      });
      
      return NextResponse.json(
        {
          ...convexData,
          status: "error",
          code: "NO_TREASURY",
          error: "No treasury configured for this workspace. Please deploy a treasury first.",
        },
        { status: 400, headers: corsHeaders() }
      );
    }

    // Return success with txHash
    return NextResponse.json(
      {
        ...convexData,
        txHash,
      },
      { status: 200, headers: corsHeaders() }
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
 * Helper to mark payment status in Convex
 */
async function markPaymentStatus(
  convexSiteUrl: string,
  paymentId: string,
  status: "settled" | "failed",
  txHash?: string,
  errorMessage?: string
): Promise<void> {
  try {
    const endpoint = status === "settled" ? "mark-settled" : "mark-failed";
    const body = status === "settled"
      ? { paymentId, txHash }
      : { paymentId, errorMessage };
    
    await fetch(`${convexSiteUrl}/gateway/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (error) {
    console.error(`Failed to mark payment as ${status}:`, error);
  }
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
