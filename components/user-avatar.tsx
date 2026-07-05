"use client";

import { User } from "lucide-react";
import { getUserInitials } from "@/lib/user-display";
import { cn } from "@/lib/utils";

export function UserAvatar({
  name,
  username,
  imageUrl,
  size = "md",
  className,
}: {
  name?: string | null;
  username?: string | null;
  imageUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const initials = getUserInitials(name, username);
  const sizeClass =
    size === "sm"
      ? "h-8 w-8 text-xs"
      : size === "lg"
        ? "h-14 w-14 text-lg"
        : "h-9 w-9 text-sm";

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt=""
        className={cn("shrink-0 rounded-full object-cover", sizeClass, className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-primary/12 font-semibold text-primary",
        sizeClass,
        className,
      )}
    >
      {initials === "?" ? <User size={size === "lg" ? 22 : 16} /> : initials}
    </div>
  );
}
