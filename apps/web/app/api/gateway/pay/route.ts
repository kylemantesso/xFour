import { NextRequest, NextResponse } from "next/server";
import {
  createWalletClient,
  createPublicClient,
  http,
  parseUnits,
  keccak256,
  toHex,
  getAddress,
  defineChain,
  type Chain,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { treasuryAbi, erc20Abi } from "../../../../lib/contracts";
import { createSwapService } from "../../../../lib/swap";

/**
 * Gateway /pay endpoint with real on-chain token transfer and swap support
 * 
 * Flow:
 * 1. Call Convex /gateway/pay to validate and settle payment in DB
 * 2. Chain info is derived from invoice network field (stored in Convex)
 * 3. Check if swap is needed (treasury token != provider's required token)
 * 4. If swap needed: withdraw from treasury, execute swap, pay provider
 * 5. If no swap: execute direct debit from treasury to provider
 * 6. Return result with txHash(es)
 */

// Only the signer key comes from environment - treasury addresses are per-chain in Convex
const SIGNER_PRIVATE_KEY = process.env.TREASURY_SIGNER_PRIVATE_KEY as `0x${string}`;

interface ConvexPayResponse {
  status: "ok" | "error";
  paymentId?: string;
  invoiceId?: string;
  treasuryAmount?: number;
  workspaceId?: string;
  payTo?: string;
  // Chain info (derived from invoice network field, stored in Convex)
  chainId?: number;
  rpcUrl?: string;
  treasuryAddress?: string; // Treasury contract address on this chain (from Convex)
  swapRouterAddress?: string; // Mock router for localhost
  zeroxApiUrl?: string; // 0x API URL for production chains
  // Treasury token (what workspace has) - from Convex supportedTokens
  treasuryTokenAddress?: string;
  treasuryTokenDecimals?: number;
  // Required token (what provider wants) - looked up by symbol from supportedTokens
  requiredTokenAddress?: string;
  requiredTokenDecimals?: number;
  originalCurrency?: string; // Currency symbol (e.g., "USDC")
  originalAmount?: number; // Amount in original currency
  originalNetwork?: string; // Network name from invoice
  code?: string;
}

/**
 * Build a viem Chain object from Convex chain data
 */
function buildChain(chainId: number, rpcUrl: string): Chain {
  return defineChain({
    id: chainId,
    name: `Chain ${chainId}`,
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: {
      default: { http: [rpcUrl] },
    },
  });
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

    // Step 2: Execute on-chain token transfer (if configured)
    let txHash: string | undefined;
    let swapTxHash: string | undefined;
    let swapSellAmount: number | undefined;
    let swapSellToken: string | undefined;
    let swapBuyAmount: number | undefined;
    let swapBuyToken: string | undefined;
    let swapFee: number | undefined;

    const hasChainInfo = convexData.chainId && convexData.rpcUrl && convexData.treasuryAddress;
    
    if (SIGNER_PRIVATE_KEY && convexData.workspaceId && convexData.payTo && hasChainInfo) {
      try {
        const result = await executePayment({
          workspaceId: convexData.workspaceId,
          payTo: convexData.payTo,
          // Chain info from Convex (derived from invoice network field)
          chainId: convexData.chainId!,
          rpcUrl: convexData.rpcUrl!,
          treasuryAddress: convexData.treasuryAddress!,
          swapRouterAddress: convexData.swapRouterAddress,
          zeroxApiUrl: convexData.zeroxApiUrl,
          // Treasury token info from Convex supportedTokens
          treasuryTokenAddress: convexData.treasuryTokenAddress,
          treasuryTokenDecimals: convexData.treasuryTokenDecimals ?? 18,
          // Required token info from Convex supportedTokens (looked up by symbol)
          requiredTokenAddress: convexData.requiredTokenAddress,
          requiredTokenDecimals: convexData.requiredTokenDecimals ?? 6,
          originalAmount: convexData.originalAmount,
          treasuryAmount: convexData.treasuryAmount,
        });
        
        txHash = result.paymentTxHash;
        swapTxHash = result.swapTxHash;
        swapSellAmount = result.swapSellAmount;
        swapSellToken = result.swapSellToken;
        swapBuyAmount = result.swapBuyAmount;
        swapBuyToken = result.swapBuyToken;
        swapFee = result.swapFee;
        
        if (swapTxHash) {
          console.log(`Swap executed: ${swapTxHash}, fee: ${swapFee}`);
        }
        console.log(`Payment executed: ${txHash}`);

        // Step 3: Save swap details back to Convex (this also marks payment as settled)
        if (convexData.paymentId) {
          try {
            await fetch(`${convexSiteUrl}/gateway/update-swap`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                paymentId: convexData.paymentId,
                txHash,
                swapTxHash,
                swapSellAmount,
                swapSellToken,
                swapBuyAmount,
                swapBuyToken,
                swapFee,
              }),
            });
            console.log("Swap details saved to Convex");
          } catch (updateError) {
            console.error("Failed to save swap details to Convex:", updateError);
            // Don't fail the request - payment already succeeded
          }
        }
      } catch (paymentError) {
        console.error("Payment execution failed:", paymentError);
        
        // Mark payment as failed in Convex
        if (convexData.paymentId) {
          try {
            await fetch(`${convexSiteUrl}/gateway/mark-failed`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                paymentId: convexData.paymentId,
                errorMessage: paymentError instanceof Error ? paymentError.message : String(paymentError),
              }),
            });
            console.log("Payment marked as failed in Convex");
          } catch (updateError) {
            console.error("Failed to mark payment as failed in Convex:", updateError);
          }
        }
        
        return NextResponse.json(
          {
            ...convexData,
            status: "error",
            paymentError: paymentError instanceof Error ? paymentError.message : String(paymentError),
          },
          {
            status: 500,
            headers: corsHeaders(),
          }
        );
      }
    } else {
      console.log("On-chain payment skipped - missing configuration:", {
        hasSigner: !!SIGNER_PRIVATE_KEY,
        hasWorkspaceId: !!convexData.workspaceId,
        hasPayTo: !!convexData.payTo,
        hasChainInfo,
        chainId: convexData.chainId,
        hasTreasuryAddress: !!convexData.treasuryAddress,
      });
    }

    // Return success with optional txHashes and swap details
    return NextResponse.json(
      {
        ...convexData,
        txHash,
        swapTxHash,
        swapSellAmount,
        swapSellToken,
        swapBuyAmount,
        swapBuyToken,
        swapFee,
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

interface PaymentParams {
  workspaceId: string;
  payTo: string;
  // Chain info from Convex (derived from invoice network field)
  chainId: number;
  rpcUrl: string;
  treasuryAddress: string; // Treasury contract address on this chain
  swapRouterAddress?: string; // Mock router for localhost
  zeroxApiUrl?: string; // 0x API for production chains
  // Treasury token (what workspace has) - from Convex supportedTokens
  treasuryTokenAddress?: string;
  treasuryTokenDecimals: number;
  // Required token (what provider wants) - from Convex supportedTokens
  requiredTokenAddress?: string;
  requiredTokenDecimals: number;
  originalAmount?: number; // Amount provider wants
  treasuryAmount?: number; // Converted amount in treasury token
}

interface PaymentResult {
  paymentTxHash: string;
  swapTxHash?: string;
  swapSellAmount?: number;
  swapSellToken?: string;
  swapBuyAmount?: number;
  swapBuyToken?: string;
  swapFee?: number; // Fee in sell token units
}

/**
 * Execute the payment, handling swap if needed
 */
async function executePayment(params: PaymentParams): Promise<PaymentResult> {
  // Build chain from Convex data (derived from invoice network field)
  const chain = buildChain(params.chainId, params.rpcUrl);
  
  const account = privateKeyToAccount(SIGNER_PRIVATE_KEY);
  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(params.rpcUrl),
  });
  const publicClient = createPublicClient({
    chain,
    transport: http(params.rpcUrl),
  });

  const workspaceKey = keccak256(toHex(params.workspaceId));
  const normalizedPayTo = getAddress(params.payTo) as `0x${string}`;

  // Treasury token (what workspace has) - from Convex supportedTokens
  const treasuryTokenAddress = params.treasuryTokenAddress 
    ? getAddress(params.treasuryTokenAddress) as `0x${string}`
    : null;

  // Required token (what provider wants) - from Convex supportedTokens (looked up by symbol)
  const requiredTokenAddress = params.requiredTokenAddress
    ? getAddress(params.requiredTokenAddress) as `0x${string}`
    : null;

  // If we have both tokens and they're different, we need a swap
  const needsSwap = treasuryTokenAddress && requiredTokenAddress && 
    treasuryTokenAddress.toLowerCase() !== requiredTokenAddress.toLowerCase();

  console.log("Payment execution:", {
    chainId: params.chainId,
    rpcUrl: params.rpcUrl,
    workspaceId: params.workspaceId,
    payTo: normalizedPayTo,
    treasuryToken: treasuryTokenAddress,
    treasuryTokenDecimals: params.treasuryTokenDecimals,
    requiredToken: requiredTokenAddress,
    requiredTokenDecimals: params.requiredTokenDecimals,
    needsSwap,
  });

  if (needsSwap && params.originalAmount && requiredTokenAddress) {
    // Execute swap flow
    return await executeSwapAndPay({
      workspaceKey,
      payTo: normalizedPayTo,
      sellToken: treasuryTokenAddress!,
      sellTokenDecimals: params.treasuryTokenDecimals,
      buyToken: requiredTokenAddress,
      buyTokenDecimals: params.requiredTokenDecimals,
      buyAmount: params.originalAmount,
      // Chain info from Convex
      chainId: params.chainId,
      rpcUrl: params.rpcUrl,
      chain,
      treasuryAddress: getAddress(params.treasuryAddress) as `0x${string}`,
      swapRouterAddress: params.swapRouterAddress,
      zeroxApiUrl: params.zeroxApiUrl,
      walletClient,
      publicClient,
      account,
    });
  } else {
    // Direct debit flow (no swap needed)
    // Use treasury token if available, otherwise use required token
    const tokenAddress = treasuryTokenAddress || requiredTokenAddress;
    if (!tokenAddress) {
      throw new Error("No token address available for payment");
    }
    
    return await executeDirectDebit({
      workspaceKey,
      payTo: normalizedPayTo,
      tokenAddress,
      amount: params.treasuryAmount || 0,
      decimals: params.treasuryTokenDecimals,
      chain,
      treasuryAddress: getAddress(params.treasuryAddress) as `0x${string}`,
      account,
      walletClient,
      publicClient,
    });
  }
}

