import Link from "next/link";
import { CalendarClock, ListOrdered, Trophy } from "lucide-react";

import { Card, CardHeader, CardBodyFlush } from "@/components/card";
import { EmptyState } from "@/components/empty-state";
import { PageShell } from "@/components/page-shell";
import { RoboxingMark } from "@/components/roboxing-mark";

/**
 * Home.
 *
 * The layout below is the real one — next event, then latest results, then a
 * standings snapshot — with empty states where the queries will go in step 3.
 * Nothing here is sample data: the site is publicly reachable and a fabricated
 * fixture list would be indistinguishable from a real one.
 */
export default function HomePage() {
  return (
    <PageShell>
      <section className="border-line bg-surface relative overflow-hidden rounded-lg border px-6 py-12 sm:px-10 sm:py-16">
        <p className="eyebrow mb-4">Live humanoid robot combat</p>
        <h1 className="text-display font-display text-ink max-w-3xl uppercase">
          Every fight.
          <br />
          <span className="text-volt">One place.</span>
        </h1>
        <p className="text-ink-muted mt-6 max-w-xl text-base">
          Streams, league standings, team rosters, and full fight history for
          humanoid robot combat — treated like the sport it has become.
        </p>
        {/* The most consequential sentence on the page — it says there is no
            rights deal. It gets the readable ink, not the dim one. */}
        <p className="text-ink-muted mt-8 max-w-xl text-xs">
          Roboxing is in build. There are no events loaded yet, and no broadcast
          rights are in place. See the{" "}
          <Link
            href="/styleguide"
            className="text-volt underline underline-offset-4"
          >
            styleguide
          </Link>{" "}
          for the design system.
        </p>
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Next event" />
          <CardBodyFlush>
            <EmptyState
              icon={<CalendarClock />}
              title="No events scheduled"
              description="Once a competition and its fixtures are loaded, the next event and a countdown appear here."
            />
          </CardBodyFlush>
        </Card>

        <Card>
          <CardHeader title="Standings" />
          <CardBodyFlush>
            <EmptyState
              icon={<ListOrdered />}
              title="No standings yet"
              description="Standings are computed from results, so the table appears with the first recorded bout."
            />
          </CardBodyFlush>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader title="Latest results" />
        <CardBodyFlush>
          <EmptyState
            icon={<Trophy />}
            title="No results recorded"
            description="Every completed bout will show here with its winner, method, and round."
          />
        </CardBodyFlush>
      </Card>

      <div className="text-ink-dim mt-12 flex items-center gap-2 text-xs">
        <RoboxingMark size="sm" />
        <span>· design system v1</span>
      </div>
    </PageShell>
  );
}
