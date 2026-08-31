import { describe, expect, it } from "vitest";

import { normaliseHeader, parseCsv, readCsv } from "./csv";

/**
 * A CSV reader that is slightly wrong fails silently: a quoted value with a
 * comma splits into two columns and every field after it shifts by one. The
 * import then succeeds, with the wrong data in the wrong columns.
 */

describe("parseCsv", () => {
  it("reads a plain table", () => {
    expect(parseCsv("a,b\n1,2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("keeps commas inside quoted fields", () => {
    // The bug this exists to prevent.
    expect(parseCsv('name,city\n"Meridian Hall, East Wing",Singapore')).toEqual([
      ["name", "city"],
      ["Meridian Hall, East Wing", "Singapore"],
    ]);
  });

  it("unescapes doubled quotes", () => {
    expect(parseCsv('name\n"The ""Hammer"" Mk II"')).toEqual([
      ["name"],
      ['The "Hammer" Mk II'],
    ]);
  });

  it("keeps newlines inside quoted fields", () => {
    expect(parseCsv('bio\n"line one\nline two"')).toEqual([
      ["bio"],
      ["line one\nline two"],
    ]);
  });

  it("treats CRLF as a single row break", () => {
    expect(parseCsv("a,b\r\n1,2\r\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("strips the BOM Excel writes", () => {
    // Without this the first header becomes "﻿slug" and stops matching.
    expect(parseCsv("﻿slug,name\nalpha,Alpha")[0][0]).toBe("slug");
  });

  it("drops entirely blank rows", () => {
    expect(parseCsv("a\n1\n\n\n2\n")).toEqual([["a"], ["1"], ["2"]]);
  });

  it("preserves empty fields in the middle of a row", () => {
    expect(parseCsv("a,b,c\n1,,3")).toEqual([
      ["a", "b", "c"],
      ["1", "", "3"],
    ]);
  });

  it("returns nothing for empty input", () => {
    expect(parseCsv("")).toEqual([]);
    expect(parseCsv("\n\n")).toEqual([]);
  });
});

describe("normaliseHeader", () => {
  it("accepts the spellings a third-party export actually uses", () => {
    for (const variant of ["teamSlug", "Team Slug", "team_slug", " TEAM-SLUG "]) {
      expect(normaliseHeader(variant)).toBe("teamslug");
    }
  });
});

describe("readCsv", () => {
  it("keys records by normalised header and trims values", () => {
    expect(readCsv("Team Slug,Name\n alpha , Alpha Robotics ")).toEqual([
      { teamslug: "alpha", name: "Alpha Robotics" },
    ]);
  });

  it("fills missing trailing columns with empty strings", () => {
    expect(readCsv("a,b,c\n1,2")).toEqual([{ a: "1", b: "2", c: "" }]);
  });

  it("returns nothing when there is only a header", () => {
    expect(readCsv("a,b")).toEqual([]);
  });
});
