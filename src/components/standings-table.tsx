import Link from "next/link";

import { DataTable, type Column } from "@/components/data-table";
import { TeamCrest } from "@/components/team-crest";
import type { StandingRow } from "@/lib/standings";
import { cn } from "@/lib/utils";

/**
 * The league table.
 *
 * Every number in it is derived from bout_results at request time — nothing
 * here is stored, so it cannot disagree with a robot's record or a team page.
 */
export function StandingsTable({
  rows,
  compact = false,
}: {
  rows: StandingRow[];
  /** Drops the columns a phone-sized snapshot does not need. */
  compact?: boolean;
}) {
  const columns: Column<StandingRow>[] = [
    {
      key: "pos",
      header: "#",
      headerTitle: "Position",
      numeric: true,
      className: "w-10 text-ink-dim",
      render: (r) => r.position,
    },
    {
      key: "team",
      header: "Team",
      render: (r) => (
        <div className="flex items-center gap-2.5">
          <TeamCrest name={r.team.name} size="sm" decorative />
          <span className="text-ink font-medium">{r.team.name}</span>
        </div>
      ),
    },
    {
      key: "p",
      header: "P",
      headerTitle: "Bouts fought",
      align: "right",
      numeric: true,
      hideOnMobile: true,
      render: (r) => r.played,
    },
    {
      key: "w",
      header: "W",
      headerTitle: "Won",
      align: "right",
      numeric: true,
      render: (r) => r.won,
    },
    {
      key: "l",
      header: "L",
      headerTitle: "Lost",
      align: "right",
      numeric: true,
      render: (r) => r.lost,
    },
    {
      key: "d",
      header: "D",
      headerTitle: "Drawn",
      align: "right",
      numeric: true,
      hideOnMobile: true,
      render: (r) => r.drawn,
    },
    {
      key: "ko",
      header: "KO",
      headerTitle: "Wins by knockout",
      align: "right",
      numeric: true,
      hideOnMobile: true,
      render: (r) => r.ko,
    },
    {
      key: "pts",
      header: "Pts",
      headerTitle: "Points",
      align: "right",
      numeric: true,
      render: (r) => <span className="text-volt">{r.points}</span>,
    },
  ];

  return (
    <DataTable
      columns={compact ? columns.filter((c) => !c.hideOnMobile) : columns}
      rows={rows}
      getRowKey={(r) => r.team.slug}
      caption="League standings, computed from recorded bout results"
      rowHref={(r) => `/teams/${r.team.slug}`}
      rowLabel={(r) => `${r.team.name} — position ${r.position}`}
    />
  );
}

/** Top-N snapshot with a link through to the full table. */
export function StandingsSnapshot({
  rows,
  competitionSlug,
  limit = 5,
}: {
  rows: StandingRow[];
  competitionSlug: string;
  limit?: number;
}) {
  return (
    <div>
      <StandingsTable rows={rows.slice(0, limit)} compact />
      {rows.length > limit ? (
        <div className="border-line border-t px-4 py-3 sm:px-6">
          <Link
            href={`/competitions/${competitionSlug}`}
            className={cn(
              "text-volt text-xs font-medium underline underline-offset-4",
            )}
          >
            Full table — {rows.length} teams
          </Link>
        </div>
      ) : null}
    </div>
  );
}
