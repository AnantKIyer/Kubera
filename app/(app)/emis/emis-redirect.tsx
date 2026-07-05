"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function EmisRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const q = searchParams.toString();
    router.replace(q ? `/accounts?tab=loans&${q}` : "/accounts?tab=loans");
  }, [router, searchParams]);

  return null;
}
