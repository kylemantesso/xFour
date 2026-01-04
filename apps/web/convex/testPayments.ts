"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

// ============================================
// TEST PAYMENT RUNNER (Convex Scheduled)
// ============================================

/**
 * Execute a single test payment
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
  handler: async (ctx) => {
    const startTime = Date.now();

    // Get config from env
    const apiKey = process.env.TEST_PAYMENT_API_KEY;
    const gatewayBaseUrl = process.env.TEST_GATEWAY_URL || "https://your-app.vercel.app/api/gateway";
    const mockProviderUrl = process.env.TEST_PROVIDER_URL || "https://your-app.vercel.app/api/mock-provider";
    const paymentAmount = process.env.TEST_PAYMENT_AMOUNT || "0.001";
    const paymentNetwork = process.env.TEST_PAYMENT_NETWORK || "mnee-sandbox";

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
      providerUrl.searchParams.set("currency", "MNEE");

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

      // Step 2: Extract invoice headers
      const invoiceHeaders: Record<string, string> = {};
      providerResponse.headers.forEach((value, key) => {
        if (key.toLowerCase().startsWith("x-402-")) {
          invoiceHeaders[key] = value;
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
 */
export const paymentLoop = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const isEnabled = process.env.TEST_PAYMENTS_ENABLED === "true";
    const baseIntervalMs = parseInt(process.env.TEST_PAYMENT_INTERVAL_MS || "1000", 10);
    const randomDelayMaxMs = parseInt(process.env.TEST_PAYMENT_RANDOM_DELAY_MS || "3000", 10);

    if (!isEnabled) {
      console.log("[TestPayment] Disabled - not rescheduling");
      return null;
    }

    // Add random delay before running (0 to randomDelayMaxMs)
    const randomDelay = Math.floor(Math.random() * randomDelayMaxMs);
    if (randomDelay > 0) {
      console.log(`[TestPayment] Waiting ${randomDelay}ms (random delay)...`);
      await new Promise((resolve) => setTimeout(resolve, randomDelay));
    }

    // Run the payment
    const result = await ctx.runAction(internal.testPayments.runTestPayment, {});

    if (result.success) {
      console.log(`[TestPayment] ✅ Success in ${result.duration}ms - TX: ${result.txHash}`);
    } else {
      console.log(`[TestPayment] ❌ Failed: ${result.error}`);
    }

    // Schedule next run (base interval only - random delay happens at start of next run)
    await ctx.scheduler.runAfter(baseIntervalMs, internal.testPayments.paymentLoop, {});
    console.log(`[TestPayment] Next run scheduled in ${baseIntervalMs}ms + random delay`);

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
    const isEnabled = process.env.TEST_PAYMENTS_ENABLED === "true";

    if (!apiKey) {
      return "❌ TEST_PAYMENT_API_KEY not configured";
    }

    if (!isEnabled) {
      return "❌ TEST_PAYMENTS_ENABLED is not 'true'";
    }

    // Schedule the first run immediately
    await ctx.scheduler.runAfter(0, internal.testPayments.paymentLoop, {});

    return "✅ Payment loop started! Check Convex logs for output.";
  },
});

/**
 * Stop the payment loop by disabling (you'll need to set env var)
 * Note: Running jobs will complete, but no new ones will schedule
 */
export const stopPaymentLoop = internalAction({
  args: {},
  returns: v.string(),
  handler: async () => {
    // Just returns instructions - actual stopping is via env var
    return "To stop: Set TEST_PAYMENTS_ENABLED=false in Convex environment variables";
  },
});

