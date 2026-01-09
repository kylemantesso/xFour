import { NextRequest, NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { fetchMutation } from "convex/nextjs";
import { encryptWif } from "@/lib/mnee-crypto";

/**
 * API Route: Add MNEE Wallet to Workspace
 * 
 * This endpoint encrypts the WIF before storing it in Convex.
 * 
 * POST /api/admin/mnee/add-wallet
 * Body:
 * {
 *   address: string;
 *   wif: string; (plaintext WIF from MNEE CLI)
 *   network: "sandbox" | "mainnet";
 * }
 * 
 * Security: This endpoint should only be accessible to authenticated workspace admins.
 * The Convex mutation handles authorization.
 */

interface AddWalletRequest {
  address: string;
  wif: string;
  network: "sandbox" | "mainnet";
}

export async function POST(request: NextRequest) {
  try {
    const body: AddWalletRequest = await request.json();

    // Validate request
    if (!body.address || !body.wif || !body.network) {
      return NextResponse.json(
        { error: "Missing required fields: address, wif, network" },
        { status: 400 }
      );
    }

    // Validate network
    if (body.network !== "sandbox" && body.network !== "mainnet") {
      return NextResponse.json(
        { error: "Invalid network. Must be 'sandbox' or 'mainnet'" },
        { status: 400 }
      );
    }

    // Encrypt the WIF before storing
    let encryptedWif: string;
    try {
      encryptedWif = encryptWif(body.wif);
    } catch (error) {
      console.error("Failed to encrypt WIF:", error);
      return NextResponse.json(
        { error: "Failed to encrypt wallet credentials" },
        { status: 500 }
      );
    }

    // Call Convex mutation to store the wallet
    // Note: This requires Clerk authentication context
    const result = await fetchMutation(api.mneeAdmin.addMneeWalletToWorkspace, {
      address: body.address,
      encryptedWif,
      network: body.network,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to add wallet" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      walletId: result.walletId,
      message: `MNEE ${body.network} wallet added successfully`,
    });
  } catch (error) {
    console.error("Add MNEE wallet error:", error);
    
    // Handle Convex auth errors
    if (error instanceof Error && error.message.includes("Unauthenticated")) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { 
        error: "Internal server error", 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}

// CORS headers for development
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(),
  });
}



