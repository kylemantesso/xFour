import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { convertToTreasuryToken } from "./gateway";

const http = httpRouter();

// ============================================
// TYPES
// ============================================

interface QuoteRequest {
  apiKey: string;
  requestUrl: string;
  invoiceHeaders: {
    "X-402-Invoice-Id"?: string;
    "X-402-Amount"?: string;
    "X-402-Currency"?: string;
    "X-402-Network"?: string;
    "X-402-Pay-To"?: string;
  };
}

interface X402Invoice {
  invoiceId: string;
  amount: number;
  currency: string;
  network: string;
  payTo: string;
}

interface QuoteResponseAllowed {
  status: "allowed";
  paymentId: string;
  invoiceId: string;
  treasuryAmount: number; // Amount in treasury token
  treasuryTokenSymbol: string; // Treasury token symbol
  fxRate: number;
}

interface QuoteResponseDenied {
  status: "denied";
  reason: string;
  invoiceId: string | null;
  treasuryAmount: number | null;
  treasuryTokenSymbol: string | null;
  fxRate: number | null;
}

interface PayRequest {
  apiKey: string;
  paymentId: string;
}

interface PayResponseOk {
  status: "ok";
  paymentId: string;
  invoiceId: string;
  treasuryAmount: number; // Amount debited from treasury (in treasury token)
  // Additional fields for on-chain settlement
  workspaceId: string;
  payTo: string;
  // Chain info (derived from invoice network field)
  chainId: number;
  rpcUrl: string;
  treasuryAddress?: string; // Treasury contract address on this chain
  swapRouterAddress?: string; // Mock router for localhost
  zeroxApiUrl?: string; // 0x API for production chains
  // Treasury token (what workspace has)
  treasuryTokenAddress?: string; // Token address from API key preference
  treasuryTokenSymbol?: string; // Token symbol (e.g., "MNEE", "USDC")
  treasuryTokenDecimals?: number; // Token decimals
  // Required token (what provider wants) - looked up from supportedTokens by symbol
  requiredTokenAddress?: string; // Token address for originalCurrency
  requiredTokenDecimals?: number; // Token decimals
  originalCurrency: string; // Currency symbol (e.g., "USDC")
  originalAmount: number; // Amount in original currency
  originalNetwork: string; // Network name from invoice (e.g., "base")
}

interface PayResponseError {
  status: "error";
  code: "INVALID_API_KEY" | "PAYMENT_NOT_FOUND" | "PAYMENT_NOT_ALLOWED";
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Parse x402 invoice from headers
 */
function parseInvoiceHeaders(headers: QuoteRequest["invoiceHeaders"]): X402Invoice | null {
  const invoiceId = headers["X-402-Invoice-Id"];
  const amountStr = headers["X-402-Amount"];
  const currency = headers["X-402-Currency"];
  const network = headers["X-402-Network"];
  const payTo = headers["X-402-Pay-To"];

  if (!invoiceId || !amountStr || !currency || !network || !payTo) {
    return null;
  }

  const amount = parseFloat(amountStr);
  if (isNaN(amount) || amount <= 0) {
    return null;
  }

  return {
    invoiceId,
    amount,
    currency,
    network,
    payTo,
  };
}

/**
 * Extract host from URL
 */
function extractHost(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.host;
  } catch {
    return null;
  }
}

/**
 * Create JSON response with CORS headers
 */
function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

/**
 * Create error response
 */
function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status);
}

// ============================================
// GATEWAY QUOTE ENDPOINT
// ============================================

/**
 * POST /gateway/quote
 * 
 * Evaluates an x402 invoice and returns a quote for payment in the workspace's treasury token.
 * 
 * Request body:
 * {
 *   "apiKey": "x402_...",
 *   "requestUrl": "https://api.novaai.com/review",
 *   "invoiceHeaders": {
 *     "X-402-Invoice-Id": "inv_123",
 *     "X-402-Amount": "0.50",
 *     "X-402-Currency": "USDC",
 *     "X-402-Network": "base",
 *     "X-402-Pay-To": "0x..."
 *   }
 * }
 * 
 * Response (allowed):
 * {
 *   "status": "allowed",
 *   "paymentId": "pay_abc",
 *   "invoiceId": "inv_123",
 *   "treasuryAmount": 0.49,
 *   "treasuryTokenSymbol": "MNEE",
 *   "fxRate": 0.98
 * }
 * 
 * Response (denied):
 * {
 *   "status": "denied",
 *   "reason": "AGENT_DAILY_LIMIT",
 *   "invoiceId": "inv_123",
 *   "treasuryAmount": null,
 *   "treasuryTokenSymbol": null,
 *   "fxRate": null
 * }
 */
