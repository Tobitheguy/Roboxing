import "server-only";

import { cache } from "react";
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
  };
});

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
  const viewer = await getViewer();

  if (!viewer) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (!viewer.isAdmin) {
    return Response.json(
      { error: "Forbidden" },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  return viewer;
}
