"use client";

import { useActionState, useState } from "react";

import { ImageField } from "@/components/admin/image-field";
import {
  FormStatus,
  SelectField,
  SubmitButton,
  TextArea,
  TextField,
  fieldErrorsOf,
} from "@/components/admin/form";
import {
  saveBout,
  saveCompetition,
  saveEvent,
  saveRobot,
  saveTeam,
} from "@/app/(app)/admin/actions";
import type { ActionResult } from "@/lib/admin-action";
import {
  COUNTRIES,
  STATE_COUNTRY,
  US_STATES,
} from "@/lib/places";
import { COMMON_TIME_ZONES, supportedTimeZones } from "@/lib/timezones";

/** Blank first, so nothing is selected by accident on a new record. */
const COUNTRY_OPTIONS = [
  { value: "", label: "—" },
  ...COUNTRIES.map((c) => ({ value: c.code, label: `${c.name} (${c.code})` })),
];

const US_STATE_OPTIONS = [
  { value: "", label: "—" },
  ...US_STATES.map((s) => ({ value: s.code, label: `${s.name} (${s.code})` })),
];

/**
 * Frequently used zones first, then every zone the runtime knows.
 *
 * The full list is ~420 entries, which is fine in a native select and removes
 * the class of failure where a plausible-looking typo is accepted and only
 * surfaces as a wrong time on the public page.
 */
const TIME_ZONE_OPTIONS = (() => {
  const common = [...COMMON_TIME_ZONES];
  const rest = supportedTimeZones()
    .filter((zone) => !common.includes(zone as (typeof COMMON_TIME_ZONES)[number]))
    .sort();
  return [...common, ...rest].map((zone) => ({
    value: zone,
    label: zone.replace(/_/g, " "),
  }));
})();

/**
 * One client form per entity.
 *
 * Each owns its own useActionState. They cannot share a single generic form
 * component with a render prop, because a function cannot cross the
 * server/client boundary — so the shared parts are the field components.
 */

type Saved = ActionResult<{ id: number }> | null;

/* -------------------------------------------------------------------------- */

export function CompetitionForm({
  competition,
  rule,
}: {
  competition?: {
    id: number;
    name: string;
    slug: string;
    organizer: string | null;
    seasonYear: number | null;
    status: string;
    description: string | null;
  };
  rule?: {
    winPoints: number;
    drawPoints: number;
    lossPoints: number;
    koBonusPoints: number;
  };
}) {
  const [state, action, pending] = useActionState<Saved, FormData>(
    saveCompetition,
    null,
  );
  const errors = fieldErrorsOf(state);

  return (
    <form action={action} className="space-y-5">
      {competition ? (
        <input type="hidden" name="id" value={competition.id} />
      ) : null}

      <TextField
        label="Name"
        name="name"
        required
        defaultValue={competition?.name}
        errors={errors.name}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="Slug"
          name="slug"
          hint="Leave blank to generate from the name."
          defaultValue={competition?.slug}
          errors={errors.slug}
        />
        <TextField
          label="Organizer"
          name="organizer"
          defaultValue={competition?.organizer}
          errors={errors.organizer}
        />
        <TextField
          label="Season year"
          name="seasonYear"
          type="number"
          defaultValue={competition?.seasonYear}
          errors={errors.seasonYear}
        />
        <SelectField
          label="Status"
          name="status"
          defaultValue={competition?.status ?? "upcoming"}
          options={[
            { value: "upcoming", label: "Upcoming" },
            { value: "active", label: "Active" },
            { value: "completed", label: "Completed" },
          ]}
          errors={errors.status}
        />
      </div>
      <TextArea
        label="Description"
        name="description"
        defaultValue={competition?.description}
        errors={errors.description}
      />

      <div className="border-line border-t pt-5">
        <p className="eyebrow mb-3">Scoring</p>
        <div className="grid gap-5 sm:grid-cols-4">
          <TextField
            label="Win"
            name="winPoints"
            type="number"
            defaultValue={rule?.winPoints ?? 3}
            errors={errors.winPoints}
          />
          <TextField
            label="Draw"
            name="drawPoints"
            type="number"
            defaultValue={rule?.drawPoints ?? 1}
            errors={errors.drawPoints}
          />
          <TextField
            label="Loss"
            name="lossPoints"
            type="number"
            defaultValue={rule?.lossPoints ?? 0}
            errors={errors.lossPoints}
          />
          <TextField
            label="KO bonus"
            name="koBonusPoints"
            type="number"
            hint="Added to a win by KO or TKO. Not paid for a DQ."
            defaultValue={rule?.koBonusPoints ?? 1}
            errors={errors.koBonusPoints}
          />
        </div>
      </div>

      <FormStatus state={state} />
      <SubmitButton pending={pending} />
    </form>
  );
}

/* -------------------------------------------------------------------------- */

