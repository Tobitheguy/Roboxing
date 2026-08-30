import type { Metadata } from "next";
import Link from "next/link";
import { Trophy } from "lucide-react";

import { Badge } from "@/components/badge";
import { Card, CardBody } from "@/components/card";
import { EmptyState } from "@/components/empty-state";
import { PageHeading, PageShell } from "@/components/page-shell";
import { getCompetitions } from "@/lib/queries";

export const metadata: Metadata = { title: "Competitions" };

export default async function CompetitionsPage() {
  const competitions = await getCompetitions();

  return (
    <PageShell>
      <PageHeading
        eyebrow="Leagues"
        title="Competitions"
        description="Seasons, standings, and full fixture lists."
      />

      {competitions.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Trophy />}
            title="No competitions yet"
            description="Once a season is loaded it appears here with its table and fixtures."
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {competitions.map((competition) => (
            <Card key={competition.id} className="hover:border-line-strong transition-colors">
              <CardBody>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="font-display text-title text-ink uppercase">
                      <Link
                        href={`/competitions/${competition.slug}`}
                        className="hover:text-volt transition-colors"
                      >
                        {competition.name}
                      </Link>
                    </h2>
                    {competition.organizer ? (
                      <p className="text-ink-dim mt-1 text-xs">
                        {competition.organizer}
                      </p>
                    ) : null}
                  </div>
                  <Badge
                    variant={
                      competition.status === "active" ? "volt" : "outline"
                    }
                  >
                    {competition.status}
                  </Badge>
                </div>

                {competition.description ? (
                  <p className="text-ink-muted mt-4 text-sm">
                    {competition.description}
                  </p>
                ) : null}

                {competition.seasonYear ? (
                  <p className="text-ink-dim tabular mt-4 text-xs">
                    Season {competition.seasonYear}
                  </p>
                ) : null}
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </PageShell>
  );
}
