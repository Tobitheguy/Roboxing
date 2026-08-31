"use client";

import { useState, useTransition } from "react";
import { Copy, Radio, RotateCcw, Square } from "lucide-react";

import { Badge, MethodBadge, type BoutMethod } from "@/components/badge";
import { Card, CardBody, CardBodyFlush, CardHeader } from "@/components/card";
import { LivePill } from "@/components/live-pill";
import { RobotAvatar } from "@/components/robot-avatar";
import { Button } from "@/components/ui/button";
import {
  clearResult,
  recordResult,
  setBoutStatus,
  setEventStatus,
} from "@/app/admin/actions";
import type { BoutDetail } from "@/lib/queries";
import { cn } from "@/lib/utils";

/**
 * The run-of-show console.
 *
 * The one screen used while a broadcast is happening, by someone who is
 * watching a fight rather than watching this. Every design choice follows from
 * that: the actions are large, the destructive ones are separated from the
 * frequent ones, and every result can be corrected without leaving the page —
 * because the mistake that actually happens is picking the wrong winner in the
 * ten seconds after a knockout.
 */

type EventStatus = "scheduled" | "live" | "completed" | "cancelled";

type StreamCredentials = {
  rtmpUrl: string;
  streamKey: string;
  liveInputId: string;
  reused: boolean;
};

