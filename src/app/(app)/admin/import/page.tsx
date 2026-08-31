import type { Metadata } from "next";

import { ImportPanel } from "@/components/admin/import-panel";
import { PageHeading, PageShell } from "@/components/page-shell";

export const metadata: Metadata = {
  title: "Import",
  robots: { index: false, follow: false },
};

export default function AdminImportPage() {
  return (
    <PageShell>
      <PageHeading
        eyebrow="Admin"
        title="Import"
        description="Turn an organizer's spreadsheet into a season. Nothing is written until you have seen exactly what would change."
      />
      <ImportPanel />
    </PageShell>
  );
}
