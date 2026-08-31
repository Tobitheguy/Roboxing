"use server";

import { and, eq, inArray, ne } from "drizzle-orm";
import { z } from "zod";

import { STATE_COUNTRY, isKnownCountry, isKnownUsState } from "@/lib/places";
import { isValidTimeZone } from "@/lib/timezones";
import { db } from "@/db";
import {
  boutResults,
  bouts,
  competitions,
  events,
  pointsRules,
  robots,
  teams,
} from "@/db/schema";
import { adminAction, type ActionResult } from "@/lib/admin-action";

/**
 * Every write the admin panel performs.
 *
 * Server Actions rather than API routes: the forms are server-rendered, the
 * mutations are only ever called from those forms, and an action cannot be
 * reached without a session — so there is no second surface to secure and
 * keep in sync. Each one goes through adminAction(), which authorises,
 * validates, audits, and revalidates.
 */

/* -------------------------------------------------------------------------- */
/* Shared pieces                                                               */
/* -------------------------------------------------------------------------- */

/** URL-safe slug from a name. Deterministic, so the same name gives the same slug. */
function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

const Slug = z
  .string()
  .trim()
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Lowercase letters, numbers and hyphens only.",
  )
  .max(80);

/** Turns "" into undefined so an untouched optional field is not stored as "". */
const optionalText = (max = 500) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v === "" ? undefined : v));

const optionalInt = (min: number, max: number) =>
  z
    .union([z.coerce.number().int().min(min).max(max), z.literal("")])
    .optional()
    .transform((v) => (v === "" || v === undefined ? undefined : Number(v)));

/* -------------------------------------------------------------------------- */
/* Competitions                                                                */
/* -------------------------------------------------------------------------- */

const CompetitionSchema = z.object({
  id: optionalInt(1, Number.MAX_SAFE_INTEGER),
  name: z.string().trim().min(1, "Required.").max(120),
  slug: Slug.optional(),
  organizer: optionalText(120),
  seasonYear: optionalInt(2000, 2100),
  status: z.enum(["upcoming", "active", "completed"]).default("upcoming"),
  description: optionalText(2000),
  winPoints: z.coerce.number().int().min(0).max(100).default(3),
  drawPoints: z.coerce.number().int().min(0).max(100).default(1),
  lossPoints: z.coerce.number().int().min(0).max(100).default(0),
  koBonusPoints: z.coerce.number().int().min(0).max(100).default(1),
});

export async function saveCompetition(
  _prev: ActionResult<{ id: number }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: number }>> {
  return adminAction({
    schema: CompetitionSchema,
    input: Object.fromEntries(formData),
    run: async (input) => {
      const slug = input.slug ?? slugify(input.name);
      const values = {
        name: input.name,
        slug,
        organizer: input.organizer ?? null,
        seasonYear: input.seasonYear ?? null,
        status: input.status,
        description: input.description ?? null,
      };

      const id = input.id
        ? (
            await db
              .update(competitions)
              .set(values)
              .where(eq(competitions.id, input.id))
              .returning({ id: competitions.id })
          )[0].id
        : (
            await db
              .insert(competitions)
              .values(values)
              .returning({ id: competitions.id })
          )[0].id;

      // The scoring rule is created with the competition, in the same action.
      // A competition without one silently falls back to defaults, which looks
      // identical on screen and is wrong in a way nobody notices.
      await db
        .insert(pointsRules)
        .values({
          competitionId: id,
          winPoints: input.winPoints,
          drawPoints: input.drawPoints,
          lossPoints: input.lossPoints,
          koBonusPoints: input.koBonusPoints,
        })
        .onConflictDoUpdate({
          target: pointsRules.competitionId,
          set: {
            winPoints: input.winPoints,
            drawPoints: input.drawPoints,
            lossPoints: input.lossPoints,
            koBonusPoints: input.koBonusPoints,
          },
        });

      return { id };
    },
    audit: (input, out) => ({
      action: input.id ? "competition.update" : "competition.create",
      entity: "competition",
      entityId: out.id,
      payload: { name: input.name },
    }),
  });
}

/* -------------------------------------------------------------------------- */
/* Teams                                                                       */
/* -------------------------------------------------------------------------- */

