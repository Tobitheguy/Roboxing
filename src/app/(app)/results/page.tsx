import type { Metadata } from "next";
import { Trophy } from "lucide-react";

import { BoutList } from "@/components/bout-row";
import { Card, CardBodyFlush, CardHeader } from "@/components/card";
import { CompetitionFilter } from "@/components/competition-filter";
import { EmptyState } from "@/components/empty-state";
import { PageHeading, PageShell } from "@/components/page-shell";
import { StatRow, StatTile } from "@/components/stat-tile";
import { getAllResults, getCompetitions } from "@/lib/queries";

export const metadata: Metadata = { title: "Results" };

export default async function ResultsPage(props: PageProps<"/results">) {
  const params = await props.searchParams;
  const raw = params.competition;
  const competition = Array.isArray(raw) ? raw[0] : raw;

  const [competitions, results] = await Promise.all([
    getCompetitions(),
    getAllResults(competition),
  ]);

  const finishes = results.filter(
    (b) => b.result?.method === "ko" || b.result?.method === "tko",
  ).length;
  const draws = results.filter((b) => b.result?.method === "draw").length;

  // Group by event so a night of fights reads as a night rather than a stream.
  const byEvent = new Map<number, typeof results>();
  for (const bout of results) {
    const list = byEvent.get(bout.event.id) ?? [];
    list.push(bout);
    byEvent.set(bout.event.id, list);
  }

  return (
    <PageShell>
      <PageHeading
        eyebrow="Completed"
        title="Results"
        description="Every finished bout, with winner, method, and round."
      />

      <CompetitionFilter
        competitions={competitions}
        active={competition}
        basePath="/results"
      />

      {results.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Trophy />}
            // The absence is explained, not just stated. The real reason
            // there are no rows is a fact about the SPORT — the leagues do
            // not publish complete fight cards yet — and saying so turns an
            // empty page from "this site is broken" into the site's core
            // promise stated at the exact moment a visitor tests it.
            title="No verified results yet"
            description={
              competition
                ? "This league has not published a complete, verifiable fight card yet. The day it does, the card is here."
                : "Not a gap in this site — a gap in the sport. No league has yet published complete fight cards we can verify, and we record nothing we cannot stand behind. The moment one does, its results appear here the same day."
            }
          />
        </Card>
      ) : (
        <>
          <StatRow className="mb-8">
            <StatTile label="Bouts" value={results.length} />
            <StatTile label="Finishes" value={finishes} emphasis />
            <StatTile label="Draws" value={draws} />
            <StatTile label="Events" value={byEvent.size} />
          </StatRow>

          <div className="space-y-6">
            {[...byEvent.values()].map((eventBouts) => {
              const event = eventBouts[0].event;
              return (
                <Card key={event.id}>
                  <CardHeader
                    title={eventBouts[0].competitionName}
                    action={
                      <span className="text-ink-dim tabular text-xs">
                        {eventBouts.length}{" "}
                        {eventBouts.length === 1 ? "bout" : "bouts"}
                      </span>
                    }
                  />
                  <CardBodyFlush>
                    <BoutList bouts={eventBouts} showEvent />
                  </CardBodyFlush>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </PageShell>
  );
}
