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
 * Note: This is a MOCK for demo purposes. In production, the provider would
 * verify the invoice ID against their payment records.
 */

// Generate a random invoice ID
function generateInvoiceId(): string {
  return `inv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// Check if an invoice ID looks valid (for mock purposes, just check format)
function isValidInvoiceFormat(invoiceId: string): boolean {
  return invoiceId.startsWith("inv_") && invoiceId.length > 10;
}

export async function POST(request: NextRequest) {
  // Check for proof of payment header
  const paidInvoiceId = request.headers.get("X-MOCK-PAID-INVOICE");
  
  // For mock purposes: accept any valid-looking invoice ID as "paid"
  if (paidInvoiceId && isValidInvoiceFormat(paidInvoiceId)) {
    // Payment verified - return success response
    const body = await request.json().catch(() => ({}));
    
    return NextResponse.json({
      success: true,
      message: "Request processed successfully",
      invoiceId: paidInvoiceId,
      timestamp: new Date().toISOString(),
      data: {
        input: body,
        result: "This is the paid content you requested!",
        processingTime: "42ms",
      },
    });
  }

  // No valid payment proof - return 402 with invoice headers
  const invoiceId = generateInvoiceId();

  const response = NextResponse.json(
    {
      error: "Payment Required",
      message: "This API requires payment via x402 protocol",
      invoiceId,
    },
    { status: 402 }
  );

  // Add x402 invoice headers
  response.headers.set("X-402-Invoice-Id", invoiceId);
  response.headers.set("X-402-Amount", "0.50");
  response.headers.set("X-402-Currency", "USDC");
  response.headers.set("X-402-Network", "base");
  response.headers.set("X-402-Pay-To", "0x742d35Cc6634C0532925a3b844Bc9e7595f8fE0E");
  
  // CORS headers for browser testing
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, X-MOCK-PAID-INVOICE");
  response.headers.set("Access-Control-Expose-Headers", "X-402-Invoice-Id, X-402-Amount, X-402-Currency, X-402-Network, X-402-Pay-To");

  return response;
}

export async function GET(request: NextRequest) {
  // Check for proof of payment header
  const paidInvoiceId = request.headers.get("X-MOCK-PAID-INVOICE");
  
  if (paidInvoiceId && isValidInvoiceFormat(paidInvoiceId)) {
    return NextResponse.json({
      success: true,
      message: "Resource accessed successfully",
      invoiceId: paidInvoiceId,
      timestamp: new Date().toISOString(),
      data: {
        resource: "Premium content accessed!",
      },
    });
  }

  const invoiceId = generateInvoiceId();

  const response = NextResponse.json(
    {
      error: "Payment Required",
      message: "This resource requires payment via x402 protocol",
      invoiceId,
    },
    { status: 402 }
  );

  response.headers.set("X-402-Invoice-Id", invoiceId);
  response.headers.set("X-402-Amount", "0.25");
  response.headers.set("X-402-Currency", "USDC");
  response.headers.set("X-402-Network", "base");
  response.headers.set("X-402-Pay-To", "0x742d35Cc6634C0532925a3b844Bc9e7595f8fE0E");
  
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, X-MOCK-PAID-INVOICE");
  response.headers.set("Access-Control-Expose-Headers", "X-402-Invoice-Id, X-402-Amount, X-402-Currency, X-402-Network, X-402-Pay-To");

  return response;
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-MOCK-PAID-INVOICE",
      "Access-Control-Expose-Headers": "X-402-Invoice-Id, X-402-Amount, X-402-Currency, X-402-Network, X-402-Pay-To",
    },
  });
}
