/**
 * x402 Server SDK
 * 
 * TypeScript SDK for API providers who want to receive x402 payments.
 * Provides middleware and utilities for Express, Next.js, and other frameworks.
 */

// Export types
export type {
  ServerConfig,
  EndpointPrice,
  PaymentRequirement,
  VerificationResult,
  InvoiceHeaders,
  GatewayVerifyResponse,
} from "./types";

// Export middleware
export {
  createX402Middleware,
  type MiddlewareConfig,
} from "./middleware";

// Export verification utilities
export {
  createVerifier,
  generateInvoiceId,
} from "./verification";

// Export version
export const VERSION = "0.1.0";

/**
 * Quick start for Express:
 * 
 * ```typescript
 * import express from 'express';
 * import { createX402Middleware } from '@x402/server';
 * 
 * const app = express();
 * 
 * const x402 = createX402Middleware({
 *   gatewayUrl: 'https://gateway.x402.com',
 *   apiKey: process.env.X402_SERVER_KEY!,
 *   payToAddress: '1ABC...', // Your MNEE address
 *   network: 'mainnet',
 * });
 * 
 * // Protect specific routes
 * app.post('/api/complete', 
 *   x402.requirePayment(0.05), // 0.05 MNEE per request
 *   async (req, res) => {
 *     // Only executes if payment verified
 *     res.json({ success: true });
 *   }
 * );
 * 
 * // Or protect entire route groups
 * app.use('/api/premium', x402.middleware(0.10));
 * ```
 * 
 * Quick start for Next.js API Routes:
 * 
 * ```typescript
 * import { createX402Middleware } from '@x402/server';
 * import type { NextRequest } from 'next/server';
 * 
 * const x402 = createX402Middleware({
 *   gatewayUrl: 'https://gateway.x402.com',
 *   apiKey: process.env.X402_SERVER_KEY!,
 *   payToAddress: '1ABC...',
 *   network: 'mainnet',
 * });
 * 
 * export async function POST(request: NextRequest) {
 *   // Extract proof and verify
 *   const proofHeader = request.headers.get('X-MOCK-PAID-INVOICE');
 *   
 *   if (!proofHeader) {
 *     const headers = x402.createInvoiceHeaders(0.05);
 *     return new Response(JSON.stringify({ error: 'Payment Required' }), {
 *       status: 402,
 *       headers: Object.entries(headers).reduce((acc, [k, v]) => {
 *         acc.set(k, v);
 *         return acc;
 *       }, new Headers()),
 *     });
 *   }
 *   
 *   const verification = await x402.verifyPayment(proofHeader);
 *   if (!verification.verified) {
 *     return new Response(JSON.stringify({ error: 'Invalid payment' }), {
 *       status: 403,
 *     });
 *   }
 *   
 *   // Payment verified, process request
 *   return new Response(JSON.stringify({ success: true }));
 * }
 * ```
 */


