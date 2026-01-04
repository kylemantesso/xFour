/**
 * MNEE Payment Utilities
 * 
 * Handles MNEE wallet generation, balance queries, and payment execution
 * using the MNEE SDK
 * 
 * Note: This file contains both server-side functions (that use the MNEE SDK)
 * and utility functions. It should only be imported in server-side code (API routes,
 * Convex actions, etc.), not in client components.
 */

import Mnee from "@mnee/ts-sdk";
import { decryptWif } from "./mnee-crypto";

// ============================================
// TYPES
// ============================================

export interface MneeWalletInfo {
  address: string;
  wif: string;
}

export interface MneePaymentParams {
  workspaceId: string;
  recipientAddress: string;
  amount: number; // Amount in MNEE (up to 5 decimals)
  network: "sandbox" | "mainnet";
  encryptedWif: string; // Retrieved from Convex
}

export interface MneePaymentResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

export interface MneeBalanceResult {
  balance: number;
  address: string;
  network: string;
}

// ============================================
// MNEE SDK CLIENT
// ============================================

/**
 * Create a configured MNEE SDK client
 */
function createMneeClient(network: "sandbox" | "mainnet" = "sandbox"): Mnee {
  const apiKey = process.env.MNEE_API_KEY;
  
  if (!apiKey) {
    throw new Error("MNEE_API_KEY environment variable not set");
  }

  const environment = network === "sandbox" ? "sandbox" : "production";

  return new Mnee({
    environment,
    apiKey,
  });
}

// ============================================
// WALLET GENERATION
// ============================================

/**
 * Generate a new MNEE wallet
 * This uses the MNEE SDK's built-in wallet generation
 * 
 * Note: For production, you might want to use HD wallets or more sophisticated
 * key derivation. This is a simple approach for MVP.
 */
export async function generateMneeWallet(): Promise<{ address: string; encryptedWif: string }> {
  // For MNEE, we need to generate a Bitcoin address and private key
  // The MNEE SDK doesn't have a built-in wallet generator in the current version
  // We'll need to use a Bitcoin library for this
  
  // TODO: Implement proper Bitcoin wallet generation
  // For now, this is a placeholder that will be implemented with a Bitcoin library
  throw new Error("Wallet generation not yet implemented - use MNEE CLI to generate wallets");
}

// ============================================
// BALANCE QUERIES
// ============================================

/**
 * Get MNEE balance for an address
 */
