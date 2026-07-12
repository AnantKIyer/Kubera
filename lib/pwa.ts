/** True when the app is running as an installed PWA (home screen / standalone). */
export function isStandalonePwa(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // Legacy iOS Safari
    ("standalone" in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

export function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function isAndroid(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android/.test(navigator.userAgent);
}

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

/** localStorage key: user chose to keep using the browser (dismiss install banner). */
export const PWA_INSTALL_DISMISSED_KEY = "kubera-pwa-install-dismissed";

export function isInstallPromptDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(PWA_INSTALL_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function setInstallPromptDismissed(dismissed: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (dismissed) {
      localStorage.setItem(PWA_INSTALL_DISMISSED_KEY, "1");
    } else {
      localStorage.removeItem(PWA_INSTALL_DISMISSED_KEY);
    }
  } catch {
    // Ignore quota / private mode failures
  }
}
