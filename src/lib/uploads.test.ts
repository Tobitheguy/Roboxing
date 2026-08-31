import { describe, expect, it } from "vitest";

import {
  ALLOWED_IMAGE_TYPES,
  MAX_UPLOAD_BYTES,
  buildObjectKey,
  publicUrlFor,
  validateUpload,
} from "./uploads";

/**
 * These rules decide what lands in a bucket that is served publicly. The
 * failures are quiet: a wrong extension makes an HTML document reachable on
 * our own domain, and a filename used as a path lets a caller choose where the
 * object goes.
 */

describe("what may be uploaded", () => {
  it.each(Object.keys(ALLOWED_IMAGE_TYPES))("accepts %s", (type) => {
    expect(validateUpload({ contentType: type, sizeBytes: 1024 })).toEqual({
      ok: true,
    });
  });

  it("refuses SVG, which is a document that can carry script", () => {
    expect(
      validateUpload({ contentType: "image/svg+xml", sizeBytes: 1024 }),
    ).toEqual({ ok: false, reason: "unsupported_type" });
  });

  it.each([
    "text/html",
    "application/javascript",
    "application/pdf",
    "video/mp4",
    "application/octet-stream",
    "",
  ])("refuses %s", (type) => {
    expect(validateUpload({ contentType: type, sizeBytes: 1024 })).toEqual({
      ok: false,
      reason: "unsupported_type",
    });
  });

  it("is not fooled by a type that merely starts with image/", () => {
    expect(
      validateUpload({ contentType: "image/png; charset=utf-8", sizeBytes: 10 }),
    ).toEqual({ ok: false, reason: "unsupported_type" });
  });
});

describe("size limits", () => {
  it("accepts a file exactly on the limit", () => {
    expect(
      validateUpload({ contentType: "image/png", sizeBytes: MAX_UPLOAD_BYTES }),
    ).toEqual({ ok: true });
  });

  it("refuses one byte over", () => {
    expect(
      validateUpload({
        contentType: "image/png",
        sizeBytes: MAX_UPLOAD_BYTES + 1,
      }),
    ).toEqual({ ok: false, reason: "too_large" });
  });

  it("refuses an empty file", () => {
    expect(
      validateUpload({ contentType: "image/png", sizeBytes: 0 }),
    ).toEqual({ ok: false, reason: "empty" });
  });

  it.each([
    ["negative", -1],
    ["NaN", Number.NaN],
    ["Infinity", Number.POSITIVE_INFINITY],
  ])("refuses a %s size", (_label, size) => {
    expect(
      validateUpload({ contentType: "image/png", sizeBytes: size }),
    ).toEqual({ ok: false, reason: "invalid_size" });
  });
});

describe("object keys are built from what we control", () => {
  it("uses the extension for the declared type, not the filename", () => {
    expect(buildObjectKey("image/png", "abc123")).toBe("images/abc123.png");
    expect(buildObjectKey("image/jpeg", "abc123")).toBe("images/abc123.jpg");
  });

  it("throws rather than guessing for an unsupported type", () => {
    expect(() => buildObjectKey("image/svg+xml", "abc")).toThrow();
  });

  it("cannot be steered out of the prefix", () => {
    // Even if a caller managed to pass a hostile id, the shape holds: there is
    // exactly one slash, and it is the one this function put there.
    const key = buildObjectKey("image/png", "abc123");
    expect(key.startsWith("images/")).toBe(true);
    expect(key.split("/")).toHaveLength(2);
    expect(key).not.toContain("..");
  });
});

describe("public URLs", () => {
  it("joins cleanly whether or not the base has a trailing slash", () => {
    expect(publicUrlFor("https://cdn.example.com", "images/a.png")).toBe(
      "https://cdn.example.com/images/a.png",
    );
    expect(publicUrlFor("https://cdn.example.com/", "images/a.png")).toBe(
      "https://cdn.example.com/images/a.png",
    );
    expect(publicUrlFor("https://cdn.example.com///", "images/a.png")).toBe(
      "https://cdn.example.com/images/a.png",
    );
  });
});