const TeamSchema = z.object({
  id: optionalInt(1, Number.MAX_SAFE_INTEGER),
  name: z.string().trim().min(1, "Required.").max(120),
  slug: Slug.optional(),
  country: optionalText(2),
  orgName: optionalText(160),
  bio: optionalText(2000),
  foundedYear: optionalInt(1900, 2100),
  logoUrl: optionalText(500),
});

export async function saveTeam(
  _prev: ActionResult<{ id: number }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: number }>> {
  return adminAction({
    schema: TeamSchema,
    input: Object.fromEntries(formData),
    run: async (input) => {
      const values = {
        name: input.name,
        slug: input.slug ?? slugify(input.name),
        country: input.country?.toUpperCase() ?? null,
        orgName: input.orgName ?? null,
        bio: input.bio ?? null,
        foundedYear: input.foundedYear ?? null,
        logoUrl: input.logoUrl ?? null,
      };
      const id = input.id
        ? (
            await db
              .update(teams)
              .set(values)
              .where(eq(teams.id, input.id))
              .returning({ id: teams.id })
          )[0].id
        : (await db.insert(teams).values(values).returning({ id: teams.id }))[0]
            .id;
      return { id };
    },
    audit: (input, out) => ({
      action: input.id ? "team.update" : "team.create",
      entity: "team",
      entityId: out.id,
      payload: { name: input.name },
    }),
  });
}

/* -------------------------------------------------------------------------- */
/* Robots                                                                      */
/* -------------------------------------------------------------------------- */

const RobotSchema = z.object({
  id: optionalInt(1, Number.MAX_SAFE_INTEGER),
  teamId: z.coerce.number().int().positive("Pick a team."),
  name: z.string().trim().min(1, "Required.").max(120),
  slug: Slug.optional(),
  model: optionalText(120),
  weightClass: optionalText(60),
  heightCm: optionalInt(1, 500),
  /** Entered in kilograms; stored in grams so no float reaches the database. */
  weightKg: z
    .union([z.coerce.number().min(0).max(1000), z.literal("")])
    .optional()
    .transform((v) => (v === "" || v === undefined ? undefined : Number(v))),
  bio: optionalText(2000),
  photoUrl: optionalText(500),
});

export async function saveRobot(
  _prev: ActionResult<{ id: number }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: number }>> {
  return adminAction({
    schema: RobotSchema,
    input: Object.fromEntries(formData),
    run: async (input) => {
      const values = {
        teamId: input.teamId,
        name: input.name,
        slug: input.slug ?? slugify(input.name),
        model: input.model ?? null,
        weightClass: input.weightClass ?? null,
        heightCm: input.heightCm ?? null,
        weightGrams:
          input.weightKg === undefined ? null : Math.round(input.weightKg * 1000),
        bio: input.bio ?? null,
        photoUrl: input.photoUrl ?? null,
      };
      const id = input.id
        ? (
            await db
              .update(robots)
              .set(values)
              .where(eq(robots.id, input.id))
              .returning({ id: robots.id })
          )[0].id
        : (
            await db.insert(robots).values(values).returning({ id: robots.id })
          )[0].id;
      return { id };
    },
    audit: (input, out) => ({
      action: input.id ? "robot.update" : "robot.create",
      entity: "robot",
      entityId: out.id,
      payload: { name: input.name },
    }),
  });
}

/* -------------------------------------------------------------------------- */
/* Events                                                                      */
/* -------------------------------------------------------------------------- */

