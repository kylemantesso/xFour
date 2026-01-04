/**
 * API Route: Get MNEE Wallet Balance
 * 
 * Fetches the balance for a given MNEE wallet address
 */

import { NextRequest, NextResponse } from "next/server";
import Mnee from "@mnee/ts-sdk";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const address = searchParams.get("address");
  const network = searchParams.get("network") || "sandbox";

  if (!address) {
    return NextResponse.json({ error: "Address required" }, { status: 400 });
  }

  if (!process.env.MNEE_API_KEY) {
    return NextResponse.json({ error: "MNEE not configured" }, { status: 500 });
  }

  try {
    const mnee = new Mnee({
      environment: network === "sandbox" ? "sandbox" : "production",
      apiKey: process.env.MNEE_API_KEY,
    });

    const balanceData = await mnee.balance(address);
    
    return NextResponse.json({
      address,
      balance: balanceData.decimalAmount || 0,
      network,
    });
  } catch (error) {
    console.error("Error fetching MNEE balance:", error);
    return NextResponse.json(
      { error: "Failed to fetch balance", balance: 0 },
      { status: 500 }
    );
  }
}

