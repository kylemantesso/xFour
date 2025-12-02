/**
 * x402 Gateway SDK
 *
 * TypeScript SDK for interacting with the x402 payment gateway.
 */

// ============================================
// TYPES
// ============================================

/**
 * Configuration options for the x402 client
 */
export interface X402ClientConfig {
  /**
   * Your x402 API key
   */
  apiKey: string;

  /**
   * Gateway base URL (defaults to production)
   */
  baseUrl?: string;
}

/**
 * x402 invoice headers as received from a 402 response
 */
export interface X402InvoiceHeaders {
  "X-402-Invoice-Id"?: string;
  "X-402-Amount"?: string;
  "X-402-Currency"?: string;
  "X-402-Network"?: string;
  "X-402-Pay-To"?: string;
}

/**
 * Quote request payload
 */
export interface QuoteRequest {
  requestUrl: string;
  invoiceHeaders: X402InvoiceHeaders;
}

/**
 * Quote response when payment is allowed
 */
export interface QuoteResponseAllowed {
  status: "allowed";
  paymentId: string;
  invoiceId: string;
  mneeAmount: number;
  fxRate: number;
}

/**
 * Quote response when payment is denied
 */
export interface QuoteResponseDenied {
  status: "denied";
  reason: string;
  invoiceId: string | null;
  mneeAmount: number | null;
  fxRate: number | null;
}

/**
 * Union type for quote responses
 */
export type QuoteResponse = QuoteResponseAllowed | QuoteResponseDenied;

// ============================================
// CLIENT
// ============================================

/**
 * x402 Gateway Client
 *
 * @example
 * ```typescript
 * import { X402Client } from '@x402/sdk';
 *
 * const client = new X402Client({
 *   apiKey: 'x402_...',
 * });
 *
 * const quote = await client.getQuote({
 *   requestUrl: 'https://api.example.com/resource',
 *   invoiceHeaders: {
 *     'X-402-Invoice-Id': 'inv_123',
 *     'X-402-Amount': '0.50',
 *     'X-402-Currency': 'USDC',
 *     'X-402-Network': 'base',
 *     'X-402-Pay-To': '0x...',
 *   },
 * });
 * ```
 */
export class X402Client {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: X402ClientConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? "https://api.x402.io";
  }

  /**
   * Get a quote for an x402 payment
   *
   * @param request - The quote request containing the target URL and invoice headers
   * @returns A promise that resolves to the quote response
   */
  async getQuote(request: QuoteRequest): Promise<QuoteResponse> {
    // TODO: Implement actual API call
    throw new Error("Not implemented yet");
  }
}

// ============================================
// UTILITIES
// ============================================

/**
 * Parse x402 headers from a Response object
 *
 * @param response - A fetch Response with 402 status
 * @returns Parsed invoice headers or null if not a valid 402 response
 */
export function parseX402Headers(
  response: Response
): X402InvoiceHeaders | null {
  if (response.status !== 402) {
    return null;
  }

  return {
    "X-402-Invoice-Id": response.headers.get("X-402-Invoice-Id") ?? undefined,
    "X-402-Amount": response.headers.get("X-402-Amount") ?? undefined,
    "X-402-Currency": response.headers.get("X-402-Currency") ?? undefined,
    "X-402-Network": response.headers.get("X-402-Network") ?? undefined,
    "X-402-Pay-To": response.headers.get("X-402-Pay-To") ?? undefined,
  };
}

/**
 * Check if a response is a 402 Payment Required
 */
export function isPaymentRequired(response: Response): boolean {
  return response.status === 402;
}

// Export version
export const VERSION = "0.0.1";

