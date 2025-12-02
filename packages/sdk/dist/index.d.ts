/**
 * x402 Gateway SDK
 *
 * TypeScript SDK for interacting with the x402 payment gateway.
 */
/**
 * Configuration options for the x402 client
 */
interface X402ClientConfig {
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
interface X402InvoiceHeaders {
    "X-402-Invoice-Id"?: string;
    "X-402-Amount"?: string;
    "X-402-Currency"?: string;
    "X-402-Network"?: string;
    "X-402-Pay-To"?: string;
}
/**
 * Quote request payload
 */
interface QuoteRequest {
    requestUrl: string;
    invoiceHeaders: X402InvoiceHeaders;
}
/**
 * Quote response when payment is allowed
 */
interface QuoteResponseAllowed {
    status: "allowed";
    paymentId: string;
    invoiceId: string;
    mneeAmount: number;
    fxRate: number;
}
/**
 * Quote response when payment is denied
 */
interface QuoteResponseDenied {
    status: "denied";
    reason: string;
    invoiceId: string | null;
    mneeAmount: number | null;
    fxRate: number | null;
}
/**
 * Union type for quote responses
 */
type QuoteResponse = QuoteResponseAllowed | QuoteResponseDenied;
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
declare class X402Client {
    private readonly apiKey;
    private readonly baseUrl;
    constructor(config: X402ClientConfig);
    /**
     * Get a quote for an x402 payment
     *
     * @param request - The quote request containing the target URL and invoice headers
     * @returns A promise that resolves to the quote response
     */
    getQuote(request: QuoteRequest): Promise<QuoteResponse>;
}
/**
 * Parse x402 headers from a Response object
 *
 * @param response - A fetch Response with 402 status
 * @returns Parsed invoice headers or null if not a valid 402 response
 */
declare function parseX402Headers(response: Response): X402InvoiceHeaders | null;
/**
 * Check if a response is a 402 Payment Required
 */
declare function isPaymentRequired(response: Response): boolean;
declare const VERSION = "0.0.1";

export { type QuoteRequest, type QuoteResponse, type QuoteResponseAllowed, type QuoteResponseDenied, VERSION, X402Client, type X402ClientConfig, type X402InvoiceHeaders, isPaymentRequired, parseX402Headers };
