#!/usr/bin/env node
/**
 * Script to encrypt MNEE WIF and generate command to add wallet
 * 
 * Usage:
 * MNEE_ENCRYPTION_KEY=your_key node scripts/add-mnee-wallet.ts
 */

import crypto from "crypto";

// Encryption settings
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const SALT_LENGTH = 64;

function encryptWif(wif: string, masterKey: Buffer): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const salt = crypto.randomBytes(SALT_LENGTH);
  const derivedKey = crypto.pbkdf2Sync(masterKey, salt, 100000, 32, "sha256");
  const cipher = crypto.createCipheriv(ALGORITHM, derivedKey, iv);
  
  let encrypted = cipher.update(wif, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();
  
  return `${iv.toString("base64")}:${authTag.toString("base64")}:${salt.toString("base64")}:${encrypted}`;
}

// Wallet details
const address = "1KPmRUMAWmddVk6xDwDZk6Lo9VFPB2YMPM";
const wif = "KyTrjVoJsHnUoNrH79svfkZvaMJ6eTD78W33dP4rWJZ98UegV75P";
const network = "sandbox";

// Check for encryption key
const encryptionKey = process.env.MNEE_ENCRYPTION_KEY;
if (!encryptionKey) {
  console.error("❌ MNEE_ENCRYPTION_KEY not set");
  console.log("\nGenerate one with: openssl rand -base64 32");
  console.log("Then run: MNEE_ENCRYPTION_KEY=your_key node scripts/add-mnee-wallet.js");
  process.exit(1);
}

console.log("🔐 Encrypting WIF...");
const masterKey = Buffer.from(encryptionKey, "base64");
const encryptedWif = encryptWif(wif, masterKey);
console.log("✅ WIF encrypted\n");

console.log("=" .repeat(60));
console.log("📝 ADD WALLET TO WORKSPACE");
console.log("=".repeat(60));
console.log("\n1. Go to your Convex Dashboard (https://dashboard.convex.dev)");
console.log("2. Select your project and deployment");
console.log("3. Open the Functions tab");
console.log("4. Run this mutation:\n");
console.log(`await api.mneeAdmin.addMneeWalletToWorkspace({
  address: "${address}",
  encryptedWif: "${encryptedWif}",
  network: "${network}"
})`);
console.log("\n⚠️  Make sure you're logged in to a workspace first!");
console.log("=" .repeat(60));

