import type { Metadata } from "next";

import { NotBuiltYet } from "@/components/not-built-yet";
import { PageHeading, PageShell } from "@/components/page-shell";

export const metadata: Metadata = { title: "Schedule" };

export default function SchedulePage() {
  return (
    <PageShell>
      <PageHeading
        eyebrow="Upcoming"
        title="Schedule"
        description="Every scheduled event, in your timezone and the venue's."
      />
      <NotBuiltYet page="Schedule" step="step 3" />
    </PageShell>
  );
}
