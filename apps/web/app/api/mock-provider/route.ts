import { NextRequest, NextResponse } from "next/server";

/**
 * Mock x402 Provider API
 * 
 * This simulates an external API that requires payment via x402.
 * 
 * Behavior:
 * - If X-MOCK-PAID-INVOICE header is present with a valid invoice format → 200 OK
 * - Otherwise → 402 Payment Required with x402 invoice headers
 * 
 * Configuration via query params:
 * - currency: Token symbol to request (default: USDC)
 * - amount: Amount to charge (default: 0.50)
 * - network: Network to use (default: localhost)
 * - payTo: Payment address (default: test address)
 * 
 * Note: This is a MOCK for demo purposes. In production, the provider would
 * verify the invoice ID against their payment records.
 */

// Default test payment addresses
const DEFAULT_EVM_PAY_TO = "0x742d35Cc6634C0532925a3b844Bc9e7595f8fE0E";
const DEFAULT_MNEE_SANDBOX_PAY_TO = "1KPmRUMAWmddVk6xDwDZk6Lo9VFPB2YMPM";
const DEFAULT_MNEE_MAINNET_PAY_TO = "1KPmRUMAWmddVk6xDwDZk6Lo9VFPB2YMPM"; // Same for now

// Generate a random invoice ID
function generateInvoiceId(): string {
  return `inv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// Check if an invoice ID looks valid (for mock purposes, just check format)
function isValidInvoiceFormat(invoiceId: string): boolean {
  return invoiceId.startsWith("inv_") && invoiceId.length > 10;
}

// Get default payTo address based on network
function getDefaultPayToAddress(network: string): string {
  if (network === "mnee-sandbox") {
    return DEFAULT_MNEE_SANDBOX_PAY_TO;
  } else if (network === "mnee-mainnet") {
    return DEFAULT_MNEE_MAINNET_PAY_TO;
  }
  return DEFAULT_EVM_PAY_TO;
}

// Extract config from URL params
function getConfig(url: URL) {
  const network = url.searchParams.get("network") || "localhost";
  const defaultPayTo = getDefaultPayToAddress(network);
  
  return {
    currency: url.searchParams.get("currency") || "USDC",
    amount: url.searchParams.get("amount") || "0.50",
    network,
    payTo: url.searchParams.get("payTo") || defaultPayTo,
  };
}

function addCorsHeaders(response: NextResponse) {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, X-MOCK-PAID-INVOICE");
  response.headers.set("Access-Control-Expose-Headers", "X-402-Invoice-Id, X-402-Amount, X-402-Currency, X-402-Network, X-402-Pay-To");
  return response;
}

export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  const config = getConfig(url);

  // Check for proof of payment header
  const paidInvoiceId = request.headers.get("X-MOCK-PAID-INVOICE");
  
  // For mock purposes: accept any valid-looking invoice ID as "paid"
  if (paidInvoiceId && isValidInvoiceFormat(paidInvoiceId)) {
    // Payment verified - return success response
    const body = await request.json().catch(() => ({}));
    
    const response = NextResponse.json({
      success: true,
      message: "Request processed successfully",
      invoiceId: paidInvoiceId,
      timestamp: new Date().toISOString(),
      payment: {
        currency: config.currency,
        amount: config.amount,
        network: config.network,
      },
      data: {
        input: body,
        result: "This is the paid content you requested!",
        processingTime: "42ms",
      },
    });
    return addCorsHeaders(response);
  }

  // No valid payment proof - return 402 with invoice headers
  const invoiceId = generateInvoiceId();

  const response = NextResponse.json(
    {
      error: "Payment Required",
      message: "This API requires payment via x402 protocol",
      invoiceId,
      requiredPayment: {
        currency: config.currency,
        amount: config.amount,
        network: config.network,
      },
    },
    { status: 402 }
  );

  // Add x402 invoice headers (configurable)
  response.headers.set("X-402-Invoice-Id", invoiceId);
  response.headers.set("X-402-Amount", config.amount);
  response.headers.set("X-402-Currency", config.currency);
  response.headers.set("X-402-Network", config.network);
  response.headers.set("X-402-Pay-To", config.payTo);

  return addCorsHeaders(response);
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const config = getConfig(url);

  // Check for proof of payment header
  const paidInvoiceId = request.headers.get("X-MOCK-PAID-INVOICE");
  
  if (paidInvoiceId && isValidInvoiceFormat(paidInvoiceId)) {
    const response = NextResponse.json({
      success: true,
      message: "Resource accessed successfully",
      invoiceId: paidInvoiceId,
      timestamp: new Date().toISOString(),
      payment: {
        currency: config.currency,
        amount: config.amount,
        network: config.network,
      },
      data: {
        resource: "Premium content accessed!",
      },
    });
    return addCorsHeaders(response);
  }

  const invoiceId = generateInvoiceId();

  const response = NextResponse.json(
    {
      error: "Payment Required",
      message: "This resource requires payment via x402 protocol",
      invoiceId,
      requiredPayment: {
        currency: config.currency,
        amount: config.amount,
        network: config.network,
      },
    },
    { status: 402 }
  );

  response.headers.set("X-402-Invoice-Id", invoiceId);
  response.headers.set("X-402-Amount", config.amount);
  response.headers.set("X-402-Currency", config.currency);
  response.headers.set("X-402-Network", config.network);
  response.headers.set("X-402-Pay-To", config.payTo);

  return addCorsHeaders(response);
}

export async function OPTIONS() {
  const response = new NextResponse(null, { status: 204 });
  return addCorsHeaders(response);
}
