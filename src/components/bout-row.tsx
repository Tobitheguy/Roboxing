import Link from "next/link";

import { Badge, MethodBadge } from "@/components/badge";
import { CountryTag } from "@/components/country-tag";
import { EventTime } from "@/components/event-time";
import { RobotAvatar } from "@/components/robot-avatar";
import { formatFinishDetail } from "@/lib/format";
import { leagueIdentity } from "@/lib/league-identity";
import type { BoutDetail, BoutParticipant } from "@/lib/queries";
import { cn } from "@/lib/utils";

/**
 * One bout, as it appears on a fight card, a results list, a robot's history,
 * and a team page.
 *
 * Deliberately one component rather than four: the rule for who is shown as
 * the winner is the same everywhere, and four copies of it would drift.
 *
 * The layout follows UFC's fight card, and the two borrowed details both earn
 * their place on a site covering FIVE leagues rather than one:
 *
 * - The weight class sits centred ABOVE the matchup rather than as a badge
 *   below it, because it qualifies the whole bout rather than either corner.
 * - Each corner carries its team's flag. This sport is Chinese, American and
 *   Gulf-based at once, robots are named things like T800 and PM01, and
 *   nationality is the fastest way a reader orients themselves in a matchup
 *   where none of the names mean anything to them yet.
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
        <div
          className={cn(
            "flex min-w-0 items-center gap-1.5",
            align === "right" && "flex-row-reverse",
          )}
        >
          <CountryTag code={robot.teamCountry} />
          <Link
            href={`/teams/${robot.teamSlug}`}
            className="text-ink-dim hover:text-ink-muted block truncate text-xs transition-colors"
          >
            {robot.teamName}
          </Link>
        </div>
      </div>
    </div>
  );
}

export function BoutRow({
  bout,
  showEvent = false,
  showLeague = false,
  className,
}: {
  bout: BoutDetail;
  /** Adds the event name and date — for lists that span several events. */
  showEvent?: boolean;
  /**
   * Adds the league.
   *
   * Off by default because on a single event's fight card every bout belongs
   * to the same league and repeating it twelve times is noise. On by default
   * at every call site that MIXES leagues — /results, a robot's history, the
   * home page — because this site covers five of them and a result with no
   * league attached is unreadable to someone who has not memorised which
   * robots fight where. ESPN puts a league mark on every score for the same
   * reason, and it matters more here: nobody knows these leagues yet.
   */
  showLeague?: boolean;
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
      {showEvent || showLeague ? (
        <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          {showLeague ? (
            // The league's own colour, not a neutral outline — with five
            // leagues on one list, the colour IS the information.
            <Link
              href={`/competitions/${bout.competitionSlug}`}
              className="font-display rounded px-1.5 py-0.5 text-[0.65rem] font-semibold tracking-wide text-white uppercase transition-opacity hover:opacity-80"
              style={{
                backgroundColor: leagueIdentity(bout.competitionSlug).accent,
              }}
            >
              {bout.competitionName}
            </Link>
          ) : null}
          {showEvent ? (
            <>
              <Link
                href={`/events/${bout.event.slug}`}
                className="text-ink-muted hover:text-volt font-medium transition-colors"
              >
                {bout.event.name}
              </Link>
              <EventTime
                startsAt={bout.event.startsAt.toISOString()}
                timeZone={bout.event.timezone}
                city={bout.event.city}
                timeTbd={bout.event.startTimeTbd}
                className="text-ink-dim"
              />
            </>
          ) : null}
        </div>
      ) : null}

      {/* The weight class qualifies the bout, not either corner — so it is
          centred above the matchup rather than sitting as a badge under one
          side of it. Straight from UFC's fight card, and it is the line that
          makes a row scannable: you know what KIND of fight this is before
          you have read either name. */}
      {bout.robotA.weightClass ? (
        <p className="text-ink-dim mb-2 text-center font-display text-[0.65rem] font-semibold tracking-widest uppercase">
          {bout.robotA.weightClass}
        </p>
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
          // The weight class used to repeat here as a badge. It moved to the
          // centred eyebrow above the matchup, so this slot carries only what
          // the eyebrow does not.
          <Badge variant="outline">{bout.scheduledRounds} rounds</Badge>
        )}
      </div>
    </div>
  );
}

/** A list of bouts inside a Card, with dividers. */
export function BoutList({
  bouts,
  showEvent = false,
  showLeague = false,
}: {
  bouts: BoutDetail[];
  showEvent?: boolean;
  showLeague?: boolean;
}) {
  return (
    <ul>
      {bouts.map((bout) => (
        <li
          key={bout.id}
          className="border-line/60 border-b last:border-b-0"
        >
          <BoutRow bout={bout} showEvent={showEvent} showLeague={showLeague} />
        </li>
      ))}
    </ul>
  );
}