export function TeamForm({
  team,
}: {
  team?: {
    id: number;
    name: string;
    slug: string;
    country: string | null;
    orgName: string | null;
    bio: string | null;
    foundedYear: number | null;
    logoUrl: string | null;
  };
}) {
  const [state, action, pending] = useActionState<Saved, FormData>(
    saveTeam,
    null,
  );
  const errors = fieldErrorsOf(state);

  return (
    <form action={action} className="space-y-5">
      {team ? <input type="hidden" name="id" value={team.id} /> : null}

      <TextField
        label="Name"
        name="name"
        required
        defaultValue={team?.name}
        errors={errors.name}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="Slug"
          name="slug"
          hint="Leave blank to generate."
          defaultValue={team?.slug}
          errors={errors.slug}
        />
        <SelectField
          label="Country"
          name="country"
          defaultValue={team?.country ?? ""}
          options={COUNTRY_OPTIONS}
          errors={errors.country}
        />
        <TextField
          label="Organisation"
          name="orgName"
          defaultValue={team?.orgName}
          errors={errors.orgName}
        />
        <TextField
          label="Founded"
          name="foundedYear"
          type="number"
          defaultValue={team?.foundedYear}
          errors={errors.foundedYear}
        />
      </div>
      <ImageField
        label="Logo"
        name="logoUrl"
        hint="Upload an image, or paste a URL."
        defaultValue={team?.logoUrl}
        errors={errors.logoUrl}
      />
      <TextArea
        label="Bio"
        name="bio"
        defaultValue={team?.bio}
        errors={errors.bio}
      />

      <FormStatus state={state} />
      <SubmitButton pending={pending} />
    </form>
  );
}

/* -------------------------------------------------------------------------- */

