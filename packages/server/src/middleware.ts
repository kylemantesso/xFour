/**
 * x402 Server Middleware
 */

import type {
  ServerConfig,
  PaymentRequirement,
  InvoiceHeaders,
} from "./types";
import { createVerifier, generateInvoiceId } from "./verification";

/**
 * Configuration for middleware
 */
export interface MiddlewareConfig extends ServerConfig {
  /**
   * Your MNEE wallet address for receiving payments
   */
  payToAddress: string;

  /**
   * MNEE network (sandbox or mainnet)
   */
  network?: "sandbox" | "mainnet";

  /**
   * Default pricing if not specified per-request
   */
  defaultPrice?: number;

  /**
   * Optional callback when payment is verified
   */
  onPaymentVerified?: (payment: {
    invoiceId: string;
    amount: number;
    paymentId?: string;
  }) => void | Promise<void>;

  /**
   * Optional callback when payment is required (402 sent)
   */
  onPaymentRequired?: (invoice: {
    invoiceId: string;
    amount: number;
  }) => void | Promise<void>;
}

/**
 * Create x402 middleware factory
 */
export function createX402Middleware(config: MiddlewareConfig) {
  const {
    payToAddress,
    network = "mainnet",
    defaultPrice,
    onPaymentVerified,
    onPaymentRequired,
  } = config;

  const verifier = createVerifier(config);

  /**
   * Create Express/Next.js compatible middleware that requires payment
   * 
   * @param requirement - Payment requirement (amount or full config)
   */
  function requirePayment(
    requirement?: number | PaymentRequirement
  ) {
    // Normalize requirement
    let amount: number;
    let invoiceId: string | undefined;
    let description: string | undefined;

    if (typeof requirement === "number") {
      amount = requirement;
    } else if (requirement) {
      amount = requirement.amount;
      invoiceId = requirement.invoiceId;
      description = requirement.description;
    } else if (defaultPrice !== undefined) {
      amount = defaultPrice;
    } else {
      throw new Error("No payment amount specified and no default price configured");
    }

    // Return middleware function
    return async function x402Handler(
      req: any,
      res: any,
      next: any
    ) {
      // Extract payment proof from headers
      const proofInvoiceId = verifier.extractProofFromHeaders(
        req.headers || {}
      );

      // If proof provided, verify it
      if (proofInvoiceId) {
        const verification = await verifier.verifyPayment(proofInvoiceId);

        if (verification.verified) {
          // Payment verified - attach payment info to request
          (req as any).x402Payment = {
            verified: true,
            invoiceId: proofInvoiceId,
            paymentId: verification.paymentId,
            amount: verification.amount,
            paidAt: verification.paidAt,
            txHash: verification.txHash,
          };

          // Call callback if provided
          if (onPaymentVerified) {
            await onPaymentVerified({
              invoiceId: proofInvoiceId,
              amount: verification.amount!,
              paymentId: verification.paymentId,
            });
          }

          // Allow request through
          return next();
        }

        // Proof provided but verification failed
        return res.status(403).json({
          error: "Payment verification failed",
          code: verification.errorCode,
          message: verification.error,
        });
      }

      // No proof provided - send 402 Payment Required
      const newInvoiceId = invoiceId || generateInvoiceId();

      const headers: InvoiceHeaders = {
        "X-402-Invoice-Id": newInvoiceId,
        "X-402-Amount": amount.toString(),
        "X-402-Pay-To": payToAddress,
        "X-402-Network": network,
      };

      if (description) {
        headers["X-402-Description"] = description;
      }

      // Set headers
      Object.entries(headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });

      // Call callback if provided
      if (onPaymentRequired) {
        await onPaymentRequired({
          invoiceId: newInvoiceId,
          amount,
        });
      }

      // Return 402
      return res.status(402).json({
        error: "Payment Required",
        invoiceId: newInvoiceId,
        amount,
        payTo: payToAddress,
        network,
        description,
      });
    };
  }

  /**
   * General middleware that checks for payment on all requests
   * Use this to protect entire routes
   */
  function middleware(price?: number) {
    return requirePayment(price);
  }

  /**
   * Manually verify a payment (for non-middleware usage)
   */
  async function verifyPayment(invoiceId: string) {
    return verifier.verifyPayment(invoiceId);
  }

  /**
   * Generate invoice headers for manual 402 responses
   */
  function createInvoiceHeaders(
    amount: number,
    invoiceId?: string,
    description?: string
  ): InvoiceHeaders {
    const headers: InvoiceHeaders = {
      "X-402-Invoice-Id": invoiceId || generateInvoiceId(),
      "X-402-Amount": amount.toString(),
      "X-402-Pay-To": payToAddress,
      "X-402-Network": network,
    };

    if (description) {
      headers["X-402-Description"] = description;
    }

    return headers;
  }

  return {
    requirePayment,
    middleware,
    verifyPayment,
    createInvoiceHeaders,
    extractProof: verifier.extractProofFromHeaders,
  };
}

/**
 * Type augmentation for Express Request
 */
declare global {
  namespace Express {
    interface Request {
      x402Payment?: {
        verified: boolean;
        invoiceId: string;
        paymentId?: string;
        amount?: number;
        paidAt?: number;
        txHash?: string;
      };
    }
  }
}