const EventSchema = z.object({
  id: optionalInt(1, Number.MAX_SAFE_INTEGER),
  competitionId: z.coerce.number().int().positive("Pick a competition."),
  name: z.string().trim().min(1, "Required.").max(160),
  slug: Slug.optional(),
  venue: optionalText(160),
  city: optionalText(120),
  country: optionalText(2),
  /**
   * A local wall-clock time plus the venue's zone, exactly as an organizer
   * would state it — "8pm in Singapore". Converted to a UTC instant on save,
   * because storing a local time without its zone is how events end up an
   * hour out twice a year.
   */
  startsAtLocal: z
    .string()
    .trim()
    .min(1, "Required.")
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Use the date and time picker."),
  // Checked against what Intl will ACTUALLY accept, not just length. An
  // unrecognised zone throws RangeError at render time, inside a component on
  // the public watch page and the landing hero — so a typo in this field is
  // not a wrong label, it is a downed page.
  timezone: z
    .string()
    .trim()
    .min(1, "Required.")
    .max(64)
    .refine(isValidTimeZone, "Not a recognised IANA timezone."),
  /**
   * State or territory. Meaningful only for the United States, and the
   * refinement below drops it for anywhere else rather than storing a value
   * that would then be printed beside a foreign city.
   */
  stateCode: optionalText(2),
  status: z.enum(["scheduled", "live", "completed", "cancelled"]),
  access: z.enum(["free", "subscription"]).default("free"),
  posterUrl: optionalText(500),
  /** Comma-separated ISO country codes; empty means unrestricted. */
  allowedCountries: optionalText(500),
})
  .refine(
    (v) => !v.country || isKnownCountry(v.country),
    { path: ["country"], message: "Pick a country from the list." },
  )
  .refine(
    (v) =>
      !v.stateCode ||
      (v.country?.toUpperCase() === STATE_COUNTRY && isKnownUsState(v.stateCode)),
    {
      path: ["stateCode"],
      // Two failures at once, and both matter. A state that is not a state is
      // rejected; so is a state on an event outside the US, because the form
      // hides that field there and a value arriving anyway did not come from
      // the form.
      message: "A state can only be set on a US event, and must be a real one.",
    },
  );

/**
 * Convert a wall-clock time in a named zone to the UTC instant it refers to.
 *
 * Done by measuring the zone's offset at approximately that moment and
 * subtracting it, then measuring again — the second pass matters on the two
 * days a year when a DST transition means the first guess landed on the wrong
 * side of the change.
 */
function zonedTimeToUtc(local: string, timeZone: string): Date {
  const asUtc = new Date(`${local}:00Z`);

  const offsetAt = (instant: Date) => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).formatToParts(instant);
    const get = (type: string) =>
      Number(parts.find((p) => p.type === type)?.value ?? "0");
    const asIfUtc = Date.UTC(
      get("year"),
      get("month") - 1,
      get("day"),
      get("hour") % 24,
      get("minute"),
      get("second"),
    );
    return asIfUtc - instant.getTime();
  };

  const firstGuess = new Date(asUtc.getTime() - offsetAt(asUtc));
  return new Date(asUtc.getTime() - offsetAt(firstGuess));
}

export async function saveEvent(
  _prev: ActionResult<{ id: number }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: number }>> {
  return adminAction({
    schema: EventSchema,
    input: Object.fromEntries(formData),
    run: async (input) => {
      const countries = (input.allowedCountries ?? "")
        .split(",")
        .map((c) => c.trim().toUpperCase())
        .filter(Boolean);

      const values = {
        competitionId: input.competitionId,
        name: input.name,
        slug: input.slug ?? slugify(input.name),
        venue: input.venue ?? null,
        city: input.city ?? null,
        country: input.country?.toUpperCase() ?? null,
        // Normalised and, for anywhere but the US, deliberately dropped.
        stateCode:
          input.country?.toUpperCase() === STATE_COUNTRY && input.stateCode
            ? input.stateCode.toUpperCase()
            : null,
        startsAt: zonedTimeToUtc(input.startsAtLocal, input.timezone),
        timezone: input.timezone,
        status: input.status,
        access: input.access,
        posterUrl: input.posterUrl ?? null,
        // Null, not an empty array. An empty array means "no territory is
        // permitted" and blocks everyone — see the note in lib/stream.ts.
        allowedCountries: countries.length > 0 ? countries : null,
      };

      const id = input.id
        ? (
            await db
              .update(events)
              .set(values)
              .where(eq(events.id, input.id))
              .returning({ id: events.id })
          )[0].id
        : (await db.insert(events).values(values).returning({ id: events.id }))[0]
            .id;
      return { id };
    },
    audit: (input, out) => ({
      action: input.id ? "event.update" : "event.create",
      entity: "event",
      entityId: out.id,
      payload: { name: input.name, status: input.status, access: input.access },
    }),
  });
}

const EventStatusSchema = z.object({
  eventId: z.coerce.number().int().positive(),
  status: z.enum(["scheduled", "live", "completed", "cancelled"]),
});

/** The Go Live / End Event switch on the run-of-show console. */
export async function setEventStatus(
  input: z.input<typeof EventStatusSchema>,
): Promise<ActionResult<{ id: number }>> {
  return adminAction({
    schema: EventStatusSchema,
    input,
    run: async ({ eventId, status }) => {
      await db.update(events).set({ status }).where(eq(events.id, eventId));
      return { id: eventId };
    },
    audit: ({ eventId, status }) => ({
      action: "event.status",
      entity: "event",
      entityId: eventId,
      payload: { status },
    }),
  });
}

