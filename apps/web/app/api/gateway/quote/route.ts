import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy to Convex gateway /quote endpoint
 * 
 * NOTE: This is a thin proxy route that exists to provide a unified
 * gateway URL for clients. The actual business logic is in the Convex
 * HTTP endpoint at /gateway/quote.
 * 
 * This route:
 * - Adds CORS headers for browser clients
 * - Proxies to the Convex HTTP endpoint
 * 
 * This should remain a simple proxy with no business logic.
 */
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
    
    const response = await fetch(`${convexSiteUrl}/gateway/quote`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    return NextResponse.json(data, {
      status: response.status,
      headers: corsHeaders(),
    });
  } catch (err) {
    console.error("Gateway proxy error:", err);
    return NextResponse.json(
      { error: "Gateway request failed", details: String(err) },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}
