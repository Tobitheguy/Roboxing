import { describe, expect, it } from "vitest";

import { decideAccess, type EntitlementRecord } from "./entitlements";

/**
 * This function is the paywall. If it is wrong in one direction Roboxing gives
 * the stream away; if it is wrong in the other it refuses a paying customer
 * during the event they paid for. Both failures are expensive and neither is
 * visible in a screenshot, so every branch is pinned here.
 */

const EVENT_ID = 42;
const EVENT_START = new Date("2026-09-20T20:00:00Z");

const sub = (
  startsAt: string,
  endsAt: string | null,
  overrides: Partial<EntitlementRecord> = {},
): EntitlementRecord => ({
  kind: "subscription",
  eventId: null,
  startsAt: new Date(startsAt),
  endsAt: endsAt === null ? null : new Date(endsAt),
  ...overrides,
});

const ask = (
  eventAccess: "free" | "subscription",
  entitlements: EntitlementRecord[] | null,
) =>
  decideAccess({
    eventId: EVENT_ID,
    eventAccess,
    eventStartsAt: EVENT_START,
    entitlements,
  });

describe("free events", () => {
  it("let anyone watch, signed out included", () => {
    expect(ask("free", null)).toEqual({ allowed: true, reason: "free" });
  });

  it("let signed-in users with no entitlement watch", () => {
    expect(ask("free", [])).toEqual({ allowed: true, reason: "free" });
  });
});

describe("subscription events", () => {
  it("ask a signed-out visitor to sign in, not to subscribe", () => {
    // The distinction matters: these are two different buttons, and telling
    // an existing subscriber to buy again is how you generate a refund.
    expect(ask("subscription", null)).toEqual({
      allowed: false,
      reason: "sign_in_required",
    });
  });

  it("refuse a signed-in user with no entitlements", () => {
    expect(ask("subscription", [])).toEqual({
      allowed: false,
      reason: "subscription_required",
    });
  });

  it("admit a subscription whose window covers the event", () => {
    expect(
      ask("subscription", [sub("2026-09-01T00:00:00Z", "2026-10-01T00:00:00Z")]),
    ).toEqual({ allowed: true, reason: "entitled" });
  });

  it("admit an open-ended grant", () => {
    expect(
      ask("subscription", [
        sub("2026-01-01T00:00:00Z", null, { kind: "complimentary" }),
      ]),
    ).toEqual({ allowed: true, reason: "entitled" });
  });
});

describe("the time window is the whole point", () => {
  it("keeps access to an event that happened before the subscription ended", () => {
    // Cancelled on the 25th; the event was on the 20th. They paid for it.
    expect(
      ask("subscription", [sub("2026-09-01T00:00:00Z", "2026-09-25T00:00:00Z")]),
    ).toEqual({ allowed: true, reason: "entitled" });
  });

  it("refuses an event that happened before the subscription started", () => {
    // Subscribed the day after. That card was never paid for.
    expect(
      ask("subscription", [sub("2026-09-21T00:00:00Z", "2026-10-21T00:00:00Z")]),
    ).toEqual({ allowed: false, reason: "subscription_required" });
  });

  it("refuses an event after the subscription lapsed", () => {
    expect(
      ask("subscription", [sub("2026-07-01T00:00:00Z", "2026-08-01T00:00:00Z")]),
    ).toEqual({ allowed: false, reason: "subscription_required" });
  });

  it("treats the window as start-inclusive and end-exclusive", () => {
    // Starting exactly at kickoff counts.
    expect(
      ask("subscription", [sub("2026-09-20T20:00:00Z", null)]),
    ).toEqual({ allowed: true, reason: "entitled" });

    // Ending exactly at kickoff does not — the period was already over.
    expect(
      ask("subscription", [
        sub("2026-08-20T20:00:00Z", "2026-09-20T20:00:00Z"),
      ]),
    ).toEqual({ allowed: false, reason: "subscription_required" });
  });

  it("admits when any one of several entitlements covers the event", () => {
    expect(
      ask("subscription", [
        sub("2026-01-01T00:00:00Z", "2026-02-01T00:00:00Z"), // lapsed
        sub("2026-09-01T00:00:00Z", "2026-10-01T00:00:00Z"), // current
      ]),
    ).toEqual({ allowed: true, reason: "entitled" });
  });
});

describe("per-event grants", () => {
  it("unlock only their own event", () => {
    const other = sub("2026-09-01T00:00:00Z", "2026-10-01T00:00:00Z", {
      kind: "ppv",
      eventId: 999,
    });
    expect(ask("subscription", [other])).toEqual({
      allowed: false,
      reason: "subscription_required",
    });
  });

  it("unlock the event they name", () => {
    const mine = sub("2026-09-01T00:00:00Z", "2026-10-01T00:00:00Z", {
      kind: "ppv",
      eventId: EVENT_ID,
    });
    expect(ask("subscription", [mine])).toEqual({
      allowed: true,
      reason: "entitled",
    });
  });

  it("still respect the window for the event they name", () => {
    const expired = sub("2026-01-01T00:00:00Z", "2026-02-01T00:00:00Z", {
      kind: "ppv",
      eventId: EVENT_ID,
    });
    expect(ask("subscription", [expired])).toEqual({
      allowed: false,
      reason: "subscription_required",
    });
  });
});
