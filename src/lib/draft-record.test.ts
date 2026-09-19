import { describe, expect, it } from "vitest";

import { rejectDraft, type DraftPayload } from "./draft-record";

/**
 * The gate between a model's claim and a row a human is asked to approve.
 *
 * Everything here is about the same failure: a draft that LOOKS reviewable and
 * is not. A reviewer scanning a queue at 7am approves what reads as complete,
 * so the fields that reach them must be either true or visibly empty — never
 * malformed, never almost-right.
 */

const base: DraftPayload = {
  draft: true,
  reason: "",
  kind: "competition",
  rationale: "A new humanoid fighting league announced in Kuala Lumpur.",
  confidence: "reported",
  name: "Shadow Combat League",
};

describe("rejectDraft", () => {
  it("accepts a draft with a name and nothing else", () => {
    // The whole design: three true fields and nine nulls is CORRECT. A draft
    // must not be rejected for being mostly empty, or the model learns to fill
    // the blanks to get past the gate.
    expect(rejectDraft(base)).toBeNull();
  });

  it("passes the model's own refusal through as the reason", () => {
    expect(
      rejectDraft({
        ...base,
        draft: false,
        reason: "hardware story, no competition in it",
      }),
    ).toBe("hardware story, no competition in it");
  });

  it("never lets a nameless draft into the queue", () => {
    // A proposal for a league that is not called anything cannot be reviewed:
    // there is nothing to check against the source.
    expect(rejectDraft({ ...base, name: null })).toBe("no name");
    expect(rejectDraft({ ...base, name: "  " })).toBe("no name");
  });

  it("refuses a date that is not a real calendar day", () => {
    // "later this year" belongs in dateLabel. If it reaches startDate it
    // becomes `new Date("later this yearT12:00:00Z")` — an Invalid Date in a
    // NOT NULL column, which fails at insert time on the reviewer's click.
    expect(
      rejectDraft({ ...base, kind: "event", startDate: "later this year" }),
    ).toMatch(/unusable date/);
    expect(
      rejectDraft({ ...base, kind: "event", startDate: "2026-10-03" }),
    ).toBeNull();
    // Absent is fine and is the common case.
    expect(rejectDraft({ ...base, kind: "event", startDate: null })).toBeNull();
  });

  it("refuses a country that is not an ISO code", () => {
    // The site renders this column as a flag. "Malaysia" in it is not a
    // verbose country, it is the WRONG flag — worse than an empty one.
    expect(rejectDraft({ ...base, country: "Malaysia" })).toMatch(/ISO code/);
    expect(rejectDraft({ ...base, country: "MY" })).toBeNull();
    expect(rejectDraft({ ...base, country: null })).toBeNull();
  });

  it("refuses a name long enough to be a sentence", () => {
    expect(rejectDraft({ ...base, name: "x".repeat(200) })).toBe(
      "name too long",
    );
  });
});
