import { describe, expect, it } from "vitest";

import {
  describeStripeKey,
  isLiveStripeKey,
  isRestrictedStripeKey,
  isTestStripeKey,
  isValidStripeKeyShape,
} from "./stripe-key";

/**
 * These four lines decide whether the pricing page says "no real money moves".
 * The original version matched on an `sk_` prefix and called a perfectly good
 * `rk_test_` key LIVE — so the tests below name the restricted forms
 * explicitly rather than testing only the shapes that happened to work.
 */

const KEYS = {
  standardTest: "sk_test_51AbCdEf",
  standardLive: "sk_live_51AbCdEf",
  restrictedTest: "rk_test_51AbCdEf",
  restrictedLive: "rk_live_51AbCdEf",
};

describe("test vs live", () => {
  it("recognises both standard and restricted test keys", () => {
    expect(isTestStripeKey(KEYS.standardTest)).toBe(true);
    expect(isTestStripeKey(KEYS.restrictedTest)).toBe(true);
  });

  it("recognises both standard and restricted live keys", () => {
    expect(isLiveStripeKey(KEYS.standardLive)).toBe(true);
    expect(isLiveStripeKey(KEYS.restrictedLive)).toBe(true);
  });

  it("never calls a test key live, or a live key test", () => {
    expect(isLiveStripeKey(KEYS.restrictedTest)).toBe(false);
    expect(isTestStripeKey(KEYS.restrictedLive)).toBe(false);
  });
});

describe("keys it cannot identify", () => {
  // Both answers must be false. Defaulting to "live" cries wolf; defaulting to
  // "test" tells someone no real money is moving when it might be.
  it.each([
    ["undefined", undefined],
    ["empty", ""],
    ["a publishable key", "pk_test_51AbCdEf"],
    ["a webhook secret", "whsec_AbCdEf"],
    ["a mode we do not know", "sk_sandbox_51AbCdEf"],
    ["something else entirely", "hello"],
  ])("claims neither test nor live for %s", (_label, key) => {
    expect(isTestStripeKey(key)).toBe(false);
    expect(isLiveStripeKey(key)).toBe(false);
    expect(isValidStripeKeyShape(key)).toBe(false);
  });
});

describe("restricted detection", () => {
  it("is about the rk_ prefix, not the mode", () => {
    expect(isRestrictedStripeKey(KEYS.restrictedTest)).toBe(true);
    expect(isRestrictedStripeKey(KEYS.restrictedLive)).toBe(true);
    expect(isRestrictedStripeKey(KEYS.standardTest)).toBe(false);
  });
});

describe("describeStripeKey", () => {
  it("names mode and kind", () => {
    expect(describeStripeKey(KEYS.restrictedTest)).toBe(
      "TEST (restricted key)",
    );
    expect(describeStripeKey(KEYS.standardLive)).toBe("LIVE (standard key)");
  });

  it("admits when it does not know, rather than picking one", () => {
    expect(describeStripeKey(undefined)).toBe("not set");
    expect(describeStripeKey("pk_test_1")).toBe("unrecognised key format");
  });
});
