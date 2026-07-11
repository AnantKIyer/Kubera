/**
 * Smoke-tests AES-256-GCM field encryption (mirrors convex/lib/encryption.ts).
 * Run: npm run test:encryption
 *
 * Exit 0 on success; non-zero with failing assertion messages otherwise.
 */
import { randomBytes, webcrypto } from "node:crypto";

const PREFIX = "enc:v1:";
const IV_LENGTH = 12;

function bytesToBase64(bytes) {
  return Buffer.from(bytes).toString("base64");
}

function base64ToBytes(value) {
  return new Uint8Array(Buffer.from(value, "base64"));
}

async function importKey(keyB64) {
  const raw = base64ToBytes(keyB64);
  if (raw.length !== 32) {
    throw new Error("DATA_ENCRYPTION_KEY must be a base64-encoded 32-byte key");
  }
  return webcrypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

async function encryptField(plaintext, key) {
  if (!plaintext || plaintext.startsWith(PREFIX)) return plaintext;
  if (!key) return plaintext;

  const iv = webcrypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await webcrypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return `${PREFIX}${bytesToBase64(combined)}`;
}

async function decryptField(value, key) {
  if (!value || !value.startsWith(PREFIX)) return value;
  if (!key) {
    throw new Error(
      "Encrypted data found but DATA_ENCRYPTION_KEY is not set. Configure it in Convex environment variables.",
    );
  }
  const combined = base64ToBytes(value.slice(PREFIX.length));
  const iv = combined.slice(0, IV_LENGTH);
  const data = combined.slice(IV_LENGTH);
  const decrypted = await webcrypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
  return new TextDecoder().decode(decrypted);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function expectReject(fn, messageIncludes) {
  try {
    await fn();
    throw new Error(`Expected rejection including "${messageIncludes}"`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("Expected rejection")) throw err;
    assert(msg.includes(messageIncludes), `Expected error containing "${messageIncludes}", got: ${msg}`);
  }
}

async function main() {
  const keyB64 = randomBytes(32).toString("base64");
  const otherKeyB64 = randomBytes(32).toString("base64");
  const key = await importKey(keyB64);
  const otherKey = await importKey(otherKeyB64);
  const sample = "HDFC Savings · lastFour 4321";

  // Round-trip with key configured
  const encrypted = await encryptField(sample, key);
  assert(encrypted.startsWith(PREFIX), "encrypted value should use enc:v1: prefix");
  assert(encrypted !== sample, "ciphertext should differ from plaintext");
  const decrypted = await decryptField(encrypted, key);
  assert(decrypted === sample, `round-trip failed: got "${decrypted}"`);

  // Idempotent encrypt (already-encrypted passthrough)
  const twice = await encryptField(encrypted, key);
  assert(twice === encrypted, "re-encrypting ciphertext should be a no-op");

  // No key → plaintext write (fallback)
  const plainWrite = await encryptField(sample, null);
  assert(plainWrite === sample, "without key, encrypt should leave plaintext unchanged");

  // Legacy plaintext decrypt unchanged
  const legacy = await decryptField("legacy plaintext note", key);
  assert(legacy === "legacy plaintext note", "legacy plaintext should decrypt unchanged");

  // Encrypted value without key → hard fail
  await expectReject(
    () => decryptField(encrypted, null),
    "DATA_ENCRYPTION_KEY is not set",
  );

  // Wrong key → decrypt fails (Node: "operation-specific reason"; browsers: OperationError)
  await expectReject(() => decryptField(encrypted, otherKey), "fail");

  // Empty / falsy values
  assert((await encryptField("", key)) === "", "empty string encrypt is no-op");
  assert((await decryptField("", key)) === "", "empty string decrypt is no-op");

  // Invalid key length rejected at import
  await expectReject(() => importKey(Buffer.from("too-short").toString("base64")), "32-byte");

  console.log("✓ encryption verification passed");
  console.log("  - AES-256-GCM round-trip");
  console.log("  - enc:v1: prefix + idempotent encrypt");
  console.log("  - plaintext fallback when key missing");
  console.log("  - legacy plaintext decrypt unchanged");
  console.log("  - encrypted-without-key throws");
  console.log("  - wrong key fails decrypt");
}

main().catch((err) => {
  console.error("✗ encryption verification failed");
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
