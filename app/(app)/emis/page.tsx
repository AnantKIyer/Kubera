import { Suspense } from "react";
import EmisRedirect from "./emis-redirect";

export default function EmisPage() {
  return (
    <Suspense fallback={null}>
      <EmisRedirect />
    </Suspense>
  );
}
