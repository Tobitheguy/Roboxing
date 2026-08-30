import type { Metadata } from "next";

import { NotBuiltYet } from "@/components/not-built-yet";
import { PageHeading, PageShell } from "@/components/page-shell";

export const metadata: Metadata = { title: "Watch" };

export default function WatchIndexPage() {
  return (
    <PageShell>
      <PageHeading
        eyebrow="Broadcast"
        title="Watch"
        description="Live events play here, and the recording stays at the same address afterward."
      />
      <NotBuiltYet page="Watch" step="step 4, with the Roboxing player" />
    </PageShell>
  );
}
