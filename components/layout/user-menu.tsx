"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useConvex } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { LogOut, Settings } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { UserAvatar } from "@/components/user-avatar";
import { getUserDisplayName } from "@/lib/user-display";
import { cn } from "@/lib/utils";

type UserProfile = {
  _id: string;
  name: string | null;
  username: string | null;
  email: string | null;
  phone: string | null;
  imageUrl: string | null;
};

function useCurrentUser() {
  const convex = useConvex();
  const [user, setUser] = useState<UserProfile | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    setUser(undefined);

    convex
      .query(api.users.me)
      .then((result) => {
        if (!cancelled) setUser(result);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      });

    return () => {
      cancelled = true;
    };
  }, [convex]);

  return user;
}

export function UserMenu({ compact = false }: { compact?: boolean }) {
  const user = useCurrentUser();
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAuthActions();

  const handleSignOut = async () => {
    await signOut();
    router.replace("/sign-in");
  };

  const displayName = getUserDisplayName(user?.name, user?.username, user?.email);
  const settingsActive = pathname === "/settings";

  if (user === undefined) {
    return (
      <div className="animate-pulse rounded-xl bg-muted/40 px-3 py-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-muted" />
          {!compact && <div className="h-4 flex-1 rounded bg-muted" />}
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <Link
        href="/settings"
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-full transition-colors",
          settingsActive
            ? "bg-primary/12 text-primary"
            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
        )}
        aria-label="Account settings"
      >
        <UserAvatar
          name={user?.name}
          username={user?.username}
          imageUrl={user?.imageUrl}
          size="sm"
        />
      </Link>
    );
  }

  return (
    <div className="space-y-2">
      <Link
        href="/settings"
        className={cn(
          "flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors",
          settingsActive
            ? "bg-primary/10 text-primary"
            : "hover:bg-muted/60",
        )}
      >
        <UserAvatar
          name={user?.name}
          username={user?.username}
          imageUrl={user?.imageUrl}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {user ? displayName : "Account"}
          </p>
          {user?.username && (
            <p className="truncate text-xs text-muted-foreground">@{user.username}</p>
          )}
        </div>
        <Settings size={16} className="shrink-0 opacity-50" />
      </Link>

      <button
        onClick={handleSignOut}
        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
      >
        <LogOut size={16} />
        Sign out
      </button>
    </div>
  );
}
