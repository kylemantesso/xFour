/**
 * x402 Gateway SDK
 *
 * TypeScript SDK for interacting with the x402 payment gateway.
 * Provides a drop-in fetch replacement that automatically handles x402 payment flows.
 */

// ============================================
// TYPES
// ============================================

/**
 * Configuration options for the Gateway client
 */
export type GatewayClientConfig = {
  /**
   * Base URL of the gateway API (e.g., 'http://localhost:3000/api/gateway')
   */
  gatewayBaseUrl: string;

  /**
   * API key issued by the gateway for authentication
   */
  apiKey: string;

  /**
   * Optional custom fetch implementation. If not provided, uses global fetch.
   */
  fetchImpl?: typeof fetch;

  /**
   * Header name used to send the proof of payment.
   * Default: 'X-MOCK-PAID-INVOICE'
   */
  proofHeaderName?: string;
};

/**
 * x402 invoice headers extracted from a 402 response
 */
export type InvoiceHeaders = Record<string, string>;

/**
 * Result of a quote request
 */
export type QuoteResult =
  | {
      status: "allowed";
      paymentId: string;
      invoiceId: string;
      amount: string;
      tokenSymbol: string;
      fxRate: string;
    }
  | {
      status: "denied";
      reason: string;
    };

/**
 * Result of a pay request
 */
export type PayResult = {
  status: "ok" | "error";
  paymentId?: string;
  invoiceId?: string;
  amount?: string;
  tokenSymbol?: string;
  txHash?: string;
  errorCode?: string;
  errorMessage?: string;
};

/**
 * Gateway client interface
 */
export interface GatewayClient {
  /**
   * Fetch with automatic x402 payment handling.
   * If the request returns 402, automatically handles the payment flow
   * and retries the request with proof of payment.
   */
  fetchWithX402(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response>;

  /**
   * Lower-level helper: get a quote from invoice headers in a response
   */
  quoteFromResponse(
    response: Response,
    requestUrl: string,
    method: string
  ): Promise<QuoteResult>;

  /**
   * Lower-level helper: execute a payment for a given paymentId
   */
  pay(paymentId: string): Promise<PayResult>;
}

// ============================================
// ERROR CLASSES
// ============================================

/**
 * Base error class for gateway-related errors
 */
export class GatewayError extends Error {
  code?: string;
  details?: unknown;

  constructor(message: string, code?: string, details?: unknown) {
    super(message);
    this.name = "GatewayError";
    this.code = code;
    this.details = details;
  }
}

/**
 * Error thrown when a payment quote is denied
 */
export class PaymentDeniedError extends GatewayError {
  reason: string;

  constructor(reason: string, details?: unknown) {
    super(`Payment denied: ${reason}`, "PAYMENT_DENIED", details);
    this.name = "PaymentDeniedError";
    this.reason = reason;
  }
}

/**
 * Error thrown when a payment execution fails
 */
export class PaymentFailedError extends GatewayError {
  constructor(message: string, code?: string, details?: unknown) {
    super(message, code ?? "PAYMENT_FAILED", details);
    this.name = "PaymentFailedError";
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Extract and normalize x402 invoice headers from a Response.
 * Converts header names to canonical case (e.g., 'x-402-invoice-id' -> 'X-402-Invoice-Id')
 */
export function extractInvoiceHeaders(res: Response): InvoiceHeaders {
  const headers: InvoiceHeaders = {};

  res.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (lower.startsWith("x-402-")) {
      // Convert to canonical case: 'x-402-invoice-id' -> 'X-402-Invoice-Id'
      const suffix = lower.slice("x-402-".length);
      const canonical =
        "X-402-" +
        suffix
          .split("-")
          .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
          .join("-");
      headers[canonical] = value;
    }
  });

  return headers;
}

/**
 * Convert headers from various formats to a plain object
 */
function headersToObject(
  headers: HeadersInit | undefined
): Record<string, string> {
  if (!headers) {
    return {};
  }

  if (headers instanceof Headers) {
    const obj: Record<string, string> = {};
    headers.forEach((value, key) => {
      obj[key] = value;
    });
    return obj;
  }

  if (Array.isArray(headers)) {
    const obj: Record<string, string> = {};
    for (const [key, value] of headers) {
      obj[key] = value;
    }
    return obj;
  }

  // Already a plain object
  return { ...headers };
}

/**
 * Get the URL string from RequestInfo or URL
 */
function getRequestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") {
    return input;
  }
  if (input instanceof URL) {
    return input.toString();
  }
  // It's a Request object
  return input.url;
}

/**
 * Get the method from init or default to GET
 */
function getMethod(input: RequestInfo | URL, init?: RequestInit): string {
  if (init?.method) {
    return init.method.toUpperCase();
  }
  if (typeof input !== "string" && !(input instanceof URL) && input.method) {
    return input.method.toUpperCase();
  }
  return "GET";
}

// ============================================
// CLIENT IMPLEMENTATION
// ============================================

/**
 * Create a Gateway client instance
 *
 * @example
 * ```typescript
 * import { createGatewayClient } from '@x402/sdk';
 *
 * const client = createGatewayClient({
 *   gatewayBaseUrl: 'http://localhost:3000/api/gateway',
 *   apiKey: process.env.GATEWAY_API_KEY!,
 * });
 *
 * // Use like regular fetch - x402 payments handled automatically
 * const res = await client.fetchWithX402('https://api.example.com/resource', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({ data: 'test' }),
 * });
 * ```
 */
