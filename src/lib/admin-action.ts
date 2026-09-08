import "server-only";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { adminAudit } from "@/db/schema";
import { getViewer } from "@/lib/auth";

/**
 * The shape every admin mutation shares.
 *
 * One wrapper rather than repeating the same four steps in twenty actions:
 * authorise, validate, record who did it, refresh the public pages. Each of
 * those is easy to forget in exactly one action, and the one you forget is
 * the one that matters.
 */

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

/**
 * Public routes that show data an admin can change.
 *
 * Revalidated after every write. Being generous here is deliberate: a stale
 * standings table after a result is entered is the single most visible thing
 * that can go wrong, and the cost of refreshing a few extra routes is a
 * rebuild of pages that are already dynamic.
 */
const PUBLIC_ROUTES = [
  "/",
  "/competitions",
  "/teams",
  "/schedule",
  "/results",
  "/watch",
  "/events",
  "/news",
  // The sitemap prerenders at build time, so without this a new event stays
  // invisible to crawlers until the next deploy — which on a site whose
  // events are announced days ahead is most of the window that mattered.
  "/sitemap.xml",
];

export function revalidatePublic(extra: string[] = []) {
  for (const route of [...PUBLIC_ROUTES, ...extra]) {
    revalidatePath(route);
  }
  // Detail pages are dynamic segments; revalidating the layout covers them.
  revalidatePath("/competitions/[slug]", "page");
  revalidatePath("/teams/[slug]", "page");
  revalidatePath("/robots/[slug]", "page");
  // `/watch/[slug]` is now a permanent redirect with nothing cached worth
  // refreshing, but it stays in the list: it costs one no-op call, and
  // dropping it would silently stop refreshing anything that route grows back
  // into later.
  revalidatePath("/watch/[slug]", "page");
  revalidatePath("/events/[slug]", "page");
  revalidatePath("/news/[slug]", "page");
}

type AuditEntry = {
  action: string;
  entity: string;
  entityId?: string | number | null;
  payload?: unknown;
};

/**
 * Run an admin mutation.
 *
 * Refuses if the caller is not an administrator, validates the input, writes
 * an audit row, and refreshes the public site. Returns a result object rather
 * than throwing so a form can render the error next to the field that caused
 * it.
 */
export async function adminAction<TInput, TOutput>({
  schema,
  input,
  audit,
  run,
  revalidate = [],
}: {
  schema: z.ZodType<TInput>;
  input: unknown;
  /** Built from the parsed input, so it records what was actually applied. */
  audit: (input: TInput, output: TOutput) => AuditEntry;
  run: (input: TInput) => Promise<TOutput>;
  revalidate?: string[];
}): Promise<ActionResult<TOutput>> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "You are not signed in." };
  if (!viewer.isAdmin) {
    return { ok: false, error: "Your account is not an administrator." };
  }

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "_";
      (fieldErrors[key] ??= []).push(issue.message);
    }
    return { ok: false, error: "Please check the fields below.", fieldErrors };
  }

  let output: TOutput;
  try {
    output = await run(parsed.data);
  } catch (error) {
    console.error("[admin] action failed:", error);
    // Database constraint violations are the common case here, and their
    // messages name columns and constraints. Useful in a log, not in a UI.
    return {
      ok: false,
      error: "That could not be saved. The change was not applied.",
    };
  }

  const entry = audit(parsed.data, output);
  try {
    await db.insert(adminAudit).values({
      adminEmail: viewer.email,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId == null ? null : String(entry.entityId),
      payloadJson: (entry.payload ?? null) as never,
    });
  } catch (error) {
    // The write already succeeded. Losing the audit row is bad, but undoing a
    // completed change because the log failed would be worse.
    console.error("[admin] audit write failed:", error);
  }

  revalidatePublic(revalidate);
  return { ok: true, data: output };
}
