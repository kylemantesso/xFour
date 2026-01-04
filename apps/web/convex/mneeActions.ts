/**
 * MNEE Actions
 * 
 * Node.js actions for MNEE wallet generation and management
 * These run in Node.js environment and can use the MNEE SDK
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

function encryptWif(wif: string): string {
  const encryptionKey = process.env.MNEE_ENCRYPTION_KEY;
  if (!encryptionKey) {
    console.warn("MNEE_ENCRYPTION_KEY not set - WIF not encrypted");
    return wif;
  }

  const masterKey = Buffer.from(encryptionKey, "base64");
  const iv = crypto.randomBytes(IV_LENGTH);
  const salt = crypto.randomBytes(SALT_LENGTH);
  const derivedKey = crypto.pbkdf2Sync(masterKey, salt, 100000, 32, "sha256");
  const cipher = crypto.createCipheriv(ALGORITHM, derivedKey, iv);

  let encrypted = cipher.update(wif, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();

  return `${iv.toString("base64")}:${authTag.toString("base64")}:${salt.toString("base64")}:${encrypted}`;
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

      // Store in Convex database
      console.log(`💾 Storing wallet in database...`);
      await ctx.runMutation(internal.lib.mnee.storeMneeWallet, {
        workspaceId: args.workspaceId,
        address: addressInfo.address,
        encryptedWif: encryptedWif,
        network: args.network,
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

