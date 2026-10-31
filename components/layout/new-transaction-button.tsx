"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { TransactionForm } from "@/components/transaction-form";
import { showsNewTransactionButton } from "@/lib/nav";

/** Phone-only primary action, docked above the trailing edge of the tab bar. */
export function NewTransactionButton() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  if (!showsNewTransactionButton(pathname)) return null;

  return (
    <>
      <div className="new-transaction-position pointer-events-none fixed inset-x-3 z-30 mx-auto flex max-w-md justify-end transition-[bottom] duration-300 ease-out motion-reduce:transition-none lg:hidden">
        <button
          type="button"
          aria-label="New transaction"
          aria-haspopup="dialog"
          onClick={() => setOpen(true)}
          className="pointer-events-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-tab-bar transition-transform duration-150 ease-spring active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
        >
          <Plus size={26} strokeWidth={2.25} aria-hidden />
        </button>
      </div>
      <TransactionForm open={open} onClose={() => setOpen(false)} initialType="expense" />
    </>
  );
}
