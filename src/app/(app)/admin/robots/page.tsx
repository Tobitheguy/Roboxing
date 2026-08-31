import type { Metadata } from "next";
import { eq } from "drizzle-orm";

import { RobotForm } from "@/components/admin/entity-forms";
import { Card, CardBody, CardBodyFlush, CardHeader } from "@/components/card";
import { DataTable, type Column } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { PageHeading, PageShell } from "@/components/page-shell";
import { RobotAvatar } from "@/components/robot-avatar";
import { db } from "@/db";
import { robots, teams } from "@/db/schema";
import { formatWeight } from "@/lib/format";

export const metadata: Metadata = {
  title: "Robots",
  robots: { index: false, follow: false },
};

type Row = {
  id: number;
  name: string;
  slug: string;
  photoUrl: string | null;
  teamName: string;
  weightClass: string | null;
  weightGrams: number | null;
};

export default async function AdminRobotsPage() {
  const [rows, teamOptions] = await Promise.all([
    db
      .select({
        id: robots.id,
        name: robots.name,
        slug: robots.slug,
        photoUrl: robots.photoUrl,
        teamName: teams.name,
        weightClass: robots.weightClass,
        weightGrams: robots.weightGrams,
      })
      .from(robots)
      .innerJoin(teams, eq(robots.teamId, teams.id))
      .orderBy(robots.name),
    db.select({ id: teams.id, name: teams.name }).from(teams).orderBy(teams.name),
  ]);

  const columns: Column<Row>[] = [
    {
      key: "name",
      header: "Robot",
      render: (r) => (
        <div className="flex items-center gap-2.5">
          <RobotAvatar name={r.name} photoUrl={r.photoUrl} size="sm" decorative />
          <span className="text-ink font-medium">{r.name}</span>
        </div>
      ),
    },
    { key: "team", header: "Team", render: (r) => r.teamName },
    {
      key: "class",
      header: "Class",
      hideOnMobile: true,
      render: (r) => r.weightClass ?? "—",
    },
    {
      key: "weight",
      header: "Weight",
      align: "right",
      numeric: true,
      hideOnMobile: true,
      render: (r) => formatWeight(r.weightGrams) ?? "—",
    },
  ];

  return (
    <PageShell>
      <PageHeading eyebrow="Admin" title="Robots" />

      {teamOptions.length === 0 ? (
        <Card className="mb-6">
          <EmptyState
            title="Add a team first"
            description="Every robot belongs to a team, so there is nothing to attach one to yet."
          />
        </Card>
      ) : (
        <Card className="mb-6">
          <CardHeader title="Add a robot" />
          <CardBody>
            <RobotForm teams={teamOptions} />
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader title="All robots" />
        <CardBodyFlush>
          <DataTable
            columns={columns}
            rows={rows}
            getRowKey={(r) => String(r.id)}
            caption="Robots"
            rowHref={(r) => `/robots/${r.slug}`}
            rowLabel={(r) => `${r.name} public page`}
            empty={
              <EmptyState
                title="No robots yet"
                description="Robots appear on team pages and fight cards once added."
              />
            }
          />
        </CardBodyFlush>
      </Card>
    </PageShell>
  );
}
