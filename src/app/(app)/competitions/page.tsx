import type { Metadata } from "next";
import Link from "next/link";
import { Trophy } from "lucide-react";

import { Badge } from "@/components/badge";
import { Card, CardBody } from "@/components/card";
import { EmptyState } from "@/components/empty-state";
import { LeagueMarkBadge } from "@/components/league-mark";
import { PageHeading, PageShell } from "@/components/page-shell";
import { ConfidenceBadge } from "@/components/confidence-badge";
import { toParagraphs } from "@/lib/embeds";
import { getLeagues } from "@/lib/queries";

export const metadata: Metadata = { title: "Leagues" };

/**
 * The leagues index.
 *
 * Humanoid only. This page briefly carried Robowar (a human inside a mech) and
 * NHRL (wheeled combat) under their own headings, walled off from the
 * standings. They are gone: "every league" means every league of the sport this
 * site is about, and a reader who finds a piloted mech league in the index
 * learns that the scope is negotiable.
 *
 * The class filter stays as a guard rather than a feature — nothing
 * non-humanoid can reach this grid even if a row is added by hand.
 * `getLeagues()` additionally drops the exhibitions container, which is a row
 * in `competitions` and is not a league.
 */
export default async function CompetitionsPage() {
  const all = await getLeagues();
  const competitions = all.filter((c) => c.class === "humanoid");

  return (
    <PageShell>
      <PageHeading
        eyebrow="Humanoid robot fighting"
        title="The Leagues"
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
                  <div className="flex min-w-0 items-center gap-3">
                    <LeagueMarkBadge
                      slug={competition.slug}
                      name={competition.name}
                      logoUrl={competition.logoUrl}
                      size="md"
                    />
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
                        <p className="text-ink-dim mt-1 truncate text-xs">
                          {competition.organizer}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <Badge
                      variant={
                        competition.status === "active" ? "volt" : "outline"
                      }
                    >
                      {competition.status}
                    </Badge>
                    <ConfidenceBadge level={competition.confidence} showLabel={false} />
                  </div>
                </div>

                {competition.description ? (
                  // First paragraph only, clamped. Descriptions grew into
                  // multi-paragraph prose for the league detail page, and an
                  // index card that dumps all of it stops being an index.
                  <p className="text-ink-muted mt-4 line-clamp-3 text-sm">
                    {toParagraphs(competition.description)[0]}
                  </p>
                ) : null}

                <p className="text-ink-dim tabular mt-4 text-xs">
                  {[
                    competition.seasonYear ? `Season ${competition.seasonYear}` : null,
                    [competition.city, competition.country]
                      .filter(Boolean)
                      .join(", ") || null,
                    competition.foundedYear ? `Founded ${competition.foundedYear}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

    </PageShell>
  );
}
