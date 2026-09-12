import { z } from "zod";

/**
 * Turn imported rows into a plan of exactly what would change.
 *
 * Pure, so the preview a person approves and the work that then happens are
 * computed by the same code from the same input. A preview produced by
 * different logic than the apply is worse than no preview — it invites
 * approval of something that will not happen.
 *
 * Matching is by SLUG. A row whose slug already exists is an update, not a
 * duplicate; a row whose slug is new is a create. That makes an import
 * re-runnable, which matters because the real workflow is "the organizer sent
 * a corrected file".
 */

export type RowAction = "create" | "update" | "error";

export type PlannedRow<T> = {
  /** 1-based line in the file, counting the header, so it matches a spreadsheet. */
  line: number;
  action: RowAction;
  slugOrLabel: string;
  values?: T;
  existingId?: number;
  errors?: string[];
};

export type ImportPlan<T> = {
  rows: PlannedRow<T>[];
  creates: number;
  updates: number;
  errors: number;
};

function summarise<T>(rows: PlannedRow<T>[]): ImportPlan<T> {
  return {
    rows,
    creates: rows.filter((r) => r.action === "create").length,
    updates: rows.filter((r) => r.action === "update").length,
    errors: rows.filter((r) => r.action === "error").length,
  };
}

const trimmed = (max: number) => z.string().trim().max(max);
const optional = (max: number) =>
  trimmed(max)
    .optional()
    .transform((v) => (v === "" || v === undefined ? undefined : v));

const optionalInt = (min: number, max: number) =>
  z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === "" || v === undefined ? undefined : Number(v)))
    .refine(
      (v) => v === undefined || (Number.isFinite(v) && v >= min && v <= max),
      { message: `Must be a number between ${min} and ${max}.` },
    );

const slug = trimmed(80)
  .min(1, "Required.")
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Lowercase letters, numbers and hyphens only.",
  );

/* -------------------------------------------------------------------------- */
/* Teams                                                                       */
/* -------------------------------------------------------------------------- */

export const TeamImportSchema = z.object({
  slug,
  name: trimmed(120).min(1, "Required."),
  country: optional(2),
  orgname: optional(160),
  foundedyear: optionalInt(1900, 2100),
  bio: optional(2000),
});

export type TeamImport = z.infer<typeof TeamImportSchema>;

export function planTeamImport(
  records: Record<string, string>[],
  existing: { id: number; slug: string }[],
): ImportPlan<TeamImport> {
  const bySlug = new Map(existing.map((t) => [t.slug, t.id]));
  const seen = new Set<string>();

  const rows = records.map((record, index): PlannedRow<TeamImport> => {
    const line = index + 2;
    const parsed = TeamImportSchema.safeParse(record);

    if (!parsed.success) {
      return {
        line,
        action: "error",
        slugOrLabel: record.slug || record.name || `line ${line}`,
        errors: parsed.error.issues.map(
          (i) => `${i.path.join(".") || "row"}: ${i.message}`,
        ),
      };
    }

    // A file that lists the same slug twice would apply both rows, and the
    // last one silently wins. Caught here rather than discovered afterwards.
    if (seen.has(parsed.data.slug)) {
      return {
        line,
        action: "error",
        slugOrLabel: parsed.data.slug,
        errors: ["Duplicate slug in this file."],
      };
    }
    seen.add(parsed.data.slug);

    const existingId = bySlug.get(parsed.data.slug);
    return {
      line,
      action: existingId ? "update" : "create",
      slugOrLabel: parsed.data.slug,
      values: parsed.data,
      existingId,
    };
  });

  return summarise(rows);
}

/* -------------------------------------------------------------------------- */
/* Robots                                                                      */
/* -------------------------------------------------------------------------- */

export const RobotImportSchema = z.object({
  slug,
  name: trimmed(120).min(1, "Required."),
  teamslug: trimmed(80).min(1, "Required."),
  model: optional(120),
  weightclass: optional(60),
  heightcm: optionalInt(1, 500),
  weightkg: optionalInt(0, 1000),
  bio: optional(2000),
});

export type RobotImport = z.infer<typeof RobotImportSchema> & { teamId: number };

export function planRobotImport(
  records: Record<string, string>[],
  existingRobots: { id: number; slug: string }[],
  existingTeams: { id: number; slug: string }[],
): ImportPlan<RobotImport> {
  const robotBySlug = new Map(existingRobots.map((r) => [r.slug, r.id]));
  const teamBySlug = new Map(existingTeams.map((t) => [t.slug, t.id]));
  const seen = new Set<string>();

  const rows = records.map((record, index): PlannedRow<RobotImport> => {
    const line = index + 2;
    const parsed = RobotImportSchema.safeParse(record);

    if (!parsed.success) {
      return {
        line,
        action: "error",
        slugOrLabel: record.slug || record.name || `line ${line}`,
        errors: parsed.error.issues.map(
          (i) => `${i.path.join(".") || "row"}: ${i.message}`,
        ),
      };
    }

    if (seen.has(parsed.data.slug)) {
      return {
        line,
        action: "error",
        slugOrLabel: parsed.data.slug,
        errors: ["Duplicate slug in this file."],
      };
    }
    seen.add(parsed.data.slug);

    // The team must already exist. Creating one implicitly from a robot row
    // would invent an organisation from a typo in a spreadsheet.
    const teamId = teamBySlug.get(parsed.data.teamslug);
    if (!teamId) {
      return {
        line,
        action: "error",
        slugOrLabel: parsed.data.slug,
        errors: [`No team with slug "${parsed.data.teamslug}". Import teams first.`],
      };
    }

    const existingId = robotBySlug.get(parsed.data.slug);
    return {
      line,
      action: existingId ? "update" : "create",
      slugOrLabel: parsed.data.slug,
      values: { ...parsed.data, teamId },
      existingId,
    };
  });

  return summarise(rows);
}

