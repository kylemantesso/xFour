/**
 * MNEE Wallet Generation
 * 
 * Server-side utilities for creating new MNEE wallets using the SDK
 */

import Mnee from "@mnee/ts-sdk";
import { encryptWif } from "./mnee-crypto";

export interface GeneratedMneeWallet {
  address: string;
  wif: string; // Raw WIF
  encryptedWif: string; // Encrypted for storage
}

/**
 * Generate a new MNEE wallet for a workspace
 * 
 * @param network - "sandbox" or "mainnet"
 * @returns Generated wallet with address and encrypted WIF
 */
export async function generateMneeWallet(
  network: "sandbox" | "mainnet"
): Promise<GeneratedMneeWallet> {
  if (!process.env.MNEE_API_KEY) {
    throw new Error("MNEE_API_KEY not configured");
  }

  if (!process.env.MNEE_ENCRYPTION_KEY) {
    throw new Error("MNEE_ENCRYPTION_KEY not configured");
  }

  // Initialize MNEE SDK
  const mnee = new Mnee({
    environment: network === "sandbox" ? "sandbox" : "production",
    apiKey: process.env.MNEE_API_KEY,
  });

  console.log(`🔑 Generating new MNEE wallet for ${network}...`);

  // Generate new mnemonic
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
  console.log(`🔐 Encrypting WIF for storage...`);

  // Encrypt the WIF for secure storage
  const encryptedWif = encryptWif(addressInfo.privateKey);

  return {
    address: addressInfo.address,
    wif: addressInfo.privateKey, // Return raw WIF for immediate use if needed
    encryptedWif, // Encrypted version for database storage
  };
}

/**
 * Get MNEE wallet balance
 * 
 * @param address - MNEE wallet address
 * @param network - "sandbox" or "mainnet"
 * @returns Balance in MNEE (up to 5 decimals)
 */
export async function getMneeBalance(
  address: string,
  network: "sandbox" | "mainnet"
): Promise<number> {
  if (!process.env.MNEE_API_KEY) {
    throw new Error("MNEE_API_KEY not configured");
  }

  const mnee = new Mnee({
    environment: network === "sandbox" ? "sandbox" : "production",
    apiKey: process.env.MNEE_API_KEY,
  });

  try {
    const balanceData = await mnee.balance(address);
    return balanceData.decimalAmount || 0;
  } catch (error) {
    console.error(`Error fetching MNEE balance for ${address}:`, error);
    return 0;
  }
}