interface SwapAndPayParams {
  workspaceKey: `0x${string}`;
  payTo: `0x${string}`;
  sellToken: `0x${string}`;
  sellTokenDecimals: number;
  buyToken: `0x${string}`;
  buyTokenDecimals: number;
  buyAmount: number;
  // Chain info from Convex
  chainId: number;
  rpcUrl: string;
  chain: Chain; // viem Chain object
  treasuryAddress: `0x${string}`; // Treasury contract address on this chain
  swapRouterAddress?: string; // Mock router for localhost
  zeroxApiUrl?: string; // 0x API for production
  walletClient: ReturnType<typeof createWalletClient>;
  publicClient: ReturnType<typeof createPublicClient>;
  account: ReturnType<typeof privateKeyToAccount>;
}

/**
 * Execute swap and then pay the provider
 */
async function executeSwapAndPay(params: SwapAndPayParams): Promise<PaymentResult> {
  const buyAmountUnits = parseUnits(params.buyAmount.toString(), params.buyTokenDecimals);
  
  console.log("Executing swap and pay:", {
    sellToken: params.sellToken,
    buyToken: params.buyToken,
    buyAmount: params.buyAmount,
    buyAmountUnits: buyAmountUnits.toString(),
  });

  // Initialize swap service with chain config from Convex
  const swapService = createSwapService({
    chainId: params.chainId,
    rpcUrl: params.rpcUrl,
    swapRouterAddress: params.swapRouterAddress,
    zeroxApiUrl: params.zeroxApiUrl,
  });

  // Get swap quote to know how much we need to sell
  const quote = await swapService.getQuote({
    sellToken: params.sellToken,
    buyToken: params.buyToken,
    buyAmount: buyAmountUnits,
    sellTokenDecimals: params.sellTokenDecimals,
    buyTokenDecimals: params.buyTokenDecimals,
    fromAddress: params.account.address,
  });

  console.log("Swap quote:", {
    sellAmount: quote.sellAmount.toString(),
    buyAmount: quote.buyAmount.toString(),
    price: quote.price,
  });

  // Step 1: Withdraw sellToken from treasury to signer wallet
  const withdrawHash = await params.walletClient.writeContract({
    chain: params.chain,
    account: params.account,
    address: params.treasuryAddress,
    abi: treasuryAbi,
    functionName: "withdrawForSwap",
    args: [params.sellToken, params.workspaceKey, params.account.address, quote.sellAmount],
  });
  await params.publicClient.waitForTransactionReceipt({ hash: withdrawHash });
  console.log("Withdrawn from treasury:", withdrawHash);

  // Step 2: Execute swap
  const swapResult = await swapService.executeSwap({
    sellToken: params.sellToken,
    buyToken: params.buyToken,
    buyAmount: buyAmountUnits,
    sellTokenDecimals: params.sellTokenDecimals,
    buyTokenDecimals: params.buyTokenDecimals,
    fromAddress: params.account.address,
  }, quote);

  if (!swapResult.success) {
    throw new Error(`Swap failed: ${swapResult.error}`);
  }
  console.log("Swap executed:", swapResult.txHash);

  // Step 3: Transfer the swapped tokens directly to the provider
  const transferHash = await params.walletClient.writeContract({
    chain: params.chain,
    account: params.account,
    address: params.buyToken,
    abi: erc20Abi,
    functionName: "transfer",
    args: [params.payTo, buyAmountUnits],
  });
  await params.publicClient.waitForTransactionReceipt({ hash: transferHash });
  console.log("Paid provider:", transferHash);

  // Convert amounts back to human-readable format for storage
  const sellAmountHuman = Number(quote.sellAmount) / (10 ** params.sellTokenDecimals);
  const buyAmountHuman = Number(buyAmountUnits) / (10 ** params.buyTokenDecimals);
  
  // Calculate swap fee (slippage/fee in sell token units)
  // For mock swaps: we add 1% buffer, so fee is approx 1% of sell amount
  // For 0x swaps: fee is embedded in the quote
  // We calculate it as the difference between what we sold and a theoretical 1:1 rate
  const theoreticalSellAmount = buyAmountHuman * (10 ** params.sellTokenDecimals) / (10 ** params.buyTokenDecimals);
  const swapFee = Math.max(0, sellAmountHuman - theoreticalSellAmount);

  return {
    paymentTxHash: transferHash,
    swapTxHash: swapResult.txHash,
    swapSellAmount: sellAmountHuman,
    swapSellToken: params.sellToken,
    swapBuyAmount: buyAmountHuman,
    swapBuyToken: params.buyToken,
    swapFee: Math.round(swapFee * 1000000) / 1000000, // 6 decimal precision
  };
}

