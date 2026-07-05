"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuthActions } from "@convex-dev/auth/react";
import { FormError, FormField, Input } from "@/components/ui/form";
import { parseAuthError } from "@/lib/auth/errors";

type Step = "request" | { phone: string };

export function ForgotPasswordForm() {
  const { signIn } = useAuthActions();
  const [step, setStep] = useState<Step>("request");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [devHint, setDevHint] = useState<string | null>(null);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setDevHint(null);
    setLoading(true);
    try {
      await signIn("password", {
        flow: "reset",
        phone: phone.trim(),
      });
      setStep({ phone: phone.trim() });
      setDevHint(
        "If SMS is not configured, check the Convex dashboard logs for your OTP code.",
      );
    } catch (err) {
      setError(parseAuthError(err, "Could not send verification code."));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === "request") return;
    setError(null);
    setLoading(true);
    try {
      await signIn("password", {
        flow: "reset-verification",
        phone: step.phone,
        code: code.trim(),
        newPassword,
      });
    } catch (err) {
      setError(parseAuthError(err, "Invalid code or password."));
    } finally {
      setLoading(false);
    }
  };

  if (step !== "request") {
    return (
      <>
        <form onSubmit={handleReset} className="space-y-4">
          <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            We sent a 6-digit code to{" "}
            <span className="font-medium text-foreground">{step.phone}</span>
          </p>

          <FormField label="Verification code">
            <Input
              type="text"
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              required
              autoComplete="one-time-code"
              autoFocus
              maxLength={6}
            />
          </FormField>

          <FormField label="New password" hint="At least 8 characters">
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </FormField>

          {error && <FormError message={error} />}
          {devHint && !error && (
            <p className="text-xs text-muted-foreground">{devHint}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:brightness-[1.03] active:brightness-95 disabled:opacity-50"
          >
            {loading ? "Updating…" : "Reset password"}
          </button>
        </form>

        <div className="mt-5 flex flex-col items-center gap-2 text-sm text-muted-foreground">
          <button
            type="button"
            onClick={() => {
              setStep("request");
              setCode("");
              setNewPassword("");
              setError(null);
            }}
            className="font-medium text-primary hover:underline"
          >
            Use a different number
          </button>
          <Link href="/sign-in" className="hover:underline">
            Back to sign in
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <form onSubmit={handleRequestOtp} className="space-y-4">
        <FormField
          label="Phone number"
          hint="Enter the number linked to your account"
        >
          <Input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 98765 43210"
            required
            autoComplete="tel"
            autoFocus
          />
        </FormField>

        {error && <FormError message={error} />}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:brightness-[1.03] active:brightness-95 disabled:opacity-50"
        >
          {loading ? "Sending code…" : "Send verification code"}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        Remember your password?{" "}
        <Link href="/sign-in" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}
