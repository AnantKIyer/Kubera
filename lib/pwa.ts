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
