import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { users } from "@/db/schema";

/**
 * Who is watching, and whether they may administer.
 *
 * Clerk owns identity — sign-in, social providers, sessions, MFA, password
 * resets. This module owns the two things Clerk cannot know: which local
 * `users` row belongs to this person (so entitlements have something to hang
 * off), and whether they are an administrator.
 *
 * Admin is an email allowlist rather than a Clerk role, deliberately. It is
 * one environment variable, it cannot be granted by anything that happens
 * inside Clerk's dashboard by accident, and revoking access is removing an
 * address rather than editing a role on a user record.
 */

export type Viewer = {
  /** Local users.id — the foreign key entitlements point at. */
  id: number;
  clerkUserId: string;
  email: string;
  displayName: string | null;
  imageUrl: string | null;
  isAdmin: boolean;
  /**
   * Whether this account has a second factor enrolled.
   *
   * Read from Clerk on every request rather than from a session claim. A
   * claim would be cheaper, but it is a snapshot: someone who enrols a second
   * factor still carries a token that says they have not, and the gate would
   * keep sending them back to the screen they just completed until the token
   * happened to refresh. This value cannot be stale.
   */
  twoFactorEnabled: boolean;
};

export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = adminEmails();
  // An empty allowlist means nobody, not everybody.
  if (list.length === 0) return false;
  return list.includes(email.trim().toLowerCase());
}

/** Only refresh last_seen_at when it is this stale, to avoid a write per request. */
const LAST_SEEN_REFRESH_MS = 60 * 60 * 1000;

/**
 * The signed-in viewer, or null.
 *
 * `cache()`d so the several components that ask during one render share a
 * single Clerk call and a single database round trip.
 *
 * Creates the local user row on first sight rather than relying on a Clerk
 * webhook. Webhooks are the tidier design but they fail open in the worst
 * way here: a webhook that is delayed or dropped leaves someone signed in
 * with no local row, which means no entitlements, which means a paying
 * subscriber who cannot watch. Reading their own row into existence cannot
 * be late.
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const email =
    clerkUser.primaryEmailAddress?.emailAddress ??
    clerkUser.emailAddresses[0]?.emailAddress ??
    null;

  // Clerk permits accounts without a verified email on some provider
  // configurations. Entitlements and the admin allowlist are both keyed on
  // email, so an account without one cannot be served meaningfully.
  if (!email) return null;

  const displayName =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
    clerkUser.username ||
    null;

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.clerkUserId, clerkUser.id))
    .limit(1);

  let row = existing[0];

  if (!row) {
    const inserted = await db
      .insert(users)
      .values({
        clerkUserId: clerkUser.id,
        email,
        displayName,
        imageUrl: clerkUser.imageUrl ?? null,
        lastSeenAt: new Date(),
      })
      // Two requests from the same new user can race; the unique constraint
      // on clerk_user_id turns the loser into an update rather than a 500.
      .onConflictDoUpdate({
        target: users.clerkUserId,
        set: { email, displayName, lastSeenAt: new Date() },
      })
      .returning();
    row = inserted[0];
  } else {
    const stale =
      !row.lastSeenAt ||
      Date.now() - row.lastSeenAt.getTime() > LAST_SEEN_REFRESH_MS;
    const emailChanged = row.email !== email;

    // A user can change their email in Clerk, and this copy would otherwise
    // rot — which for an administrator means silently losing access.
    if (stale || emailChanged) {
      const updated = await db
        .update(users)
        .set({
          email,
          displayName,
          imageUrl: clerkUser.imageUrl ?? null,
          lastSeenAt: new Date(),
        })
        .where(eq(users.id, row.id))
        .returning();
      row = updated[0] ?? row;
    }
  }

  return {
    id: row.id,
    clerkUserId: row.clerkUserId,
    email: row.email,
    displayName: row.displayName,
    imageUrl: row.imageUrl,
    isAdmin: isAdminEmail(row.email),
    twoFactorEnabled: clerkUser.twoFactorEnabled,
  };
});

/**
 * Where an account that is not yet allowed in gets sent.
 *
 * Exported so the gate and the screens it points at agree on one spelling.
 */
