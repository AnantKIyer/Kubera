"use client";

import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { Download, X } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { BASE_CURRENCY } from "@/lib/currency";
import { iconPath } from "@/lib/pwa-icons";
import { cn } from "@/lib/utils";
import { IosInstallSteps } from "./ios-install-steps";
import { useInstallPrompt } from "./install-prompt-provider";

const SHOW_DELAY_MS = 1600;

/**
 * Mobile-only install nudge: Install app vs Continue in browser.
 * Hidden when already installed, dismissed, or install isn't available.
 */
export function InstallPromptBanner() {
  const user = useQuery(api.users.me);
  const {
    mounted,
    standalone,
    ios,
    installPrompt,
    installing,
    dismissed,
    canOfferInstall,
    promptInstall,
    continueInBrowser,
  } = useInstallPrompt();

  const [ready, setReady] = useState(false);
  const [iosGuideOpen, setIosGuideOpen] = useState(false);
  const [visible, setVisible] = useState(false);

  const homeCurrency = user?.homeCurrency ?? BASE_CURRENCY;
  const brandIcon = iconPath(homeCurrency, 180);

  useEffect(() => {
    if (!mounted || standalone || dismissed || !canOfferInstall) {
      setReady(false);
      setVisible(false);
      return;
    }

    const delay = window.setTimeout(() => setReady(true), SHOW_DELAY_MS);
    return () => window.clearTimeout(delay);
  }, [mounted, standalone, dismissed, canOfferInstall]);

  useEffect(() => {
    if (!ready) {
      setVisible(false);
      return;
    }
    const frame = window.requestAnimationFrame(() => setVisible(true));
    return () => window.cancelAnimationFrame(frame);
  }, [ready]);

  if (!mounted || standalone || dismissed || !canOfferInstall || !ready) {
    return null;
  }

  const handleInstall = async () => {
    if (installPrompt) {
      await promptInstall();
      return;
    }
    if (ios) {
      setIosGuideOpen(true);
    }
  };

  const handleContinueInBrowser = () => {
    setIosGuideOpen(false);
    continueInBrowser();
  };

  return (
    <>
      <div
        className={cn(
          "fixed inset-x-3 z-40 lg:hidden",
          "bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px)+0.75rem)]",
          "transition-[transform,opacity] duration-300 ease-out",
          visible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
        )}
        role="dialog"
        aria-label="Install Kubera"
      >
        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-soft">
          <div className="flex items-start gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={brandIcon}
              alt=""
              width={40}
              height={40}
              className="h-10 w-10 shrink-0 rounded-xl"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold tracking-tight text-foreground">
                Use Kubera as an app
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                Install for a fuller screen and quicker access — or keep using the browser.
              </p>
            </div>
            <button
              type="button"
              onClick={handleContinueInBrowser}
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Dismiss"
            >
              <X size={16} />
            </button>
          </div>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button
              size="sm"
              className="w-full sm:flex-1"
              onClick={handleInstall}
              disabled={installing}
            >
              <Download size={14} />
              {installing ? "Installing…" : "Install app"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="w-full sm:flex-1"
              onClick={handleContinueInBrowser}
            >
              Continue in browser
            </Button>
          </div>
        </div>
      </div>

      <Modal
        open={iosGuideOpen}
        onClose={() => setIosGuideOpen(false)}
        title="Add Kubera to your Home Screen"
        description="A few taps in Safari gives you the full app experience."
        footer={
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={handleContinueInBrowser}
              className="w-full sm:w-auto"
            >
              Continue in browser
            </Button>
            <Button
              onClick={() => {
                setIosGuideOpen(false);
                continueInBrowser();
              }}
              className="w-full sm:w-auto"
            >
              Got it
            </Button>
          </div>
        }
      >
        <IosInstallSteps />
      </Modal>
    </>
  );
}
