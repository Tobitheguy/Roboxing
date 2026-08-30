import type { Metadata } from "next";

import { NotBuiltYet } from "@/components/not-built-yet";
import { PageHeading, PageShell } from "@/components/page-shell";

export const metadata: Metadata = { title: "Competitions" };

export default function CompetitionsPage() {
  return (
    <PageShell>
      <PageHeading
        eyebrow="Leagues"
        title="Competitions"
        description="Seasons, standings, and full fixture lists."
      />
      <NotBuiltYet page="Competitions" step="step 3" />
    </PageShell>
  );
}
