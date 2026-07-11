/** Application-level field encryption (AES-256-GCM). */

const PREFIX = "enc:v1:";
const IV_LENGTH = 12;

let cachedKey: CryptoKey | null | undefined;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function getEncryptionKey(): Promise<CryptoKey | null> {
  if (cachedKey !== undefined) return cachedKey;

  const keyB64 = process.env.DATA_ENCRYPTION_KEY;
  if (!keyB64) {
    cachedKey = null;
    return null;
  }

  const raw = new Uint8Array(base64ToBytes(keyB64));
  if (raw.length !== 32) {
    throw new Error("DATA_ENCRYPTION_KEY must be a base64-encoded 32-byte key");
  }

  cachedKey = await crypto.subtle.importKey(
    "raw",
    raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength),
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
  return cachedKey;
}

export function encryptionEnabled(): boolean {
  return Boolean(process.env.DATA_ENCRYPTION_KEY);
}

export function isEncrypted(value: string): boolean {
  return value.startsWith(PREFIX);
}

/** Encrypt a string for storage. No-op when encryption key is not configured. */
export async function encryptField(plaintext: string): Promise<string> {
  if (!plaintext || isEncrypted(plaintext)) return plaintext;

  const key = await getEncryptionKey();
  if (!key) return plaintext;

  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);

  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return `${PREFIX}${bytesToBase64(combined)}`;
}

/** Decrypt a stored value. Returns plaintext legacy values unchanged. */
export async function decryptField(value: string): Promise<string> {
  if (!value || !isEncrypted(value)) return value;

  const key = await getEncryptionKey();
  if (!key) {
    throw new Error(
      "Encrypted data found but DATA_ENCRYPTION_KEY is not set. Configure it in Convex environment variables.",
    );
  }

  const combined = base64ToBytes(value.slice(PREFIX.length));
  const iv = combined.slice(0, IV_LENGTH);
  const data = combined.slice(IV_LENGTH);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
  return new TextDecoder().decode(decrypted);
}

export async function encryptOptional(value: string | undefined | null): Promise<string | undefined> {
  if (!value) return undefined;
  return await encryptField(value);
}

export async function decryptOptional(value: string | undefined | null): Promise<string | undefined> {
  if (!value) return undefined;
  return await decryptField(value);
}
