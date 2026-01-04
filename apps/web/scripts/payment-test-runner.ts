#!/usr/bin/env tsx
/**
 * Test Payment Runner
 * 
 * A long-running script that sends test payments through the x402 gateway
 * every N seconds. Uses the mock provider and agent SDK.
 * 
 * Usage:
 *   pnpm test-payments              # using npm script
 *   tsx scripts/payment-test-runner.ts  # direct
 * 
 * Environment variables:
 *   GATEWAY_BASE_URL - Gateway URL (default: http://localhost:3000/api/gateway)
 *   MOCK_PROVIDER_URL - Mock provider URL (default: http://localhost:3000/api/mock-provider)
 *   AGENT_API_KEY - Your agent API key (required)
 *   INTERVAL_SECONDS - Seconds between payments (default: 5)
 *   PAYMENT_AMOUNT - MNEE amount per payment (default: 0.001)
 *   PAYMENT_NETWORK - Network: mnee-sandbox or mnee-mainnet (default: mnee-sandbox)
 */

// ============================================
// TYPES & CONFIG
// ============================================

interface PaymentResult {
  success: boolean;
  invoiceId?: string;
  txHash?: string;
  error?: string;
  duration: number;
}

interface Config {
  gatewayBaseUrl: string;
  mockProviderUrl: string;
  apiKey: string;
  intervalSeconds: number;
  paymentAmount: string;
  paymentNetwork: string;
}

// ============================================
// INLINE AGENT LOGIC (simplified)
// ============================================

async function makePaymentRequest(config: Config): Promise<PaymentResult> {
  const startTime = Date.now();
  
  try {
    // Step 1: Call mock provider - it will return 402
    const providerUrl = new URL(config.mockProviderUrl);
    providerUrl.searchParams.set("amount", config.paymentAmount);
    providerUrl.searchParams.set("network", config.paymentNetwork);
    providerUrl.searchParams.set("currency", "MNEE");

    console.log(`\n[${new Date().toISOString()}] Requesting: ${providerUrl}`);
    
    const providerResponse = await fetch(providerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ test: true, timestamp: Date.now() }),
    });

    if (providerResponse.status !== 402) {
      return {
        success: false,
        error: `Unexpected status: ${providerResponse.status}`,
        duration: Date.now() - startTime,
      };
    }

    // Step 2: Extract invoice headers
    const invoiceHeaders: Record<string, string> = {};
    providerResponse.headers.forEach((value, key) => {
      if (key.toLowerCase().startsWith("x-402-")) {
        invoiceHeaders[key] = value;
      }
    });

    console.log("  📧 Invoice headers:", invoiceHeaders);

    // Step 3: Get quote from gateway
    const quoteResponse = await fetch(`${config.gatewayBaseUrl}/quote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiKey: config.apiKey,
        requestUrl: providerUrl.toString(),
        method: "POST",
        invoiceHeaders,
      }),
    });

    const quoteData = await quoteResponse.json();
    console.log("  💬 Quote response:", quoteData);

    if (quoteData.status === "denied") {
      return {
        success: false,
        error: `Quote denied: ${quoteData.reason}`,
        duration: Date.now() - startTime,
      };
    }

    if (!quoteData.paymentId) {
      return {
        success: false,
        error: "No payment ID in quote",
        duration: Date.now() - startTime,
      };
    }

    // Step 4: Execute payment
    const payResponse = await fetch(`${config.gatewayBaseUrl}/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiKey: config.apiKey,
        paymentId: quoteData.paymentId,
      }),
    });

    const payData = await payResponse.json();
    console.log("  💰 Pay response:", payData);

    if (payData.status !== "ok") {
      return {
        success: false,
        invoiceId: quoteData.invoiceId,
        error: payData.message || "Payment failed",
        duration: Date.now() - startTime,
      };
    }

    // Step 5: Retry original request with proof
    const retryResponse = await fetch(providerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-MOCK-PAID-INVOICE": quoteData.invoiceId,
      },
      body: JSON.stringify({ test: true, timestamp: Date.now() }),
    });

    const retryData = await retryResponse.json();
    console.log("  ✅ Provider response:", retryData.success ? "SUCCESS" : retryData);

    return {
      success: true,
      invoiceId: quoteData.invoiceId,
      txHash: payData.txHash,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      duration: Date.now() - startTime,
    };
  }
}

// ============================================
// MAIN LOOP
// ============================================

async function main() {
  const config: Config = {
    gatewayBaseUrl: process.env.GATEWAY_BASE_URL || "http://localhost:3000/api/gateway",
    mockProviderUrl: process.env.MOCK_PROVIDER_URL || "http://localhost:3000/api/mock-provider",
    apiKey: process.env.AGENT_API_KEY || "",
    intervalSeconds: parseInt(process.env.INTERVAL_SECONDS || "5", 10),
    paymentAmount: process.env.PAYMENT_AMOUNT || "0.001",
    paymentNetwork: process.env.PAYMENT_NETWORK || "mnee-sandbox",
  };

  if (!config.apiKey) {
    console.error("❌ AGENT_API_KEY environment variable is required!");
    console.error("\nUsage:");
    console.error("  AGENT_API_KEY=x402_xxx npx ts-node scripts/payment-test-runner.ts");
    process.exit(1);
  }

  console.log("🚀 Payment Test Runner Started");
  console.log("================================");
  console.log(`Gateway: ${config.gatewayBaseUrl}`);
  console.log(`Provider: ${config.mockProviderUrl}`);
  console.log(`Interval: ${config.intervalSeconds}s`);
  console.log(`Amount: ${config.paymentAmount} MNEE`);
  console.log(`Network: ${config.paymentNetwork}`);
  console.log(`API Key: ${config.apiKey.slice(0, 12)}...`);
  console.log("================================");
  console.log("Press Ctrl+C to stop\n");

  let paymentCount = 0;
  let successCount = 0;
  let failureCount = 0;

  // Handle graceful shutdown
  process.on("SIGINT", () => {
    console.log("\n\n📊 Final Stats:");
    console.log(`   Total: ${paymentCount}`);
    console.log(`   Success: ${successCount}`);
    console.log(`   Failed: ${failureCount}`);
    process.exit(0);
  });

  // Main loop
  while (true) {
    paymentCount++;
    console.log(`\n━━━ Payment #${paymentCount} ━━━`);

    const result = await makePaymentRequest(config);

    if (result.success) {
      successCount++;
      console.log(`  ✅ SUCCESS in ${result.duration}ms`);
      if (result.txHash) {
        console.log(`  📜 TX: ${result.txHash}`);
      }
    } else {
      failureCount++;
      console.log(`  ❌ FAILED: ${result.error}`);
    }

    console.log(`  📊 Stats: ${successCount}/${paymentCount} successful (${failureCount} failed)`);

    // Wait for next interval
    await new Promise((resolve) => setTimeout(resolve, config.intervalSeconds * 1000));
  }
}

main().catch(console.error);

