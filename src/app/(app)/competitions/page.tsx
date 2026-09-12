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
 * The leagues index, grouped by class.
 *
 * "Every league" is the site's claim, and honouring it means carrying things
 * that are not the same sport: Robowar puts a human inside a nine-foot mech,
 * NHRL is wheeled destructive combat. Both belong here — they are where this
 * audience already is — and neither can sit in an undifferentiated grid with
 * URKL, because a reader scanning cards will not check a class field.
 *
 * So: humanoid first and unqualified, then the others under headings that say
 * plainly what they are. `getLeagues()` also drops the exhibitions container,
 * which is a row in `competitions` and is not a league.
 */
export default async function CompetitionsPage() {
  const all = await getLeagues();
  const competitions = all.filter((c) => c.class === "humanoid");
  const mechs = all.filter((c) => c.class === "piloted_mech");
  const adjacent = all.filter((c) => c.class === "adjacent");

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

      {/* Related, and deliberately not mixed in above. */}
      {mechs.length > 0 ? (
        <OtherClass
          title="Piloted mech"
          blurb="A human inside the machine rather than driving it from outside. Spectacular, adjacent, and kept out of humanoid standings for the same reason a heavyweight does not appear in a flyweight table."
          rows={mechs}
        />
      ) : null}

      {adjacent.length > 0 ? (
        <OtherClass
          title="Adjacent: wheeled combat"
          blurb="Not humanoid fighting at all. Carried because it is where most of this audience already is, and because the broadcast listings are genuinely useful. Nothing here reaches a humanoid standings table."
          rows={adjacent}
        />
      ) : null}
    </PageShell>
  );
}

function OtherClass({
  title,
  blurb,
  rows,
}: {
  title: string;
  blurb: string;
  rows: Awaited<ReturnType<typeof getLeagues>>;
}) {
  return (
    <div className="mt-12">
      <h2 className="font-display text-title text-ink uppercase">{title}</h2>
      <p className="text-ink-muted mt-2 mb-5 max-w-2xl text-sm leading-relaxed">
        {blurb}
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {rows.map((competition) => (
          <Card key={competition.id}>
            <CardBody>
              <div className="flex items-start justify-between gap-4">
                <h3 className="font-display text-ink text-sm font-semibold uppercase">
                  <Link
                    href={`/competitions/${competition.slug}`}
                    className="hover:text-volt transition-colors"
                  >
                    {competition.name}
                  </Link>
                </h3>
                <ConfidenceBadge level={competition.confidence} showLabel={false} />
              </div>
              {competition.description ? (
                <p className="text-ink-muted mt-3 line-clamp-3 text-sm">
                  {toParagraphs(competition.description)[0]}
                </p>
              ) : null}
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
