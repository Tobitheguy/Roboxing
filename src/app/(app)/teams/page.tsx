import type { Metadata } from "next";
import Link from "next/link";
import { Users } from "lucide-react";

import { Card, CardBody } from "@/components/card";
import { EmptyState } from "@/components/empty-state";
import { PageHeading, PageShell } from "@/components/page-shell";
import { TeamCrest } from "@/components/team-crest";
import { getPrimaryCompetition, getTeams } from "@/lib/queries";
import { getStandings } from "@/lib/standings";

export const metadata: Metadata = { title: "Teams" };

export default async function TeamsPage() {
  const [teams, primary] = await Promise.all([
    getTeams(),
    getPrimaryCompetition(),
  ]);

  const standings = primary ? await getStandings(primary.id) : [];
  const bySlug = new Map(standings.map((r) => [r.team.slug, r]));

  return (
    <PageShell>
      <PageHeading
        eyebrow="Competitors"
        title="Teams"
        description="Two kinds of organisation share this sport: the manufacturers who build the machines, and the teams who pilot them."
      />

      {teams.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Users />}
            title="No teams yet"
            description="Teams appear here once they are entered into a competition."
          />
        </Card>
      ) : (
        <>
          {/*
            ONE list, and the split that used to be here is gone.
            It divided teams by "owns a machine = manufacturer", which was true
            while Unitree and EngineAI were rows in this table. They are not any
            more — `manufacturers` is its own table now — so the heuristic put
            White Eagle and Matador under "Manufacturers & platforms", which is
            exactly backwards: they are the competitors.

            Makers live on the Machines page, where the hardware is.
          */}
          {[
            {
              heading: "Competing teams",
              blurb:
                "They pilot standardised hardware supplied by the league — every URKL entry is the same EngineAI T800 — which is why the machine count says little about them. The companies that BUILD the machines are on the Machines page.",
              rows: teams,
            },
          ]
            .filter((section) => section.rows.length > 0)
            .map((section) => (
              <section key={section.heading} className="mb-10">
                <div className="mb-4">
                  <h2 className="font-display text-title text-ink uppercase">
                    {section.heading}
                  </h2>
                  <p className="text-ink-muted mt-1 text-sm">{section.blurb}</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {section.rows.map(({ team, robotCount }) => {
            const standing = bySlug.get(team.slug);
            return (
              <Card
                key={team.id}
                className="hover:border-line-strong transition-colors"
              >
                <CardBody>
                  <div className="flex items-start gap-4">
                    <TeamCrest
                      name={team.name}
                      logoUrl={team.logoUrl}
                      size="lg"
                      decorative
                    />
                    <div className="min-w-0 flex-1">
                      <h2 className="font-display text-ink truncate text-lg font-semibold uppercase">
                        <Link
                          href={`/teams/${team.slug}`}
                          className="hover:text-volt transition-colors"
                        >
                          {team.name}
                        </Link>
                      </h2>
                      <p className="text-ink-dim mt-0.5 truncate text-xs">
                        {[team.orgName, team.country].filter(Boolean).join(" · ")}
                      </p>
                      <p className="text-ink-muted tabular mt-3 text-xs">
                        {robotCount > 0
                          ? `${robotCount} ${robotCount === 1 ? "machine" : "machines"}`
                          : "Pilots league hardware"}
                        {standing ? (
                          <>
                            <span className="text-ink-dim"> · </span>
                            {standing.won}–{standing.lost}
                            {standing.drawn > 0 ? `–${standing.drawn}` : ""}
                            <span className="text-ink-dim"> · </span>
                            <span className="text-volt">
                              {standing.points} pts
                            </span>
                          </>
                        ) : null}
                      </p>
                    </div>
                  </div>
                </CardBody>
              </Card>
            );
                  })}
                </div>
              </section>
            ))}
        </>
      )}
    </PageShell>
  );
}
