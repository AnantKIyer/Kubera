/** Uppercase A–Z + 2–9 (skip 0/O, 1/I for readability). */
const SHARE_ID_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const SHARE_ID_LENGTH = 8;

export function generateShareId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(SHARE_ID_LENGTH));
  let id = "";
  for (let i = 0; i < SHARE_ID_LENGTH; i++) {
    id += SHARE_ID_CHARS[bytes[i]! % SHARE_ID_CHARS.length];
  }
  return id;
}

/** Strip leading # and non-alphanumeric, uppercase. */
export function normalizeShareId(input: string): string {
  return input.trim().replace(/^#/, "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

export function isValidShareId(code: string): boolean {
  return code.length === SHARE_ID_LENGTH && /^[A-Z0-9]+$/.test(code);
}

export function formatShareId(code: string): string {
  return `#${code}`;
}
