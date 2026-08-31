import type { Metadata } from "next";
import { sql } from "drizzle-orm";

import { TeamForm } from "@/components/admin/entity-forms";
import { Card, CardBody, CardBodyFlush, CardHeader } from "@/components/card";
import { DataTable, type Column } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { PageHeading, PageShell } from "@/components/page-shell";
import { TeamCrest } from "@/components/team-crest";
import { db } from "@/db";
import { robots, teams } from "@/db/schema";

export const metadata: Metadata = {
  title: "Teams",
  robots: { index: false, follow: false },
};

type Row = {
  id: number;
  name: string;
  slug: string;
  country: string | null;
  logoUrl: string | null;
  robotCount: number;
};

export default async function AdminTeamsPage() {
  const rows = await db
    .select({
      id: teams.id,
      name: teams.name,
      slug: teams.slug,
      country: teams.country,
      logoUrl: teams.logoUrl,
      robotCount: sql<number>`(select count(*) from ${robots} where ${robots.teamId} = ${teams.id})::int`,
    })
    .from(teams)
    .orderBy(teams.name);

  const columns: Column<Row>[] = [
    {
      key: "name",
      header: "Team",
      render: (r) => (
        <div className="flex items-center gap-2.5">
          <TeamCrest name={r.name} logoUrl={r.logoUrl} size="sm" decorative />
          <span className="text-ink font-medium">{r.name}</span>
        </div>
      ),
    },
    { key: "slug", header: "Slug", hideOnMobile: true, render: (r) => r.slug },
    {
      key: "country",
      header: "Country",
      hideOnMobile: true,
      render: (r) => r.country ?? "—",
    },
    {
      key: "robots",
      header: "Robots",
      align: "right",
      numeric: true,
      render: (r) => r.robotCount,
    },
  ];

  return (
    <PageShell>
      <PageHeading eyebrow="Admin" title="Teams" />

      <Card className="mb-6">
        <CardHeader title="Add a team" />
        <CardBody>
          <TeamForm />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="All teams" />
        <CardBodyFlush>
          <DataTable
            columns={columns}
            rows={rows}
            getRowKey={(r) => String(r.id)}
            caption="Teams"
            rowHref={(r) => `/teams/${r.slug}`}
            rowLabel={(r) => `${r.name} public page`}
            empty={
              <EmptyState
                title="No teams yet"
                description="Add a team before adding robots — every robot belongs to one."
              />
            }
          />
        </CardBodyFlush>
      </Card>
    </PageShell>
  );
}
