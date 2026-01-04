import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

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
  amount: number; // Amount in MNEE
  network: "sandbox" | "mainnet";
}

interface QuoteResponseDenied {
  status: "denied";
  reason: string;
  invoiceId: string | null;
}

interface PayRequest {
  apiKey: string;
  paymentId: string;
}

interface PayResponseOk {
  status: "ok";
  paymentId: string;
  invoiceId: string;
  amount: number; // Amount in MNEE
  workspaceId: string;
  payTo: string; // MNEE Bitcoin address
  network: "sandbox" | "mainnet"; // MNEE network
  // MNEE wallet info for payment execution
  mneeWalletAddress?: string;
  encryptedWif?: string;
}

interface PayResponseError {
  status: "error";
  code: "INVALID_API_KEY" | "PAYMENT_NOT_FOUND" | "PAYMENT_NOT_ALLOWED" | "PAYMENT_FAILED" | "UNSUPPORTED_CURRENCY" | "NO_MNEE_WALLET";
  message?: string;
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

/**
 * Determine MNEE network from invoice network field
 * Returns null if not a supported MNEE network
 */
function getMneeNetwork(networkName: string): "sandbox" | "mainnet" | null {
  const normalized = networkName.toLowerCase();
  if (normalized === "mnee-sandbox" || normalized === "mnee_sandbox" || normalized === "sandbox") {
    return "sandbox";
  }
  if (normalized === "mnee-mainnet" || normalized === "mnee_mainnet" || normalized === "mainnet" || normalized === "mnee") {
    return "mainnet";
  }
  return null;
}

/**
 * Format MNEE amount (ensures max 5 decimal places)
 */
function formatMneeAmount(amount: number): number {
  return Math.round(amount * 100000) / 100000;
}

// ============================================
// GATEWAY QUOTE ENDPOINT
// ============================================

/**
 * POST /gateway/quote
 * 
 * Evaluates an x402 invoice and returns a quote for MNEE payment.
 * Only supports MNEE currency on MNEE networks.
 * 
 * Request body:
 * {
 *   "apiKey": "x402_...",
 *   "requestUrl": "https://api.provider.com/service",
 *   "invoiceHeaders": {
 *     "X-402-Invoice-Id": "inv_123",
 *     "X-402-Amount": "0.50",
 *     "X-402-Currency": "MNEE",
 *     "X-402-Network": "mnee-mainnet",
 *     "X-402-Pay-To": "1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2"
 *   }
 * }
 * 
 * Response (allowed):
 * {
 *   "status": "allowed",
 *   "paymentId": "pay_abc",
 *   "invoiceId": "inv_123",
 *   "amount": 0.50,
 *   "network": "mainnet"
 * }
 * 
 * Response (denied):
 * {
 *   "status": "denied",
 *   "reason": "AGENT_DAILY_LIMIT",
 *   "invoiceId": "inv_123"
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

  const { apiKeyId, workspaceId } = authResult;

  // Step 2: Parse invoice headers
  const invoice = parseInvoiceHeaders(invoiceHeaders);
  if (!invoice) {
    return errorResponse("Invalid or incomplete x402 invoice headers", 400);
  }

  // Step 3: Validate currency is MNEE
  if (invoice.currency.toUpperCase() !== "MNEE") {
    return errorResponse(`Unsupported currency: ${invoice.currency}. Only MNEE is supported.`, 400);
  }

  // Step 4: Determine MNEE network from invoice
  const mneeNetwork = getMneeNetwork(invoice.network);
  if (!mneeNetwork) {
    return errorResponse(`Unsupported network: ${invoice.network}. Use mnee-mainnet or mnee-sandbox.`, 400);
  }

  // Step 5: Extract host from requestUrl
  const host = extractHost(requestUrl);
  if (!host) {
    return errorResponse("Invalid requestUrl - could not extract host", 400);
  }

  // Step 6: Get or create provider for this host
  const providerId = await ctx.runMutation(internal.gateway.getOrCreateProviderForHost, {
    workspaceId,
    host,
  });

  // Step 7: Format amount with proper MNEE decimals
  const amount = formatMneeAmount(invoice.amount);

  // Step 8: Apply policies
  const policyResult = await ctx.runQuery(internal.gateway.checkAgentPolicyMnee, {
    apiKeyId,
    providerId,
    amount,
  });

  // Step 9: Create payment record
  const paymentId = await ctx.runMutation(internal.gateway.createMneePaymentQuote, {
    workspaceId,
    apiKeyId,
    providerId,
    providerHost: host,
    invoiceId: invoice.invoiceId,
    amount,
    payTo: invoice.payTo,
    network: mneeNetwork,
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
      amount,
      network: mneeNetwork,
    };
    return jsonResponse(response);
  } else {
    const response: QuoteResponseDenied = {
      status: "denied",
      reason: policyResult.reason ?? "UNKNOWN",
      invoiceId: invoice.invoiceId,
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
 * Confirms a payment quote and returns info needed for MNEE payment execution.
 * The actual payment execution happens in the Next.js API route.
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
 *   "amount": <amount in MNEE>,
 *   "workspaceId": "<id>",
 *   "payTo": "<bitcoin address>",
 *   "network": "mainnet" | "sandbox",
 *   "mneeWalletAddress": "<workspace mnee address>",
 *   "encryptedWif": "<encrypted private key>"
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

  // Step 4: Get MNEE wallet for this workspace
  const mneeWallet = await ctx.runQuery(internal.lib.mnee.getMneeWallet, {
    workspaceId,
    network: payment.network,
  });

  if (!mneeWallet) {
    const response: PayResponseError = {
      status: "error",
      code: "NO_MNEE_WALLET",
      message: `No MNEE wallet configured for ${payment.network} network`,
    };
    return jsonResponse(response, 400);
  }

  // Build the response
  const buildResponse = (): PayResponseOk => ({
    status: "ok",
    paymentId: paymentId,
    invoiceId: payment.invoiceId,
    amount: payment.amount,
    workspaceId: workspaceId.toString(),
    payTo: payment.payTo,
    network: payment.network,
    mneeWalletAddress: mneeWallet.address,
    encryptedWif: mneeWallet.encryptedWif,
  });

  // Step 5: Check payment status
  // If already settled or completed, return success (idempotent)
  if (payment.status === "settled" || payment.status === "completed") {
    return jsonResponse(buildResponse());
  }

  // If already failed, return error (idempotent)
  if (payment.status === "failed") {
    const response: PayResponseError = {
      status: "error",
      code: "PAYMENT_FAILED",
      message: payment.denialReason || "Payment failed",
    };
    return jsonResponse(response, 500);
  }

  // Only allow payments with status "allowed" (quotes ready for payment)
  if (payment.status !== "allowed") {
    // Status is "denied", "pending", or "refunded"
    const response: PayResponseError = {
      status: "error",
      code: "PAYMENT_NOT_ALLOWED",
    };
    return jsonResponse(response, 403);
  }

  // Step 6: Mark payment as pending (MNEE execution will happen in Next.js route)
  await ctx.runMutation(internal.gateway.updatePaymentStatus, {
    paymentId: paymentId as Id<"payments">,
    status: "pending",
  });

  // Step 7: Update API key last used
  await ctx.runMutation(internal.gateway.markApiKeyUsedInternal, { apiKeyId });

  // Step 8: Return success response with MNEE wallet details
  return jsonResponse(buildResponse());
});

// ============================================
// MARK PAYMENT AS SETTLED ACTION
// ============================================

interface MarkSettledRequest {
  paymentId: string;
  txHash?: string;
  ticketId?: string;
}

const markSettledAction = httpAction(async (ctx, request) => {
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
  let body: MarkSettledRequest;
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
    // Mark payment as settled with transaction details
    await ctx.runMutation(internal.gateway.markPaymentSettled, {
      paymentId: paymentId as Id<"payments">,
      txHash: body.txHash,
      ticketId: body.ticketId,
    });

    return jsonResponse({ status: "ok" });
  } catch (error) {
    console.error("Failed to mark payment as settled:", error);
    return errorResponse("Failed to mark payment as settled", 500);
  }
});

// ============================================
// MARK PAYMENT AS FAILED ACTION
// ============================================

interface MarkFailedRequest {
  paymentId: string;
  errorMessage?: string;
}

const markFailedAction = httpAction(async (ctx, request) => {
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
  let body: MarkFailedRequest;
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
    // Mark payment as failed
    await ctx.runMutation(internal.gateway.markPaymentFailed, {
      paymentId: paymentId as Id<"payments">,
      errorMessage: body.errorMessage,
    });

    return jsonResponse({ status: "ok" });
  } catch (error) {
    console.error("Failed to mark payment as failed:", error);
    return errorResponse("Failed to mark payment as failed", 500);
  }
});

// ============================================
// PAYMENT VERIFICATION ACTION (for providers)
// ============================================

interface VerifyRequest {
  apiKey: string;
  invoiceId: string;
}

interface VerifyResponseSuccess {
  verified: true;
  paymentId: string;
  amount: number;
  paidAt: number;
  txHash?: string;
}

interface VerifyResponseFailed {
  verified: false;
  error: string;
  code: string;
}

type VerifyResponse = VerifyResponseSuccess | VerifyResponseFailed;

/**
 * POST /gateway/verify
 * 
 * Verifies a payment by invoice ID for API providers.
 * Providers use this to check if a payment proof is valid.
 * 
 * Request body:
 * {
 *   "apiKey": "x402_...",  // Provider's API key
 *   "invoiceId": "inv_..."  // Invoice ID from payment proof header
 * }
 * 
 * Response (verified):
 * {
 *   "verified": true,
 *   "paymentId": "<payment_id>",
 *   "amount": <amount in MNEE>,
 *   "paidAt": <timestamp>,
 *   "txHash": "<optional transaction hash>"
 * }
 * 
 * Response (not verified):
 * {
 *   "verified": false,
 *   "error": "<error message>",
 *   "code": "INVALID_API_KEY" | "PAYMENT_NOT_FOUND" | "PAYMENT_NOT_SETTLED"
 * }
 */
const verifyAction = httpAction(async (ctx, request) => {
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
  let body: VerifyRequest;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  // Validate required fields
  const { apiKey, invoiceId } = body;
  if (!apiKey || typeof apiKey !== "string") {
    const response: VerifyResponseFailed = {
      verified: false,
      error: "Missing or invalid apiKey",
      code: "INVALID_API_KEY",
    };
    return jsonResponse(response, 400);
  }

  if (!invoiceId || typeof invoiceId !== "string") {
    const response: VerifyResponseFailed = {
      verified: false,
      error: "Missing or invalid invoiceId",
      code: "INVALID_REQUEST",
    };
    return jsonResponse(response, 400);
  }

  // Step 1: Authenticate provider API key
  const authResult = await ctx.runQuery(internal.gateway.validateApiKeyInternal, { apiKey });
  
  if (!authResult.valid) {
    const response: VerifyResponseFailed = {
      verified: false,
      error: "Invalid API key",
      code: "INVALID_API_KEY",
    };
    return jsonResponse(response, 401);
  }

  // Step 2: Find payment by invoice ID
  const payment = await ctx.runQuery(internal.gateway.getPaymentByInvoiceId, { 
    invoiceId 
  });

  if (!payment) {
    const response: VerifyResponseFailed = {
      verified: false,
      error: "Payment not found",
      code: "PAYMENT_NOT_FOUND",
    };
    return jsonResponse(response, 404);
  }

  // Step 3: Check if payment is settled/completed
  if (payment.status !== "settled" && payment.status !== "completed") {
    const response: VerifyResponseFailed = {
      verified: false,
      error: `Payment status is ${payment.status}, not settled`,
      code: "PAYMENT_NOT_SETTLED",
    };
    return jsonResponse(response, 400);
  }

  // Step 4: Payment is verified - return success
  const response: VerifyResponseSuccess = {
    verified: true,
    paymentId: payment._id,
    amount: payment.amount,
    paidAt: payment.completedAt ?? payment.createdAt,
    txHash: payment.txHash,
  };

  return jsonResponse(response, 200);
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

// Mark payment as settled endpoint (called by Next.js after MNEE payment succeeds)
http.route({
  path: "/gateway/mark-settled",
  method: "POST",
  handler: markSettledAction,
});

// CORS preflight for mark-settled
http.route({
  path: "/gateway/mark-settled",
  method: "OPTIONS",
  handler: markSettledAction,
});

// Mark payment as failed endpoint (called by Next.js when MNEE payment fails)
http.route({
  path: "/gateway/mark-failed",
  method: "POST",
  handler: markFailedAction,
});

// CORS preflight for mark-failed
http.route({
  path: "/gateway/mark-failed",
  method: "OPTIONS",
  handler: markFailedAction,
});

// Verify payment endpoint (for API providers)
http.route({
  path: "/gateway/verify",
  method: "POST",
  handler: verifyAction,
});

// CORS preflight for verify
http.route({
  path: "/gateway/verify",
  method: "OPTIONS",
  handler: verifyAction,
});

// ============================================
// PROVIDER CONFIG ENDPOINT
// ============================================

/**
 * GET /gateway/provider-config
 * 
 * Returns the receiving address for a provider API key.
 * This allows the server SDK to dynamically fetch the address
 * without hardcoding it.
 */
const providerConfigAction = httpAction(async (ctx, request) => {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (request.method !== "GET") {
    return errorResponse("Method not allowed", 405);
  }

  // Get API key from Authorization header
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return errorResponse("Missing or invalid Authorization header", 401);
  }

  const apiKey = authHeader.substring(7); // Remove "Bearer " prefix

  // Validate API key
  const authResult = await ctx.runQuery(internal.gateway.validateApiKeyInternal, { apiKey });

  if (!authResult.valid) {
    return jsonResponse({ status: "error", code: "INVALID_API_KEY" }, 401);
  }

  // Get the API key details
  const keyRecord = await ctx.runQuery(internal.gateway.getApiKeyDetails, { 
    apiKeyId: authResult.apiKeyId 
  });

  if (!keyRecord) {
    return jsonResponse({ status: "error", code: "API_KEY_NOT_FOUND" }, 404);
  }

  // Check if it's a provider key
  if (keyRecord.type !== "provider") {
    return jsonResponse({ 
      status: "error", 
      code: "INVALID_KEY_TYPE",
      message: "This endpoint requires a provider API key" 
    }, 400);
  }

  if (!keyRecord.receivingAddress || !keyRecord.receivingNetwork) {
    return jsonResponse({ 
      status: "error", 
      code: "NO_RECEIVING_ADDRESS",
      message: "Provider key does not have a receiving address configured" 
    }, 400);
  }

  return jsonResponse({
    status: "ok",
    receivingAddress: keyRecord.receivingAddress,
    network: keyRecord.receivingNetwork,
  }, 200);
});

// Provider config endpoint
http.route({
  path: "/gateway/provider-config",
  method: "GET",
  handler: providerConfigAction,
});

// CORS preflight for provider config
http.route({
  path: "/gateway/provider-config",
  method: "OPTIONS",
  handler: providerConfigAction,
});

export default http;
