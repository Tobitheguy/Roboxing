import type { Metadata } from "next";

import { NotBuiltYet } from "@/components/not-built-yet";
import { PageHeading, PageShell } from "@/components/page-shell";

export const metadata: Metadata = { title: "Teams" };

export default function TeamsPage() {
  return (
    <PageShell>
      <PageHeading
        eyebrow="Competitors"
        title="Teams"
        description="The organisations that build and field the robots."
      />
      <NotBuiltYet page="Teams" step="step 3" />
    </PageShell>
  );
}
