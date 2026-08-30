"use client";

import { useEffect, useMemo, useState } from "react";
import { MonitorPlay, Swords } from "lucide-react";

import { BoutList } from "@/components/bout-row";
import { Card, CardBody, CardBodyFlush, CardHeader } from "@/components/card";
import { EmptyState } from "@/components/empty-state";
import { RoboxingPlayer } from "@/components/roboxing-player";
import type { BoutDetail } from "@/lib/queries";

/** How often the fight card asks whether anything has changed. */
const POLL_INTERVAL_MS = 10_000;

type BoutState = {
  id: number;
  status: BoutDetail["status"];
  result: BoutDetail["result"];
};

type EventState = {
  eventStatus: "scheduled" | "live" | "completed" | "cancelled";
  currentBoutId: number | null;
  bouts: BoutState[];
};

/**
 * The watch page's live half.
 *
 * Polling rather than WebSockets is a deliberate V1 choice: it is trivially
 * robust, survives a dropped connection with no reconnect logic, and the
 * endpoint behind it is CDN-cached so the load does not scale with the
 * audience. The one rule is that a result landing must never touch the video
 * element — re-rendering the player would restart the stream, which is the one
 * thing a viewer will not forgive.
 */
export function WatchExperience({
  eventSlug,
  initialBouts,
  initialEventStatus,
  playbackUrl,
  posterUrl,
  unavailableReason,
}: {
  eventSlug: string;
  initialBouts: BoutDetail[];
  initialEventStatus: "scheduled" | "live" | "completed" | "cancelled";
  /** Signed HLS manifest, or null when there is nothing to play yet. */
  playbackUrl: string | null;
  posterUrl?: string | null;
  /** Why there is no stream, shown in the player's place. */
  unavailableReason?: string;
}) {
  const [eventStatus, setEventStatus] = useState(initialEventStatus);
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

  useEffect(() => {
    // Nothing changes on a finished or unstarted event, so no polling.
    if (!isLive) return;

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
      } catch {
        // A failed poll is not worth surfacing — the next one is ten seconds
        // away and the video is unaffected either way.
      }
    }

    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      controller.abort();
      clearInterval(id);
    };
  }, [eventSlug, isLive]);

  // Merge polled state over the server-rendered bouts. The bout's identity,
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

  const refreshSrc = useMemo(
    () => async () => {
      try {
        const response = await fetch(`/api/events/${eventSlug}/playback`);
        if (!response.ok) return null;
        const body = (await response.json()) as { url?: string };
        return body.url ?? null;
      } catch {
        return null;
      }
    },
    [eventSlug],
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div>
        {playbackUrl ? (
          <RoboxingPlayer
            src={playbackUrl}
            poster={posterUrl}
            isLive={isLive}
            onRefreshSrc={refreshSrc}
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
