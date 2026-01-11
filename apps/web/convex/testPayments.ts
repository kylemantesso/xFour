"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

// ============================================
// TEST PAYMENT RUNNER (Convex Scheduled)
// Simple loop: one payment every 45 seconds with random amounts (0.001-0.02 MNEE)
// ============================================

/**
 * Execute a single test payment (random amount between 0.001 and 0.02 MNEE)
 */
export const runTestPayment = internalAction({
  args: {},
  returns: v.object({
    success: v.boolean(),
    invoiceId: v.optional(v.string()),
    txHash: v.optional(v.string()),
    error: v.optional(v.string()),
    duration: v.number(),
  }),
  handler: async () => {
    const startTime = Date.now();

    // Get config from env
    const apiKey = process.env.TEST_PAYMENT_API_KEY;
    const gatewayBaseUrl = process.env.TEST_GATEWAY_URL || "https://your-app.vercel.app/api/gateway";
    const mockProviderUrl = process.env.TEST_PROVIDER_URL || "https://your-app.vercel.app/api/mock-provider";
    
    // Randomize payment amount between 0.001 and 0.02 MNEE (ERC20 token on Ethereum)
    const minAmount = 0.001;
    const maxAmount = 0.02;
    const randomAmount = minAmount + Math.random() * (maxAmount - minAmount);
    const paymentAmount = randomAmount.toFixed(18); // 18 decimal places for Ethereum tokens
    
    const paymentNetwork = process.env.TEST_PAYMENT_NETWORK || "sepolia";

    if (!apiKey) {
      return {
        success: false,
        error: "TEST_PAYMENT_API_KEY not configured",
        duration: Date.now() - startTime,
      };
    }

    try {
      // Step 1: Call mock provider - it will return 402
      const providerUrl = new URL(mockProviderUrl);
      providerUrl.searchParams.set("amount", paymentAmount);
      providerUrl.searchParams.set("network", paymentNetwork);
      providerUrl.searchParams.set("currency", "MNEE"); // MNEE ERC20 token on Ethereum

      console.log(`[TestPayment] Requesting: ${providerUrl}`);

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

      // Step 2: Extract and normalize invoice headers
      // Headers come back lowercase from fetch, but the quote endpoint expects canonical format
      const invoiceHeaders: Record<string, string> = {};
      providerResponse.headers.forEach((value, key) => {
        const lower = key.toLowerCase();
        if (lower.startsWith("x-402-")) {
          // Convert to canonical format: x-402-invoice-id -> X-402-Invoice-Id
          const suffix = lower.slice("x-402-".length);
          const canonical =
            "X-402-" +
            suffix
              .split("-")
              .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
              .join("-");
          invoiceHeaders[canonical] = value;
        }
      });

      console.log("[TestPayment] Invoice headers:", invoiceHeaders);

      // Step 3: Get quote from gateway
      const quoteResponse = await fetch(`${gatewayBaseUrl}/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey,
          requestUrl: providerUrl.toString(),
          method: "POST",
          invoiceHeaders,
        }),
      });

      const quoteData = await quoteResponse.json();
      console.log("[TestPayment] Quote response:", quoteData);

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
      const payResponse = await fetch(`${gatewayBaseUrl}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey,
          paymentId: quoteData.paymentId,
        }),
      });

      const payData = await payResponse.json();
      console.log("[TestPayment] Pay response:", payData);

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
      console.log("[TestPayment] Provider response:", retryData.success ? "SUCCESS" : retryData);

      return {
        success: true,
        invoiceId: quoteData.invoiceId,
        txHash: payData.txHash,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      console.error("[TestPayment] Error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      };
    }
  },
});

/**
 * The main loop - runs a payment then reschedules itself
 * Simple fixed interval: one payment every 45 seconds
 */
export const paymentLoop = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    // Check database flag (takes precedence over env var)
    const isEnabledInDb: boolean = await ctx.runQuery(internal.testPaymentControl.getLoopControl, {});
    const intervalMs = 45000; // 45 seconds

    if (!isEnabledInDb) {
      console.log("[TestPayment] Loop disabled in database - not rescheduling");
      return null;
    }

    // Run the payment
    const result = await ctx.runAction(internal.testPayments.runTestPayment, {});

    if (result.success) {
      console.log(`[TestPayment] ✅ Success in ${result.duration}ms - TX: ${result.txHash}`);
    } else {
      console.log(`[TestPayment] ❌ Failed: ${result.error}`);
    }

    // Schedule next run in 45 seconds
    await ctx.scheduler.runAfter(intervalMs, internal.testPayments.paymentLoop, {});
    console.log(`[TestPayment] Next run scheduled in 45 seconds`);

    return null;
  },
});

/**
 * Start the payment loop (call this once to kick things off)
 */
export const startPaymentLoop = internalAction({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    const apiKey = process.env.TEST_PAYMENT_API_KEY;

    if (!apiKey) {
      return "❌ TEST_PAYMENT_API_KEY not configured";
    }

    // Enable the loop in database
    await ctx.runMutation(internal.testPaymentControl.setLoopControl, { isEnabled: true });

    // Schedule the first run immediately
    await ctx.scheduler.runAfter(0, internal.testPayments.paymentLoop, {});

    return "✅ Payment loop started! Check Convex logs for output.";
  },
});

/**
 * Stop the payment loop immediately
 * The next scheduled run will check the flag and stop rescheduling
 */
export const stopPaymentLoop = internalAction({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    // Disable the loop in database
    await ctx.runMutation(internal.testPaymentControl.setLoopControl, { isEnabled: false });
    
    return "✅ Payment loop stopped! Any currently running payment will complete, but no new runs will be scheduled.";
  },
});

