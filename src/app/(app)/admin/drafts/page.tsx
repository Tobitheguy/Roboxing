import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { FilePlus2 } from "lucide-react";

import { DraftRow } from "@/components/admin/draft-row";
import { Card, CardBodyFlush, CardHeader } from "@/components/card";
import { EmptyState } from "@/components/empty-state";
import { PageHeading, PageShell } from "@/components/page-shell";
import { db } from "@/db";
import { recordDrafts } from "@/db/schema";

export const metadata: Metadata = {
  title: "Record drafts",
  robots: { index: false, follow: false },
};

/**
 * Stage 4's queue: leagues and events the watcher believes exist.
 *
 * This page is the gate. Everything on it was written by a model reading one
 * article, and nothing on it is visible anywhere else on the site until
 * somebody presses Apply — which is the only reason it is safe for the cron to
 * propose leagues at all.
 *
 * The recently-applied list below the queue is not decoration. A row that
 * appeared on /competitions without a person typing it should be traceable to
 * the article it came from, months later, and this is where that trail lives.
 */
export default async function DraftsPage() {
  const pending = await db
    .select()
    .from(recordDrafts)
    .where(eq(recordDrafts.status, "pending"))
    .orderBy(desc(recordDrafts.createdAt))
    .limit(50);

  const applied = await db
    .select()
    .from(recordDrafts)
    .where(eq(recordDrafts.status, "applied"))
    .orderBy(desc(recordDrafts.reviewedAt))
    .limit(10);

  return (
    <PageShell>
      <PageHeading
        eyebrow="Admin"
        title="Record drafts"
        description="Leagues and events the morning sweep proposed from a source article. Nothing here is public. Apply writes the row at reported confidence or lower; dismiss says it is not one."
      />

      {pending.length === 0 ? (
        <Card>
          <EmptyState
            icon={<FilePlus2 />}
            title="Nothing proposed"
            description="Stage 4 drafts a row when a signal scores 75+ and the classifier calls it a league or an event. Most mornings there is nothing — a quiet queue is the system working."
          />
        </Card>
      ) : (
        <Card>
          <CardHeader
            title="Awaiting review"
            action={
              <span className="text-ink-dim text-xs">
                {pending.length} — none of it is on the site yet
              </span>
            }
          />
          <CardBodyFlush>
            <ul>
              {pending.map((draft) => (
                <DraftRow key={draft.id} draft={draft} />
              ))}
            </ul>
          </CardBodyFlush>
        </Card>
      )}

      {applied.length > 0 ? (
        <Card className="mt-6">
          <CardHeader
            title="Applied"
            action={
              <span className="text-ink-dim text-xs">
                what the machine put on the site
              </span>
            }
          />
          <CardBodyFlush>
            <ul className="divide-line/60 divide-y">
              {applied.map((draft) => (
                <li key={draft.id} className="px-4 py-3 text-sm sm:px-6">
                  <span className="text-ink">{draft.appliedSlug}</span>{" "}
                  <span className="eyebrow">{draft.kind}</span>
                  <a
                    href={draft.sourceUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-ink-dim hover:text-volt ml-2 text-xs"
                  >
                    source
                  </a>
                </li>
              ))}
            </ul>
          </CardBodyFlush>
        </Card>
      ) : null}
    </PageShell>
  );
}
