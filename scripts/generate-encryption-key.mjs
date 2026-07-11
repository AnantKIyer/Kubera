/**
 * Generates a 32-byte AES-256 key for Convex field encryption.
 * Run: node scripts/generate-encryption-key.mjs
 */
import { randomBytes } from "node:crypto";

const key = randomBytes(32).toString("base64");
console.log("Generated DATA_ENCRYPTION_KEY:\n");
console.log(key);
console.log("\nSet it in Convex (required for encryption at rest):");
console.log(`  npx convex env set DATA_ENCRYPTION_KEY "${key}"`);
console.log("\nKeep this key safe — losing it means encrypted data cannot be recovered.");
