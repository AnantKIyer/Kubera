"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import { FormError, FormField, Input } from "@/components/ui/form";
import { parseAuthError } from "@/lib/auth/errors";
import { isValidUsername, normalizeUsername } from "@/lib/auth/normalize";
import { cn } from "@/lib/utils";

export function SignUpForm() {
  const { signIn } = useAuthActions();
  const convex = useConvex();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [debouncedUsername, setDebouncedUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [usernameAvailability, setUsernameAvailability] = useState<{
    available: boolean;
  } | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedUsername(username.trim()), 400);
    return () => clearTimeout(timer);
  }, [username]);

  const normalizedUsername = normalizeUsername(debouncedUsername);
  const shouldCheckUsername =
    debouncedUsername.length > 0 && isValidUsername(normalizedUsername);

  useEffect(() => {
    if (!shouldCheckUsername) {
      setUsernameAvailability(null);
      setCheckingUsername(false);
      return;
    }

    let cancelled = false;
    setCheckingUsername(true);

    convex
      .query(api.authHelpers.checkFieldAvailable, {
        field: "username",
        value: normalizedUsername,
      })
      .then((result) => {
        if (!cancelled) setUsernameAvailability(result);
      })
      .catch(() => {
        // Backend may be out of sync during dev — server still validates on submit
        if (!cancelled) setUsernameAvailability(null);
      })
      .finally(() => {
        if (!cancelled) setCheckingUsername(false);
      });

    return () => {
      cancelled = true;
    };
  }, [convex, normalizedUsername, shouldCheckUsername]);

  const usernameTaken =
    shouldCheckUsername && usernameAvailability?.available === false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isValidUsername(normalizeUsername(username))) {
      setError("Username must be 3–24 characters (letters, numbers, underscore).");
      return;
    }

    if (usernameTaken) {
      setError("This username already exists.");
      return;
    }

    setLoading(true);
    try {
      await signIn("password", {
        flow: "signUp",
        name: name.trim(),
        username: username.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
      });
    } catch (err) {
      setError(parseAuthError(err, "Could not create account. Please check your details."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Full name">
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Anant Kumar"
            required
            autoComplete="name"
            autoFocus
          />
        </FormField>

        <FormField label="Username" hint="Letters, numbers, underscore only">
          <Input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="anant_k"
            required
            autoComplete="username"
            minLength={3}
            maxLength={24}
            className={cn(usernameTaken && "border-expense/50 focus:ring-expense/30")}
          />
          {shouldCheckUsername && checkingUsername && (
            <p className="mt-1.5 text-xs text-muted-foreground">Checking availability…</p>
          )}
          {usernameTaken && (
            <p className="mt-1.5 text-xs text-expense">This username already exists.</p>
          )}
          {shouldCheckUsername && usernameAvailability?.available === true && (
            <p className="mt-1.5 text-xs text-income">Username is available</p>
          )}
        </FormField>

        <FormField label="Email">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
          />
        </FormField>

        <FormField label="Phone number" hint="Include country code, e.g. +91 98765 43210">
          <Input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 98765 43210"
            required
            autoComplete="tel"
          />
        </FormField>

        <FormField label="Password" hint="At least 8 characters">
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            minLength={8}
            autoComplete="new-password"
          />
        </FormField>

        {error && <FormError message={error} />}

        <button
          type="submit"
          disabled={loading || usernameTaken}
          className="mt-2 w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:brightness-[1.03] active:brightness-95 disabled:opacity-50"
        >
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}
