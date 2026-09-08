import type { Metadata } from "next";
import Link from "next/link";
import { Target } from "lucide-react";

import { Card, CardBody, CardBodyFlush, CardHeader } from "@/components/card";
import { EmptyState } from "@/components/empty-state";
import { PageHeading, PageShell } from "@/components/page-shell";
import { StatTile } from "@/components/stat-tile";
import { requireVerifiedViewer } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import {
  gradePrediction,
  summarizeRecord,
  type PredictionGrade,
} from "@/lib/predictions";
import { getPicksWithResultsForUser } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Your picks" };

/**
 * Somebody's prediction record.
 *
 * The payoff half of the game. Picking is only interesting if being right
 * accumulates somewhere, and the sign-in prompt on the event page promises
 * exactly this — a promise that has to be kept on the page it points at.
 *
 * Nothing here is stored. The record is derived from the picks and the
 * results every time it is asked for, which is the same rule the standings
 * follow and for the same reason: a corrected result has to move the number,
 * and a cached one does not.
 */

const GRADE_LABEL: Record<PredictionGrade, string> = {
  correct: "Correct",
  wrong: "Wrong",
  void: "Void",
  pending: "Pending",
};

const GRADE_CLASS: Record<PredictionGrade, string> = {
  correct: "text-volt",
  wrong: "text-ink-muted",
  void: "text-ink-dim",
  pending: "text-ink-dim",
};

export default async function PicksPage() {
  const viewer = await requireVerifiedViewer("/account/picks");
  const rows = await getPicksWithResultsForUser(viewer.id);

  const graded = rows.map((row) => ({
    ...row,
    // `method` is null when the LEFT JOIN found no result, and that has to
    // reach gradePrediction as a null RESULT rather than as a result with a
    // null method — the latter grades an unfought bout as "void" instead of
    // "pending", which silently drops it out of the record it is waiting to
    // join.
    grade: gradePrediction(
      row.robotId,
      row.method
        ? { winnerRobotId: row.winnerRobotId, method: row.method }
        : null,
    ),
  }));

  const record = summarizeRecord(graded.map((g) => g.grade));

  return (
    <PageShell>
      <PageHeading
        eyebrow="Account"
        title="Your picks"
        description="Free to play — no stake, no payout. Just whether you called it."
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile
          label="Accuracy"
          emphasis
          // An em dash, not "0%". Nothing has settled, and a fresh player shown
          // a zero reads it as "you have been wrong every time".
          value={
            record.accuracy === null
              ? "—"
              : `${Math.round(record.accuracy * 100)}%`
          }
          sub={
            record.settled === 0
              ? "Nothing settled yet"
              : `${record.settled} settled`
          }
        />
        <StatTile label="Correct" value={String(record.correct)} />
        <StatTile label="Wrong" value={String(record.wrong)} />
        <StatTile
          label="Open"
          value={String(record.pending)}
          sub={record.void > 0 ? `${record.void} void` : undefined}
        />
      </div>

      <Card className="mt-6">
        <CardHeader title="Every pick" />
        {graded.length === 0 ? (
          <CardBody>
            <EmptyState
              icon={<Target />}
              title="No picks yet"
              description="Pick a winner on any upcoming event and it shows up here."
            />
            <div className="mt-4 flex justify-center">
              <Link
                href="/schedule"
                className="text-volt text-sm hover:underline"
              >
                See what&rsquo;s coming up
              </Link>
            </div>
          </CardBody>
        ) : (
          <CardBodyFlush>
            <ul>
              {graded.map((pick) => (
                <li
                  key={pick.boutId}
                  className="border-line/60 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b px-4 py-3 last:border-b-0 sm:px-6"
                >
                  <div className="min-w-0">
                    <p className="text-ink truncate text-sm">
                      <span className="font-display font-semibold uppercase">
                        {pick.robotName}
                      </span>
                      <span className="text-ink-dim">
                        {" "}
                        over{" "}
                        {/* The other corner, whichever one that is. */}
                        {pick.robotId === pick.opponentAId
                          ? pick.opponentBName
                          : pick.opponentAName}
                      </span>
                    </p>
                    <p className="text-ink-dim truncate text-xs">
                      <Link
                        href={`/events/${pick.eventSlug}`}
                        className="hover:text-ink-muted transition-colors"
                      >
                        {pick.eventName}
                      </Link>
                      {" · "}
                      {formatDate(pick.eventStartsAt, "UTC")}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "text-xs font-medium",
                      GRADE_CLASS[pick.grade],
                    )}
                  >
                    {GRADE_LABEL[pick.grade]}
                  </span>
                </li>
              ))}
            </ul>
          </CardBodyFlush>
        )}
      </Card>
    </PageShell>
  );
}
