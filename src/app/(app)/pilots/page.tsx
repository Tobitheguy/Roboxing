import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/badge";
import { Card, CardBody } from "@/components/card";
import { ConfidenceBadge } from "@/components/confidence-badge";
import { PageHeading, PageShell } from "@/components/page-shell";
import { getPilots } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Pilots",
  description:
    "The people driving the robots. Almost every bout in humanoid fighting is remote-piloted by a named human.",
};

const ROLE_LABEL: Record<string, string> = {
  pilot: "Pilot",
  founder: "Founder",
  engineer: "Engineer",
  executive: "Executive",
  referee: "Referee",
};

/**
 * The humans.
 *
 * This page exists because the site had none, and a record of a sport whose
 * entire premise is that a person is driving cannot leave the people out. The
 * most consequential fact about humanoid fighting — the one that separates it
 * from the autonomous-robotics story it is usually filed under — is that Lu Xin
 * won the first tournament, not that a Unitree G1 did.
 *
 * Grouped by role rather than sorted by name: a visitor came here for the
 * drivers, and putting a league founder above them because of an alphabet is
 * the wrong emphasis.
 */
export default async function PilotsPage() {
  const people = await getPilots();

  const drivers = people.filter((p) => p.pilot.role === "pilot");
  const others = people.filter((p) => p.pilot.role !== "pilot");

  return (
    <PageShell>
      <PageHeading
        eyebrow="The people"
        title="Pilots"
        description="Almost every bout in this sport is driven by a person. Their names are reported far less often than the machines', which is backwards — so this is the index of everyone the record can name."
      />

      <Card className="mb-10">
        <CardBody className="text-ink-muted max-w-3xl space-y-3 text-sm leading-relaxed">
          <p>
            The single most common misconception about humanoid fighting is that
            the robots are doing it themselves. Mostly they are not. Iron Fist
            King&rsquo;s four Unitree G1s were fully remote-piloted, their
            movement trained from motion capture of professional kickboxers. UFB
            pilots use game controllers, and can drive from a browser. The 2026
            World Humanoid Robot Games took the distinction seriously enough to
            halve the score of any teleoperated machine.
          </p>
          <p>
            Where a pilot&rsquo;s name has never been published — which is most
            of the time, because Chinese coverage of a team tournament names the
            team and not the operator — there is nothing here to list. That gap
            is itself one of this sport&rsquo;s open questions.
          </p>
        </CardBody>
      </Card>

      <h2 className="font-display text-title text-ink mb-4 uppercase">
        Pilots
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {drivers.map((row) => (
          <PersonCard key={row.pilot.id} row={row} />
        ))}
      </div>

      <h2 className="font-display text-title text-ink mt-12 mb-4 uppercase">
        Founders, officials and executives
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {others.map((row) => (
          <PersonCard key={row.pilot.id} row={row} />
        ))}
      </div>
    </PageShell>
  );
}

function PersonCard({
  row,
}: {
  row: Awaited<ReturnType<typeof getPilots>>[number];
}) {
  const { pilot, competitionSlug, competitionName } = row;
  return (
    <Card className="hover:border-ink-dim transition-colors">
      <CardBody>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-display text-ink text-sm font-semibold uppercase">
              <Link
                href={`/pilots/${pilot.slug}`}
                className="hover:text-volt transition-colors"
              >
                {pilot.name}
              </Link>
            </h3>
            {/* The local-script name beside the transliteration, never instead
                of it: this site is the English-language record, and the people
                in it are mostly not English-speaking. */}
            {pilot.nameLocal ? (
              <p className="text-ink-dim mt-0.5 text-xs">{pilot.nameLocal}</p>
            ) : null}
          </div>
          <Badge variant="outline" size="sm">
            {ROLE_LABEL[pilot.role] ?? pilot.role}
          </Badge>
        </div>

        {pilot.notableResult ? (
          <p className="text-ink-muted mt-3 text-sm leading-relaxed">
            {pilot.notableResult}
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {competitionSlug && competitionName ? (
            <Link
              href={`/competitions/${competitionSlug}`}
              className="text-ink-dim hover:text-ink text-xs underline underline-offset-2"
            >
              {competitionName}
            </Link>
          ) : pilot.affiliation ? (
            <span className="text-ink-dim text-xs">{pilot.affiliation}</span>
          ) : null}
          <ConfidenceBadge level={pilot.confidence} showLabel={false} />
        </div>
      </CardBody>
    </Card>
  );
}
