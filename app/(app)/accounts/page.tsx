import { Suspense } from "react";
import { Skeleton } from "@/components/ui/misc";
import AccountsPageContent from "./accounts-content";

export default function AccountsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-48" />
        </div>
      }
    >
      <AccountsPageContent />
    </Suspense>
  );
}
