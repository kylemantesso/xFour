/**
 * MNEE Actions
 * 
 * Node.js actions for MNEE wallet generation and management
 * These run in Node.js environment and can use the MNEE SDK
 * 
 * Note: All backend operations that need external APIs or encryption
 * should be Convex actions, NOT Next.js API routes. This ensures:
 * - Centralized environment variables (no need to sync .env.local and Convex)
 * - Direct database access without HTTP calls
 * - Atomic operations and consistent error handling
 */

"use node";

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import Mnee from "@mnee/ts-sdk";
import crypto from "crypto";

// Encryption configuration (same as in mnee-crypto.ts)
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const SALT_LENGTH = 64;

function getMasterKey(): Buffer {
  const encryptionKey = process.env.MNEE_ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error("MNEE_ENCRYPTION_KEY environment variable not set");
  }
  return Buffer.from(encryptionKey, "base64");
}

function encryptWif(wif: string): string {
  const masterKey = getMasterKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const salt = crypto.randomBytes(SALT_LENGTH);
  const derivedKey = crypto.pbkdf2Sync(masterKey, salt, 100000, 32, "sha256");
  const cipher = crypto.createCipheriv(ALGORITHM, derivedKey, iv);

  let encrypted = cipher.update(wif, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();

  return `${iv.toString("base64")}:${authTag.toString("base64")}:${salt.toString("base64")}:${encrypted}`;
}

function decryptWif(encryptedWif: string): string {
  const encryptionKey = process.env.MNEE_ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error("MNEE_ENCRYPTION_KEY environment variable not set");
  }

  const masterKey = Buffer.from(encryptionKey, "base64");

  // Split the combined string
  const parts = encryptedWif.split(":");
  if (parts.length !== 4) {
    throw new Error("Invalid encrypted WIF format");
  }

  const [ivBase64, authTagBase64, saltBase64, encryptedData] = parts;

  // Convert from base64
  const iv = Buffer.from(ivBase64, "base64");
  const authTag = Buffer.from(authTagBase64, "base64");
  const salt = Buffer.from(saltBase64, "base64");

  // Derive key from master key and salt
  const derivedKey = crypto.pbkdf2Sync(masterKey, salt, 100000, 32, "sha256");

  // Create decipher
  const decipher = crypto.createDecipheriv(ALGORITHM, derivedKey, iv);
  decipher.setAuthTag(authTag);

  // Decrypt
  let decrypted = decipher.update(encryptedData, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Internal action to generate and store a MNEE wallet for a workspace
 * Called automatically during workspace creation
 */
export const createWalletForWorkspace = internalAction({
  args: {
    workspaceId: v.id("workspaces"),
    network: v.union(v.literal("sandbox"), v.literal("mainnet")),
  },
  returns: v.object({
    address: v.string(),
    success: v.boolean(),
  }),
  handler: async (ctx, args) => {
    console.log(`🔑 Generating MNEE wallet for workspace ${args.workspaceId}...`);

    // Check for required environment variables
    if (!process.env.MNEE_API_KEY) {
      console.error("❌ MNEE_API_KEY not configured");
      throw new Error("MNEE_API_KEY not configured");
    }

    if (!process.env.MNEE_ENCRYPTION_KEY) {
      console.error("❌ MNEE_ENCRYPTION_KEY not configured");
      throw new Error("MNEE_ENCRYPTION_KEY not configured");
    }

    // Initialize MNEE SDK
    const mnee = new Mnee({
      environment: args.network === "sandbox" ? "sandbox" : "production",
      apiKey: process.env.MNEE_API_KEY,
    });

    try {
      // Generate new mnemonic
      console.log(`📝 Generating mnemonic for ${args.network} wallet...`);
      const mnemonic = Mnee.HDWallet.generateMnemonic();
      
      // Create HD wallet from mnemonic
      const hdWallet = mnee.HDWallet(mnemonic, {
        derivationPath: "m/44'/236'/0'/0", // Standard MNEE derivation path
        cacheSize: 10,
      });

      // Derive the first address (index 0)
      const addressInfo = hdWallet.deriveAddress(0);

      if (!addressInfo || !addressInfo.address || !addressInfo.privateKey) {
        throw new Error("Failed to derive MNEE address");
      }

      console.log(`✅ Wallet created: ${addressInfo.address}`);
      console.log(`🔐 Encrypting WIF...`);

      // Encrypt the WIF (private key)
      const encryptedWif = encryptWif(addressInfo.privateKey);

      // Store in wallets table
      console.log(`💾 Storing wallet in database...`);
      const now = Date.now();
      await ctx.runMutation(internal.wallets.internalCreateWallet, {
        workspaceId: args.workspaceId,
        name: `Default ${args.network} Wallet`,
        address: addressInfo.address,
        encryptedWif: encryptedWif,
        network: args.network,
        createdAt: now,
        updatedAt: now,
      });

      console.log(`🎉 MNEE wallet successfully created for workspace`);

      return {
        address: addressInfo.address,
        success: true,
      };
    } catch (error) {
      console.error("❌ Error generating MNEE wallet:", error);
      throw error;
    }
  },
});

/**
 * Generate and store a new wallet in the wallets table
 */
export const generateAndStoreWallet = internalAction({
  args: {
    workspaceId: v.id("workspaces"),
    name: v.string(),
    network: v.union(v.literal("sandbox"), v.literal("mainnet")),
  },
  returns: v.object({
    walletId: v.id("wallets"),
    address: v.string(),
    success: v.boolean(),
  }),
  handler: async (ctx, args) => {
    console.log(`🔑 Generating wallet "${args.name}" for workspace ${args.workspaceId}...`);

    // Check for required environment variables
    if (!process.env.MNEE_API_KEY) {
      console.error("❌ MNEE_API_KEY not configured");
      throw new Error("MNEE_API_KEY not configured");
    }

    if (!process.env.MNEE_ENCRYPTION_KEY) {
      console.error("❌ MNEE_ENCRYPTION_KEY not configured");
      throw new Error("MNEE_ENCRYPTION_KEY not configured");
    }

    // Initialize MNEE SDK
    const mnee = new Mnee({
      environment: args.network === "sandbox" ? "sandbox" : "production",
      apiKey: process.env.MNEE_API_KEY,
    });

    try {
      // Generate new mnemonic
      console.log(`📝 Generating mnemonic for ${args.network} wallet...`);
      const mnemonic = Mnee.HDWallet.generateMnemonic();
      
      // Create HD wallet from mnemonic
      const hdWallet = mnee.HDWallet(mnemonic, {
        derivationPath: "m/44'/236'/0'/0", // Standard MNEE derivation path
        cacheSize: 10,
      });

      // Derive the first address (index 0)
      const addressInfo = hdWallet.deriveAddress(0);

      if (!addressInfo || !addressInfo.address || !addressInfo.privateKey) {
        throw new Error("Failed to derive MNEE address");
      }

      console.log(`✅ Wallet created: ${addressInfo.address}`);
      console.log(`🔐 Encrypting WIF...`);

      // Encrypt the WIF (private key)
      const encryptedWif = encryptWif(addressInfo.privateKey);

      // Store in new wallets table
      console.log(`💾 Storing wallet in database...`);
      const now = Date.now();
      const walletId: Id<"wallets"> = await ctx.runMutation(internal.wallets.internalCreateWallet, {
        workspaceId: args.workspaceId,
        name: args.name,
        address: addressInfo.address,
        encryptedWif: encryptedWif,
        network: args.network,
        createdAt: now,
        updatedAt: now,
      });

      console.log(`🎉 Wallet "${args.name}" successfully created!`);

      return {
        walletId,
        address: addressInfo.address,
        success: true,
      };
    } catch (error) {
      console.error("❌ Error generating wallet:", error);
      throw error;
    }
  },
});

/**
 * Get balance for a MNEE wallet address
 */
export const getWalletBalance = action({
  args: {
    address: v.string(),
    network: v.union(v.literal("sandbox"), v.literal("mainnet")),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    if (!process.env.MNEE_API_KEY) {
      console.error("MNEE_API_KEY not configured");
      return 0;
    }

    const mnee = new Mnee({
      environment: args.network === "sandbox" ? "sandbox" : "production",
      apiKey: process.env.MNEE_API_KEY,
    });

    try {
      const balanceData = await mnee.balance(args.address);
      return balanceData.decimalAmount || 0;
    } catch (error) {
      console.error(`Error fetching MNEE balance for ${args.address}:`, error);
      return 0;
    }
  },
});

/**
 * Import an existing wallet by encrypting and storing its WIF
 * This replaces the Next.js /api/wallets/import route
 */
export const importWallet = action({
  args: {
    name: v.string(),
    address: v.string(),
    privateKey: v.string(), // WIF format
    network: v.union(v.literal("sandbox"), v.literal("mainnet")),
  },
  returns: v.object({
    success: v.boolean(),
    walletId: v.optional(v.id("wallets")),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    // Check authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { success: false, error: "Authentication required" };
    }

    // Validate inputs
    if (!args.name.trim() || args.name.trim().length > 100) {
      return { success: false, error: "Wallet name must be between 1 and 100 characters" };
    }

    // Validate Bitcoin address format (basic check)
    const bitcoinAddressRegex = /^(1|3|bc1)[a-zA-Z0-9]{25,62}$/;
    if (!bitcoinAddressRegex.test(args.address.trim())) {
      return { success: false, error: "Invalid Bitcoin address format" };
    }

    // Basic WIF validation (Bitcoin WIF starts with 5, K, or L for mainnet, c for testnet)
    const wifRegex = /^[5KLc][1-9A-HJ-NP-Za-km-z]{50,51}$/;
    if (!wifRegex.test(args.privateKey.trim())) {
      return { success: false, error: "Invalid private key format. Please enter a valid WIF (Wallet Import Format) key." };
    }

    try {
      // Encrypt the WIF
      const encryptedWif = encryptWif(args.privateKey.trim());

      // Get user's current workspace
      const user = await ctx.runQuery(internal.users.getUserByTokenIdentifierInternal, {
        tokenIdentifier: identity.tokenIdentifier,
      });

      if (!user || !user.currentWorkspaceId) {
        return { success: false, error: "No workspace selected" };
      }

      // Check if wallet with this address already exists in workspace
      const existingWallet = await ctx.runQuery(internal.wallets.checkWalletExistsInternal, {
        workspaceId: user.currentWorkspaceId,
        address: args.address.trim(),
      });

      if (existingWallet) {
        return { success: false, error: "A wallet with this address already exists in your workspace" };
      }

      // Store the wallet
      const now = Date.now();
      const walletId: Id<"wallets"> = await ctx.runMutation(internal.wallets.internalCreateWallet, {
        workspaceId: user.currentWorkspaceId,
        name: args.name.trim(),
        address: args.address.trim(),
        encryptedWif,
        network: args.network,
        createdAt: now,
        updatedAt: now,
      });

      return { success: true, walletId };
    } catch (error) {
      console.error("Failed to import wallet:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to import wallet",
      };
    }
  },
});

/**
 * Execute MNEE payment - handles the full payment flow
 * This replaces the Next.js /api/gateway/pay route logic
 */
export const executeMneePaymentAction = internalAction({
  args: {
    paymentId: v.id("payments"),
    recipientAddress: v.string(),
    amount: v.number(),
    network: v.union(v.literal("sandbox"), v.literal("mainnet")),
    encryptedWif: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    txHash: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    console.log("=== Starting MNEE Payment ===");
    console.log("Network:", args.network);
    console.log("Recipient:", args.recipientAddress);
    console.log("Amount:", args.amount);

    if (!process.env.MNEE_API_KEY) {
      return { success: false, error: "MNEE_API_KEY not configured" };
    }

    const mnee = new Mnee({
      environment: args.network === "sandbox" ? "sandbox" : "production",
      apiKey: process.env.MNEE_API_KEY,
    });

    try {
      // Decrypt the WIF
      console.log("Decrypting WIF...");
      const wif = decryptWif(args.encryptedWif);
      console.log("WIF decrypted successfully");

      // Prepare transfer request
      const transferRequest = [
        {
          address: args.recipientAddress,
          amount: args.amount,
        },
      ];

      console.log("Calling MNEE SDK transfer...");
      const response = await mnee.transfer(transferRequest, wif);

      // MNEE transfers return a ticketId for async processing
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ticketId = (response as any)?.ticketId;

      if (!ticketId) {
        console.error("Transfer failed - no ticketId");
        return { success: false, error: "Transfer failed: No ticket ID returned" };
      }

      console.log("Transfer submitted with ticketId:", ticketId);

      // Poll for transaction status
      const maxAttempts = 30;
      const pollInterval = 2000;
      let attempt = 0;
      let txHash: string | undefined;

      while (attempt < maxAttempts) {
        attempt++;
        console.log(`Status check attempt ${attempt}/${maxAttempts}...`);

        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const status = await mnee.getTxStatus(ticketId) as any;
          const txStatus = status?.status?.toUpperCase();
          txHash = status?.tx_id || status?.txid || status?.transactionId || status?.txHash;

          if (txStatus === "COMPLETED" || txStatus === "CONFIRMED" || txStatus === "SUCCESS") {
            if (!txHash) {
              txHash = ticketId;
            }
            console.log("MNEE transfer successful:", txHash);

            // Mark payment as settled
            await ctx.runMutation(internal.gateway.markPaymentSettled, {
              paymentId: args.paymentId,
              txHash,
              ticketId,
            });

            return { success: true, txHash };
          } else if (txStatus === "FAILED" || txStatus === "ERROR") {
            const errorMsg = `Transfer failed: ${status?.errors || "Unknown error"}`;
            
            await ctx.runMutation(internal.gateway.markPaymentFailed, {
              paymentId: args.paymentId,
              errorMessage: errorMsg,
            });

            return { success: false, error: errorMsg };
          }

          // Still processing, wait before next poll
          if (attempt < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, pollInterval));
          }
        } catch (error) {
          console.error(`Error checking status (attempt ${attempt}):`, error);
          if (attempt >= maxAttempts) {
            throw error;
          }
          await new Promise((resolve) => setTimeout(resolve, pollInterval));
        }
      }

      // Timeout - mark as failed
      const timeoutError = `Transfer timeout - ticketId: ${ticketId}`;
      await ctx.runMutation(internal.gateway.markPaymentFailed, {
        paymentId: args.paymentId,
        errorMessage: timeoutError,
      });

      return { success: false, error: timeoutError };
    } catch (error) {
      console.error("MNEE payment failed:", error);
      const errorMsg = error instanceof Error ? error.message : String(error);

      // Mark payment as failed
      await ctx.runMutation(internal.gateway.markPaymentFailed, {
        paymentId: args.paymentId,
        errorMessage: errorMsg,
      });

      return { success: false, error: errorMsg };
    }
  },
});

/**
 * Decrypt an encrypted WIF (Admin only)
 * Used for debugging/recovery purposes by platform admins
 */
export const decryptWifForAdmin = action({
  args: {
    encryptedWif: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    decryptedWif: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    // Check if user is a platform admin
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return {
        success: false,
        error: "Authentication required",
      };
    }

    // Verify admin status by querying the database
    const isAdmin = await ctx.runQuery(internal.users.checkIsAdminInternal, {
      tokenIdentifier: identity.tokenIdentifier,
    });

    if (!isAdmin) {
      return {
        success: false,
        error: "Platform admin access required",
      };
    }

    try {
      const decrypted = decryptWif(args.encryptedWif);
      return {
        success: true,
        decryptedWif: decrypted,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Decryption failed",
      };
    }
  },
});

