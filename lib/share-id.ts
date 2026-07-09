const SHARE_ID_LENGTH = 8;

export function parseShareIdInput(input: string): string {
  return input.trim().replace(/^#/, "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

export function formatShareId(code: string): string {
  return `#${code}`;
}

export function isValidShareIdInput(input: string): boolean {
  const code = parseShareIdInput(input);
  return code.length === SHARE_ID_LENGTH && /^[A-Z0-9]+$/.test(code);
}

export async function copyShareId(code: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(formatShareId(code));
    return true;
  } catch {
    return false;
  }
}
