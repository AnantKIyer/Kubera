"use client";

import { useRef } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  InvestmentsSection,
  type InvestmentsSectionHandle,
} from "@/components/investments/investments-section";

export default function InvestmentsPage() {
  const sectionRef = useRef<InvestmentsSectionHandle>(null);

  return (
    <>
      <PageHeader
        title="Investments"
        description="Track SIP, mutual funds, stocks, gold, FD, RD, LIC, and crypto."
        action={
          <Button onClick={() => sectionRef.current?.openNew()}>
            <Plus size={16} /> Add investment
          </Button>
        }
      />

      <InvestmentsSection ref={sectionRef} />
    </>
  );
}
