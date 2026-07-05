/** Parse Convex Auth / ConvexError messages for display */
export function parseAuthError(err: unknown, fallback: string): string {
  if (err instanceof Error) {
    const msg = err.message;
    if (msg.includes("ConvexError") || msg.startsWith("{")) {
      try {
        const parsed = JSON.parse(msg.replace(/^ConvexError:\s*/, ""));
        if (typeof parsed === "string") return parsed;
        if (parsed?.message) return parsed.message;
      } catch {
        /* use raw message */
      }
    }
    return msg || fallback;
  }
  return fallback;
}
