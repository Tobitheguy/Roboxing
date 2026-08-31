import { describe, expect, it } from "vitest";

import { decideAccess, type EntitlementRecord } from "./entitlements";

/**
 * This function is the paywall. Wrong one way it gives the stream away; wrong
 * the other it locks out a paying customer during the event they paid for.
 * Neither failure is visible in a screenshot.
 */

const EVENT_ID = 42;
const NOW = new Date("2026-09-20T12:00:00Z");

const grant = (
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
  now: Date = NOW,
) =>
  decideAccess({ eventId: EVENT_ID, eventAccess, now, entitlements });

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

  it("admit a subscription that is active right now", () => {
    expect(
      ask("subscription", [
        grant("2026-09-01T00:00:00Z", "2026-10-01T00:00:00Z"),
      ]),
    ).toEqual({ allowed: true, reason: "entitled" });
  });

  it("admit an open-ended grant", () => {
    expect(
      ask("subscription", [
        grant("2026-01-01T00:00:00Z", null, { kind: "complimentary" }),
      ]),
    ).toEqual({ allowed: true, reason: "entitled" });
  });
});

describe("the whole library, while the subscription is active", () => {
  it("unlocks an event that happened BEFORE the subscription began", () => {
    // The bug this test exists for. The event is from June; this person
    // subscribed in September. A subscription sells the back catalogue —
    // locking them out of it is locking them out of most of what they bought.
    expect(
      ask("subscription", [
        grant("2026-09-01T00:00:00Z", "2026-10-01T00:00:00Z"),
      ]),
    ).toEqual({ allowed: true, reason: "entitled" });
  });

  it("refuses once the subscription has lapsed, including for old events", () => {
    // Cancelled in July. In September they can watch nothing, not even the
    // June event they could watch while paying. That is what a subscription
    // is, and the pricing page says so: access runs until the period ends.
    expect(
      ask("subscription", [
        grant("2026-05-01T00:00:00Z", "2026-07-01T00:00:00Z"),
      ]),
    ).toEqual({ allowed: false, reason: "subscription_required" });
  });

  it("refuses before the subscription starts", () => {
    expect(
      ask("subscription", [
        grant("2026-10-01T00:00:00Z", "2026-11-01T00:00:00Z"),
      ]),
    ).toEqual({ allowed: false, reason: "subscription_required" });
  });

  it("treats the window as start-inclusive and end-exclusive", () => {
    expect(ask("subscription", [grant(NOW.toISOString(), null)])).toEqual({
      allowed: true,
      reason: "entitled",
    });

    expect(
      ask("subscription", [grant("2026-08-01T00:00:00Z", NOW.toISOString())]),
    ).toEqual({ allowed: false, reason: "subscription_required" });
  });

  it("admits when any one of several entitlements is active", () => {
    expect(
      ask("subscription", [
        grant("2026-01-01T00:00:00Z", "2026-02-01T00:00:00Z"), // lapsed
        grant("2026-09-01T00:00:00Z", "2026-10-01T00:00:00Z"), // current
      ]),
    ).toEqual({ allowed: true, reason: "entitled" });
  });

  // Note: the event's own date is no longer an input to this function at all.
  // The type carries no eventStartsAt, so "does it depend on when the event
  // happened" is answered by the compiler rather than by a test.
});

describe("per-event grants", () => {
  it("unlock only their own event", () => {
    const other = grant("2026-09-01T00:00:00Z", null, {
      kind: "ppv",
      eventId: 999,
    });
    expect(ask("subscription", [other])).toEqual({
      allowed: false,
      reason: "subscription_required",
    });
  });

  it("unlock the event they name", () => {
    const mine = grant("2026-09-01T00:00:00Z", null, {
      kind: "ppv",
      eventId: EVENT_ID,
    });
    expect(ask("subscription", [mine])).toEqual({
      allowed: true,
      reason: "entitled",
    });
  });

  it("stop working once their own window closes", () => {
    const expired = grant("2026-01-01T00:00:00Z", "2026-02-01T00:00:00Z", {
      kind: "ppv",
      eventId: EVENT_ID,
    });
    expect(ask("subscription", [expired])).toEqual({
      allowed: false,
      reason: "subscription_required",
    });
  });
});
