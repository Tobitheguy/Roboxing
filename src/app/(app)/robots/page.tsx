import type { Metadata } from "next";
import Link from "next/link";
import { Bot } from "lucide-react";

import { Card, CardBody } from "@/components/card";
import { EmptyState } from "@/components/empty-state";
import { PageHeading, PageShell } from "@/components/page-shell";
import { RobotAvatar } from "@/components/robot-avatar";
import { formatHeight, formatWeight } from "@/lib/format";
import { db } from "@/db";
import { robots, teams } from "@/db/schema";
import { asc, eq } from "drizzle-orm";

export const metadata: Metadata = {
  title: "Machines",
  description:
    "The humanoid platforms this sport is fought on — specs, makers, and fight history.",
};

/**
 * The machines index.
 *
 * Framed as a hardware database, not a fighter roster, because that is what
 * the data actually is: this sport currently runs on a handful of
 * standardised platforms (EngineAI's T800, Unitree's G1) that whole leagues
 * share. Spec sheets are the unique content here — nobody else lists this
 * sport's hardware side by side in English — and fight records attach to
 * these pages the day the leagues publish full cards.
 */
export default async function MachinesPage() {
  const rows = await db
    .select({ robot: robots, teamName: teams.name, teamSlug: teams.slug })
    .from(robots)
    .innerJoin(teams, eq(robots.teamId, teams.id))
    .orderBy(asc(robots.name));

  return (
    <PageShell>
      <PageHeading
        eyebrow="Hardware"
        title="Machines"
        description="The humanoid platforms this sport is fought on. Entire leagues run on standardised hardware — these are the models."
      />

      {rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Bot />}
            title="No machines on record"
            description="Platforms appear here as leagues announce the hardware they run on."
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {rows.map(({ robot, teamName, teamSlug }) => (
            <Card
              key={robot.id}
              className="hover:border-line-strong transition-colors"
            >
              <CardBody>
                <div className="flex items-start gap-4">
                  <RobotAvatar
                    name={robot.name}
                    photoUrl={robot.photoUrl}
                    size="lg"
                    decorative
                  />
                  <div className="min-w-0 flex-1">
                    <h2 className="font-display text-ink text-lg font-semibold uppercase">
                      <Link
                        href={`/robots/${robot.slug}`}
                        className="hover:text-volt transition-colors"
                      >
                        {robot.name}
                      </Link>
                    </h2>
                    <p className="text-ink-dim mt-0.5 text-xs">
                      <Link
                        href={`/teams/${teamSlug}`}
                        className="hover:text-ink-muted transition-colors"
                      >
                        {teamName}
                      </Link>
                      {robot.weightClass ? ` · ${robot.weightClass}` : null}
                    </p>
                    <p className="text-ink-muted tabular mt-3 text-xs">
                      {[
                        formatHeight(robot.heightCm),
                        formatWeight(robot.weightGrams),
                      ]
                        .filter(Boolean)
                        .join(" · ") || "Specs to follow"}
                    </p>
                    {robot.bio ? (
                      <p className="text-ink-muted mt-3 line-clamp-3 text-sm">
                        {robot.bio}
                      </p>
                    ) : null}
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </PageShell>
  );
}
