"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { MoreHorizontal } from "lucide-react";
import {
  MOBILE_MORE_NAV,
  MOBILE_PRIMARY_NAV,
  NAV_ITEMS,
  isNavActive as isActive,
} from "@/lib/nav";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { UserMenu } from "./user-menu";
import { MobileMoreSheet } from "./mobile-more-sheet";

function isMoreActive(pathname: string) {
  return (
    pathname === "/settings" ||
    MOBILE_MORE_NAV.some((item) => isActive(pathname, item.href))
  );
}

const tabClassName =
  "flex min-h-[3.25rem] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 overflow-hidden rounded-[18px] px-0.5 text-caption font-medium transition-colors duration-200 motion-reduce:transition-none";

function tabStateClassName(active: boolean) {
  return active
    ? "bg-primary/12 text-accent-foreground"
    : "text-muted-foreground active:bg-muted/70";
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[260px] flex-col border-r border-border/60 glass lg:flex">
      <div className="flex h-[60px] items-center px-5">
        <Logo compact />
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-[12px] px-3 py-2.5 text-[15px] font-medium tracking-tight transition-colors duration-200",
                active
                  ? "bg-primary/12 text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
              )}
            >
              <Icon
                size={18}
                strokeWidth={active ? 2.25 : 1.75}
                className="shrink-0"
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border/50 p-3">
        <UserMenu />
      </div>
    </aside>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = isMoreActive(pathname);

  return (
    <>
      <nav
        aria-label="Primary"
        className="tab-bar-position fixed inset-x-3 z-30 mx-auto max-w-md rounded-[24px] glass shadow-tab-bar lg:hidden"
      >
        <div className="flex gap-0.5 p-1">
          {MOBILE_PRIMARY_NAV.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(tabClassName, tabStateClassName(active))}
              >
                <Icon size={22} strokeWidth={active ? 2.25 : 1.75} aria-hidden />
                <span className="block w-full min-w-0 truncate text-center">
                  {item.shortLabel ?? item.label}
                </span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={cn(tabClassName, tabStateClassName(moreActive))}
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
          >
            <MoreHorizontal size={22} strokeWidth={moreActive ? 2.25 : 1.75} aria-hidden />
            <span className="block w-full min-w-0 truncate text-center">More</span>
          </button>
        </div>
      </nav>
      <MobileMoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
    </>
  );
}

export function MobileHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-border/50 glass pt-safe lg:hidden">
      <div className="flex h-12 items-center justify-between px-4">
        <Logo compact />
        <UserMenu compact />
      </div>
    </header>
  );
}