export async function getMneeBalance(
  address: string,
  network: "sandbox" | "mainnet" = "sandbox"
): Promise<MneeBalanceResult> {
  const mnee = createMneeClient(network);

  try {
    // Get balance using MNEE SDK
    const balanceResponse = await mnee.balance(address);
    
    // The response format from MNEE SDK - decimalAmount is the balance in MNEE
    const balance = balanceResponse.decimalAmount || 0;

    return {
      balance,
      address,
      network,
    };
  } catch (error) {
    console.error("Failed to get MNEE balance:", error);
    throw new Error(`Failed to get MNEE balance: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// ============================================
// PAYMENT EXECUTION
// ============================================

/**
 * Execute a MNEE payment
 * 
 * @param params - Payment parameters including encrypted WIF
 * @returns Payment result with transaction hash
 */
export async function executeMneePayment(
  params: MneePaymentParams
): Promise<MneePaymentResult> {
  console.log("=== Starting MNEE Payment ===");
  console.log("Network:", params.network);
  console.log("Recipient:", params.recipientAddress);
  console.log("Amount:", params.amount);
  console.log("Workspace ID:", params.workspaceId);

  const mnee = createMneeClient(params.network);
  console.log("MNEE SDK client created for", params.network);

  try {
    // Decrypt the WIF
    console.log("Decrypting WIF...");
    const wif = decryptWif(params.encryptedWif);
    console.log("WIF decrypted successfully, length:", wif.length);

    // Prepare transfer request
    const transferRequest = [
      {
        address: params.recipientAddress,
        amount: params.amount, // MNEE amount with up to 5 decimals
      },
    ];

    console.log("Transfer request prepared:", JSON.stringify(transferRequest, null, 2));

    // Execute the transfer
    console.log("Calling MNEE SDK transfer...");
    const response = await mnee.transfer(transferRequest, wif);

    // DEBUG: Log the full response to understand its structure
    console.log("=== MNEE SDK Response ===");
    console.log("Response type:", typeof response);
    console.log("Response is null?:", response === null);
    console.log("Response is undefined?:", response === undefined);
    if (response) {
      console.log("Response keys:", Object.keys(response));
      console.log("Full response:", JSON.stringify(response, null, 2));
    }
    console.log("========================");

    // MNEE transfers are asynchronous and return a ticketId
    // We need to check the status to get the actual transaction hash
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ticketId = (response as any)?.ticketId;
    
    if (!ticketId) {
      console.error("Transfer failed - no ticketId found in response");
      throw new Error("Transfer failed: No ticket ID returned");
    }

    console.log("Transfer submitted with ticketId:", ticketId);
    console.log("Polling for transaction status...");

    // Poll for transaction status with timeout
    const maxAttempts = 30; // 30 attempts
    const pollInterval = 2000; // 2 seconds between attempts
    let attempt = 0;
    let txHash: string | undefined;

    while (attempt < maxAttempts) {
      attempt++;
      console.log(`Status check attempt ${attempt}/${maxAttempts}...`);

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const status = await mnee.getTxStatus(ticketId) as any;

        console.log("=== Transaction Status ===");
        console.log("Status:", status?.status);
        console.log("Full status:", JSON.stringify(status, null, 2));
        console.log("========================");

        // Check if transaction is complete
        const txStatus = status?.status?.toUpperCase();
        
        // Extract transaction ID if available
        txHash = status?.tx_id || status?.txid || status?.transactionId || status?.txHash;

        // Also check if tx_hex is populated (sometimes contains the txid)
        if (!txHash && status?.tx_hex && status.tx_hex.length > 0) {
          console.log("Transaction hex available, status:", txStatus);
          // For Bitcoin transactions, we might need to derive the txid from tx_hex
          // For now, we'll use the ticketId as a reference
        }

        if (txStatus === "COMPLETED" || txStatus === "CONFIRMED" || txStatus === "SUCCESS") {
          if (!txHash) {
            // Use ticketId as fallback if no tx_id is provided
            console.warn("Transaction completed but no tx_id found, using ticketId");
            txHash = ticketId;
          }
          console.log("MNEE transfer successful:", txHash);
          break;
        } else if (txStatus === "FAILED" || txStatus === "ERROR") {
          throw new Error(`Transfer failed: ${status?.errors || "Unknown error"}`);
        } else if (txStatus === "BROADCASTING" || txStatus === "PENDING") {
          // Still processing, continue polling
          if (attempt < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, pollInterval));
          }
        } else {
          console.warn("Unknown status:", txStatus);
          if (attempt < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, pollInterval));
          }
        }
      } catch (error) {
        console.error(`Error checking status (attempt ${attempt}):`, error);
        if (attempt >= maxAttempts) {
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
      }
    }

    if (!txHash) {
      throw new Error(`Transfer timeout - ticketId: ${ticketId}. Check status manually.`);
    }

    return {
      success: true,
      txHash,
    };
  } catch (error) {
    console.error("MNEE payment failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Validate a MNEE address
 * 
 * @param address - MNEE Bitcoin address to validate
 * @returns true if valid, false otherwise
 */
export function validateMneeAddress(address: string): boolean {
  // MNEE uses Bitcoin addresses
  // Basic validation: starts with 1, 3, or bc1 and is 26-35 characters
  const bitcoinAddressRegex = /^(1|3|bc1)[a-zA-Z0-9]{25,34}$/;
  return bitcoinAddressRegex.test(address);
}

/**
 * Format MNEE amount (ensures max 5 decimal places)
 */
export function formatMneeAmount(amount: number): number {
  return Math.round(amount * 100000) / 100000;
}

/**
 * Get MNEE transaction explorer URL
 */
export function getMneeExplorerUrl(txHash: string, network: "sandbox" | "mainnet"): string {
  // MNEE uses WhatsOnChain for Bitcoin blockchain explorer
  const baseUrl = network === "mainnet" 
    ? "https://whatsonchain.com/tx" 
    : "https://test.whatsonchain.com/tx";
  
  return `${baseUrl}/${txHash}`;
}

