import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * POST /api/admin/setup-local
 * 
 * Sets up Convex with localhost deployment addresses.
 * 
 * Body:
 * {
 *   "treasuryAddress": "0x...",
 *   "swapRouterAddress": "0x...",
 *   "mneeAddress": "0x...",
 *   "usdcAddress": "0x..."
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { treasuryAddress, swapRouterAddress, mneeAddress, usdcAddress } = body;

    if (!treasuryAddress || !swapRouterAddress || !mneeAddress || !usdcAddress) {
      return NextResponse.json(
        { error: "Missing required addresses" },
        { status: 400 }
      );
    }

    const results: string[] = [];

    // 1. Seed default chains
    try {
      const chainResult = await convex.mutation(api.chains.seedDefaultChains, {});
      results.push(`Chains: ${chainResult.message}`);
    } catch (e) {
      results.push(`Chains: Already seeded or error - ${e}`);
    }

    // 2. Update localhost chain with deployed addresses (uses special no-auth mutation)
    try {
      await convex.mutation(api.chains.setupLocalhost, {
        treasuryAddress,
        swapRouterAddress,
      });
      results.push(`Localhost chain updated with treasury and swap router`);
    } catch (e) {
      results.push(`Chain update error: ${e}`);
    }

    // 3. Add tokens to global supported tokens
    try {
      const tokenResult = await convex.mutation(api.tokens.seedDefaultTokens, {
        tokens: [
          { address: mneeAddress, symbol: "MNEE", name: "Mock MNEE", decimals: 18, chainId: 31337 },
          { address: usdcAddress, symbol: "USDC", name: "Mock USDC", decimals: 6, chainId: 31337 },
        ],
      });
      results.push(`Tokens: ${tokenResult.message}`);
    } catch (e) {
      results.push(`Token seed error: ${e}`);
    }

    return NextResponse.json({
      success: true,
      results,
      nextStep: "Go to Treasury page, select Localhost network, and add tokens to your workspace!",
    });
  } catch (error) {
    console.error("Setup error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Setup failed" },
      { status: 500 }
    );
  }
}

