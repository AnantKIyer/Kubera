"use client";

import { SignIn } from "@clerk/nextjs";
import { kuberaClerkAppearance } from "@/lib/clerk-appearance";

export default function SignInPage() {
  return (
    <>
      <div className="mb-6 text-center">
        <h1 className="text-[22px] font-semibold tracking-tight text-foreground">
          Welcome back
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
          Your balances, spending, and goals stay private — sign in to pick up
          where you left off.
        </p>
      </div>
      <ul className="mb-7 space-y-2 rounded-xl bg-muted/40 px-4 py-3.5 text-left text-[13px] leading-snug text-muted-foreground">
        <li className="flex gap-2">
          <span className="font-medium text-foreground" aria-hidden>
            ·
          </span>
          See income and expenses with clear +/− signs, not color alone
        </li>
        <li className="flex gap-2">
          <span className="font-medium text-foreground" aria-hidden>
            ·
          </span>
          Track accounts, EMIs, and subscriptions in one calm place
        </li>
        <li className="flex gap-2">
          <span className="font-medium text-foreground" aria-hidden>
            ·
          </span>
          Share groups securely with people you invite
        </li>
      </ul>
      <SignIn
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        fallbackRedirectUrl="/"
        forceRedirectUrl="/"
        appearance={kuberaClerkAppearance}
      />
    </>
  );
}
