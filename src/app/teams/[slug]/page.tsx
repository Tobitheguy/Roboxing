import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Bot, CalendarClock, Trophy } from "lucide-react";

import { BoutList } from "@/components/bout-row";
import { Card, CardBodyFlush, CardHeader } from "@/components/card";
import { EmptyState } from "@/components/empty-state";
import { PageHeading, PageShell } from "@/components/page-shell";
import { RobotAvatar } from "@/components/robot-avatar";
import { StatRow, StatTile } from "@/components/stat-tile";
import { TeamCrest } from "@/components/team-crest";
import { formatWeight } from "@/lib/format";
import { computeRobotRecord, formatRecord } from "@/lib/records";
import {
  getBoutsForTeam,
  getRobotsForTeam,
  getTeamBySlug,
} from "@/lib/queries";

export async function generateMetadata(
  props: PageProps<"/teams/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const team = await getTeamBySlug(slug);
  return { title: team?.name ?? "Team" };
}

export default async function TeamPage(props: PageProps<"/teams/[slug]">) {
  const { slug } = await props.params;
  const team = await getTeamBySlug(slug);
  if (!team) notFound();

  const [robots, teamBouts] = await Promise.all([
    getRobotsForTeam(team.id),
    getBoutsForTeam(team.id),
  ]);

  const resolved = teamBouts.filter((b) => b.result);
  const upcoming = teamBouts.filter((b) => !b.result).reverse();

  // The team's record is the sum of its robots' records in bouts fought FOR
  // this team — read off the bout's own team columns, so a robot that has
  // since transferred still counts here for the bouts it fought here.
  let won = 0;
  let lost = 0;
  let drawn = 0;
  let ko = 0;
  for (const bout of resolved) {
    const isA = bout.robotA.teamId === team.id;
    const result = bout.result!;
    if (result.method === "no_contest") continue;
    if (result.method === "draw") {
      drawn += 1;
      continue;
    }
    if (result.winnerRobotId == null) continue;
    const ourRobotId = isA ? bout.robotA.id : bout.robotB.id;
    if (result.winnerRobotId === ourRobotId) {
      won += 1;
      if (result.method === "ko" || result.method === "tko") ko += 1;
    } else {
      lost += 1;
    }
  }

  return (
    <PageShell>
      <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-start">
        <TeamCrest name={team.name} logoUrl={team.logoUrl} size="xl" decorative />
        <div className="min-w-0 flex-1">
          <PageHeading
            eyebrow={[team.orgName, team.country].filter(Boolean).join(" · ")}
            title={team.name}
            description={team.bio ?? undefined}
            className="mb-0"
          />
          {team.foundedYear ? (
            <p className="text-ink-dim tabular mt-3 text-xs">
              Founded {team.foundedYear}
            </p>
          ) : null}
        </div>
      </div>

      <StatRow className="mb-8">
        <StatTile
          label="Record"
          value={formatRecord({ won, lost, drawn, ko, fought: won + lost + drawn })}
          sub={ko > 0 ? `${ko} by KO` : undefined}
          emphasis
        />
        <StatTile label="Robots" value={robots.length} />
        <StatTile label="Bouts fought" value={won + lost + drawn} />
        <StatTile label="Upcoming" value={upcoming.length} />
      </StatRow>

      <Card>
        <CardHeader title="Roster" />
        <CardBodyFlush>
          {robots.length === 0 ? (
            <EmptyState
              icon={<Bot />}
              title="No robots on the roster"
              description="Robots appear here once they are added to this team."
            />
          ) : (
            <ul>
              {robots.map((robot) => {
                const record = computeRobotRecord(robot.id, teamBouts);
                return (
                  <li
                    key={robot.id}
                    className="border-line/60 border-b last:border-b-0"
                  >
                    <Link
                      href={`/robots/${robot.slug}`}
                      className="hover:bg-surface-2 flex items-center gap-4 px-4 py-4 transition-colors sm:px-6"
                    >
                      <RobotAvatar
                        name={robot.name}
                        photoUrl={robot.photoUrl}
                        size="md"
                        decorative
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-display text-ink truncate text-sm font-semibold uppercase">
                          {robot.name}
                        </p>
                        <p className="text-ink-dim truncate text-xs">
                          {[
                            robot.model,
                            robot.weightClass,
                            formatWeight(robot.weightGrams),
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                      <span className="font-display tabular text-ink-muted shrink-0 text-sm font-semibold">
                        {formatRecord(record)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </CardBodyFlush>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Upcoming bouts" />
          <CardBodyFlush>
            {upcoming.length > 0 ? (
              <BoutList bouts={upcoming} showEvent />
            ) : (
              <EmptyState
                icon={<CalendarClock />}
                title="Nothing scheduled"
                description="This team has no bouts booked."
              />
            )}
          </CardBodyFlush>
        </Card>

        <Card>
          <CardHeader title="Recent results" />
          <CardBodyFlush>
            {resolved.length > 0 ? (
              <BoutList bouts={resolved.slice(0, 8)} showEvent />
            ) : (
              <EmptyState
                icon={<Trophy />}
                title="No results yet"
                description="Completed bouts appear here with the winner and method."
              />
            )}
          </CardBodyFlush>
        </Card>
      </div>
    </PageShell>
  );
}
