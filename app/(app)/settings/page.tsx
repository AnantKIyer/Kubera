"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Mail, Phone, AtSign, User as UserIcon } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ChangePasswordForm } from "@/components/change-password-form";
import { ProfileAvatarUpload } from "@/components/profile-avatar-upload";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormError, FormField, Input } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/misc";
import { getUserDisplayName } from "@/lib/user-display";
import { parseUserError } from "@/lib/errors";
import { AppIconCurrencyCard } from "@/components/pwa/app-icon-currency-card";
import { InstallAppCard } from "@/components/pwa/install-app-card";

export default function SettingsPage() {
  const user = useQuery(api.users.me);
  const updateProfile = useMutation(api.users.updateProfile);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.name) setName(user.name);
  }, [user?.name]);

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

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Account"
        description="Your profile, photo, and security settings"
      />

      <div className="grid max-w-2xl gap-6">
        <InstallAppCard />

        <AppIconCurrencyCard homeCurrency={user.homeCurrency} />

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
            <CardTitle>Sign-in details</CardTitle>
            <CardDescription>
              Used to sign in. Contact support to change username, email, or phone.
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
            <CardTitle>Password</CardTitle>
            <CardDescription>
              Change your password while signed in
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChangePasswordForm />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Forgot password?</CardTitle>
            <CardDescription>
              If you can&apos;t remember your current password
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Sign out and use{" "}
              <a href="/forgot-password" className="font-medium text-primary hover:underline">
                forgot password
              </a>{" "}
              to reset via OTP on your registered phone number.
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
    <div className="flex items-center gap-3 rounded-xl bg-muted/30 px-3.5 py-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-background text-muted-foreground">
        <Icon size={16} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {label}
        </p>
        <p className="truncate text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}