/* -------------------------------------------------------------------------- */
/* Fixtures                                                                    */
/* -------------------------------------------------------------------------- */

export const FixtureImportSchema = z.object({
  eventslug: trimmed(80).min(1, "Required."),
  orderindex: z
    .string()
    .trim()
    .min(1, "Required.")
    .transform(Number)
    .refine((v) => Number.isInteger(v) && v >= 1 && v <= 99, {
      message: "Must be a whole number between 1 and 99.",
    }),
  robotaslug: trimmed(80).min(1, "Required."),
  robotbslug: trimmed(80).min(1, "Required."),
  scheduledrounds: optionalInt(1, 20),
});

export type FixtureImport = {
  eventId: number;
  orderIndex: number;
  robotAId: number;
  robotBId: number;
  teamAId: number;
  teamBId: number;
  scheduledRounds: number;
};

export function planFixtureImport(
  records: Record<string, string>[],
  events: { id: number; slug: string; competitionId: number }[],
  robots: { id: number; slug: string; teamId: number | null }[],
  existingBouts: { id: number; eventId: number; orderIndex: number }[],
): ImportPlan<FixtureImport & { competitionId: number }> {
  const eventBySlug = new Map(events.map((e) => [e.slug, e]));
  const robotBySlug = new Map(robots.map((r) => [r.slug, r]));
  const boutBySlot = new Map(
    existingBouts.map((b) => [`${b.eventId}:${b.orderIndex}`, b.id]),
  );
  const seenSlots = new Set<string>();

  const rows = records.map(
    (record, index): PlannedRow<FixtureImport & { competitionId: number }> => {
      const line = index + 2;
      const parsed = FixtureImportSchema.safeParse(record);

      if (!parsed.success) {
        return {
          line,
          action: "error",
          slugOrLabel: record.eventslug || `line ${line}`,
          errors: parsed.error.issues.map(
            (i) => `${i.path.join(".") || "row"}: ${i.message}`,
          ),
        };
      }

      const data = parsed.data;
      const label = `${data.eventslug} #${data.orderindex}`;
      const errors: string[] = [];

      const event = eventBySlug.get(data.eventslug);
      if (!event) errors.push(`No event with slug "${data.eventslug}".`);

      const robotA = robotBySlug.get(data.robotaslug);
      if (!robotA) errors.push(`No robot with slug "${data.robotaslug}".`);

      const robotB = robotBySlug.get(data.robotbslug);
      if (!robotB) errors.push(`No robot with slug "${data.robotbslug}".`);

      if (robotA && robotB && robotA.id === robotB.id) {
        errors.push("A robot cannot fight itself.");
      }

      // Two rows claiming the same slot on the same card would violate the
      // UNIQUE constraint mid-import, leaving it half applied.
      const slot = event ? `${event.id}:${data.orderindex}` : null;
      if (slot && seenSlots.has(slot)) {
        errors.push("Two rows use this position on the same card.");
      }
      if (slot) seenSlots.add(slot);

      /*
       * A robot with no team cannot be entered into a bout.
       *
       * `robots.team_id` became nullable when the Machines page started
       * carrying platform models — a Unitree H2 or a Booster T1 is a product,
       * not a competitor, and belongs to nobody. Those rows must never reach a
       * card: `bouts.team_a_id` is NOT NULL precisely so the standings always
       * know who earned a result, and importing a teamless robot would either
       * fail at the database with an opaque error or, worse, invite somebody to
       * invent a team to get past it.
       */
      if (robotA && robotA.teamId === null) {
        errors.push(`Robot "${data.robotaslug}" has no team, so it cannot fight.`);
      }
      if (robotB && robotB.teamId === null) {
        errors.push(`Robot "${data.robotbslug}" has no team, so it cannot fight.`);
      }

      if (
        errors.length > 0 ||
        !event ||
        !robotA ||
        !robotB ||
        robotA.teamId === null ||
        robotB.teamId === null
      ) {
        return { line, action: "error", slugOrLabel: label, errors };
      }

      const existingId = boutBySlot.get(`${event.id}:${data.orderindex}`);
      return {
        line,
        action: existingId ? "update" : "create",
        slugOrLabel: label,
        existingId,
        values: {
          eventId: event.id,
          competitionId: event.competitionId,
          orderIndex: data.orderindex,
          robotAId: robotA.id,
          robotBId: robotB.id,
          // Captured now and never updated, so a later transfer cannot move a
          // finished result to a different team.
          teamAId: robotA.teamId,
          teamBId: robotB.teamId,
          scheduledRounds: data.scheduledrounds ?? 3,
        },
      };
    },
  );

  return summarise(rows);
}
