import { GuestGate } from "@/components/auth-gate";
import { Logo } from "@/components/layout/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <GuestGate>
      <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-12">
        {/* Ambient glow orbs */}
        <div className="pointer-events-none absolute -left-32 top-20 h-96 w-96 rounded-full bg-primary/[0.06] blur-3xl" />
        <div className="pointer-events-none absolute -right-24 bottom-16 h-80 w-80 rounded-full bg-accent/[0.08] blur-3xl" />

        <div className="relative w-full max-w-[400px] animate-fade-in">
          <div className="mb-8 flex justify-center">
            <Logo />
          </div>
          <div className="rounded-2xl border border-border/50 bg-card/80 p-7 shadow-soft backdrop-blur-sm sm:p-8">
            {children}
          </div>
        </div>
      </div>
    </GuestGate>
  );
}
