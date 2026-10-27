"use client";

import { AuthGate } from "@/components/auth-gate";
import { MobileHeader, MobileNav, Sidebar } from "@/components/layout/sidebar";
import { InstallPromptBanner } from "@/components/pwa/install-prompt-banner";
import { InstallPromptProvider } from "@/components/pwa/install-prompt-provider";
import { PwaIconSync } from "@/components/pwa/pwa-icon-sync";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <PwaIconSync />
      <InstallPromptProvider>
        <div className="min-h-screen">
          <Sidebar />
          <MobileHeader />
          <main className="lg:pl-[260px]">
            <div className="mx-auto max-w-5xl px-4 pb-mobile-nav pt-5 sm:px-6 lg:px-10 lg:pb-16 lg:pt-10">
              {children}
            </div>
          </main>
          <MobileNav />
          <InstallPromptBanner />
        </div>
      </InstallPromptProvider>
    </AuthGate>
  );
}
