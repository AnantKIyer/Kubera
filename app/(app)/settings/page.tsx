"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Mail, Phone, AtSign, User as UserIcon } from "lucide-react";
import { useClerk } from "@clerk/nextjs";
import { PageHeader } from "@/components/page-header";
import { ProfileAvatarUpload } from "@/components/profile-avatar-upload";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormError, FormField, Input } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/misc";
import { getUserDisplayName } from "@/lib/user-display";
import { parseUserError } from "@/lib/errors";
import { AppearanceControl } from "@/components/theme-toggle";
import { AppIconCurrencyCard } from "@/components/pwa/app-icon-currency-card";
import { InstallAppCard } from "@/components/pwa/install-app-card";

export default function SettingsPage() {
  const user = useQuery(api.users.me);
  const updateProfile = useMutation(api.users.updateProfile);
  const updateUsername = useMutation(api.users.updateUsername);
  const { openUserProfile } = useClerk();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [usernameSaved, setUsernameSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [usernameLoading, setUsernameLoading] = useState(false);

  const usernameAvailability = useQuery(
    api.authHelpers.checkFieldAvailable,
    username.trim().length >= 3
      ? { field: "username" as const, value: username }
      : "skip",
  );

  useEffect(() => {
    if (user?.name) setName(user.name);
  }, [user?.name]);

  useEffect(() => {
    if (user?.username) setUsername(user.username);
  }, [user?.username]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setLoading(true);
    try {
      await updateProfile({ name: name.trim() });
      setSaved(true);
    } catch (err) {
      setError(parseUserError(err, "We couldn't update your profile. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const handleUsernameSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setUsernameError(null);
    setUsernameSaved(false);
    setUsernameLoading(true);
    try {
      await updateUsername({ username: username.trim() });
      setUsernameSaved(true);
    } catch (err) {
      setUsernameError(
        parseUserError(err, "We couldn't update your username. Please try again."),
      );
    } finally {
      setUsernameLoading(false);
    }
  };

  if (user === undefined) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (user === null) return null;

  const displayName = getUserDisplayName(user.name, user.username, user.email);
  const usernameUnchanged =
    username.trim().toLowerCase() === (user.username ?? "").toLowerCase();
  const usernameHint =
    !usernameUnchanged &&
    username.trim().length >= 3 &&
    usernameAvailability &&
    "available" in usernameAvailability &&
    !usernameAvailability.available
      ? usernameAvailability.reason === "invalid"
        ? "Use 3–24 letters, numbers, or underscores."
        : "That username is taken."
      : null;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Account"
        description="Your profile, photo, and security settings"
      />

      <div className="grid max-w-2xl gap-6">
        <InstallAppCard />

        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>
              Defaults to your system setting. Override only if you prefer a fixed look.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AppearanceControl />
          </CardContent>
        </Card>

        <AppIconCurrencyCard homeCurrency={user.homeCurrency} />

        {!user.username && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground">
            Set a username below so others can find you in group invites.
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Profile photo</CardTitle>
            <CardDescription>
              Shown in the sidebar and on your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileAvatarUpload
              name={user.name}
              username={user.username}
              imageUrl={user.imageUrl}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <UserAvatar
                name={user.name}
                username={user.username}
                imageUrl={user.imageUrl}
                size="lg"
              />
              <div>
                <CardTitle>{displayName}</CardTitle>
                <CardDescription>
                  {user.username ? `@${user.username}` : user.email ?? "Signed in"}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <FormField label="Display name">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  required
                  autoComplete="name"
                />
              </FormField>

              {error && (
                <FormError
                  title="Profile not updated"
                  message={error}
                  onDismiss={() => setError(null)}
                />
              )}
              {saved && (
                <p className="text-sm text-income">Profile saved successfully.</p>
              )}

              <Button type="submit" disabled={loading}>
                {loading ? "Saving…" : "Save changes"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Username</CardTitle>
            <CardDescription>
              Used inside Kubera for groups and display — not your Clerk sign-in.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUsernameSave} className="space-y-4">
              <FormField label="Username">
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    @
                  </span>
                  <Input
                    className="pl-7"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      setUsernameSaved(false);
                    }}
                    placeholder="your_name"
                    autoComplete="username"
                    minLength={3}
                    maxLength={24}
                    required
                  />
                </div>
                {usernameHint && (
                  <p className="mt-1.5 text-xs text-expense">{usernameHint}</p>
                )}
              </FormField>

              {usernameError && (
                <FormError
                  title="Username not updated"
                  message={usernameError}
                  onDismiss={() => setUsernameError(null)}
                />
              )}
              {usernameSaved && (
                <p className="text-sm text-income">Username saved.</p>
              )}

              <Button
                type="submit"
                disabled={
                  usernameLoading ||
                  !username.trim() ||
                  Boolean(usernameHint) ||
                  usernameUnchanged
                }
              >
                {usernameLoading ? "Saving…" : "Save username"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sign-in details</CardTitle>
            <CardDescription>
              Managed by Clerk. Email and phone come from your Clerk account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {user.username && (
              <DetailRow icon={AtSign} label="Username" value={`@${user.username}`} />
            )}
            {user.email && (
              <DetailRow icon={Mail} label="Email" value={user.email} />
            )}
            {user.phone && (
              <DetailRow icon={Phone} label="Phone" value={user.phone} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
            <CardDescription>
              Password, email, and MFA are managed in your Clerk account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button type="button" variant="outline" onClick={() => openUserProfile()}>
              Manage account &amp; password
            </Button>
            <p className="text-sm text-muted-foreground">
              Forgot your password? Use{" "}
              <a href="/sign-in" className="font-medium text-primary hover:underline">
                Sign in
              </a>{" "}
              and choose Clerk&apos;s reset flow (email by default).
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UserIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-[12px] bg-muted/45 px-3.5 py-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-card text-muted-foreground">
        <Icon size={16} strokeWidth={1.75} />
      </div>
      <div className="min-w-0">
        <p className="text-[12px] font-medium text-muted-foreground">{label}</p>
        <p className="truncate text-[15px] font-medium tracking-tight">{value}</p>
      </div>
    </div>
  );
}
