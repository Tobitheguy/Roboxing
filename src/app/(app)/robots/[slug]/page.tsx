import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Swords } from "lucide-react";

import { Badge } from "@/components/badge";
import { BoutList } from "@/components/bout-row";
import { Card, CardBody, CardBodyFlush, CardHeader } from "@/components/card";
import { EmptyState } from "@/components/empty-state";
import { PageShell } from "@/components/page-shell";
import { RobotAvatar } from "@/components/robot-avatar";
import { StatRow, StatTile } from "@/components/stat-tile";
import { formatHeight, formatWeight, humanize } from "@/lib/format";
import { computeRobotRecord, formatRecord } from "@/lib/records";
import { getBoutsForRobot, getRobotBySlug } from "@/lib/queries";

export async function generateMetadata(
  props: PageProps<"/robots/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const row = await getRobotBySlug(slug);
  return {
    title: row?.robot.name ?? "Robot",
    description: row
      ? `${row.robot.name} — ${row.teamName}. Record, specifications, and full fight history.`
      : undefined,
  };
}

/** Renders a jsonb spec blob as a key/value strip, if it is a flat object. */
function SpecsStrip({ specs }: { specs: unknown }) {
  if (!specs || typeof specs !== "object" || Array.isArray(specs)) return null;
  const entries = Object.entries(specs as Record<string, unknown>).filter(
    ([, v]) => v != null && typeof v !== "object",
  );
  if (entries.length === 0) return null;

  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
      {entries.map(([key, value]) => (
        <div key={key}>
          <dt className="eyebrow">{humanize(key)}</dt>
          <dd className="font-display tabular text-ink mt-1 text-sm font-semibold">
            {String(value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default async function RobotPage(props: PageProps<"/robots/[slug]">) {
  const { slug } = await props.params;
  const row = await getRobotBySlug(slug);
  if (!row) notFound();

  const { robot, teamName, teamSlug } = row;
  const history = await getBoutsForRobot(robot.id);
  const record = computeRobotRecord(robot.id, history);
  const upcoming = history.filter((b) => !b.result);
  const resolved = history.filter((b) => b.result);

  const specLines = [
    formatHeight(robot.heightCm),
    formatWeight(robot.weightGrams),
    robot.model,
  ].filter(Boolean);

  return (
    <PageShell>
      <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-start">
        <RobotAvatar
          name={robot.name}
          photoUrl={robot.photoUrl}
          size="xl"
          decorative
        />
        <div className="min-w-0 flex-1">
          <p className="eyebrow mb-2">
            <Link href={`/teams/${teamSlug}`} className="hover:text-volt transition-colors">
              {teamName}
            </Link>
          </p>
          <h1 className="font-display text-hero text-ink uppercase">
            {robot.name}
          </h1>
          {specLines.length > 0 ? (
            <p className="text-ink-muted tabular mt-3 text-sm">
              {specLines.join(" · ")}
            </p>
          ) : null}
          {robot.weightClass ? (
            <div className="mt-3">
              <Badge>{robot.weightClass}</Badge>
            </div>
          ) : null}
          {robot.bio ? (
            <p className="text-ink-muted mt-4 max-w-2xl text-sm">{robot.bio}</p>
          ) : null}
        </div>
      </div>

      <StatRow className="mb-8">
        <StatTile
          label="Record"
          value={formatRecord(record)}
          sub={record.ko > 0 ? `${record.ko} by KO` : undefined}
          emphasis
        />
        <StatTile label="Bouts fought" value={record.fought} />
        <StatTile label="Wins by KO" value={record.ko} />
        <StatTile label="Upcoming" value={upcoming.length} />
      </StatRow>

      {robot.specsJson ? (
        <Card className="mb-6">
          <CardHeader title="Specification" />
          <CardBody>
            <SpecsStrip specs={robot.specsJson} />
          </CardBody>
        </Card>
      ) : null}

      {upcoming.length > 0 ? (
        <Card className="mb-6">
          <CardHeader title="Upcoming" />
          <CardBodyFlush>
            <BoutList bouts={upcoming} showEvent />
          </CardBodyFlush>
        </Card>
      ) : null}

      <Card>
        <CardHeader
          title="Fight history"
          action={
            resolved.length > 0 ? (
              <span className="text-ink-dim tabular text-xs">
                {resolved.length} {resolved.length === 1 ? "bout" : "bouts"}
              </span>
            ) : null
          }
        />
        <CardBodyFlush>
          {resolved.length > 0 ? (
            <BoutList bouts={resolved} showEvent />
          ) : (
            <EmptyState
              icon={<Swords />}
              title="No bouts fought yet"
              description="Every completed bout will appear here, newest first, with a link to the event it was on."
            />
          )}
        </CardBodyFlush>
      </Card>
    </PageShell>
  );
}
