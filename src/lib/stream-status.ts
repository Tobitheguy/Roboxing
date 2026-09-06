/**
 * Reading a Cloudflare live input's status.
 *
 * Deliberately NOT in stream.ts: that file is `server-only`, and this logic is
 * the part worth testing. The check it replaces was one line —
 * `status?.current?.state === "connected"` — and it was wrong in two ways at
 * once, which is what an untestable one-liner buys you.
 *
 * Cloudflare reports one of eight states:
 *
 *   connected                   a signal is arriving
 *   reconnected                 the encoder dropped and came back; still live
 *   reconnecting                dropped, encoder is trying again
 *   new_configuration_accepted  settings changed, signal expected imminently
 *   client_disconnect           the broadcaster stopped, cleanly
 *   ttl_exceeded                Cloudflare ended it
 *   failed_to_connect           the encoder never got in
 *   failed_to_reconnect         it dropped and could not get back
 *
 * The old check accepted exactly the first one. OBS reporting "reconnection
 * successful" — an ordinary thing to happen on a home connection, and what
 * happened on the very first real test — put the input in `reconnected`, and
 * the console announced there was no signal while the broadcast was fine.
 *
 * That is the worst possible failure for this particular light, because its
 * entire job is to separate "the broadcaster never connected" from "the
 * connection is fine and playback is broken". Those have opposite fixes. A
 * light stuck on one answer sends someone to debug the part that was working.
 */

/** States in which video is genuinely arriving. */
const RECEIVING = new Set(["connected", "reconnected"]);

/**
 * States where a signal is expected imminently but is not here yet.
 *
 * Reported apart from both certainties. Calling this "no signal" would send a
 * broadcaster to re-check cables during the two seconds their encoder was
 * already fixing itself; calling it "receiving" would promise a picture that
 * is not on screen.
 */
const RECONNECTING = new Set(["reconnecting", "new_configuration_accepted"]);

/** States that positively mean nothing is arriving. */
const NOT_RECEIVING = new Set([
  "client_disconnect",
  "ttl_exceeded",
  "failed_to_connect",
  "failed_to_reconnect",
]);

/**
 * What we managed to read out of the `status` field.
 *
 * Three outcomes, not two, because "Cloudflare told us nothing is connected"
 * and "we could not understand what Cloudflare told us" must never collapse
 * into the same answer — that collapse is the bug this file exists to fix.
 */
export type LiveInputStatusReading =
  /** `status: null` — Cloudflare's way of saying nothing has ever connected. */
  | { kind: "never-connected" }
  /** A state string we found, whatever it turns out to mean. */
  | { kind: "state"; state: string }
  /** A status object in a shape we did not expect. We know that we do not know. */
  | { kind: "unreadable" };

export type StreamSignal =
  | "receiving"
  | "reconnecting"
  | "not-receiving"
  | "unknown";

/**
 * Pull the state string out of a live input's `status`, whatever shape it is in.
 *
 * Cloudflare's own documentation disagrees with itself here: the API reference
 * lists the state enum directly on `status`, while the live-input examples nest
 * it under `status.current.state`. We could not settle it from the outside —
 * the Stream credentials live only in the deployment environment — so this
 * accepts every documented shape rather than betting on one.
 *
 * The bet is what made the original fragile: if the shape had been the other
 * one, `status?.current?.state` would have been `undefined` for every input in
 * every state, and the light would have been red permanently instead of
 * intermittently. Both defects look identical from the outside, which is
 * exactly why guessing was never going to end well.
 */
export function readLiveInputStatus(status: unknown): LiveInputStatusReading {
  if (status === null || status === undefined) return { kind: "never-connected" };

  // `status: "connected"` — the flattest reading of the API reference.
  if (typeof status === "string") {
    return status ? { kind: "state", state: status } : { kind: "unreadable" };
  }

  if (typeof status !== "object") return { kind: "unreadable" };

  const record = status as Record<string, unknown>;

  // `status.current.state` — the shape the examples show.
  const current = record.current;
  if (current && typeof current === "object") {
    const state = (current as Record<string, unknown>).state;
    if (typeof state === "string" && state) return { kind: "state", state };
  }

  // `status.state` — the shape the API reference describes.
  if (typeof record.state === "string" && record.state) {
    return { kind: "state", state: record.state };
  }

  return { kind: "unreadable" };
}

/**
 * Turn a reading into the answer the console shows.
 *
 * An unrecognised state resolves to `unknown`, never to `not-receiving`.
 * Cloudflare can add a state at any time, and a state we have never heard of
 * is not evidence that someone's encoder is down — it is evidence that this
 * list is out of date. Saying so is honest; blaming the encoder is not.
 */
export function classifyLiveInputStatus(
  reading: LiveInputStatusReading,
): StreamSignal {
  switch (reading.kind) {
    // Nothing has ever pushed to this input. That is a real, certain "no".
    case "never-connected":
      return "not-receiving";
    case "unreadable":
      return "unknown";
    case "state":
      if (RECEIVING.has(reading.state)) return "receiving";
      if (RECONNECTING.has(reading.state)) return "reconnecting";
      if (NOT_RECEIVING.has(reading.state)) return "not-receiving";
      return "unknown";
  }
}

/** Convenience: read and classify in one step. */
export function liveInputSignal(status: unknown): StreamSignal {
  return classifyLiveInputStatus(readLiveInputStatus(status));
}
