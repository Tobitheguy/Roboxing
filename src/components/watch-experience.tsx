"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MonitorPlay, Swords } from "lucide-react";

import { BoutList } from "@/components/bout-row";
import { Card, CardBody, CardBodyFlush, CardHeader } from "@/components/card";
import { EmptyState } from "@/components/empty-state";
import { RoboxingPlayer } from "@/components/roboxing-player";
import type { BoutDetail } from "@/lib/queries";

/** Poll cadence while broadcasting. */
const LIVE_POLL_MS = 10_000;
/**
 * Cadence before the event starts. Slower because nothing is changing yet, but
 * NOT zero — a viewer who opens the page early must see it go live without
 * refreshing, and "arrives early" is the single most common way people show up.
 */
const PRE_LIVE_POLL_MS = 30_000;

type EventStatus = "scheduled" | "live" | "completed" | "cancelled";

type BoutState = {
  id: number;
  status: BoutDetail["status"];
  result: BoutDetail["result"];
};

type EventState = {
  eventStatus: EventStatus;
  currentBoutId: number | null;
  bouts: BoutState[];
};

/**
 * The watch page's live half.
 *
 * Polling rather than WebSockets is a deliberate V1 choice: trivially robust,
 * survives a dropped connection with no reconnect logic, and the endpoint
 * behind it is CDN-cached so load does not scale with the audience. The one
 * inviolable rule is that a result landing must never change the player's
 * `src` — that would restart the video, which is the one thing a viewer will
 * not forgive. `src` changes only when the broadcast itself changes state.
 */
export function WatchExperience({
  eventSlug,
  initialBouts,
  initialEventStatus,
  playbackUrl,
  posterUrl,
  unavailableReason,
  directSource = false,
}: {
  eventSlug: string;
  initialBouts: BoutDetail[];
  initialEventStatus: EventStatus;
  /** Signed HLS manifest, or null when there is nothing to play yet. */
  playbackUrl: string | null;
  posterUrl?: string | null;
  unavailableReason?: string;
  /**
   * The manifest came from outside Cloudflare, so there is no token to renew
   * and no point asking our own endpoint for one.
   */
  directSource?: boolean;
}) {
  const [eventStatus, setEventStatus] = useState<EventStatus>(initialEventStatus);
  const [playback, setPlayback] = useState<string | null>(playbackUrl);
  const [boutStates, setBoutStates] = useState<Map<number, BoutState>>(
    () =>
      new Map(
        initialBouts.map((b) => [
          b.id,
          { id: b.id, status: b.status, result: b.result },
        ]),
      ),
  );
  const [currentBoutId, setCurrentBoutId] = useState<number | null>(
    () => initialBouts.find((b) => b.status === "live")?.id ?? null,
  );

  const isLive = eventStatus === "live";
  const isFinished = eventStatus === "completed" || eventStatus === "cancelled";

  const fetchPlayback = useCallback(async () => {
    try {
      const response = await fetch(`/api/events/${eventSlug}/playback`);
      if (!response.ok) return null;
      const body = (await response.json()) as { url?: string };
      return body.url ?? null;
    } catch {
      return null;
    }
  }, [eventSlug]);

  // Tracks the status the last poll saw, so a TRANSITION can be detected
  // rather than just the current value.
  const lastStatusRef = useRef<EventStatus>(initialEventStatus);

  useEffect(() => {
    // A finished or cancelled event never changes again — nothing to poll.
    // Everything else does, including "scheduled": that is precisely the case
    // where the page must notice the broadcast starting.
    if (isFinished) return;

    let cancelled = false;
    const controller = new AbortController();

    async function poll() {
      try {
        const response = await fetch(`/api/events/${eventSlug}/state`, {
          signal: controller.signal,
        });
        if (!response.ok) return;
        const state = (await response.json()) as EventState;
        if (cancelled) return;

        setEventStatus(state.eventStatus);
        setCurrentBoutId(state.currentBoutId);
        setBoutStates(new Map(state.bouts.map((b) => [b.id, b])));

        // The broadcast changed state: scheduled -> live needs a stream that
        // did not exist when the page rendered, and live -> completed needs to
        // roll over to the recording. Without this the viewer who sat through
        // the whole card is left staring at a frozen final frame.
        if (state.eventStatus !== lastStatusRef.current) {
          lastStatusRef.current = state.eventStatus;
          const url = await fetchPlayback();
          if (!cancelled && url) setPlayback(url);
        }
      } catch {
        // A failed poll is not worth surfacing — the next one is seconds away
        // and the video is unaffected either way.
      }
    }

    // Poll once immediately so a page opened seconds after a result lands is
    // not stale for a full interval.
    void poll();

    const id = setInterval(poll, isLive ? LIVE_POLL_MS : PRE_LIVE_POLL_MS);
    return () => {
      cancelled = true;
      controller.abort();
      clearInterval(id);
    };
  }, [eventSlug, isLive, isFinished, fetchPlayback]);

  // Merge polled state over the server-rendered bouts. A bout's identity,
  // robots, and teams never change mid-event; only status and result do.
  const bouts = useMemo(
    () =>
      initialBouts.map((bout) => {
        const state = boutStates.get(bout.id);
        return state
          ? { ...bout, status: state.status, result: state.result }
          : bout;
      }),
    [initialBouts, boutStates],
  );

  const currentBout = bouts.find((b) => b.id === currentBoutId) ?? null;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div>
        {playback ? (
          <RoboxingPlayer
            src={playback}
            poster={posterUrl}
            isLive={isLive}
            onRefreshSrc={directSource ? undefined : fetchPlayback}
          />
        ) : (
          <div className="border-line bg-surface relative aspect-video w-full overflow-hidden rounded-lg border">
            <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
              <div className="text-ink-dim border-line bg-surface-2 mb-4 flex size-12 items-center justify-center rounded-lg border">
                <MonitorPlay className="size-6" />
              </div>
              <p className="font-display text-ink text-base font-semibold uppercase">
                {isLive ? "Stream not connected" : "Not playing"}
              </p>
              <p className="text-ink-muted mt-2 max-w-sm text-sm">
                {unavailableReason ??
                  "There is nothing to play for this event yet."}
              </p>
            </div>
          </div>
        )}

        {currentBout ? (
          <Card className="mt-4">
            <CardHeader title="On now" />
            <CardBodyFlush>
              <BoutList bouts={[currentBout]} />
            </CardBodyFlush>
          </Card>
        ) : null}
      </div>

      <Card className="lg:sticky lg:top-24 lg:self-start">
        <CardHeader
          title="Fight card"
          action={
            <span className="text-ink-dim tabular text-xs">
              {bouts.length} {bouts.length === 1 ? "bout" : "bouts"}
            </span>
          }
        />
        <CardBodyFlush>
          {bouts.length > 0 ? (
            <BoutList bouts={bouts} />
          ) : (
            <EmptyState
              icon={<Swords />}
              title="Card not announced"
              description="Bouts appear here once the organizer confirms the running order."
            />
          )}
        </CardBodyFlush>
        {bouts.length > 0 ? (
          <CardBody className="border-line border-t">
            <p className="text-ink-dim text-xs">
              {isLive
                ? "Updating live — results appear here as they are recorded."
                : "Listed in running order — the last bout is the main event."}
            </p>
          </CardBody>
        ) : null}
      </Card>
    </div>
  );
}
