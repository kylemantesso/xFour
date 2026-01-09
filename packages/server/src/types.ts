/**
 * x402 Server SDK Types
 */

/**
 * Configuration for the x402 server provider
 */
export interface ServerConfig {
  /**
   * Base URL of the x402 gateway
   */
  gatewayUrl: string;

  /**
   * Provider API key issued by x402 gateway
   */
  apiKey: string;

  /**
   * Optional custom fetch implementation
   */
  fetchImpl?: typeof fetch;

  /**
   * Header name to check for payment proof
   * Default: 'X-MOCK-PAID-INVOICE'
   */
  proofHeaderName?: string;
}

/**
 * Pricing configuration for an endpoint
 */
export interface EndpointPrice {
  /**
   * Price in MNEE
   */
  amount: number;

  /**
   * Optional description
   */
  description?: string;
}

/**
 * Payment requirement configuration
 */
export interface PaymentRequirement {
  /**
   * Amount in MNEE
   */
  amount: number;

  /**
   * Optional invoice ID (if you manage your own IDs)
   */
  invoiceId?: string;

  /**
   * Optional description
   */
  description?: string;
}

/**
 * Result of payment verification
 */
export interface VerificationResult {
  /**
   * Whether the payment is verified
   */
  verified: boolean;

  /**
   * Payment ID (if verified)
   */
  paymentId?: string;

  /**
   * Amount paid in MNEE (if verified)
   */
  amount?: number;

  /**
   * When payment was completed (if verified)
   */
  paidAt?: number;

  /**
   * Transaction hash (if verified and available)
   */
  txHash?: string;

  /**
   * Error message (if not verified)
   */
  error?: string;

  /**
   * Error code (if not verified)
   */
  errorCode?: string;
}

/**
 * Response from gateway verification endpoint
 */
export interface GatewayVerifyResponse {
  verified: boolean;
  paymentId?: string;
  amount?: number;
  paidAt?: number;
  txHash?: string;
  error?: string;
  code?: string;
}

/**
 * x402 invoice headers to send in 402 response
 */
export interface InvoiceHeaders {
  "X-402-Invoice-Id": string;
  "X-402-Amount": string;
  "X-402-Pay-To": string;
  "X-402-Network": string;
  "X-402-Currency"?: string;
  "X-402-Description"?: string;
}