export const SIGN_IN_PATH = "/sign-in";
export const ENROL_PATH = "/welcome/secure";

/**
 * Is a second factor actually required to get in?
 *
 * A flag rather than a constant `true`, because turning it on when Clerk
 * cannot deliver it locks EVERYONE out — including whoever would fix it.
 * Clerk gates TOTP and recovery codes behind its paid plan; on the free plan
 * `createTOTP()` fails, the enrolment screen has nothing to offer, and the
 * gate would send every account to a dead end on every request. That is not a
 * degraded site, it is no site.
 *
 * So the requirement is off unless the environment says the capability
 * exists. Set REQUIRE_TWO_FACTOR=true the moment Clerk's authenticator-app
 * strategy is enabled — nothing else needs to change, and every screen in the
 * flow is already built and deployed.
 *
 * Default-off is the right default here specifically because the failure is
 * total and self-locking. It is not the right default for a paywall, which is
 * why decideAccess() has no equivalent escape hatch.
 */
export function isTwoFactorRequired(): boolean {
  return process.env.REQUIRE_TWO_FACTOR === "true";
}

/**
 * Page guard. Everything under `(app)` passes through this.
 *
 * Redirects rather than returns, so a page that forgets to check gets no
 * silent half-authenticated render. The two destinations are distinct on
 * purpose: "sign in" and "finish securing your account" are different states,
 * and sending the second person to a login form they have already passed is
 * how a support ticket starts.
 */
export async function requireVerifiedViewer(
  returnTo?: string,
): Promise<Viewer> {
  const viewer = await getViewer();

  if (!viewer) {
    const target = new URLSearchParams();
    if (returnTo) target.set("redirect_url", returnTo);
    const query = target.toString();
    redirect(query ? `${SIGN_IN_PATH}?${query}` : SIGN_IN_PATH);
  }

  if (isTwoFactorRequired() && !viewer.twoFactorEnabled) {
    const target = new URLSearchParams();
    if (returnTo) target.set("redirect_url", returnTo);
    const query = target.toString();
    redirect(query ? `${ENROL_PATH}?${query}` : ENROL_PATH);
  }

  return viewer;
}

/**
 * API guard for any signed-in caller.
 *
 * Separate from the page guard because an API client cannot follow a redirect
 * to a sign-in form in any useful way — it needs a status code it can act on.
 *
 * 403 for a missing second factor rather than 401: the credentials WERE
 * accepted. Answering 401 would tell a client to retry authentication, which
 * would succeed and land it right back here.
 */
export async function requireViewer(): Promise<Viewer | Response> {
  const viewer = await getViewer();

  if (!viewer) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (isTwoFactorRequired() && !viewer.twoFactorEnabled) {
    return Response.json(
      { error: "Forbidden", reason: "two_factor_required" },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  return viewer;
}

/**
 * Guard for API route handlers.
 *
 * Returns the Viewer when they may proceed, or a Response when they may not.
 * Distinguishes 401 from 403 on purpose: "you are not signed in" and "you are
 * signed in but not an administrator" are different problems with different
 * fixes, and collapsing them makes both harder to diagnose.
 *
 *   const auth = await requireAdmin();
 *   if (auth instanceof Response) return auth;
 *   // auth.email is now available
 */
export async function requireAdmin(): Promise<Viewer | Response> {
  // Reuses the signed-in guard so an administrator can never be held to a
  // WEAKER standard than a viewer. Admins change results and control the
  // broadcast; if a second factor is mandatory for the people watching, it is
  // not optional for the people running it.
  const viewer = await requireViewer();
  if (viewer instanceof Response) return viewer;

  if (!viewer.isAdmin) {
    return Response.json(
      { error: "Forbidden" },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  return viewer;
}