/* -------------------------------------------------------------------------- */
/* Bouts                                                                       */
/* -------------------------------------------------------------------------- */

const BoutSchema = z
  .object({
    id: optionalInt(1, Number.MAX_SAFE_INTEGER),
    eventId: z.coerce.number().int().positive(),
    orderIndex: z.coerce.number().int().min(1).max(99),
    robotAId: z.coerce.number().int().positive("Pick a robot."),
    robotBId: z.coerce.number().int().positive("Pick a robot."),
    scheduledRounds: z.coerce.number().int().min(1).max(20).default(3),
  })
  .refine((v) => v.robotAId !== v.robotBId, {
    message: "A robot cannot fight itself.",
    path: ["robotBId"],
  });

export async function saveBout(
  _prev: ActionResult<{ id: number }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: number }>> {
  return adminAction({
    schema: BoutSchema,
    input: Object.fromEntries(formData),
    run: async (input) => {
      const [event] = await db
        .select({ competitionId: events.competitionId })
        .from(events)
        .where(eq(events.id, input.eventId))
        .limit(1);
      if (!event) throw new Error("Event not found");

      // Capture each robot's team AS OF NOW. The bout keeps these for good, so
      // a later transfer cannot move a finished result to a different team.
      //
      // Fetch only the two robots involved: reading the whole table worked
      // fine at a dozen robots and becomes a full scan on every bout write
      // once a league has hundreds.
      const chosen = await db
        .select({ id: robots.id, teamId: robots.teamId })
        .from(robots)
        .where(inArray(robots.id, [input.robotAId, input.robotBId]));
      const teamOf = (robotId: number) =>
        chosen.find((r) => r.id === robotId)?.teamId;

      const teamAId = teamOf(input.robotAId);
      const teamBId = teamOf(input.robotBId);
      if (!teamAId || !teamBId) throw new Error("Robot not found");

      const values = {
        eventId: input.eventId,
        competitionId: event.competitionId,
        orderIndex: input.orderIndex,
        robotAId: input.robotAId,
        robotBId: input.robotBId,
        teamAId,
        teamBId,
        scheduledRounds: input.scheduledRounds,
      };

      const id = input.id
        ? (
            await db
              .update(bouts)
              .set(values)
              .where(eq(bouts.id, input.id))
              .returning({ id: bouts.id })
          )[0].id
        : (await db.insert(bouts).values(values).returning({ id: bouts.id }))[0]
            .id;
      return { id };
    },
    audit: (input, out) => ({
      action: input.id ? "bout.update" : "bout.create",
      entity: "bout",
      entityId: out.id,
      payload: { eventId: input.eventId, orderIndex: input.orderIndex },
    }),
  });
}

const DeleteBoutSchema = z.object({
  boutId: z.coerce.number().int().positive(),
});

export async function deleteBout(
  input: z.input<typeof DeleteBoutSchema>,
): Promise<ActionResult<{ id: number }>> {
  return adminAction({
    schema: DeleteBoutSchema,
    input,
    run: async ({ boutId }) => {
      await db.delete(bouts).where(eq(bouts.id, boutId));
      return { id: boutId };
    },
    audit: ({ boutId }) => ({
      action: "bout.delete",
      entity: "bout",
      entityId: boutId,
    }),
  });
}

const BoutStatusSchema = z.object({
  boutId: z.coerce.number().int().positive(),
  status: z.enum(["scheduled", "live", "completed"]),
});

/**
 * Mark a bout live from the console.
 *
 * Setting one bout live clears any other on the same card, because two bouts
 * cannot be happening at once and the viewer's "On now" panel reads the first
 * one it finds.
 */
