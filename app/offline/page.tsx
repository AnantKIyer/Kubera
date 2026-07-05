"use client";

import Link from "next/link";
import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <WifiOff size={28} />
      </div>
      <h1 className="mt-6 text-xl font-semibold">You&apos;re offline</h1>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
        Kubera needs an internet connection to sync your accounts and transactions. Reconnect
        and try again.
      </p>
      <Button className="mt-6" onClick={() => typeof window !== "undefined" && window.location.reload()}>
        Try again
      </Button>
      <Link href="/" className="mt-4 text-sm font-medium text-primary hover:underline">
        Go to dashboard
      </Link>
    </div>
  );
}
