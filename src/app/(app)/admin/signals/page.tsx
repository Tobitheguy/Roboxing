import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { Inbox } from "lucide-react";

import { SignalRow } from "@/components/admin/signal-row";
import { Card, CardBodyFlush, CardHeader } from "@/components/card";
import { EmptyState } from "@/components/empty-state";
import { PageHeading, PageShell } from "@/components/page-shell";
import { db } from "@/db";
import { signals, type Signal } from "@/db/schema";

export const metadata: Metadata = {
  title: "Signals",
  robots: { index: false, follow: false },
};

/**
 * Anything the classifier scored at or above this lands in Priority, whatever
 * language it came in. It is the rubric's own boundary: 70 is where "a result,
 * or substantive news about one of these leagues" starts, and below it is
 * hardware and adjacent industry noise.
 */
const PRIORITY_SCORE = 70;

/**
 * Best first, then newest. Unclassified rows sort last rather than first —
 * they carry no judgement, and putting them at the top would bury the scored
 * ones behind whatever the sweep happened to land most recently.
 *
 * Sorted here rather than in SQL on purpose. This is a hundred-odd rows a day,
 * so ordering in the query buys nothing measurable, and this file's own history
 * argues for it: a single-table drizzle query has bitten this codebase three
 * times with unqualified column references. Plain JavaScript cannot.
 */
function byRelevance(a: Signal, b: Signal): number {
  const scoreA = a.score ?? -1;
  const scoreB = b.score ?? -1;
  if (scoreA !== scoreB) return scoreB - scoreA;
  return b.createdAt.getTime() - a.createdAt.getTime();
}

/**
 * The morning inbox.
 *
 * Everything the watcher swept in overnight. Stage 2 scores it, so the page
 * leads with what the classifier thinks matters — across every language,
 * because a non-English fight result is the single most valuable thing this
 * feed can produce and burying it under a language heading would be exactly
 * backwards.
 *
 * Below that the language split survives, and still earns its place: the
 * English feed is what the audience is already reading, the other five are
 * what they CANNOT read — which is where this site's edge lives. A kept signal
 * is a lead for a post; a dismissed one is remembered so its URL never
 * resurfaces.
 */
export default async function SignalsPage() {
  const rows = await db
    .select()
    .from(signals)
    .where(eq(signals.status, "new"))
    .orderBy(desc(signals.createdAt))
    .limit(200);

  const sorted = [...rows].sort(byRelevance);
  const priority = sorted.filter((s) => (s.score ?? -1) >= PRIORITY_SCORE);
  const rest = sorted.filter((s) => (s.score ?? -1) < PRIORITY_SCORE);
  const chinese = rest.filter((s) => s.language === "zh");
  const english = rest.filter(
    (s) => s.language === "en" || s.language === null,
  );
  /*
   * Malay, Japanese, Korean, Arabic. This bucket exists because the split used
   * to be `zh` versus everything-else-is-English, and the moment the sweep
   * started running in six languages that heading became a lie — a Malay
   * result would have been filed under "English-language" and read as
   * something a reader could already get elsewhere, which is the exact
   * opposite of what it is.
   */
  const other = rest.filter(
    (s) => s.language !== null && s.language !== "zh" && s.language !== "en",
  );

  // Distinguishable states: nothing swept at all, versus swept but unscored.
  // The second one means the classifier is not running, and saying so here is
  // cheaper than noticing a month later that every row lost its chip.
  const unscored = rows.filter((s) => s.classifiedAt === null).length;

  return (
    <PageShell>
      <PageHeading
        eyebrow="Admin"
        title="Signals"
        description="What the watcher found, ranked by what it looks like. Keep what becomes coverage; dismiss the noise — dismissed URLs never resurface."
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
          {unscored > 0 ? (
            <p className="text-ink-dim text-xs">
              {unscored} of {rows.length} not yet scored — they sort last and
              carry no chip. The classifier picks them up on the next sweep; if
              the count keeps growing, check ANTHROPIC_API_KEY and the{" "}
              <code>classification</code> block in the cron response.
            </p>
          ) : null}

          {priority.length > 0 ? (
            <Card>
              <CardHeader
                title="Priority"
                action={
                  <span className="text-ink-dim text-xs">
                    {priority.length} — scored {PRIORITY_SCORE}+, every language
                  </span>
                }
              />
              <CardBodyFlush>
                <ul>
                  {priority.map((signal) => (
                    <SignalRow key={signal.id} signal={signal} showLanguage />
                  ))}
                </ul>
              </CardBodyFlush>
            </Card>
          ) : null}

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

          {other.length > 0 ? (
            <Card>
              <CardHeader
                title="Other languages"
                action={
                  <span className="text-ink-dim text-xs">
                    {other.length} — Malay, Japanese, Korean, Arabic
                  </span>
                }
              />
              <CardBodyFlush>
                <ul>
                  {other.map((signal) => (
                    <SignalRow key={signal.id} signal={signal} showLanguage />
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