interface DirectDebitParams {
  workspaceKey: `0x${string}`;
  payTo: `0x${string}`;
  tokenAddress: `0x${string}`;
  amount: number;
  decimals: number;
  chain: Chain;
  treasuryAddress: `0x${string}`; // Treasury contract address on this chain
  account: ReturnType<typeof privateKeyToAccount>;
  walletClient: ReturnType<typeof createWalletClient>;
  publicClient: ReturnType<typeof createPublicClient>;
}

/**
 * Execute direct debit from treasury (no swap needed)
 */
async function executeDirectDebit(params: DirectDebitParams): Promise<PaymentResult> {
  const amountUnits = parseUnits(params.amount.toString(), params.decimals);

  console.log("Executing direct debit:", {
    tokenAddress: params.tokenAddress,
    workspaceKey: params.workspaceKey,
    payTo: params.payTo,
    amount: params.amount,
    amountUnits: amountUnits.toString(),
  });

  const hash = await params.walletClient.writeContract({
    chain: params.chain,
    account: params.account,
    address: params.treasuryAddress,
    abi: treasuryAbi,
    functionName: "debit",
    args: [params.tokenAddress, params.workspaceKey, params.payTo, amountUnits],
  });

  await params.publicClient.waitForTransactionReceipt({ hash });

  return {
    paymentTxHash: hash,
  };
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
