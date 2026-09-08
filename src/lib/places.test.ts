import { describe, expect, it } from "vitest";

import {
  COUNTRIES,
  STATE_COUNTRY,
  US_STATES,
  countryCode,
  countryName,
  isKnownCountry,
  isKnownUsState,
} from "./places";
import { isValidTimeZone, safeTimeZone } from "./timezones";

/**
 * Country codes are not decoration. `events.allowed_countries` carries
 * territory rights through to Cloudflare's geo rules, so "USA" instead of "US"
 * is not a typo in a label — it is a rule that matches nothing.
 */

describe("countries", () => {
  it("uses two-letter uppercase ISO codes throughout", () => {
    for (const country of COUNTRIES) {
      expect(country.code).toMatch(/^[A-Z]{2}$/);
      expect(country.name.length).toBeGreaterThan(1);
    }
  });

  it("has no duplicates", () => {
    const codes = COUNTRIES.map((c) => c.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("accepts a known code in either case", () => {
    expect(isKnownCountry("US")).toBe(true);
    expect(isKnownCountry("us")).toBe(true);
  });

  it.each(["USA", "United States", "U.S.", "XX", ""])(
    "refuses %s",
    (value) => {
      expect(isKnownCountry(value)).toBe(false);
    },
  );

  it("includes the country the state field is for", () => {
    expect(isKnownCountry(STATE_COUNTRY)).toBe(true);
  });
});

describe("US states", () => {
  it("covers the 50 states plus DC and Puerto Rico", () => {
    expect(US_STATES).toHaveLength(52);
    expect(isKnownUsState("NY")).toBe(true);
    expect(isKnownUsState("DC")).toBe(true);
    expect(isKnownUsState("PR")).toBe(true);
  });

  it("uses two-letter uppercase codes with no duplicates", () => {
    for (const s of US_STATES) expect(s.code).toMatch(/^[A-Z]{2}$/);
    const codes = US_STATES.map((s) => s.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it.each(["New York", "NYC", "ZZ", ""])("refuses %s", (value) => {
    expect(isKnownUsState(value)).toBe(false);
  });
});

/**
 * An unrecognised timezone does not render wrongly — Intl throws a RangeError,
 * inside a component, on the public watch page and the landing hero. One typo
 * in an admin field could take the home page down.
 */
describe("timezones", () => {
  it.each([
    "UTC",
    "America/New_York",
    "America/Los_Angeles",
    "Asia/Singapore",
    "Europe/Berlin",
  ])("accepts %s", (zone) => {
    expect(isValidTimeZone(zone)).toBe(true);
    // The real check: Intl must not throw on anything we accept.
    expect(() =>
      new Intl.DateTimeFormat("en-US", { timeZone: zone }).format(new Date(0)),
    ).not.toThrow();
  });

  it.each([
    "America/NewYork",
    "EST5EDT_typo",
    "Nonsense/Zone",
    "New York",
    "",
  ])("refuses %s", (zone) => {
    expect(isValidTimeZone(zone)).toBe(false);
  });

  it("falls back to UTC rather than throwing on stored rubbish", () => {
    // This is the guard for data that is already in the database, or arrives
    // through an import that bypassed the form.
    expect(safeTimeZone("Nonsense/Zone")).toBe("UTC");
    expect(safeTimeZone(null)).toBe("UTC");
    expect(safeTimeZone(undefined)).toBe("UTC");
    expect(safeTimeZone("")).toBe("UTC");
  });

  it("passes a good zone straight through", () => {
    expect(safeTimeZone("Asia/Tokyo")).toBe("Asia/Tokyo");
  });
});

/**
 * The country mark beside every corner of every bout. Two letters rather than
 * a flag emoji: Windows ships no flag emoji font, so 🇺🇸 rendered as a tiny
 * "US" there while showing a real flag on macOS. See `CountryTag`.
 */
describe("countryCode", () => {
  it("normalises a two-letter code", () => {
    expect(countryCode("cn")).toBe("CN");
    expect(countryCode(" us ")).toBe("US");
    expect(countryCode("SA")).toBe("SA");
  });

  it("returns null for anything that is not one", () => {
    for (const bad of [null, undefined, "", "C", "USA", "1A", "C-"]) {
      expect(countryCode(bad)).toBeNull();
    }
  });

  it("accepts every code on the pick list", () => {
    for (const country of COUNTRIES) {
      expect(countryCode(country.code)).toBe(country.code);
    }
  });

  it("accepts a code that is NOT on the pick list", () => {
    // COUNTRIES is what an admin may choose from. Refusing here would hide a
    // data-entry gap behind a missing label. "ZZ" is user-assigned in ISO
    // 3166 and so is guaranteed never to join the list.
    expect(countryCode("ZZ")).toBe("ZZ");
  });
});

describe("countryName", () => {
  it("expands a known code", () => {
    expect(countryName("CN")).toBe("China");
    expect(countryName("us")).toBe("United States");
  });

  it("falls back to the code itself for one we do not list", () => {
    // Used as the accessible expansion of an abbreviation, so it must never
    // come back empty and leave a screen reader spelling out two letters.
    expect(countryName("ZZ")).toBe("ZZ");
  });

  it("expands every code on the pick list to a real name", () => {
    for (const country of COUNTRIES) {
      expect(countryName(country.code)).toBe(country.name);
    }
  });

  it("is null for a malformed code", () => {
    expect(countryName("USA")).toBeNull();
    expect(countryName(null)).toBeNull();
  });
});
