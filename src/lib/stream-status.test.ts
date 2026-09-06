import { describe, expect, it } from "vitest";

import {
  classifyLiveInputStatus,
  liveInputSignal,
  readLiveInputStatus,
} from "./stream-status";

/**
 * The check these cover used to be `status?.current?.state === "connected"`.
 *
 * It shipped unverified and failed on the first real broadcast: OBS reported
 * "reconnection successful", Cloudflare called that `reconnected`, and the
 * console told the broadcaster there was no signal while the stream was up.
 *
 * So the cases below name every documented state explicitly rather than only
 * the one that happened to work.
 */

describe("states in which video is arriving", () => {
  it("counts a reconnected input as receiving", () => {
    // The exact case that was broken. A dropped-and-restored encoder is the
    // normal condition of any home connection, not an outage.
    expect(liveInputSignal({ current: { state: "reconnected" } })).toBe(
      "receiving",
    );
  });

  it("counts a freshly connected input as receiving", () => {
    expect(liveInputSignal({ current: { state: "connected" } })).toBe(
      "receiving",
    );
  });
});

describe("states in between", () => {
  // Neither certainty is true yet, and claiming either one misdirects someone.
  it.each(["reconnecting", "new_configuration_accepted"])(
    "reports %s as reconnecting, not as no-signal",
    (state) => {
      expect(liveInputSignal({ current: { state } })).toBe("reconnecting");
    },
  );
});

describe("states in which nothing is arriving", () => {
  it.each([
    "client_disconnect",
    "ttl_exceeded",
    "failed_to_connect",
    "failed_to_reconnect",
  ])("reports %s as not receiving", (state) => {
    expect(liveInputSignal({ current: { state } })).toBe("not-receiving");
  });

  it("treats a null status as never-connected, which is a real no", () => {
    // Cloudflare uses `status: null` for an input nobody has pushed to. That
    // is a certainty, so it must not be softened into "unknown".
    expect(readLiveInputStatus(null)).toEqual({ kind: "never-connected" });
    expect(liveInputSignal(null)).toBe("not-receiving");
    expect(liveInputSignal(undefined)).toBe("not-receiving");
  });
});

describe("shapes Cloudflare's docs disagree about", () => {
  // The API reference puts the enum on `status`; the examples nest it under
  // `status.current.state`. Betting on one is what made the original fragile —
  // the wrong bet would have pinned the light to red for every input forever.
  it.each([
    ["status.current.state", { current: { state: "connected" } }],
    ["status.state", { state: "connected" }],
    ["a bare string", "connected"],
  ])("reads the state out of %s", (_label, status) => {
    expect(readLiveInputStatus(status)).toEqual({
      kind: "state",
      state: "connected",
    });
  });
});

describe("what it does not know, it does not guess", () => {
  it("calls an unrecognised state unknown rather than blaming the encoder", () => {
    // Cloudflare can add a state whenever it likes. A state missing from our
    // list means this file is out of date, not that someone's encoder is down.
    expect(liveInputSignal({ current: { state: "some_future_state" } })).toBe(
      "unknown",
    );
  });

  it.each([
    ["an empty object", {}],
    ["a nested object with no state", { current: {} }],
    ["a number", 42],
    ["an empty string", ""],
    ["a non-string state", { current: { state: 7 } }],
  ])("calls %s unreadable, not not-receiving", (_label, status) => {
    expect(readLiveInputStatus(status)).toEqual({ kind: "unreadable" });
    expect(liveInputSignal(status)).toBe("unknown");
  });

  it("keeps 'we could not read it' distinct from 'nothing is connected'", () => {
    // The whole point. Collapsing these two is the bug being fixed: one means
    // check the encoder, the other means check our own code.
    expect(classifyLiveInputStatus({ kind: "unreadable" })).toBe("unknown");
    expect(classifyLiveInputStatus({ kind: "never-connected" })).toBe(
      "not-receiving",
    );
  });
});
