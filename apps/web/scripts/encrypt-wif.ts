#!/usr/bin/env tsx
/**
 * CLI tool to encrypt a WIF (Wallet Import Format) key
 * 
 * Usage:
 *   pnpm encrypt-wif <wif>
 *   pnpm encrypt-wif  # Will prompt for WIF
 * 
 * The script will automatically load MNEE_ENCRYPTION_KEY from:
 *   1. .env.local (checked first)
 *   2. .env
 *   3. Environment variables
 * 
 * Example:
 *   pnpm encrypt-wif KyTrjVoJsHnUoNrH79svfkZvaMJ6eTD78W33dP4rWJZ98UegV75P
 */

import { encryptWif } from "../lib/mnee-crypto";
import * as readline from "readline";
import { config } from "dotenv";
import { existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// Get the directory of this script and resolve to apps/web
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const webAppRoot = resolve(__dirname, "..");

// Load environment variables from .env files in apps/web
// Check .env.local first, then .env
const envLocalPath = resolve(webAppRoot, ".env.local");
const envPath = resolve(webAppRoot, ".env");

if (existsSync(envLocalPath)) {
  config({ path: envLocalPath });
  console.log(`📄 Loaded environment from ${envLocalPath}`);
} else if (existsSync(envPath)) {
  config({ path: envPath });
  console.log(`📄 Loaded environment from ${envPath}`);
} else {
  console.log(`ℹ️  No .env file found in ${webAppRoot}, using environment variables`);
}

async function promptForWif(): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question("Enter WIF to encrypt: ", (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  // Check for encryption key
  if (!process.env.MNEE_ENCRYPTION_KEY) {
    console.error("❌ Error: MNEE_ENCRYPTION_KEY environment variable not set");
    console.log("\nGenerate a key with:");
    console.log("  openssl rand -base64 32");
    console.log("\nThen set it in your environment:");
    console.log("  export MNEE_ENCRYPTION_KEY=<your_key>");
    process.exit(1);
  }

  // Get WIF from command line argument or prompt
  let wif = process.argv[2];
  
  if (!wif) {
    wif = await promptForWif();
  }

  if (!wif) {
    console.error("❌ Error: No WIF provided");
    process.exit(1);
  }

  try {
    console.log("\n🔐 Encrypting WIF...");
    const encryptedWif = encryptWif(wif);
    
    console.log("\n✅ Encryption successful!");
    console.log("\n" + "=".repeat(80));
    console.log("ENCRYPTED WIF:");
    console.log("=".repeat(80));
    console.log(encryptedWif);
    console.log("=".repeat(80));
    
    console.log("\n📝 To add this wallet to the database, you can:");
    console.log("   1. Use the Convex dashboard to call addMneeWalletToWorkspace mutation");
    console.log("   2. Use the encrypted WIF value above as the 'encryptedWif' parameter");
    console.log("\n⚠️  Keep the encrypted WIF secure - treat it like a password!");
    
  } catch (error) {
    console.error("❌ Encryption failed:");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("❌ Unexpected error:");
  console.error(error);
  process.exit(1);
});

