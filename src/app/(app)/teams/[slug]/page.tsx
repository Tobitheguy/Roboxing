import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Bot, CalendarClock, Trophy } from "lucide-react";

import { BackLink } from "@/components/back-link";
import { BoutList } from "@/components/bout-row";
import { Card, CardBodyFlush, CardHeader } from "@/components/card";
import { EmptyState } from "@/components/empty-state";
import { PageHeading, PageShell } from "@/components/page-shell";
import { RobotAvatar } from "@/components/robot-avatar";
import { StatRow, StatTile } from "@/components/stat-tile";
import { TeamCrest } from "@/components/team-crest";
import { formatWeight } from "@/lib/format";
import {
  computeRobotRecord,
  computeTeamRecord,
  formatRecord,
} from "@/lib/records";
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

  // Shared with the standings rather than computed inline. The obvious inline
  // version gets two cases wrong that the league table gets right — a winner
  // belonging to neither corner, and a bout between two of this team's own
  // robots — and either one makes this page contradict the table for the same
  // row. Team attribution comes from the bout's own team columns, so a robot
  // that has since transferred still counts for the bouts it fought here.
  const record = computeTeamRecord(team.id, teamBouts);

  return (
    <PageShell>
      <BackLink href="/teams" label="All teams" />
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

      {/* Only once there is anything to count. A row reading 0-0 / 0 / 0 is
          not information, it is the site advertising its own thinnest spot —
          and for most organisations here the zeros are permanent until the
          leagues publish full cards. */}
      {record.fought > 0 || upcoming.length > 0 ? (
        <StatRow className="mb-8">
          <StatTile
            label="Record"
            value={formatRecord(record)}
            sub={record.ko > 0 ? `${record.ko} by KO` : undefined}
            emphasis
          />
          <StatTile label="Machines" value={robots.length} />
          <StatTile label="Bouts fought" value={record.fought} />
          <StatTile label="Upcoming" value={upcoming.length} />
        </StatRow>
      ) : (
        <p className="text-ink-dim mb-8 text-sm">
          No verified bouts on record yet — the leagues have not published
          complete fight cards. Records appear here the day they do.
        </p>
      )}

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
                const robotRecord = computeRobotRecord(robot.id, teamBouts);
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
                        {formatRecord(robotRecord)}
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
              <BoutList bouts={upcoming} showEvent showLeague />
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
              <BoutList bouts={resolved.slice(0, 8)} showEvent showLeague />
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
