import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Badge } from "@/components/badge";
import { LeagueMarkBadge } from "@/components/league-mark";
import { formatDateLong, formatDaysUntil } from "@/lib/format";
import { leagueIdentity } from "@/lib/league-identity";
import { getLeaguesOverview } from "@/lib/queries";

/**
 * The five leagues, on the front page.
 *
 * This is the band that has no equivalent on UFC.com or Formula1.com, and the
 * reason is structural rather than stylistic: those sites cover ONE
 * competition, so "which league" is never a question their reader has. Here it
 * is the first question. Nobody has to be told what the NFL is; everybody has
 * to be told what URKL is, who runs it, and whether it is the one with the
 * gold belt or the one in a San Francisco nightclub.
 *
 * It is also the honest answer to what this site is for right now. There are
 * no results worth a table yet and one event a month, but there IS a map of a
 * sport that does not have one in English — and that map is the product.
 */
export async function LeaguesBand() {
  const leagues = await getLeaguesOverview();
  if (leagues.length === 0) return null;

  const now = new Date();

  return (
    <section>
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h2 className="font-display text-title text-ink uppercase">
          The leagues
        </h2>
        <Link
          href="/competitions"
          className="text-volt shrink-0 text-xs font-medium underline underline-offset-4"
        >
          All leagues
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {leagues.map(({ league, nextEvent, eventCount }) => {
          const until = nextEvent
            ? formatDaysUntil(nextEvent.startsAt, now)
            : null;

          const identity = leagueIdentity(league.slug);

          return (
            <Link
              key={league.id}
              href={`/competitions/${league.slug}`}
              className="border-line bg-surface hover:border-ink-dim group flex flex-col overflow-hidden rounded-lg border transition-colors"
            >
              {/* The league's colour, worn as a top edge and a monogram. This
                  is what stops five competitions rendering as five identical
                  headings — colour with a referent, not decoration. */}
              <div
                aria-hidden
                className="h-1"
                style={{ backgroundColor: identity.accent }}
              />
              <div className="flex flex-1 flex-col p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <LeagueMarkBadge slug={league.slug} name={league.name} logoUrl={league.logoUrl} />
                    <div className="min-w-0">
                      <h3 className="font-display text-ink group-hover:text-volt truncate text-base leading-tight font-semibold uppercase transition-colors">
                        {league.name}
                      </h3>
                      {league.organizer ? (
                        <p className="text-ink-muted truncate text-xs">
                          {league.organizer}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <Badge
                    variant={league.status === "active" ? "default" : "outline"}
                  >
                    {league.status === "active"
                      ? "Active"
                      : league.status === "upcoming"
                        ? "Upcoming"
                        : "Finished"}
                  </Badge>
                </div>

                <div className="mt-auto pt-4">
                  {nextEvent ? (
                    <>
                      <p className="text-ink-dim text-[0.65rem] font-semibold tracking-wide uppercase">
                        Next
                      </p>
                      <p className="text-ink mt-1 truncate text-sm">
                        {nextEvent.name}
                      </p>
                      <p className="text-ink-dim tabular mt-0.5 text-xs">
                        {/* The venue's date, and the coarse distance beside it.
                            Both, because "in 3 weeks" tells you whether to care
                            and the date tells you when to be there. */}
                        {formatDateLong(nextEvent.startsAt, nextEvent.timezone)}
                        {until ? (
                          <span className="text-volt"> · {until}</span>
                        ) : null}
                        {nextEvent.startTimeTbd ? " · time TBA" : null}
                      </p>
                    </>
                  ) : (
                    <p className="text-ink-dim text-xs">
                      {eventCount > 0
                        ? `${eventCount} event${eventCount === 1 ? "" : "s"} on record — nothing scheduled`
                        : "No events on record yet"}
                    </p>
                  )}
                </div>

                <span className="text-ink-dim group-hover:text-volt mt-3 inline-flex items-center gap-1 text-xs transition-colors">
                  League page
                  <ArrowRight className="size-3" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
