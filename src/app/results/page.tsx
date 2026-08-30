import type { Metadata } from "next";

import { NotBuiltYet } from "@/components/not-built-yet";
import { PageHeading, PageShell } from "@/components/page-shell";

export const metadata: Metadata = { title: "Results" };

export default function ResultsPage() {
  return (
    <PageShell>
      <PageHeading
        eyebrow="Completed"
        title="Results"
        description="Every finished bout, with winner, method, and round."
      />
      <NotBuiltYet page="Results" step="step 3" />
    </PageShell>
  );
}
