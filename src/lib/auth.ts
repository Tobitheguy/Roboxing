import "server-only";

import { cookies } from "next/headers";

import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  verifySessionToken,
  type Session,
} from "./auth-tokens";

/**
 * Admin authentication, Next-facing half.
 *
 * The original plan had /admin/login check the submitted email against an
 * ADMIN_EMAILS allowlist and set a signed cookie. That is identification, not
 * authentication: anyone who types a listed address would get an admin
 * session, and on a public repo with a public deployment those addresses are
 * guessable. That is full write access to the database and control of the live
 * broadcast, for anyone who tries.
 *
 * So a session requires the email AND a shared password. Still POC-grade — one
 * shared credential, no per-user accounts — but it is actually a lock. The
 * crypto lives in ./auth-tokens so it can be tested.
 */

export {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  adminEmails,
  createSessionToken,
  hashPassword,
  isAdminEmail,
  verifyPassword,
  verifySessionToken,
  type Session,
} from "./auth-tokens";

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  // Not readable by JavaScript, not sent cross-site, and HTTPS-only in
  // production (localhost has no certificate, so Secure would break dev).
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_TTL_SECONDS,
};

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}

/**
 * Guard for API route handlers.
 *
 * Returns the Session when the caller may proceed, or a 401 Response when not.
 * Returning the session rather than a boolean means a handler never has to
 * read the cookie and verify the HMAC a second time to find out who it is
 * talking to.
 *
 * Every /api/admin/* handler begins with this, and the proxy blocks those
 * paths as well — two independent layers, because one missed check on one
 * route is the whole breach.
 *
 *   const auth = await requireAdmin();
 *   if (auth instanceof Response) return auth;
 *   // auth.email is now available
 */
export async function requireAdmin(): Promise<Session | Response> {
  const session = await getSession();
  if (session) return session;

  return Response.json(
    { error: "Unauthorized" },
    {
      status: 401,
      // Admin responses must never be cached by a CDN or a browser.
      headers: { "Cache-Control": "no-store" },
    },
  );
}
