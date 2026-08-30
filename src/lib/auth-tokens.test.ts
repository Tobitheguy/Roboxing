import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createSessionToken,
  hashPassword,
  isAdminEmail,
  verifyPassword,
  verifySessionToken,
} from "./auth-tokens";

/**
 * Auth is the one place in this codebase where "it looks right" is not good
 * enough. A forged or expired token has to be provably rejected.
 *
 * These tests exist because the original plan authenticated admins by checking
 * a submitted email against an allowlist — which is identification, not
 * authentication, and would have handed database write access and live
 * broadcast control to anyone who guessed an address.
 */

const SECRET = "a".repeat(64);

beforeEach(() => {
  vi.stubEnv("SESSION_SECRET", SECRET);
  vi.stubEnv("ADMIN_EMAILS", "admin@example.com, Second@Example.com");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("password hashing", () => {
  it("accepts the correct password", async () => {
    const stored = await hashPassword("correct horse battery staple");
    expect(await verifyPassword("correct horse battery staple", stored)).toBe(
      true,
    );
  });

  it("rejects the wrong password", async () => {
    const stored = await hashPassword("correct horse battery staple");
    expect(await verifyPassword("Correct horse battery staple", stored)).toBe(
      false,
    );
    expect(await verifyPassword("", stored)).toBe(false);
  });

  it("salts, so the same password hashes differently every time", async () => {
    const a = await hashPassword("same");
    const b = await hashPassword("same");
    expect(a).not.toBe(b);
    // Both still verify.
    expect(await verifyPassword("same", a)).toBe(true);
    expect(await verifyPassword("same", b)).toBe(true);
  });

  it("fails closed on a missing or malformed stored hash", async () => {
    // A configuration mistake must deny access, never admit it.
    expect(await verifyPassword("anything", undefined)).toBe(false);
    expect(await verifyPassword("anything", "")).toBe(false);
    expect(await verifyPassword("anything", "not-a-hash")).toBe(false);
    expect(await verifyPassword("anything", "scrypt$1$2$3$zz$zz")).toBe(false);
    expect(await verifyPassword("anything", "bcrypt$1$2$3$aa$bb")).toBe(false);
  });
});

describe("admin allowlist", () => {
  it("matches case-insensitively and ignores surrounding space", () => {
    expect(isAdminEmail("admin@example.com")).toBe(true);
    expect(isAdminEmail("  ADMIN@example.com ")).toBe(true);
    expect(isAdminEmail("second@example.com")).toBe(true);
  });

  it("rejects anyone not listed", () => {
    expect(isAdminEmail("attacker@example.com")).toBe(false);
  });

  it("treats an empty allowlist as nobody, not everybody", () => {
    vi.stubEnv("ADMIN_EMAILS", "");
    expect(isAdminEmail("admin@example.com")).toBe(false);
    expect(isAdminEmail("")).toBe(false);
  });
});

describe("session tokens", () => {
  it("round-trips a valid token", () => {
    const token = createSessionToken("admin@example.com");
    expect(verifySessionToken(token)?.email).toBe("admin@example.com");
  });

  it("rejects a token signed with a different secret", () => {
    const token = createSessionToken("admin@example.com");
    vi.stubEnv("SESSION_SECRET", "b".repeat(64));
    expect(verifySessionToken(token)).toBeNull();
  });

  it("rejects a tampered payload", () => {
    const token = createSessionToken("admin@example.com");
    const [, signature] = token.split(".");

    // Re-encode the payload claiming to be someone else, keeping the original
    // signature. This is the attack the HMAC exists to stop.
    const forgedPayload = Buffer.from(
      JSON.stringify({
        email: "attacker@example.com",
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    )
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    expect(verifySessionToken(`${forgedPayload}.${signature}`)).toBeNull();
  });

  it("rejects an unsigned token", () => {
    const payload = Buffer.from(
      JSON.stringify({
        email: "admin@example.com",
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    ).toString("base64url");
    expect(verifySessionToken(payload)).toBeNull();
    expect(verifySessionToken(`${payload}.`)).toBeNull();
    expect(verifySessionToken(`${payload}.x`)).toBeNull();
  });

  it("rejects malformed input without throwing", () => {
    expect(verifySessionToken(undefined)).toBeNull();
    expect(verifySessionToken("")).toBeNull();
    expect(verifySessionToken("....")).toBeNull();
    expect(verifySessionToken("a.b.c")).toBeNull();
    expect(verifySessionToken("%%%.%%%")).toBeNull();
  });

  it("rejects an expired token", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const token = createSessionToken("admin@example.com");
    expect(verifySessionToken(token)).not.toBeNull();

    // 12h TTL — one second past it must fail.
    vi.setSystemTime(new Date("2026-01-01T12:00:01Z"));
    expect(verifySessionToken(token)).toBeNull();
  });

  it("rejects a still-valid token once the email leaves the allowlist", () => {
    // Revoking access must not require waiting out a 12-hour token.
    const token = createSessionToken("admin@example.com");
    expect(verifySessionToken(token)).not.toBeNull();

    vi.stubEnv("ADMIN_EMAILS", "someone-else@example.com");
    expect(verifySessionToken(token)).toBeNull();
  });

  it("fails closed when SESSION_SECRET is missing", () => {
    const token = createSessionToken("admin@example.com");
    vi.stubEnv("SESSION_SECRET", "");
    expect(verifySessionToken(token)).toBeNull();
  });

  it("refuses to sign with a weak secret", () => {
    vi.stubEnv("SESSION_SECRET", "short");
    expect(() => createSessionToken("admin@example.com")).toThrow(
      /SESSION_SECRET/,
    );
  });
});
