import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { Inbox } from "lucide-react";

import { SignalRow } from "@/components/admin/signal-row";
import { Card, CardBodyFlush, CardHeader } from "@/components/card";
import { EmptyState } from "@/components/empty-state";
import { PageHeading, PageShell } from "@/components/page-shell";
import { db } from "@/db";
import { signals } from "@/db/schema";

export const metadata: Metadata = {
  title: "Signals",
  robots: { index: false, follow: false },
};

/**
 * The morning inbox.
 *
 * Everything the watcher swept in overnight, newest first, split by language
 * because the two sweeps serve different jobs: the English feed is what the
 * audience is already reading, the Chinese feed is what they CANNOT read —
 * which is where this site's edge lives. A kept signal is a lead for a post;
 * a dismissed one is remembered so its URL never resurfaces.
 */
export default async function SignalsPage() {
  const rows = await db
    .select()
    .from(signals)
    .where(eq(signals.status, "new"))
    .orderBy(desc(signals.createdAt))
    .limit(100);

  const chinese = rows.filter((s) => s.language === "zh");
  const english = rows.filter((s) => s.language !== "zh");

  return (
    <PageShell>
      <PageHeading
        eyebrow="Admin"
        title="Signals"
        description="What the watcher found. Keep what becomes coverage; dismiss the noise — dismissed URLs never resurface."
      />

      {rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Inbox />}
            title="Inbox zero"
            description="The sweep runs every morning at 05:30 UTC. Trigger one by hand: GET /api/cron/signals."
          />
        </Card>
      ) : (
        <div className="space-y-6">
          {chinese.length > 0 ? (
            <Card>
              <CardHeader
                title="Chinese-language"
                action={
                  <span className="text-ink-dim text-xs">
                    {chinese.length} — the ones nobody else will translate
                  </span>
                }
              />
              <CardBodyFlush>
                <ul>
                  {chinese.map((signal) => (
                    <SignalRow key={signal.id} signal={signal} />
                  ))}
                </ul>
              </CardBodyFlush>
            </Card>
          ) : null}

          {english.length > 0 ? (
            <Card>
              <CardHeader
                title="English-language"
                action={
                  <span className="text-ink-dim text-xs">{english.length}</span>
                }
              />
              <CardBodyFlush>
                <ul>
                  {english.map((signal) => (
                    <SignalRow key={signal.id} signal={signal} />
                  ))}
                </ul>
              </CardBodyFlush>
            </Card>
          ) : null}
        </div>
      )}
    </PageShell>
  );
}
