import { NextRequest, NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { fetchMutation } from "convex/nextjs";
import { encryptWif } from "@/lib/mnee-crypto";
import { auth } from "@clerk/nextjs/server";

/**
 * API Route: Import Wallet
 * 
 * This endpoint encrypts the WIF before storing it in Convex.
 * 
 * POST /api/wallets/import
 * Body:
 * {
 *   name: string;
 *   address: string; (Bitcoin address)
 *   privateKey: string; (WIF format private key)
 *   network: "sandbox" | "mainnet";
 * }
 */

interface ImportWalletRequest {
  name: string;
  address: string;
  privateKey: string;
  network: "sandbox" | "mainnet";
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body: ImportWalletRequest = await request.json();

    // Validate request
    if (!body.name || !body.address || !body.privateKey || !body.network) {
      return NextResponse.json(
        { error: "Missing required fields: name, address, privateKey, network" },
        { status: 400 }
      );
    }

    // Validate name length
    if (body.name.trim().length < 1 || body.name.trim().length > 100) {
      return NextResponse.json(
        { error: "Wallet name must be between 1 and 100 characters" },
        { status: 400 }
      );
    }

    // Validate Bitcoin address format (basic check)
    const bitcoinAddressRegex = /^(1|3|bc1)[a-zA-Z0-9]{25,62}$/;
    if (!bitcoinAddressRegex.test(body.address.trim())) {
      return NextResponse.json(
        { error: "Invalid Bitcoin address format" },
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

    // Basic WIF validation (Bitcoin WIF starts with 5, K, or L for mainnet, c for testnet)
    const wifRegex = /^[5KLc][1-9A-HJ-NP-Za-km-z]{50,51}$/;
    if (!wifRegex.test(body.privateKey.trim())) {
      return NextResponse.json(
        { error: "Invalid private key format. Please enter a valid WIF (Wallet Import Format) key." },
        { status: 400 }
      );
    }

    // Encrypt the WIF before storing
    let encryptedWif: string;
    try {
      encryptedWif = encryptWif(body.privateKey.trim());
    } catch (error) {
      console.error("Failed to encrypt WIF:", error);
      return NextResponse.json(
        { error: "Failed to encrypt wallet credentials. Please check server configuration." },
        { status: 500 }
      );
    }

    // Call Convex mutation to store the wallet
    const result = await fetchMutation(api.wallets.createWallet, {
      name: body.name.trim(),
      address: body.address.trim(),
      encryptedWif,
      network: body.network,
    });

    return NextResponse.json({
      success: true,
      walletId: result.walletId,
      address: body.address.trim(),
      message: `Wallet "${body.name.trim()}" imported successfully`,
    });
  } catch (error) {
    console.error("Import wallet error:", error);
    
    // Handle Convex auth errors
    if (error instanceof Error && error.message.includes("Unauthenticated")) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Handle duplicate address errors
    if (error instanceof Error && error.message.includes("already exists")) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        error: "Failed to import wallet", 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}

