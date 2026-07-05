/** Normalize email for storage and lookup */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Normalize username: lowercase, no spaces */
export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

/** Normalize phone to E.164-ish format (digits with leading +) */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 0) return "";
  if (digits.length === 10) return `+91${digits}`;
  if (digits.startsWith("91") && digits.length === 12) return `+${digits}`;
  return digits.startsWith("+") ? digits : `+${digits}`;
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
}

export function isValidUsername(username: string): boolean {
  const u = normalizeUsername(username);
  return u.length >= 3 && u.length <= 24 && /^[a-z0-9_]+$/.test(u);
}

export function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

export type IdentifierKind = "email" | "phone" | "username";

export function detectIdentifierKind(identifier: string): IdentifierKind {
  const trimmed = identifier.trim();
  if (trimmed.includes("@")) return "email";
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length >= 10) return "phone";
  return "username";
}