export async function setBoutStatus(
  input: z.input<typeof BoutStatusSchema>,
): Promise<ActionResult<{ id: number }>> {
  return adminAction({
    schema: BoutStatusSchema,
    input,
    run: async ({ boutId, status }) => {
      const [bout] = await db
        .select({ eventId: bouts.eventId })
        .from(bouts)
        .where(eq(bouts.id, boutId))
        .limit(1);
      if (!bout) throw new Error("Bout not found");

      if (status === "live") {
        await db
          .update(bouts)
          .set({ status: "scheduled" })
          .where(
            and(
              eq(bouts.eventId, bout.eventId),
              eq(bouts.status, "live"),
              ne(bouts.id, boutId),
            ),
          );
      }

      await db
        .update(bouts)
        .set({ status, startedAt: status === "live" ? new Date() : undefined })
        .where(eq(bouts.id, boutId));

      return { id: boutId };
    },
    audit: ({ boutId, status }) => ({
      action: "bout.status",
      entity: "bout",
      entityId: boutId,
      payload: { status },
    }),
  });
}

/* -------------------------------------------------------------------------- */
/* Results                                                                     */
/* -------------------------------------------------------------------------- */

const ResultSchema = z
  .object({
    boutId: z.coerce.number().int().positive(),
    method: z.enum(["ko", "tko", "decision", "draw", "dq", "no_contest"]),
    winnerRobotId: optionalInt(1, Number.MAX_SAFE_INTEGER),
    endRound: optionalInt(1, 20),
    endTimeSeconds: optionalInt(0, 3600),
    knockdownsA: z.coerce.number().int().min(0).max(50).default(0),
    knockdownsB: z.coerce.number().int().min(0).max(50).default(0),
    notes: optionalText(1000),
  })
  .refine(
    (v) =>
      v.method === "draw" || v.method === "no_contest"
        ? v.winnerRobotId === undefined
        : v.winnerRobotId !== undefined,
    {
      message:
        "A decisive result needs a winner; a draw or no contest must not have one.",
      path: ["winnerRobotId"],
    },
  );

/**
 * Record the outcome of a bout.
 *
 * An upsert on bout_id, which is UNIQUE — so submitting the same result twice
 * corrects it rather than double-counting it in the standings. That property
 * matters more than it sounds: the console is used under time pressure, on
 * event night, by someone watching a fight rather than the screen.
 */
export async function recordResult(
  _prev: ActionResult<{ id: number }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: number }>> {
  return adminAction({
    schema: ResultSchema,
    input: Object.fromEntries(formData),
    run: async (input) => {
      const [bout] = await db
        .select({
          id: bouts.id,
          robotAId: bouts.robotAId,
          robotBId: bouts.robotBId,
        })
        .from(bouts)
        .where(eq(bouts.id, input.boutId))
        .limit(1);
      if (!bout) throw new Error("Bout not found");

      // The winner must be one of the two robots that actually fought. The
      // database cannot enforce this — a CHECK cannot reference another table
      // — so it is caught here, before it reaches the standings.
      if (
        input.winnerRobotId !== undefined &&
        input.winnerRobotId !== bout.robotAId &&
        input.winnerRobotId !== bout.robotBId
      ) {
        throw new Error("Winner is not in this bout");
      }

      const values = {
        boutId: input.boutId,
        winnerRobotId: input.winnerRobotId ?? null,
        method: input.method,
        endRound: input.endRound ?? null,
        endTimeSeconds: input.endTimeSeconds ?? null,
        knockdownsA: input.knockdownsA,
        knockdownsB: input.knockdownsB,
        notes: input.notes ?? null,
        recordedAt: new Date(),
      };

      await db
        .insert(boutResults)
        .values(values)
        .onConflictDoUpdate({ target: boutResults.boutId, set: values });

      await db
        .update(bouts)
        .set({ status: "completed" })
        .where(eq(bouts.id, input.boutId));

      return { id: input.boutId };
    },
    audit: (input) => ({
      action: "result.record",
      entity: "bout",
      entityId: input.boutId,
      payload: { method: input.method, winnerRobotId: input.winnerRobotId },
    }),
  });
}

const ClearResultSchema = z.object({
  boutId: z.coerce.number().int().positive(),
});

/** Undo a result entered in error. The bout returns to unresolved. */
export async function clearResult(
  input: z.input<typeof ClearResultSchema>,
): Promise<ActionResult<{ id: number }>> {
  return adminAction({
    schema: ClearResultSchema,
    input,
    run: async ({ boutId }) => {
      await db.delete(boutResults).where(eq(boutResults.boutId, boutId));
      await db
        .update(bouts)
        .set({ status: "scheduled" })
        .where(eq(bouts.id, boutId));
      return { id: boutId };
    },
    audit: ({ boutId }) => ({
      action: "result.clear",
      entity: "bout",
      entityId: boutId,
    }),
  });
}
