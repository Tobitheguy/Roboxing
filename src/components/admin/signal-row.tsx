"use client";

import { useActionState } from "react";
import { Check, ExternalLink, X } from "lucide-react";

import { triageSignal } from "@/app/(app)/admin/signals/actions";
import { Button } from "@/components/ui/button";
import { formatDateLong } from "@/lib/format";
import type { Signal } from "@/db/schema";
import type { ActionResult } from "@/lib/admin-action";

/**
 * One row of the inbox: the headline as an outbound link, and the two triage
 * verbs. The row hides itself optimistically once triaged — the alternative
 * is a full refresh per decision, and triage is a fifty-decision morning.
 */
export function SignalRow({ signal }: { signal: Signal }) {
  const [state, formAction] = useActionState<
    ActionResult<{ id: number }> | null,
    FormData
  >(triageSignal, null);

  // Triaged — gone. The server is the source of truth on the next load;
  // this only spares the reload in between.
  if (state?.ok) return null;

  return (
    <li className="border-line/60 flex items-center gap-3 border-b px-4 py-3 last:border-b-0 sm:px-6">
      <div className="min-w-0 flex-1">
        <a
          href={signal.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-ink hover:text-volt text-sm font-medium transition-colors"
        >
          {signal.title}
          <ExternalLink className="ml-1.5 inline size-3 align-[-1px]" />
        </a>
        <p className="text-ink-dim mt-0.5 text-xs">
          {signal.source}
          {signal.publishedAt
            ? ` · ${formatDateLong(signal.publishedAt, "UTC")}`
            : null}
        </p>
      </div>

      <form action={formAction} className="flex shrink-0 gap-1.5">
        <input type="hidden" name="id" value={signal.id} />
        <Button
          type="submit"
          name="status"
          value="kept"
          size="xs"
          variant="outline"
          title="Keep — worth coverage"
        >
          <Check />
          Keep
        </Button>
        <Button
          type="submit"
          name="status"
          value="dismissed"
          size="xs"
          variant="ghost"
          title="Dismiss — noise"
        >
          <X />
        </Button>
      </form>
    </li>
  );
}
