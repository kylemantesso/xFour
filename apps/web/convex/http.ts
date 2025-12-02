import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { convertToMnee } from "./gateway";

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
  mneeAmount: number;
  fxRate: number;
}

interface QuoteResponseDenied {
  status: "denied";
  reason: string;
  invoiceId: string | null;
  mneeAmount: number | null;
  fxRate: number | null;
}

type QuoteResponse = QuoteResponseAllowed | QuoteResponseDenied;

interface PayRequest {
  apiKey: string;
  paymentId: string;
}

interface PayResponseOk {
  status: "ok";
  paymentId: string;
  invoiceId: string;
  mneeAmount: number;
  // Additional fields for on-chain settlement
  workspaceId: string;
  payTo: string;
}

interface PayResponseError {
  status: "error";
  code: "INVALID_API_KEY" | "PAYMENT_NOT_FOUND" | "PAYMENT_NOT_ALLOWED";
}

type PayResponse = PayResponseOk | PayResponseError;

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
 * Evaluates an x402 invoice and returns a quote for MNEE payment.
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
 *   "mneeAmount": 0.49,
 *   "fxRate": 0.98
 * }
 * 
 * Response (denied):
 * {
 *   "status": "denied",
 *   "reason": "AGENT_DAILY_LIMIT",
 *   "invoiceId": "inv_123",
 *   "mneeAmount": null,
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

  const { apiKeyId, workspaceId } = authResult;

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

  // Step 5: Convert to MNEE
  const { mneeAmount, rate } = convertToMnee(invoice.amount, invoice.currency);

  // Step 6: Apply policies (placeholder - always allow for now)
  // Later this will check agent daily limits, provider policies, etc.
  const policyResult = { allowed: true, reason: null as string | null };

  // Step 7: Create payment record
  const paymentId = await ctx.runMutation(internal.gateway.createPaymentQuote, {
    workspaceId,
    apiKeyId,
    providerId,
    providerHost: host,
    invoiceId: invoice.invoiceId,
    originalAmount: invoice.amount,
    originalCurrency: invoice.currency,
    originalNetwork: invoice.network,
    payTo: invoice.payTo,
    mneeAmount,
    fxRate: rate,
    status: policyResult.allowed ? "allowed" : "denied",
    denialReason: policyResult.reason ?? undefined,
  });

  // Step 8: Update API key last used
  await ctx.runMutation(internal.gateway.markApiKeyUsedInternal, { apiKeyId });

  // Step 9: Return response
  if (policyResult.allowed) {
    const response: QuoteResponseAllowed = {
      status: "allowed",
      paymentId: paymentId.toString(),
      invoiceId: invoice.invoiceId,
      mneeAmount,
      fxRate: rate,
    };
    return jsonResponse(response);
  } else {
    const response: QuoteResponseDenied = {
      status: "denied",
      reason: policyResult.reason ?? "UNKNOWN",
      invoiceId: invoice.invoiceId,
      mneeAmount: null,
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
 *   "mneeAmount": <payment.mneeAmount>
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
      paymentId: paymentId as any // Cast to Id<"payments">
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

  // Step 4: Check payment status
  // If already settled, return success (idempotent)
  if (payment.status === "settled") {
    const response: PayResponseOk = {
      status: "ok",
      paymentId: paymentId,
      invoiceId: payment.invoiceId,
      mneeAmount: payment.mneeAmount,
      workspaceId: workspaceId.toString(),
      payTo: payment.payTo,
    };
    return jsonResponse(response);
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

  // Step 5: Settle the payment
  // For now, no on-chain logic - just update status to "settled"
  await ctx.runMutation(internal.gateway.settlePayment, { 
    paymentId: paymentId as any 
  });

  // Step 6: Update API key last used
  await ctx.runMutation(internal.gateway.markApiKeyUsedInternal, { apiKeyId });

  // Step 7: Return success response
  const response: PayResponseOk = {
    status: "ok",
    paymentId: paymentId,
    invoiceId: payment.invoiceId,
    mneeAmount: payment.mneeAmount,
    workspaceId: workspaceId.toString(),
    payTo: payment.payTo,
  };
  return jsonResponse(response);
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

export default http;

