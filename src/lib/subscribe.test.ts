import { describe, expect, it } from "vitest";

import { MAX_EMAIL_LENGTH, normalizeEmail, subscribeSchema } from "./subscribe";

/**
 * The write itself needs a database and is not covered here. What is covered
 * is everything that decides WHETHER to write — which is the half that faces
 * an unauthenticated POST.
 */

describe("normalizeEmail", () => {
  it("lowercases and trims", () => {
    expect(normalizeEmail("  Tobi@Example.COM ")).toBe("tobi@example.com");
  });

  it("collapses casings that would otherwise be two UNIQUE rows", () => {
    // Postgres compares text case-sensitively, so without this the same person
    // is stored twice and mailed twice.
    expect(normalizeEmail("A@b.com")).toBe(normalizeEmail("a@B.com"));
  });
});

describe("subscribeSchema", () => {
  it("accepts a plain address", () => {
    const result = subscribeSchema.safeParse({ email: "a@b.co" });
    expect(result.success).toBe(true);
  });

  it("trims before validating, so a pasted address with spaces works", () => {
    const result = subscribeSchema.safeParse({ email: "  a@b.co  " });
    expect(result.success).toBe(true);
    expect(result.data?.email).toBe("a@b.co");
  });

  it("rejects what is not an address", () => {
    for (const bad of ["", "nope", "a@", "@b.co", "a b@c.co"]) {
      expect(subscribeSchema.safeParse({ email: bad }).success).toBe(false);
    }
  });

  it("rejects an address past the RFC length ceiling", () => {
    const long = `${"a".repeat(MAX_EMAIL_LENGTH)}@b.co`;
    expect(subscribeSchema.safeParse({ email: long }).success).toBe(false);
  });

  it("keeps a well-formed source label", () => {
    const result = subscribeSchema.safeParse({
      email: "a@b.co",
      source: "event:riyadh-2026",
    });
    expect(result.data?.source).toBe("event:riyadh-2026");
  });

  it("drops a source that did not come from one of our own forms", () => {
    // The field is hidden, which means it arrives from the client and a hidden
    // input is not a promise. Anything unrecognised is discarded rather than
    // stored — and crucially the signup still SUCCEEDS, because a tampered
    // label is no reason to lose the address.
    const result = subscribeSchema.safeParse({
      email: "a@b.co",
      source: "<script>alert(1)</script>",
    });
    expect(result.success).toBe(true);
    expect(result.data?.source).toBeUndefined();
  });
});
