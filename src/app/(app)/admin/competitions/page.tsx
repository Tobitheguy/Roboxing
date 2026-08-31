import type { Metadata } from "next";
import { eq } from "drizzle-orm";

import { CompetitionForm } from "@/components/admin/entity-forms";
import { Badge } from "@/components/badge";
import { Card, CardBody, CardBodyFlush, CardHeader } from "@/components/card";
import { DataTable, type Column } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { PageHeading, PageShell } from "@/components/page-shell";
import { db } from "@/db";
import { competitions, pointsRules } from "@/db/schema";

export const metadata: Metadata = {
  title: "Competitions",
  robots: { index: false, follow: false },
};

type Row = {
  id: number;
  name: string;
  slug: string;
  status: string;
  seasonYear: number | null;
  winPoints: number | null;
  koBonusPoints: number | null;
};

export default async function AdminCompetitionsPage() {
  const rows = await db
    .select({
      id: competitions.id,
      name: competitions.name,
      slug: competitions.slug,
      status: competitions.status,
      seasonYear: competitions.seasonYear,
      winPoints: pointsRules.winPoints,
      koBonusPoints: pointsRules.koBonusPoints,
    })
    .from(competitions)
    .leftJoin(pointsRules, eq(pointsRules.competitionId, competitions.id))
    .orderBy(competitions.name);

  const columns: Column<Row>[] = [
    { key: "name", header: "Name", render: (r) => r.name },
    { key: "slug", header: "Slug", hideOnMobile: true, render: (r) => r.slug },
    {
      key: "season",
      header: "Season",
      align: "right",
      numeric: true,
      hideOnMobile: true,
      render: (r) => r.seasonYear ?? "—",
    },
    {
      key: "scoring",
      header: "Scoring",
      align: "right",
      hideOnMobile: true,
      // Surfaced in the list because a competition running on fallback scoring
      // looks identical to one that was configured deliberately.
      render: (r) =>
        r.winPoints == null ? (
          <Badge variant="warn">defaults</Badge>
        ) : (
          <span className="tabular text-ink-muted text-xs">
            {r.winPoints}W +{r.koBonusPoints}KO
          </span>
        ),
    },
    {
      key: "status",
      header: "Status",
      align: "right",
      render: (r) => (
        <Badge variant={r.status === "active" ? "volt" : "outline"}>
          {r.status}
        </Badge>
      ),
    },
  ];

  return (
    <PageShell>
      <PageHeading eyebrow="Admin" title="Competitions" />

      <Card className="mb-6">
        <CardHeader title="Add a competition" />
        <CardBody>
          <CompetitionForm />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="All competitions" />
        <CardBodyFlush>
          <DataTable
            columns={columns}
            rows={rows}
            getRowKey={(r) => String(r.id)}
            caption="Competitions"
            empty={
              <EmptyState
                title="No competitions yet"
                description="Create one above to start building a season."
              />
            }
          />
        </CardBodyFlush>
      </Card>
    </PageShell>
  );
}
