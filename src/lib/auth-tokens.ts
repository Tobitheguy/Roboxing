import {
  createHmac,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
  type ScryptOptions,
} from "node:crypto";
import { promisify } from "node:util";

/**
 * Password hashing and session tokens.
 *
 * Deliberately free of `server-only` and `next/headers` so it can be unit
 * tested directly. Auth is the one part of this codebase where "it looked
 * right" is not good enough — a forged token has to be provably rejected, not
 * presumed to be.
 *
 * The Next-specific half (reading the cookie, guarding a route) lives in
 * ./auth.
 */

// promisify's inferred overload drops the options argument, and the cost
// parameters are exactly what must not be silently defaulted.
const scrypt = promisify(scryptCallback) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: ScryptOptions,
) => Promise<Buffer>;

export const SESSION_COOKIE = "roboxing_session";
export const SESSION_TTL_SECONDS = 12 * 60 * 60;

/* -------------------------------------------------------------------------- */
/* Password                                                                    */
/* -------------------------------------------------------------------------- */

const SCRYPT_N = 16384;
const SCRYPT_r = 8;
const SCRYPT_p = 1;
const KEY_LENGTH = 64;

/**
 * Hash a password for ADMIN_PASSWORD_HASH.
 *
 * Format: scrypt$N$r$p$salt$hash — self-describing, so the cost parameters can
 * be raised later without losing the ability to read existing hashes.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_r,
    p: SCRYPT_p,
  });
  return [
    "scrypt",
    SCRYPT_N,
    SCRYPT_r,
    SCRYPT_p,
    salt.toString("hex"),
    derived.toString("hex"),
  ].join("$");
}

/**
 * Constant-time password check.
 *
 * Returns false rather than throwing on a malformed stored hash: a
 * configuration mistake must fail closed, not 500 with a stack trace that
 * hints at the shape of the secret.
 */
export async function verifyPassword(
  password: string,
  stored: string | undefined,
): Promise<boolean> {
  if (!stored) return false;

  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const [, n, r, p, saltHex, hashHex] = parts;
  try {
    const expected = Buffer.from(hashHex, "hex");
    if (expected.length === 0) return false;

    const derived = await scrypt(
      password,
      Buffer.from(saltHex, "hex"),
      expected.length,
      { N: Number(n), r: Number(r), p: Number(p) },
    );
    if (derived.length !== expected.length) return false;
    return timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

/* -------------------------------------------------------------------------- */
/* Admin allowlist                                                             */
/* -------------------------------------------------------------------------- */

export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string): boolean {
  const list = adminEmails();
  // An empty allowlist means nobody, not everybody.
  if (list.length === 0) return false;
  return list.includes(email.trim().toLowerCase());
}

/* -------------------------------------------------------------------------- */
/* Session token                                                               */
/* -------------------------------------------------------------------------- */

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) {
    throw new Error(
      "SESSION_SECRET is missing or too short (needs 32+ characters). " +
        "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
    );
  }
  return value;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function sign(payload: string): string {
  return base64url(createHmac("sha256", secret()).update(payload).digest());
}

export type Session = { email: string; exp: number };

/** `<base64url(payload)>.<base64url(hmac)>` */
export function createSessionToken(email: string): string {
  const session: Session = {
    email,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const payload = base64url(JSON.stringify(session));
  return `${payload}.${sign(payload)}`;
}

/** Returns the session, or null if the token is absent, forged, or expired. */
export function verifySessionToken(token: string | undefined): Session | null {
  if (!token) return null;

  const [payload, signature, ...rest] = token.split(".");
  if (!payload || !signature || rest.length > 0) return null;

  let expected: string;
  try {
    expected = sign(payload);
  } catch {
    // SESSION_SECRET missing — fail closed rather than admitting anyone.
    return null;
  }

  // Constant-time compare so a signature cannot be brute-forced byte by byte.
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  let session: Session;
  try {
    session = JSON.parse(
      Buffer.from(
        payload.replace(/-/g, "+").replace(/_/g, "/"),
        "base64",
      ).toString(),
    );
  } catch {
    return null;
  }

  if (
    typeof session?.email !== "string" ||
    typeof session?.exp !== "number" ||
    !Number.isFinite(session.exp)
  ) {
    return null;
  }
  if (session.exp * 1000 < Date.now()) return null;

  // An address removed from ADMIN_EMAILS loses access immediately rather than
  // when its 12-hour token happens to expire.
  if (!isAdminEmail(session.email)) return null;

  return session;
}
