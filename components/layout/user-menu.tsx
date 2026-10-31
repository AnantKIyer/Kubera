"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { LogOut, Settings } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { UserAvatar } from "@/components/user-avatar";
import { getUserDisplayName } from "@/lib/user-display";
import { cn } from "@/lib/utils";

export function UserMenu({ compact = false }: { compact?: boolean }) {
  const user = useQuery(api.users.me);
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useClerk();

  const handleSignOut = async () => {
    await signOut({ redirectUrl: "/sign-in" });
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
          "inline-flex min-h-11 min-w-11 items-center justify-center rounded-full transition-colors",
          settingsActive
            ? "bg-primary/12 text-accent-foreground"
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
          "flex min-h-11 items-center gap-3 rounded-[12px] px-3 py-2.5 transition-colors",
          settingsActive
            ? "bg-primary/12 text-accent-foreground"
            : "hover:bg-muted/70",
        )}
      >
        <UserAvatar
          name={user?.name}
          username={user?.username}
          imageUrl={user?.imageUrl}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-medium tracking-tight text-foreground">
            {user ? displayName : "Account"}
          </p>
          {user?.username && (
            <p className="truncate text-[12px] text-muted-foreground">@{user.username}</p>
          )}
        </div>
        <Settings size={16} strokeWidth={1.75} className="shrink-0 opacity-40" />
      </Link>

      <button
        type="button"
        onClick={handleSignOut}
        className="flex min-h-11 w-full items-center gap-2.5 rounded-[12px] px-3 py-2.5 text-[15px] font-medium text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
      >
        <LogOut size={16} aria-hidden />
        Sign out
      </button>
    </div>
  );
}
