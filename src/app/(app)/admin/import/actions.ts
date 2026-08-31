"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { bouts, events, robots, teams } from "@/db/schema";
import { adminAction, type ActionResult } from "@/lib/admin-action";
import { readCsv } from "@/lib/csv";
import {
  planFixtureImport,
  planRobotImport,
  planTeamImport,
  type ImportPlan,
} from "@/lib/import-plan";
import { getViewer } from "@/lib/auth";

/**
 * CSV import: preview, then apply.
 *
 * The preview and the apply run THE SAME planner over THE SAME text. The apply
 * never trusts a plan sent back from the browser — it re-reads the database
 * and re-plans, because the world can change between the two and because a
 * client-supplied plan is a client-supplied list of rows to overwrite.
 */

const ImportSchema = z.object({
  kind: z.enum(["teams", "robots", "fixtures"]),
  csv: z.string().min(1, "Paste some CSV first.").max(2_000_000),
});

export type ImportKind = z.infer<typeof ImportSchema>["kind"];

/** Anything the preview needs to describe a row, without the internals. */
export type PreviewRow = {
  line: number;
  action: "create" | "update" | "error";
  label: string;
  errors?: string[];
};

export type PreviewResult = {
  kind: ImportKind;
  rows: PreviewRow[];
  creates: number;
  updates: number;
  errors: number;
};

async function buildPlan(kind: ImportKind, csv: string) {
  const records = readCsv(csv);

  if (kind === "teams") {
    const existing = await db
      .select({ id: teams.id, slug: teams.slug })
      .from(teams);
    return planTeamImport(records, existing);
  }

  if (kind === "robots") {
    const [existingRobots, existingTeams] = await Promise.all([
      db.select({ id: robots.id, slug: robots.slug }).from(robots),
      db.select({ id: teams.id, slug: teams.slug }).from(teams),
    ]);
    return planRobotImport(records, existingRobots, existingTeams);
  }

  const [eventRows, robotRows, boutRows] = await Promise.all([
    db
      .select({
        id: events.id,
        slug: events.slug,
        competitionId: events.competitionId,
      })
      .from(events),
    db
      .select({ id: robots.id, slug: robots.slug, teamId: robots.teamId })
      .from(robots),
    db
      .select({
        id: bouts.id,
        eventId: bouts.eventId,
        orderIndex: bouts.orderIndex,
      })
      .from(bouts),
  ]);
  return planFixtureImport(records, eventRows, robotRows, boutRows);
}

function toPreview(
  kind: ImportKind,
  plan: ImportPlan<unknown>,
): PreviewResult {
  return {
    kind,
    creates: plan.creates,
    updates: plan.updates,
    errors: plan.errors,
    rows: plan.rows.map((r) => ({
      line: r.line,
      action: r.action,
      label: r.slugOrLabel,
      errors: r.errors,
    })),
  };
}

/** Dry run. Reads the database, changes nothing. */
export async function previewImport(
  _prev: ActionResult<PreviewResult> | null,
  formData: FormData,
): Promise<ActionResult<PreviewResult>> {
  const viewer = await getViewer();
  if (!viewer?.isAdmin) {
    return { ok: false, error: "Your account is not an administrator." };
  }

  const parsed = ImportSchema.safeParse({
    kind: formData.get("kind"),
    csv: formData.get("csv"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Choose a type and paste some CSV." };
  }

  try {
    const plan = await buildPlan(parsed.data.kind, parsed.data.csv);
    return { ok: true, data: toPreview(parsed.data.kind, plan) };
  } catch (error) {
    console.error("[import] preview failed:", error);
    return { ok: false, error: "That file could not be read." };
  }
}

/**
 * Apply an import.
 *
 * Rows that failed validation are SKIPPED, not fatal. A 200-row fixture file
 * with two bad lines should import 198 and tell you about the two — refusing
 * the whole file means someone hand-edits a spreadsheet at midnight.
 */
export async function applyImport(
  _prev: ActionResult<PreviewResult> | null,
  formData: FormData,
): Promise<ActionResult<PreviewResult>> {
  return adminAction({
    schema: ImportSchema,
    input: { kind: formData.get("kind"), csv: formData.get("csv") },
    run: async ({ kind, csv }) => {
      // Re-planned from scratch against current data. The browser's copy of
      // the plan is not evidence of anything.
      const plan = await buildPlan(kind, csv);

      for (const row of plan.rows) {
        if (row.action === "error" || !row.values) continue;

        if (kind === "teams") {
          const v = row.values as Record<string, unknown>;
          const values = {
            slug: v.slug as string,
            name: v.name as string,
            country: ((v.country as string) ?? null)?.toUpperCase() ?? null,
            orgName: (v.orgname as string) ?? null,
            foundedYear: (v.foundedyear as number) ?? null,
            bio: (v.bio as string) ?? null,
          };
          if (row.existingId) {
            await db.update(teams).set(values).where(eq(teams.id, row.existingId));
          } else {
            await db.insert(teams).values(values);
          }
          continue;
        }

        if (kind === "robots") {
          const v = row.values as Record<string, unknown>;
          const values = {
            slug: v.slug as string,
            name: v.name as string,
            teamId: v.teamId as number,
            model: (v.model as string) ?? null,
            weightClass: (v.weightclass as string) ?? null,
            heightCm: (v.heightcm as number) ?? null,
            weightGrams:
              v.weightkg === undefined
                ? null
                : Math.round((v.weightkg as number) * 1000),
            bio: (v.bio as string) ?? null,
          };
          if (row.existingId) {
            await db
              .update(robots)
              .set(values)
              .where(eq(robots.id, row.existingId));
          } else {
            await db.insert(robots).values(values);
          }
          continue;
        }

        const v = row.values as Record<string, unknown>;
        const values = {
          eventId: v.eventId as number,
          competitionId: v.competitionId as number,
          orderIndex: v.orderIndex as number,
          robotAId: v.robotAId as number,
          robotBId: v.robotBId as number,
          teamAId: v.teamAId as number,
          teamBId: v.teamBId as number,
          scheduledRounds: v.scheduledRounds as number,
        };
        if (row.existingId) {
          await db.update(bouts).set(values).where(eq(bouts.id, row.existingId));
        } else {
          await db.insert(bouts).values(values);
        }
      }

      return toPreview(kind, plan);
    },
    audit: (input, out) => ({
      action: "import.apply",
      entity: input.kind,
      payload: {
        creates: out.creates,
        updates: out.updates,
        skipped: out.errors,
      },
    }),
  });
}
