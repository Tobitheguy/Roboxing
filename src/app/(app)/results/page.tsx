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
            title="No results recorded"
            description={
              competition
                ? "This competition has no completed bouts yet."
                : "Completed bouts appear here as soon as results are entered."
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