const quoteAction = httpAction(async (ctx, request) => {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  // Only accept POST
  if (request.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  // Parse request body
  let body: QuoteRequest;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  // Validate required fields
  const { apiKey, requestUrl, invoiceHeaders } = body;
  if (!apiKey || typeof apiKey !== "string") {
    return errorResponse("Missing or invalid apiKey", 400);
  }
  if (!requestUrl || typeof requestUrl !== "string") {
    return errorResponse("Missing or invalid requestUrl", 400);
  }
  if (!invoiceHeaders || typeof invoiceHeaders !== "object") {
    return errorResponse("Missing or invalid invoiceHeaders", 400);
  }

  // Step 1: Authenticate API key
  const authResult = await ctx.runQuery(internal.gateway.validateApiKeyInternal, { apiKey });
  
  if (!authResult.valid) {
    return errorResponse(authResult.error, 401);
  }

  const { apiKeyId, workspaceId, preferredPaymentToken } = authResult;

  // Step 2: Parse invoice headers
  const invoice = parseInvoiceHeaders(invoiceHeaders);
  if (!invoice) {
    return errorResponse("Invalid or incomplete x402 invoice headers", 400);
  }

  // Step 3: Extract host from requestUrl
  const host = extractHost(requestUrl);
  if (!host) {
    return errorResponse("Invalid requestUrl - could not extract host", 400);
  }

  // Step 4: Get or create provider for this host
  const providerId = await ctx.runMutation(internal.gateway.getOrCreateProviderForHost, {
    workspaceId,
    host,
  });

  // Step 5: Get chain info from network name
  const chain = await ctx.runQuery(internal.chains.getChainByNetworkNameInternal, {
    networkName: invoice.network,
  });

  if (!chain) {
    return errorResponse(`Unsupported network: ${invoice.network}`, 400);
  }

  // Step 6: Get treasury token details for symbol
  let treasuryTokenSymbol = "UNKNOWN";
  if (preferredPaymentToken) {
    const treasuryToken = await ctx.runQuery(internal.tokens.getTokenByAddressInternal, {
      address: preferredPaymentToken,
      chainId: chain.chainId,
    });
    if (treasuryToken) {
      treasuryTokenSymbol = treasuryToken.symbol;
    }
  }

  // Step 7: Convert to treasury token amount
  const { treasuryAmount, rate } = convertToTreasuryToken(
    invoice.amount, 
    invoice.currency, 
    treasuryTokenSymbol
  );

  // Step 8: Apply policies (with chain and token info)
  const policyResult = await ctx.runQuery(internal.gateway.checkAgentPolicy, {
    apiKeyId,
    providerId,
    treasuryAmount,
    chainId: chain.chainId,
    tokenAddress: preferredPaymentToken,
  });

  // Step 9: Create payment record
  const paymentId = await ctx.runMutation(internal.gateway.createPaymentQuote, {
    workspaceId,
    apiKeyId,
    providerId,
    providerHost: host,
    invoiceId: invoice.invoiceId,
    originalAmount: invoice.amount,
    originalCurrency: invoice.currency,
    originalNetwork: invoice.network,
    chainId: chain.chainId,
    payTo: invoice.payTo,
    paymentToken: preferredPaymentToken,
    paymentTokenSymbol: treasuryTokenSymbol,
    treasuryAmount,
    fxRate: rate,
    status: policyResult.allowed ? "allowed" : "denied",
    denialReason: policyResult.reason ?? undefined,
  });

  // Step 10: Update API key last used
  await ctx.runMutation(internal.gateway.markApiKeyUsedInternal, { apiKeyId });

  // Step 11: Return response
  if (policyResult.allowed) {
    const response: QuoteResponseAllowed = {
      status: "allowed",
      paymentId: paymentId.toString(),
      invoiceId: invoice.invoiceId,
      treasuryAmount,
      treasuryTokenSymbol,
      fxRate: rate,
    };
    return jsonResponse(response);
  } else {
    const response: QuoteResponseDenied = {
      status: "denied",
      reason: policyResult.reason ?? "UNKNOWN",
      invoiceId: invoice.invoiceId,
      treasuryAmount: null,
      treasuryTokenSymbol: null,
      fxRate: null,
    };
    return jsonResponse(response, 403);
  }
});

// ============================================
// GATEWAY PAY ENDPOINT
// ============================================

/**
 * POST /gateway/pay
 * 
 * Confirms a payment quote and settles it.
 * Called by the SDK after /gateway/quote and before retrying the original request.
 * 
 * Request body:
 * {
 *   "apiKey": "x402_...",
 *   "paymentId": "abc123..."
 * }
 * 
 * Response (success):
 * {
 *   "status": "ok",
 *   "paymentId": "<id>",
 *   "invoiceId": "<payment.invoiceId>",
 *   "treasuryAmount": <payment.treasuryAmount>
 * }
 * 
 * Response (error):
 * {
 *   "status": "error",
 *   "code": "INVALID_API_KEY" | "PAYMENT_NOT_FOUND" | "PAYMENT_NOT_ALLOWED"
 * }
 */
const payAction = httpAction(async (ctx, request) => {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  // Only accept POST
  if (request.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  // Parse request body
  let body: PayRequest;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  // Validate required fields
  const { apiKey, paymentId } = body;
  if (!apiKey || typeof apiKey !== "string") {
    return errorResponse("Missing or invalid apiKey", 400);
  }
  if (!paymentId || typeof paymentId !== "string") {
    return errorResponse("Missing or invalid paymentId", 400);
  }

  // Step 1: Authenticate API key
  const authResult = await ctx.runQuery(internal.gateway.validateApiKeyInternal, { apiKey });
  
  if (!authResult.valid) {
    const response: PayResponseError = {
      status: "error",
      code: "INVALID_API_KEY",
    };
    return jsonResponse(response, 401);
  }

  const { apiKeyId, workspaceId } = authResult;

  // Step 2: Get payment by ID
  let payment;
  try {
    payment = await ctx.runQuery(internal.gateway.getPaymentById, { 
      paymentId: paymentId as Id<"payments">
    });
  } catch {
    // Invalid payment ID format
    const response: PayResponseError = {
      status: "error",
      code: "PAYMENT_NOT_FOUND",
    };
    return jsonResponse(response, 404);
  }

  // Step 3: Validate payment exists and belongs to this API key/workspace
  if (!payment) {
    const response: PayResponseError = {
      status: "error",
      code: "PAYMENT_NOT_FOUND",
    };
    return jsonResponse(response, 404);
  }

  // Ensure payment belongs to the authenticated API key and workspace
  if (payment.apiKeyId !== apiKeyId || payment.workspaceId !== workspaceId) {
    const response: PayResponseError = {
      status: "error",
      code: "PAYMENT_NOT_FOUND",
    };
    return jsonResponse(response, 404);
  }

  // Step 4: Look up chain from invoice network field
  const chain = await ctx.runQuery(internal.chains.getChainByNetworkNameInternal, {
    networkName: payment.originalNetwork,
  });

  if (!chain) {
    return errorResponse(`Unsupported network: ${payment.originalNetwork}`, 400);
  }

  // Step 5: Look up token details from supportedTokens (scoped to chain)
  // Treasury token (what workspace has) - look up by address
  let treasuryToken = null;
  if (payment.paymentToken) {
    treasuryToken = await ctx.runQuery(internal.tokens.getTokenByAddressInternal, {
      address: payment.paymentToken,
      chainId: chain.chainId,
    });
  }

  // Required token (what provider wants) - look up by symbol on this chain
  const requiredToken = await ctx.runQuery(internal.tokens.getTokenBySymbolInternal, {
    symbol: payment.originalCurrency,
    chainId: chain.chainId,
  });

  // Build the response with chain info
  const buildResponse = (): PayResponseOk => ({
    status: "ok",
    paymentId: paymentId,
    invoiceId: payment.invoiceId,
    treasuryAmount: payment.treasuryAmount,
    workspaceId: workspaceId.toString(),
    payTo: payment.payTo,
    // Chain info from Convex
    chainId: chain.chainId,
    rpcUrl: chain.rpcUrl,
    treasuryAddress: chain.treasuryAddress,
    swapRouterAddress: chain.swapRouterAddress,
    zeroxApiUrl: chain.zeroxApiUrl,
    // Token info
    treasuryTokenAddress: payment.paymentToken,
    treasuryTokenSymbol: payment.paymentTokenSymbol,
    treasuryTokenDecimals: treasuryToken?.decimals,
    requiredTokenAddress: requiredToken?.address,
    requiredTokenDecimals: requiredToken?.decimals,
    originalCurrency: payment.originalCurrency,
    originalAmount: payment.originalAmount,
    originalNetwork: payment.originalNetwork,
  });

  // Step 6: Check payment status
  // If already settled, return success (idempotent)
  if (payment.status === "settled") {
    return jsonResponse(buildResponse());
  }

  // Only allow payments with status "allowed" (quotes ready for payment)
  if (payment.status !== "allowed") {
    // Status is "denied", "pending", "completed", "failed", or "refunded"
    const response: PayResponseError = {
      status: "error",
      code: "PAYMENT_NOT_ALLOWED",
    };
    return jsonResponse(response, 403);
  }

  // Step 7: Settle the payment
  // For now, no on-chain logic - just update status to "settled"
  await ctx.runMutation(internal.gateway.settlePayment, { 
    paymentId: paymentId as Id<"payments">
  });

  // Step 8: Update API key last used
  await ctx.runMutation(internal.gateway.markApiKeyUsedInternal, { apiKeyId });

  // Step 9: Return success response with chain and token details
  return jsonResponse(buildResponse());
});

// ============================================
// UPDATE SWAP DETAILS ACTION
// ============================================

interface UpdateSwapRequest {
  paymentId: string;
  txHash?: string;
  swapTxHash?: string;
  swapSellAmount?: number;
  swapSellToken?: string;
  swapBuyAmount?: number;
  swapBuyToken?: string;
  swapFee?: number;
}

const updateSwapAction = httpAction(async (ctx, request) => {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  // Only accept POST
  if (request.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  // Parse request body
  let body: UpdateSwapRequest;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  // Validate required fields
  const { paymentId } = body;
  if (!paymentId || typeof paymentId !== "string") {
    return errorResponse("Missing or invalid paymentId", 400);
  }

  try {
    // Update swap details
    await ctx.runMutation(internal.gateway.updatePaymentSwapDetails, {
      paymentId: paymentId as Id<"payments">,
      txHash: body.txHash,
      swapTxHash: body.swapTxHash,
      swapSellAmount: body.swapSellAmount,
      swapSellToken: body.swapSellToken,
      swapBuyAmount: body.swapBuyAmount,
      swapBuyToken: body.swapBuyToken,
      swapFee: body.swapFee,
    });

    return jsonResponse({ status: "ok" });
  } catch (error) {
    console.error("Failed to update swap details:", error);
    return errorResponse("Failed to update swap details", 500);
  }
});

// ============================================
// ROUTE REGISTRATION
// ============================================

// Quote endpoint
http.route({
  path: "/gateway/quote",
  method: "POST",
  handler: quoteAction,
});

// CORS preflight for quote
http.route({
  path: "/gateway/quote",
  method: "OPTIONS",
  handler: quoteAction,
});

// Pay endpoint
http.route({
  path: "/gateway/pay",
  method: "POST",
  handler: payAction,
});

// CORS preflight for pay
http.route({
  path: "/gateway/pay",
  method: "OPTIONS",
  handler: payAction,
});

// Update swap details endpoint (called by Next.js after on-chain swap)
http.route({
  path: "/gateway/update-swap",
  method: "POST",
  handler: updateSwapAction,
});

// CORS preflight for update-swap
http.route({
  path: "/gateway/update-swap",
  method: "OPTIONS",
  handler: updateSwapAction,
});

export default http;