export function LiveConsole({
  eventId,
  initialStatus,
  bouts,
  hasStream,
}: {
  eventId: number;
  initialStatus: EventStatus;
  bouts: BoutDetail[];
  hasStream: boolean;
}) {
  const [status, setStatus] = useState<EventStatus>(initialStatus);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const changeStatus = (next: EventStatus) => {
    setError(null);
    startTransition(async () => {
      const result = await setEventStatus({ eventId, status: next });
      if (result.ok) setStatus(next);
      else setError(result.error);
    });
  };

  return (
    <div className="space-y-6">
      {error ? (
        <p
          role="alert"
          className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm"
        >
          {error}
        </p>
      ) : null}

      {/* ---------------------------------------------------------------- */}
      <Card>
        <CardHeader
          title="Broadcast"
          action={
            status === "live" ? (
              <LivePill status="live" />
            ) : (
              <Badge variant="outline">{status}</Badge>
            )
          }
        />
        <CardBody className="flex flex-wrap items-center gap-3">
          {status !== "live" ? (
            <Button
              size="lg"
              disabled={pending || status === "completed"}
              onClick={() => changeStatus("live")}
            >
              <Radio />
              Go live
            </Button>
          ) : (
            // Ending is separated from every other control and styled as
            // destructive, because it is the one button on this screen that
            // cannot be undone by clicking it again mid-event.
            <Button
              size="lg"
              variant="destructive"
              disabled={pending}
              onClick={() => changeStatus("completed")}
            >
              <Square />
              End event
            </Button>
          )}

          {status === "completed" ? (
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => changeStatus("live")}
            >
              <RotateCcw />
              Reopen
            </Button>
          ) : null}

          <p className="text-ink-dim text-xs">
            {status === "live"
              ? "The site shows a LIVE badge and viewers are polling for results."
              : "Viewers see the countdown until this is switched on."}
          </p>
        </CardBody>
      </Card>

      <StreamPanel eventId={eventId} hasStream={hasStream} />

      {/* ---------------------------------------------------------------- */}
      <Card>
        <CardHeader
          title="Fight card"
          action={
            <span className="text-ink-dim tabular text-xs">
              {bouts.filter((b) => b.result).length} / {bouts.length} recorded
            </span>
          }
        />
        <CardBodyFlush>
          {bouts.length === 0 ? (
            <p className="text-ink-muted px-6 py-8 text-center text-sm">
              No bouts on this card yet.
            </p>
          ) : (
            <ul>
              {bouts.map((bout) => (
                <li
                  key={bout.id}
                  className="border-line/60 border-b last:border-b-0"
                >
                  <BoutRow bout={bout} />
                </li>
              ))}
            </ul>
          )}
        </CardBodyFlush>
      </Card>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function StreamPanel({
  eventId,
  hasStream,
}: {
  eventId: number;
  hasStream: boolean;
}) {
  const [credentials, setCredentials] = useState<StreamCredentials | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const fetchCredentials = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/streams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body.error ?? "Could not reach Cloudflare.");
        return;
      }
      setCredentials(body as StreamCredentials);
    } catch {
      setError("Could not reach Cloudflare.");
    } finally {
      setLoading(false);
    }
  };

  const copy = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // Clipboard is blocked in some contexts; the value is selectable anyway.
    }
  };

  return (
    <Card>
      <CardHeader title="Stream credentials" />
      <CardBody className="space-y-4">
        {!credentials ? (
          <>
            <p className="text-ink-muted text-sm">
              {hasStream
                ? "A live input already exists for this event. Fetch its credentials to hand to whoever is broadcasting."
                : "Creates a Cloudflare live input and returns the RTMP address and key for OBS."}
            </p>
            <Button onClick={fetchCredentials} disabled={loading}>
              {loading
                ? "Contacting Cloudflare…"
                : hasStream
                  ? "Show credentials"
                  : "Create live input"}
            </Button>
          </>
        ) : (
          <>
            <p className="text-ink-muted text-sm">
              Paste these into OBS under Settings → Stream, with Service set to
              Custom. {credentials.reused ? "This input already existed." : null}
            </p>

            {(
              [
                ["Server", credentials.rtmpUrl],
                ["Stream key", credentials.streamKey],
              ] as const
            ).map(([label, value]) => (
              <div key={label}>
                <p className="eyebrow mb-1">{label}</p>
                <div className="flex items-center gap-2">
                  <code className="border-line bg-surface-2 text-ink min-w-0 flex-1 truncate rounded-md border px-3 py-2 font-mono text-xs">
                    {value}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label={`Copy ${label}`}
                    onClick={() => copy(label, value)}
                  >
                    <Copy />
                  </Button>
                </div>
                {copied === label ? (
                  <p className="text-volt mt-1 text-xs">Copied.</p>
                ) : null}
              </div>
            ))}

            <p className="text-ink-dim text-xs">
              The key is shown here and never stored. Reopen this panel to fetch
              it again from Cloudflare.
            </p>
          </>
        )}

        {error ? (
          <p
            role="alert"
            className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm"
          >
            {error}
          </p>
        ) : null}
      </CardBody>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */

const METHODS: BoutMethod[] = [
  "ko",
  "tko",
  "decision",
  "draw",
  "dq",
  "no_contest",
];

function BoutRow({ bout }: { bout: BoutDetail }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isLive = bout.status === "live";

  const mark = (status: "live" | "scheduled") => {
    setError(null);
    startTransition(async () => {
      const result = await setBoutStatus({ boutId: bout.id, status });
      if (!result.ok) setError(result.error);
    });
  };

  const undo = () => {
    setError(null);
    startTransition(async () => {
      const result = await clearResult({ boutId: bout.id });
      if (!result.ok) setError(result.error);
    });
  };

  const submit = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      const result = await recordResult(null, formData);
      if (result.ok) setOpen(false);
      else setError(result.error);
    });
  };

  return (
    <div className={cn("px-4 py-4 sm:px-6", isLive && "bg-live/5")}>
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-display tabular text-ink-dim w-6 text-sm font-bold">
          {bout.orderIndex}
        </span>

        <div className="flex min-w-0 flex-1 items-center gap-2">
          <RobotAvatar name={bout.robotA.name} size="sm" decorative />
          <span className="font-display text-ink truncate text-sm font-semibold uppercase">
            {bout.robotA.name}
          </span>
          <span className="text-ink-dim text-xs">vs</span>
          <span className="font-display text-ink truncate text-sm font-semibold uppercase">
            {bout.robotB.name}
          </span>
          <RobotAvatar name={bout.robotB.name} size="sm" decorative />
        </div>

        <div className="flex items-center gap-2">
          {bout.result ? (
            <>
              <MethodBadge method={bout.result.method} />
              <Button
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={undo}
              >
                Undo
              </Button>
            </>
          ) : (
            <>
              {isLive ? (
                <LivePill status="live" />
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pending}
                  onClick={() => mark("live")}
                >
                  <Radio />
                  On now
                </Button>
              )}
              <Button size="sm" disabled={pending} onClick={() => setOpen((v) => !v)}>
                Result
              </Button>
            </>
          )}
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-destructive mt-2 text-xs">
          {error}
        </p>
      ) : null}

      {open && !bout.result ? (
        <form action={submit} className="border-line mt-4 rounded-md border p-4">
          <input type="hidden" name="boutId" value={bout.id} />

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="eyebrow mb-1 block">Winner</span>
              <select
                name="winnerRobotId"
                defaultValue=""
                className="border-input bg-surface-2 text-ink w-full rounded-md border px-3 py-2 text-sm"
              >
                <option value="">None (draw / no contest)</option>
                <option value={bout.robotA.id}>{bout.robotA.name}</option>
                <option value={bout.robotB.id}>{bout.robotB.name}</option>
              </select>
            </label>

            <label className="block">
              <span className="eyebrow mb-1 block">Method</span>
              <select
                name="method"
                defaultValue="ko"
                className="border-input bg-surface-2 text-ink w-full rounded-md border px-3 py-2 text-sm"
              >
                {METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m.replace("_", " ")}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="eyebrow mb-1 block">End round</span>
              <input
                name="endRound"
                type="number"
                min={1}
                max={bout.scheduledRounds}
                className="border-input bg-surface-2 text-ink tabular w-full rounded-md border px-3 py-2 text-sm"
              />
            </label>

            <label className="block">
              <span className="eyebrow mb-1 block">End time (seconds)</span>
              <input
                name="endTimeSeconds"
                type="number"
                min={0}
                max={3600}
                className="border-input bg-surface-2 text-ink tabular w-full rounded-md border px-3 py-2 text-sm"
              />
            </label>

            <label className="block">
              <span className="eyebrow mb-1 block">
                Knockdowns · {bout.robotA.name}
              </span>
              <input
                name="knockdownsA"
                type="number"
                min={0}
                defaultValue={0}
                className="border-input bg-surface-2 text-ink tabular w-full rounded-md border px-3 py-2 text-sm"
              />
            </label>

            <label className="block">
              <span className="eyebrow mb-1 block">
                Knockdowns · {bout.robotB.name}
              </span>
              <input
                name="knockdownsB"
                type="number"
                min={0}
                defaultValue={0}
                className="border-input bg-surface-2 text-ink tabular w-full rounded-md border px-3 py-2 text-sm"
              />
            </label>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Record result"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
