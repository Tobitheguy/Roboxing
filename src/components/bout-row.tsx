import Link from "next/link";

import { Badge, MethodBadge } from "@/components/badge";
import { EventTime } from "@/components/event-time";
import { RobotAvatar } from "@/components/robot-avatar";
import { formatFinishDetail } from "@/lib/format";
import type { BoutDetail, BoutParticipant } from "@/lib/queries";
import { cn } from "@/lib/utils";

/**
 * One bout, as it appears on a fight card, a results list, a robot's history,
 * and a team page.
 *
 * Deliberately one component rather than four: the rule for who is shown as
 * the winner is the same everywhere, and four copies of it would drift.
 */

function Corner({
  robot,
  outcome,
  align = "left",
}: {
  robot: BoutParticipant;
  /** null when the bout is unresolved. */
  outcome: "win" | "loss" | "draw" | null;
  align?: "left" | "right";
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 items-center gap-3",
        align === "right" && "flex-row-reverse text-right",
      )}
    >
      <RobotAvatar
        name={robot.name}
        photoUrl={robot.photoUrl}
        size="md"
        decorative
        className={cn(outcome === "loss" && "opacity-50")}
      />
      <div className="min-w-0">
        <Link
          href={`/robots/${robot.slug}`}
          className={cn(
            "font-display block truncate text-base font-semibold tracking-tight uppercase transition-colors",
            outcome === "win" ? "text-volt" : "text-ink hover:text-volt",
            outcome === "loss" && "text-ink-muted",
          )}
        >
          {robot.name}
        </Link>
        <Link
          href={`/teams/${robot.teamSlug}`}
          className="text-ink-dim hover:text-ink-muted block truncate text-xs transition-colors"
        >
          {robot.teamName}
        </Link>
      </div>
    </div>
  );
}

export function BoutRow({
  bout,
  showEvent = false,
  className,
}: {
  bout: BoutDetail;
  /** Adds the event name and date — for lists that span several events. */
  showEvent?: boolean;
  className?: string;
}) {
  const { result } = bout;

  const outcomeFor = (robot: BoutParticipant): "win" | "loss" | "draw" | null => {
    if (!result) return null;
    if (result.method === "draw") return "draw";
    if (result.method === "no_contest") return null;
    if (result.winnerRobotId == null) return null;
    return result.winnerRobotId === robot.id ? "win" : "loss";
  };

  return (
    <div className={cn("px-4 py-4 sm:px-6", className)}>
      {showEvent ? (
        <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <Link
            href={`/watch/${bout.event.slug}`}
            className="text-ink-muted hover:text-volt font-medium transition-colors"
          >
            {bout.event.name}
          </Link>
          <EventTime
            startsAt={bout.event.startsAt.toISOString()}
            timeZone={bout.event.timezone}
            city={bout.event.city}
            className="text-ink-dim"
          />
        </div>
      ) : null}

      <div className="flex items-center gap-3 sm:gap-4">
        <Corner robot={bout.robotA} outcome={outcomeFor(bout.robotA)} />

        <div className="flex shrink-0 flex-col items-center gap-1 px-1">
          <span className="font-display text-ink-dim text-xs font-semibold tracking-widest uppercase">
            vs
          </span>
          {bout.status === "live" ? (
            <span className="bg-live size-1.5 animate-pulse rounded-full" />
          ) : null}
        </div>

        <Corner
          robot={bout.robotB}
          outcome={outcomeFor(bout.robotB)}
          align="right"
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        {result ? (
          <>
            <MethodBadge method={result.method} />
            {formatFinishDetail(result.endRound, result.endTimeSeconds) ? (
              <span className="text-ink-muted tabular text-xs">
                {formatFinishDetail(result.endRound, result.endTimeSeconds)}
              </span>
            ) : null}
            {result.knockdownsA + result.knockdownsB > 0 ? (
              <span className="text-ink-dim tabular text-xs">
                {result.knockdownsA + result.knockdownsB} KD
              </span>
            ) : null}
          </>
        ) : (
          <>
            <Badge variant="outline">
              {bout.scheduledRounds} rounds
            </Badge>
            {bout.robotA.weightClass ? (
              <Badge>{bout.robotA.weightClass}</Badge>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

/** A list of bouts inside a Card, with dividers. */
export function BoutList({
  bouts,
  showEvent = false,
}: {
  bouts: BoutDetail[];
  showEvent?: boolean;
}) {
  return (
    <ul>
      {bouts.map((bout) => (
        <li
          key={bout.id}
          className="border-line/60 border-b last:border-b-0"
        >
          <BoutRow bout={bout} showEvent={showEvent} />
        </li>
      ))}
    </ul>
  );
}
