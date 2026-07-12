"use client";

import { useQuery } from "convex/react";
import { Download } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BASE_CURRENCY } from "@/lib/currency";
import { iconPath } from "@/lib/pwa-icons";
import { IosInstallSteps } from "./ios-install-steps";
import { useInstallPrompt } from "./install-prompt-provider";

export function InstallAppCard() {
  const user = useQuery(api.users.me);
  const {
    mounted,
    standalone,
    ios,
    installPrompt,
    installing,
    canOfferInstall,
    promptInstall,
    resetDismiss,
  } = useInstallPrompt();

  const homeCurrency = user?.homeCurrency ?? BASE_CURRENCY;
  const brandIcon = iconPath(homeCurrency, 180);

  if (!mounted || standalone || !canOfferInstall) return null;

  const showIos = ios && !installPrompt;
  const showNative = Boolean(installPrompt);

  const handleInstall = async () => {
    resetDismiss();
    await promptInstall();
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
        {showIos && <IosInstallSteps />}

        {showNative && (
          <Button onClick={handleInstall} disabled={installing} className="w-full sm:w-auto">
            <Download size={16} />
            {installing ? "Installing…" : "Install app"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
