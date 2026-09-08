import Link from "next/link";
import { ArrowRight, Tv } from "lucide-react";

import { Countdown } from "@/components/countdown";
import { EventTime } from "@/components/event-time";
import { LivePill } from "@/components/live-pill";
import { formatDaysUntil } from "@/lib/format";
import { leagueIdentity } from "@/lib/league-identity";
import { cn } from "@/lib/utils";
import {
  getFeaturedEvent,
  getMostRecentCompletedEvent,
} from "@/lib/queries";

/**
 * Two panels: the last event and the next one.
 *
 * Straight from UFC.com's homepage, and it is the single best answer to a
 * calendar this sparse. A "recent activity" grid needs a stream of events to
 * fill it and this sport produces roughly one a month — so the grid would be
 * mostly whitespace, which reads as an abandoned site rather than a young one.
 * Two panels are always exactly two panels, and always true.
 *
 * Unlike UFC's version, each panel names its league. With five of them,
 * "just happened" without an attribution is a fact the reader cannot place.
 */

type Panel = {
  eyebrow: string;
  leagueName: string;
  leagueSlug: string;
  eventName: string;
  eventSlug: string;
  startsAt: Date;
  timezone: string;
  city: string | null;
  startTimeTbd: boolean;
  broadcastUrl: string | null;
  broadcastName: string | null;
  isLive: boolean;
};

function EventPanel({ panel, featured }: { panel: Panel; featured: boolean }) {
  const until = panel.isLive
    ? null
    : formatDaysUntil(panel.startsAt, new Date());
  const identity = leagueIdentity(panel.leagueSlug);

  return (
    <div
      className={cn(
        "relative flex flex-col overflow-hidden p-6 sm:p-8",
        // The featured half — what is live or next — is the ONE dark panel on
        // the light site. That inversion is the visual weight Tobias asked
        // for, and it is spent on the single most important thing on the
        // page rather than sprinkled everywhere. It also keeps a foot in the
        // old broadcast identity: dark is the register of the arena.
        featured && "bg-[#14161a] text-white",
      )}
    >
      {/* The corner wash that used to sit here carried the league's colour;
          with the brand gone black-and-white it went with it. The panels are
          told apart by light-vs-dark alone, which is the whole system now. */}
      <div className="relative mb-3 flex flex-wrap items-center gap-3">
        <p
          className={cn(
            "font-display text-[0.65rem] font-semibold tracking-widest uppercase",
            featured ? "text-white/60" : "text-ink-dim",
          )}
        >
          {panel.eyebrow}
        </p>
        {panel.isLive ? <LivePill status="live" /> : null}
        <Link
          href={`/competitions/${panel.leagueSlug}`}
          className={cn(
            "font-display rounded px-1.5 py-0.5 text-[0.65rem] font-semibold tracking-wide uppercase transition-opacity hover:opacity-80",
            // An ink chip on the ink panel would vanish, so the featured half
            // inverts it — the same rule as everything else on that panel.
            featured
              ? "bg-white text-[#14161a]"
              : "text-white",
          )}
          style={featured ? undefined : { backgroundColor: identity.accent }}
        >
          {panel.leagueName}
        </Link>
      </div>

      <h3
        className={cn(
          "font-display relative text-3xl leading-tight uppercase sm:text-4xl",
          featured ? "text-white" : "text-ink",
        )}
      >
        <Link
          href={`/events/${panel.eventSlug}`}
          className="hover:text-volt transition-colors"
          style={featured ? { color: "inherit" } : undefined}
        >
          {panel.eventName}
        </Link>
      </h3>

      <p
        className={cn(
          "relative mt-3 text-sm",
          featured ? "text-white/70" : "text-ink-muted",
        )}
      >
        <EventTime
          startsAt={panel.startsAt.toISOString()}
          timeZone={panel.timezone}
          city={panel.city}
          timeTbd={panel.startTimeTbd}
        />
        {until ? (
          <span className={featured ? "text-white" : "text-volt"}>
            {" "}
            · {until}
          </span>
        ) : null}
      </p>

      {/* The countdown, big, on the featured panel only. The number a fan
          actually wants, at the size F1 gives it. */}
      {featured && !panel.isLive && !panel.startTimeTbd ? (
        <Countdown
          startsAt={panel.startsAt.toISOString()}
          className="font-display relative mt-4 block text-3xl font-bold text-white sm:text-4xl"
        />
      ) : null}

      <div className="relative mt-6 flex flex-wrap items-center gap-4">
        <Link
          href={`/events/${panel.eventSlug}`}
          className={cn(
            "inline-flex items-center gap-1 text-sm font-medium transition-colors",
            featured
              ? "text-white hover:text-white/70"
              : "text-ink hover:text-volt",
          )}
        >
          {panel.eyebrow === "Just happened" ? "Results" : "Fight card"}
          <ArrowRight className="size-3.5" />
        </Link>
        {panel.broadcastUrl ? (
          <a
            href={panel.broadcastUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "inline-flex items-center gap-1.5 text-sm transition-colors",
              featured
                ? "text-white/70 hover:text-white"
                : "text-ink-muted hover:text-volt",
            )}
          >
            <Tv className="size-3.5" />
            {panel.broadcastName?.trim() || "Where to watch"}
          </a>
        ) : null}
      </div>
    </div>
  );
}

export async function JustHappenedUpNext() {
  const [last, featured] = await Promise.all([
    getMostRecentCompletedEvent(),
    getFeaturedEvent(),
  ]);

  const panels: Panel[] = [];

  if (last) {
    panels.push({
      eyebrow: "Just happened",
      leagueName: last.competitionName,
      leagueSlug: last.competitionSlug,
      eventName: last.event.name,
      eventSlug: last.event.slug,
      startsAt: last.event.startsAt,
      timezone: last.event.timezone,
      city: last.event.city,
      startTimeTbd: last.event.startTimeTbd,
      broadcastUrl: last.event.broadcastUrl,
      broadcastName: last.event.broadcastName,
      isLive: false,
    });
  }

  if (featured) {
    panels.push({
      eyebrow: featured.isLive ? "On now" : "Up next",
      leagueName: featured.competitionName,
      leagueSlug: featured.competitionSlug,
      eventName: featured.event.name,
      eventSlug: featured.event.slug,
      startsAt: featured.event.startsAt,
      timezone: featured.event.timezone,
      city: featured.event.city,
      startTimeTbd: featured.event.startTimeTbd,
      broadcastUrl: featured.event.broadcastUrl,
      broadcastName: featured.event.broadcastName,
      isLive: featured.isLive,
    });
  }

  if (panels.length === 0) return null;

  return (
    <section
      className={
        // One panel gets the full width rather than half a band with a hole in
        // it. Before the first event there is no "just happened", and after
        // the last one there is no "up next" — both are ordinary states for a
        // sport this young, not errors.
        panels.length === 2
          ? "border-line bg-surface divide-line grid overflow-hidden rounded-lg border md:grid-cols-2 md:divide-x"
          : "border-line bg-surface overflow-hidden rounded-lg border"
      }
    >
      {panels.map((panel) => (
        <EventPanel
          key={panel.eventSlug + panel.eyebrow}
          panel={panel}
          // The live-or-next panel carries the dark treatment; "just happened"
          // stays light. When only one panel exists it is featured by default —
          // a lone light panel here would leave the page with no anchor.
          featured={panel.eyebrow !== "Just happened"}
        />
      ))}
    </section>
  );
}
