import type { CSSProperties, ReactNode } from "react";
import { GuestGate } from "@/components/auth-gate";
import { Logo } from "@/components/layout/logo";

const authLightVars = {
  colorScheme: "light",
  background: "hsl(150 10% 97%)",
  color: "hsl(160 10% 12%)",
  // Local light palette so Logo / muted text stay readable under .dark html
  ["--background"]: "150 10% 97%",
  ["--foreground"]: "160 10% 12%",
  ["--card"]: "0 0% 100%",
  ["--muted"]: "150 8% 94%",
  ["--muted-foreground"]: "160 6% 42%",
  ["--border"]: "160 8% 88%",
  ["--primary"]: "152 38% 34%",
  ["--primary-foreground"]: "0 0% 100%",
} as CSSProperties;

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <GuestGate>
      {/*
        Force light tokens on auth. Clerk’s footer falls back to near-black when
        the page is in .dark / prefers-color-scheme: dark with transparent bg.
      */}
      <div
        className="relative flex min-h-screen flex-col items-center justify-center px-5 py-14"
        style={authLightVars}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_at_top,hsl(152_38%_34%/0.08),transparent_70%)]" />

        <div className="relative w-full max-w-[400px]">
          <div className="mb-10 flex justify-center">
            <Logo />
          </div>
          {/*
            Do not use overflow-hidden — Clerk labels/actions sit slightly outside
            the field box and get clipped (e.g. “Password” → “assword”).
          */}
          <div className="kubera-clerk-shell rounded-2xl bg-white px-6 py-7 shadow-[0_0_0_0.5px_hsl(160_8%_88%)] sm:px-7 sm:py-8">
            {children}
          </div>
        </div>
      </div>
    </GuestGate>
  );
}