export function RobotForm({
  robot,
  teams,
}: {
  robot?: {
    id: number;
    teamId: number;
    name: string;
    slug: string;
    model: string | null;
    weightClass: string | null;
    heightCm: number | null;
    weightGrams: number | null;
    bio: string | null;
    photoUrl: string | null;
  };
  teams: { id: number; name: string }[];
}) {
  const [state, action, pending] = useActionState<Saved, FormData>(
    saveRobot,
    null,
  );
  const errors = fieldErrorsOf(state);

  return (
    <form action={action} className="space-y-5">
      {robot ? <input type="hidden" name="id" value={robot.id} /> : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="Name"
          name="name"
          required
          defaultValue={robot?.name}
          errors={errors.name}
        />
        <SelectField
          label="Team"
          name="teamId"
          required
          defaultValue={robot?.teamId}
          options={teams.map((t) => ({ value: t.id, label: t.name }))}
          errors={errors.teamId}
        />
        <TextField
          label="Slug"
          name="slug"
          hint="Leave blank to generate."
          defaultValue={robot?.slug}
          errors={errors.slug}
        />
        <TextField
          label="Model"
          name="model"
          defaultValue={robot?.model}
          errors={errors.model}
        />
        <TextField
          label="Weight class"
          name="weightClass"
          defaultValue={robot?.weightClass}
          errors={errors.weightClass}
        />
        <TextField
          label="Height (cm)"
          name="heightCm"
          type="number"
          defaultValue={robot?.heightCm}
          errors={errors.heightCm}
        />
        <TextField
          label="Weight (kg)"
          name="weightKg"
          type="number"
          hint="Stored in grams, so decimals are fine."
          defaultValue={
            robot?.weightGrams == null ? undefined : robot.weightGrams / 1000
          }
          errors={errors.weightKg}
        />
        <ImageField
          label="Photo"
          name="photoUrl"
          hint="Upload an image, or paste a URL."
          defaultValue={robot?.photoUrl}
          errors={errors.photoUrl}
        />
      </div>
      <TextArea
        label="Bio"
        name="bio"
        defaultValue={robot?.bio}
        errors={errors.bio}
      />

      <FormStatus state={state} />
      <SubmitButton pending={pending} />
    </form>
  );
}

/* -------------------------------------------------------------------------- */

export function EventForm({
  event,
  competitions,
  startsAtLocal,
}: {
  event?: {
    id: number;
    competitionId: number;
    name: string;
    slug: string;
    venue: string | null;
    city: string | null;
    country: string | null;
    stateCode: string | null;
    timezone: string;
    status: string;
    access: string;
    posterUrl: string | null;
    allowedCountries: string[] | null;
  };
  competitions: { id: number; name: string }[];
  /** Precomputed on the server: the UTC instant rendered in the venue's zone. */
  startsAtLocal?: string;
}) {
  const [state, action, pending] = useActionState<Saved, FormData>(
    saveEvent,
    null,
  );
  // Held in state only so the State field can appear and disappear. The value
  // still posts from the select itself, not from here.
  const [country, setCountry] = useState(event?.country ?? "");
  const errors = fieldErrorsOf(state);

  return (
    <form action={action} className="space-y-5">
      {event ? <input type="hidden" name="id" value={event.id} /> : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="Name"
          name="name"
          required
          defaultValue={event?.name}
          errors={errors.name}
        />
        <SelectField
          label="Competition"
          name="competitionId"
          required
          defaultValue={event?.competitionId}
          options={competitions.map((c) => ({ value: c.id, label: c.name }))}
          errors={errors.competitionId}
        />
        <TextField
          label="Starts (venue local time)"
          name="startsAtLocal"
          type="datetime-local"
          required
          hint="The time on the clock at the venue, not your time."
          defaultValue={startsAtLocal}
          errors={errors.startsAtLocal}
        />
        {/* A select, not free text, and no UTC default. The old field defaulted
            to UTC and accepted anything — so the first real event entered, at
            Madison Square Garden, was saved as UTC, and the page would have
            shown the venue time in the wrong zone. A default that is wrong for
            every venue on earth is not a default, it is a trap. */}
        <SelectField
          label="Venue timezone"
          name="timezone"
          required
          hint="The zone the venue is in — this is what viewers see beside their own time."
          defaultValue={event?.timezone}
          options={TIME_ZONE_OPTIONS}
          errors={errors.timezone}
        />
        <TextField
          label="Venue"
          name="venue"
          defaultValue={event?.venue}
          errors={errors.venue}
        />
        <TextField
          label="City"
          name="city"
          defaultValue={event?.city}
          errors={errors.city}
        />
        <SelectField
          label="Country"
          name="country"
          defaultValue={country}
          onChange={(event_) => setCountry(event_.target.value)}
          options={COUNTRY_OPTIONS}
          errors={errors.country}
        />
        {/* Only for the United States. A "State" box on an event in Singapore
            is a question with no correct answer, and leaving it on screen
            invites someone to answer it anyway. The server refuses a state on
            a non-US event for the same reason. */}
        {country === STATE_COUNTRY ? (
          <SelectField
            label="State"
            name="stateCode"
            defaultValue={event?.stateCode ?? ""}
            options={US_STATE_OPTIONS}
            errors={errors.stateCode}
          />
        ) : null}
        <TextField
          label="Slug"
          name="slug"
          hint="Leave blank to generate."
          defaultValue={event?.slug}
          errors={errors.slug}
        />
        <SelectField
          label="Status"
          name="status"
          defaultValue={event?.status ?? "scheduled"}
          options={[
            { value: "scheduled", label: "Scheduled" },
            { value: "live", label: "Live" },
            { value: "completed", label: "Completed" },
            { value: "cancelled", label: "Cancelled" },
          ]}
          errors={errors.status}
        />
        <SelectField
          label="Access"
          name="access"
          hint="Free until there is something licensed to sell."
          defaultValue={event?.access ?? "free"}
          options={[
            { value: "free", label: "Free to watch" },
            { value: "subscription", label: "Subscribers only" },
          ]}
          errors={errors.access}
        />
      </div>

      <TextField
        label="Allowed countries"
        name="allowedCountries"
        hint="Comma-separated two-letter codes. Blank means no territory restriction — this comes from the rights agreement, not from preference."
        defaultValue={event?.allowedCountries?.join(", ")}
        errors={errors.allowedCountries}
      />
      <ImageField
        label="Poster"
        name="posterUrl"
        hint="Upload an image, or paste a URL."
        defaultValue={event?.posterUrl}
        errors={errors.posterUrl}
      />

      <FormStatus state={state} />
      <SubmitButton pending={pending} />
    </form>
  );
}

/* -------------------------------------------------------------------------- */

export function BoutForm({
  eventId,
  nextOrderIndex,
  robots,
}: {
  eventId: number;
  nextOrderIndex: number;
  robots: { id: number; name: string; teamName: string }[];
}) {
  const [state, action, pending] = useActionState<Saved, FormData>(
    saveBout,
    null,
  );
  const errors = fieldErrorsOf(state);
  const options = robots.map((r) => ({
    value: r.id,
    label: `${r.name} — ${r.teamName}`,
  }));

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="eventId" value={eventId} />

      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField
          label="Robot A"
          name="robotAId"
          required
          options={options}
          errors={errors.robotAId}
        />
        <SelectField
          label="Robot B"
          name="robotBId"
          required
          options={options}
          errors={errors.robotBId}
        />
        <TextField
          label="Order on the card"
          name="orderIndex"
          type="number"
          required
          hint="1 opens the night; the highest number is the main event."
          defaultValue={nextOrderIndex}
          errors={errors.orderIndex}
        />
        <TextField
          label="Scheduled rounds"
          name="scheduledRounds"
          type="number"
          defaultValue={3}
          errors={errors.scheduledRounds}
        />
      </div>

      <FormStatus state={state} successMessage="Bout added." />
      <SubmitButton pending={pending} label="Add bout" />
    </form>
  );
}
