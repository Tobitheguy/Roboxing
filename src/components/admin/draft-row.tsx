"use client";

import { useActionState } from "react";
import { Check, ExternalLink, X } from "lucide-react";

import { reviewDraft } from "@/app/(app)/admin/drafts/actions";
import { Button } from "@/components/ui/button";
import type { RecordDraft } from "@/db/schema";
import type { ActionResult } from "@/lib/admin-action";
import type { DraftPayload } from "@/lib/draft-record";

/**
 * One proposed league or event, with every extracted field shown — INCLUDING
 * the ones that came back empty.
 *
 * Showing the blanks is the whole design. A draft that renders only what the
 * model found looks complete and invites Apply; the same draft showing
 * "country —" and "venue —" tells the reviewer exactly what they are agreeing
 * to publish. The nulls are the most honest thing on the card, so they are not
 * hidden to make it tidier.
 */

const COMPETITION_FIELDS = [
  ["Organiser", "organizer"],
  ["Country", "country"],
  ["City", "city"],
  ["Founded", "foundedYear"],
  ["Website", "websiteUrl"],
] as const;

const EVENT_FIELDS = [
  ["League", "competitionName"],
  ["Venue", "venue"],
  ["City", "city"],
  ["Country", "country"],
  ["Date", "startDate"],
  ["Date as written", "dateLabel"],
  ["Format", "format"],
] as const;

function Field({ label, value }: { label: string; value: unknown }) {
  const empty = value === null || value === undefined || value === "";
  return (
    <div className="flex gap-2 text-xs">
      <span className="eyebrow shrink-0 whitespace-nowrap">{label}</span>
      <span className={empty ? "text-ink-dim" : "text-ink"}>
        {empty ? "— not stated" : String(value)}
      </span>
    </div>
  );
}

export function DraftRow({ draft }: { draft: RecordDraft }) {
  const [state, formAction] = useActionState<
    ActionResult<{ id: number }> | null,
    FormData
  >(reviewDraft, null);

  if (state?.ok) return null;

  const payload = draft.payload as DraftPayload;
  const fields =
    draft.kind === "competition" ? COMPETITION_FIELDS : EVENT_FIELDS;

  return (
    <li className="border-line/60 border-b px-4 py-4 last:border-b-0 sm:px-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="display text-lg">{payload.name}</p>
          <p className="eyebrow mt-1">
            {draft.kind} · proposed {payload.confidence} · {draft.model}
          </p>
        </div>
        <a
          href={draft.sourceUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="text-ink-dim hover:text-volt shrink-0"
          title="Read the source"
        >
          <ExternalLink className="size-4" />
        </a>
      </div>

      {draft.rationale ? (
        <p className="text-ink-muted mt-2 text-sm">{draft.rationale}</p>
      ) : null}

      <div className="mt-3 grid gap-1 sm:grid-cols-2">
        {fields.map(([label, key]) => (
          <Field key={key} label={label} value={payload[key]} />
        ))}
      </div>

      {state && !state.ok ? (
        <p className="text-live mt-2 text-xs">{state.error}</p>
      ) : null}

      <div className="mt-3 flex gap-2">
        <form action={formAction}>
          <input type="hidden" name="id" value={draft.id} />
          <input type="hidden" name="action" value="apply" />
          <Button type="submit" size="sm">
            <Check className="size-4" /> Apply
          </Button>
        </form>
        <form action={formAction}>
          <input type="hidden" name="id" value={draft.id} />
          <input type="hidden" name="action" value="dismiss" />
          <Button type="submit" size="sm" variant="outline">
            <X className="size-4" /> Dismiss
          </Button>
        </form>
      </div>
    </li>
  );
}
