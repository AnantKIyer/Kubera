"use client";

import { AuthGate } from "@/components/auth-gate";
import { MobileHeader, MobileNav, Sidebar } from "@/components/layout/sidebar";
import { UserSeeder } from "@/components/user-seeder";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <UserSeeder />
      <div className="min-h-screen">
        <Sidebar />
        <MobileHeader />
        <main className="lg:pl-64">
          <div className="mx-auto max-w-6xl px-4 pb-mobile-nav pt-6 sm:px-6 lg:px-10 lg:pb-12 lg:pt-8">
            {children}
          </div>
        </main>
        <MobileNav />
      </div>
    </AuthGate>
  );
}
