"use client";

import { useActionState } from "react";
import { Check, ExternalLink, X } from "lucide-react";

import { triageSignal } from "@/app/(app)/admin/signals/actions";
import { Button } from "@/components/ui/button";
import { formatDateLong } from "@/lib/format";
import type { Signal } from "@/db/schema";
import type { ActionResult } from "@/lib/admin-action";

/**
 * The score chip.
 *
 * Three bands, not a number line: the point of triage is deciding, and a
 * reader cannot act on the difference between 61 and 64. Unclassified rows get
 * no chip at all rather than a zero — "the classifier has not seen this" and
 * "the classifier judged this irrelevant" are different facts, and showing
 * both as 0 would quietly hide a broken classifier behind a plausible score.
 */
function ScoreChip({ score }: { score: number }) {
  const band =
    score >= 70
      ? "border-ink bg-ink text-canvas"
      : score >= 40
        ? "border-line text-ink"
        : "border-line/60 text-ink-dim";

  return (
    <span
      className={`inline-flex h-5 shrink-0 items-center rounded border px-1.5 font-mono text-[11px] leading-none ${band}`}
      title={`Relevance ${score}/100`}
    >
      {score}
    </span>
  );
}

/**
 * One row of the inbox: the headline as an outbound link, and the two triage
 * verbs. The row hides itself optimistically once triaged — the alternative
 * is a full refresh per decision, and triage is a fifty-decision morning.
 *
 * The summary line is what makes a Chinese headline actionable without leaving
 * the page; it is written in English by stage 2 regardless of source language.
 */
export function SignalRow({
  signal,
  showLanguage = false,
}: {
  signal: Signal;
  showLanguage?: boolean;
}) {
  const [state, formAction] = useActionState<
    ActionResult<{ id: number }> | null,
    FormData
  >(triageSignal, null);

  // Triaged — gone. The server is the source of truth on the next load;
  // this only spares the reload in between.
  if (state?.ok) return null;

  return (
    <li className="border-line/60 flex items-start gap-3 border-b px-4 py-3 last:border-b-0 sm:px-6">
      {signal.score === null ? null : <ScoreChip score={signal.score} />}

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

        {signal.summary ? (
          <p className="text-ink mt-1 text-sm">{signal.summary}</p>
        ) : null}

        <p className="text-ink-dim mt-0.5 text-xs">
          {showLanguage && signal.language ? (
            <span className="border-line mr-1.5 rounded border px-1 py-px text-[10px] tracking-wide uppercase">
              {signal.language}
            </span>
          ) : null}
          {signal.category ? `${signal.category} · ` : null}
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
