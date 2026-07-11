"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useQuery } from "convex/react";
import { Download, Share } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BASE_CURRENCY } from "@/lib/currency";
import { iconPath } from "@/lib/pwa-icons";
import {
  type BeforeInstallPromptEvent,
  isAndroid,
  isIos,
  isStandalonePwa,
} from "@/lib/pwa";

export function InstallAppCard() {
  const user = useQuery(api.users.me);
  const [mounted, setMounted] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [ios, setIos] = useState(false);
  const [android, setAndroid] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);

  const homeCurrency = user?.homeCurrency ?? BASE_CURRENCY;
  const brandIcon = iconPath(homeCurrency, 180);

  useEffect(() => {
    setMounted(true);
    setStandalone(isStandalonePwa());
    setIos(isIos());
    setAndroid(isAndroid());

    const onInstallPrompt = (event: BeforeInstallPromptEvent) => {
      event.preventDefault();
      setInstallPrompt(event);
    };

    window.addEventListener("beforeinstallprompt", onInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onInstallPrompt);
  }, []);

  if (!mounted || standalone) return null;

  const showIos = ios;
  const showAndroid = android && installPrompt;

  if (!showIos && !showAndroid) return null;

  const handleAndroidInstall = async () => {
    if (!installPrompt) return;
    setInstalling(true);
    try {
      await installPrompt.prompt();
      await installPrompt.userChoice;
      setInstallPrompt(null);
    } finally {
      setInstalling(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={brandIcon}
            alt=""
            width={40}
            height={40}
            className="h-10 w-10 shrink-0 rounded-xl"
          />
          <div>
            <CardTitle>Install Kubera</CardTitle>
            <CardDescription>
              {showIos
                ? "Add Kubera to your home screen for quick access and a full-screen app experience."
                : "Install Kubera on your home screen for faster access and offline support."}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showIos && (
          <ol className="space-y-3 text-sm text-muted-foreground">
            <InstallStep
              step={1}
              title="Open in Safari"
              description="Use Safari — in-app browsers from other apps won't work."
            />
            <InstallStep
              step={2}
              title="Tap Share"
              description="The square icon with an arrow pointing up, at the bottom of Safari."
              icon={<Share size={14} className="inline text-foreground" />}
            />
            <InstallStep
              step={3}
              title="Add to Home Screen"
              description='Scroll the share sheet and tap "Add to Home Screen", then tap Add.'
            />
          </ol>
        )}

        {showAndroid && (
          <Button onClick={handleAndroidInstall} disabled={installing} className="w-full sm:w-auto">
            <Download size={16} />
            {installing ? "Installing…" : "Install app"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function InstallStep({
  step,
  title,
  description,
  icon,
}: {
  step: number;
  title: string;
  description: string;
  icon?: ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
        {step}
      </span>
      <div>
        <p className="font-medium text-foreground">
          {title}
          {icon ? <> {icon}</> : null}
        </p>
        <p className="mt-0.5 leading-relaxed">{description}</p>
      </div>
    </li>
  );
}
