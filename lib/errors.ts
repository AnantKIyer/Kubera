/** Known server-side error tokens → plain language */
const KNOWN_MESSAGES: Record<string, string> = {
  InvalidSecret: "The password you entered is incorrect.",
  InvalidAccountId: "We couldn't find an account with those details.",
  InvalidCredentials: "The email, username, phone, or password is incorrect.",
  TooManyFailedAttempts: "Too many failed attempts. Please wait a few minutes and try again.",
  InvalidVerificationCode: "That verification code is invalid or has expired.",
};

const TECHNICAL_MARKERS = [
  "[CONVEX",
  "Request ID",
  "node_modules",
  "../../",
  "Uncaught Error",
  "Server Error",
  "Called by client",
  "at retrieveAccount",
  "at async",
  ".convex.cloud",
  "ConvexError:",
];

function looksTechnical(message: string): boolean {
  if (!message) return true;
  if (message.length > 160) return true;
  return TECHNICAL_MARKERS.some((marker) => message.includes(marker));
}

function extractConvexMessage(raw: string): string | null {
  const trimmed = raw.trim();

  // ConvexError: "message" or ConvexError: {"message":"..."}
  const jsonMatch = trimmed.match(/ConvexError:\s*(\{[\s\S]*\}|"[^"]+"|'[^']+')/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      if (typeof parsed === "string") return parsed;
      if (typeof parsed?.message === "string") return parsed.message;
    } catch {
      const quoted = jsonMatch[1].replace(/^["']|["']$/g, "");
      if (quoted) return quoted;
    }
  }

  // Uncaught Error: InvalidSecret (strip stack)
  const uncaught = trimmed.match(/Uncaught(?:\s+\w+)*:\s*([^.\n]+)/);
  if (uncaught?.[1]) {
    const code = uncaught[1].trim();
    if (KNOWN_MESSAGES[code]) return KNOWN_MESSAGES[code];
    if (!looksTechnical(code)) return code;
  }

  // Bare error code
  for (const [code, friendly] of Object.entries(KNOWN_MESSAGES)) {
    if (trimmed.includes(code)) return friendly;
  }

  return null;
}

function sanitizeMessage(raw: string): string {
  let message = raw
    .replace(/\[CONVEX[^\]]*\]/gi, "")
    .replace(/\[Request ID:[^\]]*\]/gi, "")
    .replace(/Server Error/gi, "")
    .replace(/Uncaught Error:/gi, "")
    .replace(/Called by client/gi, "")
    .replace(/\s+at\s+[\w./<>]+\([^)]*\)/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  const extracted = extractConvexMessage(raw);
  if (extracted) return extracted;

  if (looksTechnical(message)) return "";

  // Drop leading "Error:" if the rest is still readable
  message = message.replace(/^Error:\s*/i, "").trim();
  return message;
}

/**
 * Turn any thrown value into a short, user-safe message.
 * Never returns stack traces, request IDs, or Convex internals.
 */
export function parseUserError(err: unknown, fallback: string): string {
  if (err == null) return fallback;

  // Convex client errors sometimes expose .data
  if (typeof err === "object" && err !== null && "data" in err) {
    const data = (err as { data?: unknown }).data;
    if (typeof data === "string" && data && !looksTechnical(data)) {
      return data;
    }
    if (typeof data === "object" && data !== null && "message" in data) {
      const msg = (data as { message?: unknown }).message;
      if (typeof msg === "string" && msg && !looksTechnical(msg)) {
        return msg;
      }
    }
  }

  if (typeof err === "string") {
    const clean = sanitizeMessage(err);
    return clean || fallback;
  }

  if (err instanceof Error) {
    const clean = sanitizeMessage(err.message);
    return clean || fallback;
  }

  return fallback;
}

/** @deprecated Use parseUserError — kept for existing auth imports */
export const parseAuthError = parseUserError;
