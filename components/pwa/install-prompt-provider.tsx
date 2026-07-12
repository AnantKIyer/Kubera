"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  type BeforeInstallPromptEvent,
  isInstallPromptDismissed,
  isIos,
  isStandalonePwa,
  setInstallPromptDismissed,
} from "@/lib/pwa";

type InstallPromptContextValue = {
  mounted: boolean;
  standalone: boolean;
  ios: boolean;
  /** Native Chromium install event (Android / desktop Chrome, etc.). */
  installPrompt: BeforeInstallPromptEvent | null;
  installing: boolean;
  /** User chose “Continue in browser” — banner stays hidden. */
  dismissed: boolean;
  /** True when we can offer install (native prompt or iOS A2HS guide). */
  canOfferInstall: boolean;
  promptInstall: () => Promise<"accepted" | "dismissed" | "unavailable">;
  continueInBrowser: () => void;
  /** Clear dismiss so Settings / banner can show again. */
  resetDismiss: () => void;
};

const InstallPromptContext = createContext<InstallPromptContextValue | null>(null);

export function InstallPromptProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [ios, setIos] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setMounted(true);
    setStandalone(isStandalonePwa());
    setIos(isIos());
    setDismissed(isInstallPromptDismissed());

    const onInstallPrompt = (event: BeforeInstallPromptEvent) => {
      event.preventDefault();
      setInstallPrompt(event);
    };

    const onAppInstalled = () => {
      setInstallPrompt(null);
      setStandalone(true);
    };

    window.addEventListener("beforeinstallprompt", onInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const canOfferInstall = Boolean(installPrompt) || ios;

  const promptInstall = useCallback(async () => {
    if (!installPrompt) return "unavailable" as const;
    setInstalling(true);
    try {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      setInstallPrompt(null);
      return outcome;
    } finally {
      setInstalling(false);
    }
  }, [installPrompt]);

  const continueInBrowser = useCallback(() => {
    setInstallPromptDismissed(true);
    setDismissed(true);
  }, []);

  const resetDismiss = useCallback(() => {
    setInstallPromptDismissed(false);
    setDismissed(false);
  }, []);

  const value = useMemo(
    () => ({
      mounted,
      standalone,
      ios,
      installPrompt,
      installing,
      dismissed,
      canOfferInstall,
      promptInstall,
      continueInBrowser,
      resetDismiss,
    }),
    [
      mounted,
      standalone,
      ios,
      installPrompt,
      installing,
      dismissed,
      canOfferInstall,
      promptInstall,
      continueInBrowser,
      resetDismiss,
    ],
  );

  return (
    <InstallPromptContext.Provider value={value}>{children}</InstallPromptContext.Provider>
  );
}

export function useInstallPrompt(): InstallPromptContextValue {
  const ctx = useContext(InstallPromptContext);
  if (!ctx) {
    throw new Error("useInstallPrompt must be used within InstallPromptProvider");
  }
  return ctx;
}
