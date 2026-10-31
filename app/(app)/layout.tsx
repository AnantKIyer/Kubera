"use client";

import { usePathname } from "next/navigation";
import { AuthGate } from "@/components/auth-gate";
import { MobileHeader, MobileNav, Sidebar } from "@/components/layout/sidebar";
import { NewTransactionButton } from "@/components/layout/new-transaction-button";
import { InstallPromptBanner } from "@/components/pwa/install-prompt-banner";
import { InstallPromptProvider } from "@/components/pwa/install-prompt-provider";
import { PwaIconSync } from "@/components/pwa/pwa-icon-sync";
import { showsNewTransactionButton } from "@/lib/nav";
import { cn } from "@/lib/utils";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AuthGate>
      <PwaIconSync />
      <InstallPromptProvider>
        <div className="min-h-screen">
          <Sidebar />
          <MobileHeader />
          <main className="lg:pl-[260px]">
            <div
              className={cn(
                "mx-auto max-w-5xl px-4 pt-5 sm:px-6 lg:px-10 lg:pb-16 lg:pt-10",
                showsNewTransactionButton(pathname) ? "pb-mobile-nav-action" : "pb-mobile-nav",
              )}
            >
              {children}
            </div>
          </main>
          <MobileNav />
          <NewTransactionButton />
          <InstallPromptBanner />
        </div>
      </InstallPromptProvider>
    </AuthGate>
  );
}
