import { NextRequest, NextResponse } from "next/server";

/**
 * Gateway /pay endpoint for MNEE payments
 * 
 * Flow:
 * 1. Call Convex /gateway/pay to validate and settle payment in DB
 * 2. Execute MNEE payment if required
 * 3. Return result with txHash
 */

interface ConvexPayResponse {
  status: "ok" | "error";
  paymentId?: string;
  invoiceId?: string;
  amount?: number; // Amount in MNEE
  workspaceId?: string;
  payTo?: string;
  // MNEE-specific fields
  mneeWalletAddress?: string;
  encryptedWif?: string;
  mneeNetwork?: "sandbox" | "mainnet";
  network?: "sandbox" | "mainnet";
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

    const convexData: ConvexPayResponse = await convexResponse.json();

    // If Convex returned an error, pass it through
    if (convexData.status === "error" || !convexResponse.ok) {
      return NextResponse.json(convexData, {
        status: convexResponse.status,
        headers: corsHeaders(),
      });
    }

    // Step 2: Execute MNEE payment
    let txHash: string | undefined;

    // Check for MNEE wallet info - Convex sends 'network', not 'mneeNetwork'
    const mneeNetwork = convexData.mneeNetwork || convexData.network;
    const hasMneeInfo = convexData.mneeWalletAddress && convexData.encryptedWif && mneeNetwork;
    
    if (convexData.workspaceId && convexData.payTo && hasMneeInfo) {
      try {
        const { executeMneePayment } = await import("@/lib/mnee-payment");
        
        const result = await executeMneePayment({
          workspaceId: convexData.workspaceId,
          recipientAddress: convexData.payTo,
          amount: convexData.amount || 0,
          network: mneeNetwork!,
          encryptedWif: convexData.encryptedWif!,
        });

        if (!result.success) {
          throw new Error(result.error || "MNEE payment failed");
        }

        txHash = result.txHash;
        console.log(`MNEE payment executed: ${txHash}`);

        // Mark payment as settled in Convex
        if (convexData.paymentId) {
          try {
            await fetch(`${convexSiteUrl}/gateway/mark-settled`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                paymentId: convexData.paymentId,
                txHash: txHash,
              }),
            });
          } catch (updateError) {
            console.error("Failed to mark payment as settled:", updateError);
          }
        }
      } catch (mneeError) {
        console.error("MNEE payment execution failed:", mneeError);
        
        // Mark payment as failed in Convex
        if (convexData.paymentId) {
          try {
            await fetch(`${convexSiteUrl}/gateway/mark-failed`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                paymentId: convexData.paymentId,
                errorMessage: mneeError instanceof Error ? mneeError.message : String(mneeError),
              }),
            });
          } catch (updateError) {
            console.error("Failed to mark payment as failed:", updateError);
          }
        }
        
        return NextResponse.json(
          {
            ...convexData,
            status: "error",
            paymentError: mneeError instanceof Error ? mneeError.message : String(mneeError),
          },
          {
            status: 500,
            headers: corsHeaders(),
          }
        );
      }
    } else {
      console.log("Payment skipped - missing MNEE configuration:", {
        hasWorkspaceId: !!convexData.workspaceId,
        hasPayTo: !!convexData.payTo,
        hasMneeInfo,
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
