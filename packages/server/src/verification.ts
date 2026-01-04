/**
 * x402 Payment Verification
 */

import type { ServerConfig, VerificationResult, GatewayVerifyResponse } from "./types";

/**
 * Create a payment verifier instance
 */
export function createVerifier(config: ServerConfig) {
  const {
    gatewayUrl,
    apiKey,
    fetchImpl = fetch,
    proofHeaderName = "X-MOCK-PAID-INVOICE",
  } = config;

  const baseUrl = gatewayUrl.replace(/\/$/, "");

  /**
   * Verify a payment proof
   * 
   * @param invoiceId - Invoice ID from the payment proof header
   * @returns Verification result
   */
  async function verifyPayment(invoiceId: string): Promise<VerificationResult> {
    try {
      const response = await fetchImpl(`${baseUrl}/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          apiKey,
          invoiceId,
        }),
      });

      const data = await response.json() as GatewayVerifyResponse;

      if (!response.ok || !data.verified) {
        return {
          verified: false,
          error: data.error ?? "Payment verification failed",
          errorCode: data.code ?? "VERIFICATION_FAILED",
        };
      }

      return {
        verified: true,
        paymentId: data.paymentId,
        amount: data.amount,
        paidAt: data.paidAt,
        txHash: data.txHash,
      };
    } catch (err) {
      return {
        verified: false,
        error: err instanceof Error ? err.message : String(err),
        errorCode: "VERIFICATION_ERROR",
      };
    }
  }

  /**
   * Extract payment proof from request headers
   * 
   * @param headers - Request headers (as Headers object, Record, or array of tuples)
   * @returns Invoice ID if present, null otherwise
   */
  function extractProofFromHeaders(
    headers: Headers | Record<string, string> | Array<[string, string]>
  ): string | null {
    if (headers instanceof Headers) {
      return headers.get(proofHeaderName);
    }

    if (Array.isArray(headers)) {
      const found = headers.find(
        ([key]) => key.toLowerCase() === proofHeaderName.toLowerCase()
      );
      return found ? found[1] : null;
    }

    // Plain object
    const key = Object.keys(headers).find(
      (k) => k.toLowerCase() === proofHeaderName.toLowerCase()
    );
    return key ? headers[key] : null;
  }

  return {
    verifyPayment,
    extractProofFromHeaders,
    proofHeaderName,
  };
}

/**
 * Generate a unique invoice ID
 */
export function generateInvoiceId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 15);
  return `inv_${timestamp}_${random}`;
}