export function createGatewayClient(config: GatewayClientConfig): GatewayClient {
  const {
    gatewayBaseUrl,
    apiKey,
    fetchImpl = fetch,
    proofHeaderName = "X-MOCK-PAID-INVOICE",
  } = config;

  // Ensure gatewayBaseUrl doesn't have trailing slash
  const baseUrl = gatewayBaseUrl.replace(/\/$/, "");

  /**
   * Internal helper to make gateway API calls
   */
  async function gatewayFetch<T>(
    endpoint: string,
    body: unknown
  ): Promise<T> {
    const url = `${baseUrl}${endpoint}`;

    let response: Response;
    try {
      response = await fetchImpl(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      throw new GatewayError(
        `Failed to connect to gateway: ${err instanceof Error ? err.message : String(err)}`,
        "GATEWAY_NETWORK_ERROR",
        err
      );
    }

    let data: T;
    try {
      data = await response.json();
    } catch {
      throw new GatewayError(
        `Invalid JSON response from gateway (status ${response.status})`,
        "GATEWAY_INVALID_RESPONSE"
      );
    }

    return data;
  }

  /**
   * Get a quote from the gateway
   */
  async function quoteFromResponse(
    response: Response,
    requestUrl: string,
    method: string
  ): Promise<QuoteResult> {
    const invoiceHeaders = extractInvoiceHeaders(response);

    interface QuoteResponseRaw {
      status: "allowed" | "denied";
      paymentId?: string;
      invoiceId?: string;
      mneeAmount?: number;
      fxRate?: number;
      reason?: string;
    }

    const rawResult = await gatewayFetch<QuoteResponseRaw>("/quote", {
      apiKey,
      requestUrl,
      method,
      invoiceHeaders,
    });

    if (rawResult.status === "denied") {
      return {
        status: "denied",
        reason: rawResult.reason ?? "UNKNOWN",
      };
    }

    // Convert server response to SDK format
    // Server returns mneeAmount as number, we convert to generic amount/tokenSymbol
    return {
      status: "allowed",
      paymentId: rawResult.paymentId!,
      invoiceId: rawResult.invoiceId!,
      amount: String(rawResult.mneeAmount ?? 0),
      tokenSymbol: "MNEE", // Hardcoded until server returns this separately
      fxRate: String(rawResult.fxRate ?? 1),
    };
  }

  /**
   * Execute a payment
   */
  async function pay(paymentId: string): Promise<PayResult> {
    interface PayResponseRaw {
      status: "ok" | "error";
      paymentId?: string;
      invoiceId?: string;
      mneeAmount?: number;
      txHash?: string;
      code?: string;
      message?: string;
    }

    const rawResult = await gatewayFetch<PayResponseRaw>("/pay", {
      apiKey,
      paymentId,
    });

    if (rawResult.status === "error") {
      return {
        status: "error",
        errorCode: rawResult.code,
        errorMessage: rawResult.message ?? "Payment failed",
      };
    }

    return {
      status: "ok",
      paymentId: rawResult.paymentId,
      invoiceId: rawResult.invoiceId,
      amount: rawResult.mneeAmount !== undefined ? String(rawResult.mneeAmount) : undefined,
      tokenSymbol: rawResult.mneeAmount !== undefined ? "MNEE" : undefined,
      txHash: rawResult.txHash,
    };
  }

  /**
   * Main fetch wrapper with x402 payment handling
   */
  async function fetchWithX402(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    // Step 1: Make initial request
    const response = await fetchImpl(input, init);

    // Step 2: If not 402, return as-is
    if (response.status !== 402) {
      return response;
    }

    // Step 3: Extract request details
    const requestUrl = getRequestUrl(input);
    const method = getMethod(input, init);

    // Step 4: Get quote from gateway
    const quoteResult = await quoteFromResponse(response, requestUrl, method);

    // Step 5: If denied, throw error
    if (quoteResult.status === "denied") {
      throw new PaymentDeniedError(quoteResult.reason, { requestUrl, method });
    }

    // Step 6: Execute payment
    const payResult = await pay(quoteResult.paymentId);

    // Step 7: If payment failed, throw error
    if (payResult.status !== "ok") {
      throw new PaymentFailedError(
        payResult.errorMessage ?? "Payment failed",
        payResult.errorCode,
        { paymentId: quoteResult.paymentId, requestUrl, method }
      );
    }

    // Step 8: Retry original request with proof header
    const originalHeaders = headersToObject(init?.headers);
    const retryHeaders = {
      ...originalHeaders,
      [proofHeaderName]: quoteResult.invoiceId,
    };

    const retryInit: RequestInit = {
      ...init,
      headers: retryHeaders,
    };

    // Step 9: Return the retry response
    return fetchImpl(input, retryInit);
  }

  return {
    fetchWithX402,
    quoteFromResponse,
    pay,
  };
}

// ============================================
// UTILITIES (kept for backwards compatibility)
// ============================================

/**
 * Check if a response is a 402 Payment Required
 */
export function isPaymentRequired(response: Response): boolean {
  return response.status === 402;
}

// Export version
export const VERSION = "0.1.0";
