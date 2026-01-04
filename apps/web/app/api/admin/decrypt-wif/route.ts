import { NextRequest, NextResponse } from "next/server";
import { decryptWif } from "@/lib/mnee-crypto";

/**
 * API Route: Decrypt an encrypted WIF
 * 
 * This endpoint decrypts an encrypted WIF for admin debugging purposes.
 * 
 * POST /api/admin/decrypt-wif
 * Body:
 * {
 *   encryptedWif: string;
 * }
 * 
 * Security: This should only be used by platform admins for debugging.
 * The frontend checks admin status before allowing access.
 */

interface DecryptWifRequest {
  encryptedWif: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: DecryptWifRequest = await request.json();

    // Validate request
    if (!body.encryptedWif) {
      return NextResponse.json(
        { error: "Missing required field: encryptedWif" },
        { status: 400 }
      );
    }

    // Decrypt the WIF
    let decryptedWif: string;
    try {
      decryptedWif = decryptWif(body.encryptedWif);
    } catch (error) {
      console.error("Failed to decrypt WIF:", error);
      return NextResponse.json(
        { 
          error: "Failed to decrypt WIF", 
          details: error instanceof Error ? error.message : "Invalid encrypted WIF format or wrong encryption key"
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      decryptedWif,
    });
  } catch (error) {
    console.error("Decrypt WIF error:", error);
    
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

