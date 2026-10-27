"use client";

import { SignUp } from "@clerk/nextjs";
import { kuberaClerkAppearance } from "@/lib/clerk-appearance";

export default function SignUpPage() {
  return (
    <>
      <div className="mb-6 text-center">
        <h1 className="text-[22px] font-semibold tracking-tight text-foreground">
          Start with Kubera
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
          A calm money home for balances, spending, and goals — free to create
          an account.
        </p>
      </div>
      <ul className="mb-7 space-y-2 rounded-xl bg-muted/40 px-4 py-3.5 text-left text-[13px] leading-snug text-muted-foreground">
        <li className="flex gap-2">
          <span className="font-medium text-foreground" aria-hidden>
            ·
          </span>
          Log income and expenses in seconds
        </li>
        <li className="flex gap-2">
          <span className="font-medium text-foreground" aria-hidden>
            ·
          </span>
          Understand cash flow without spreadsheet noise
        </li>
        <li className="flex gap-2">
          <span className="font-medium text-foreground" aria-hidden>
            ·
          </span>
          Your data stays behind your account
        </li>
      </ul>
      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        fallbackRedirectUrl="/"
        forceRedirectUrl="/"
        appearance={kuberaClerkAppearance}
      />
    </>
  );
}
