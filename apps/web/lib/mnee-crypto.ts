/**
 * MNEE Cryptography Utilities
 * 
 * Server-side encryption/decryption for MNEE WIF (Wallet Import Format) keys
 * Uses AES-256-GCM with a master key from environment variables
 */

import crypto from "crypto";

// Algorithm for encryption
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16; // Initialization vector length
const SALT_LENGTH = 64; // Salt length for key derivation

/**
 * Get the master encryption key from environment variables
 * This key should be a 32-byte base64-encoded string
 */
function getMasterKey(): Buffer {
  const key = process.env.MNEE_ENCRYPTION_KEY;
  
  if (!key) {
    throw new Error("MNEE_ENCRYPTION_KEY environment variable not set");
  }

  try {
    return Buffer.from(key, "base64");
  } catch (error) {
    throw new Error(`Invalid MNEE_ENCRYPTION_KEY format: ${error}`);
  }
}

/**
 * Encrypt a WIF (Wallet Import Format) private key
 * 
 * @param wif - The WIF private key to encrypt
 * @returns Encrypted WIF as base64 string (format: iv:authTag:salt:encryptedData)
 */
export function encryptWif(wif: string): string {
  const masterKey = getMasterKey();

  // Generate random IV and salt
  const iv = crypto.randomBytes(IV_LENGTH);
  const salt = crypto.randomBytes(SALT_LENGTH);

  // Derive key from master key and salt
  const derivedKey = crypto.pbkdf2Sync(masterKey, salt, 100000, 32, "sha256");

  // Create cipher
  const cipher = crypto.createCipheriv(ALGORITHM, derivedKey, iv);

  // Encrypt
  let encrypted = cipher.update(wif, "utf8", "hex");
  encrypted += cipher.final("hex");

  // Get auth tag
  const authTag = cipher.getAuthTag();

  // Combine iv:authTag:salt:encryptedData
  const combined = `${iv.toString("base64")}:${authTag.toString("base64")}:${salt.toString("base64")}:${encrypted}`;

  return combined;
}

/**
 * Decrypt an encrypted WIF (Wallet Import Format) private key
 * 
 * @param encryptedWif - The encrypted WIF string (format: iv:authTag:salt:encryptedData)
 * @returns Decrypted WIF private key
 */
export function decryptWif(encryptedWif: string): string {
  const masterKey = getMasterKey();

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
 * Generate a random encryption key for use as MNEE_ENCRYPTION_KEY
 * This is a helper function for setup - the key should be generated once and stored in .env
 * 
 * Usage:
 * ```
 * import { generateEncryptionKey } from './mnee-crypto';
 * console.log(generateEncryptionKey());
 * ```
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString("base64");
}

/**
 * Validate that an encryption key is properly formatted
 */
export function validateEncryptionKey(key: string): boolean {
  try {
    const buffer = Buffer.from(key, "base64");
    return buffer.length === 32;
  } catch {
    return false;
  }
}

