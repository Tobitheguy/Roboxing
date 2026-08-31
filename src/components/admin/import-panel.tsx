"use client";

import { useActionState, useState } from "react";
import { AlertTriangle, Check, Plus, RefreshCw } from "lucide-react";

import { Badge } from "@/components/badge";
import { Card, CardBody, CardHeader } from "@/components/card";
import { Button } from "@/components/ui/button";
import {
  applyImport,
  previewImport,
  type ImportKind,
  type PreviewResult,
} from "@/app/(app)/admin/import/actions";
import type { ActionResult } from "@/lib/admin-action";
import { cn } from "@/lib/utils";

/**
 * Paste a CSV, see exactly what would change, then apply it.
 *
 * The preview is not decoration. An import that overwrites the wrong rows does
 * not throw — it succeeds, and the damage is only visible later on a public
 * page. Seeing "12 create, 3 update" before anything is written is the whole
 * point of the screen.
 */

const KINDS: {
  value: ImportKind;
  label: string;
  headers: string;
  note: string;
}[] = [
  {
    value: "teams",
    label: "Teams",
    headers: "slug,name,country,orgName,foundedYear,bio",
    note: "Matched on slug. A slug that already exists is updated, not duplicated.",
  },
  {
    value: "robots",
    label: "Robots",
    headers: "slug,name,teamSlug,model,weightClass,heightCm,weightKg,bio",
    note: "The team must already exist — an unknown teamSlug is an error, not a new team.",
  },
  {
    value: "fixtures",
    label: "Fixtures",
    headers: "eventSlug,orderIndex,robotASlug,robotBSlug,scheduledRounds",
    note: "Matched on event plus position. Re-importing a corrected file replaces the bout in that slot.",
  },
];

export function ImportPanel() {
  const [kind, setKind] = useState<ImportKind>("teams");
  const [csv, setCsv] = useState("");

  const [preview, previewAction, previewing] = useActionState<
    ActionResult<PreviewResult> | null,
    FormData
  >(previewImport, null);

  const [applied, applyAction, applying] = useActionState<
    ActionResult<PreviewResult> | null,
    FormData
  >(applyImport, null);

  const selected = KINDS.find((k) => k.value === kind)!;
  const result = applied ?? preview;
  const hasPreview = Boolean(preview?.ok && !applied);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Paste a CSV" />
        <CardBody className="space-y-5">
          <div className="flex flex-wrap gap-2">
            {KINDS.map((k) => (
              <button
                key={k.value}
                type="button"
                onClick={() => setKind(k.value)}
                aria-pressed={kind === k.value}
                className={cn(
                  "font-display rounded-md border px-3 py-1.5 text-xs font-semibold tracking-wide uppercase transition-colors",
                  kind === k.value
                    ? "border-volt/40 bg-volt/10 text-volt"
                    : "border-line text-ink-muted hover:text-ink",
                )}
              >
                {k.label}
              </button>
            ))}
          </div>

          <div>
            <p className="eyebrow mb-1.5">Expected columns</p>
            <code className="border-line bg-surface-2 text-ink-muted block overflow-x-auto rounded-md border px-3 py-2 font-mono text-xs">
              {selected.headers}
            </code>
            <p className="text-ink-dim mt-2 text-xs">{selected.note}</p>
          </div>

          <label className="block">
            <span className="eyebrow mb-1.5 block">CSV</span>
            <textarea
              value={csv}
              onChange={(e) => setCsv(e.target.value)}
              rows={10}
              spellCheck={false}
              placeholder={selected.headers}
              className="border-input bg-surface-2 text-ink focus-visible:border-volt w-full resize-y rounded-md border px-3 py-2 font-mono text-xs outline-none"
            />
          </label>

          <div className="flex flex-wrap gap-3">
            <form action={previewAction}>
              <input type="hidden" name="kind" value={kind} />
              <input type="hidden" name="csv" value={csv} />
              <Button type="submit" variant="outline" disabled={previewing || !csv}>
                {previewing ? "Checking…" : "Preview changes"}
              </Button>
            </form>

            {hasPreview && preview?.ok ? (
              <form action={applyAction}>
                <input type="hidden" name="kind" value={kind} />
                <input type="hidden" name="csv" value={csv} />
                <Button
                  type="submit"
                  disabled={
                    applying || preview.data.creates + preview.data.updates === 0
                  }
                >
                  {applying
                    ? "Importing…"
                    : `Apply ${preview.data.creates + preview.data.updates} changes`}
                </Button>
              </form>
            ) : null}
          </div>

          {result && !result.ok ? (
            <p
              role="alert"
              className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm"
            >
              {result.error}
            </p>
          ) : null}
        </CardBody>
      </Card>

      {result?.ok ? (
        <Card>
          <CardHeader
            title={applied ? "Imported" : "Preview — nothing written yet"}
            action={
              <div className="flex gap-2">
                <Badge variant="win">
                  <Plus className="size-3" />
                  {result.data.creates} new
                </Badge>
                <Badge>
                  <RefreshCw className="size-3" />
                  {result.data.updates} updated
                </Badge>
                {result.data.errors > 0 ? (
                  <Badge variant="warn">
                    <AlertTriangle className="size-3" />
                    {result.data.errors} skipped
                  </Badge>
                ) : null}
              </div>
            }
          />
          <CardBody>
            {applied ? (
              <p className="border-volt/30 bg-volt/10 text-volt mb-4 rounded-md border px-3 py-2 text-sm">
                <Check className="mr-1 inline size-4" />
                {result.data.creates} created, {result.data.updates} updated
                {result.data.errors > 0
                  ? `, ${result.data.errors} skipped — see below.`
                  : "."}
              </p>
            ) : null}

            <ul className="max-h-96 space-y-1 overflow-y-auto text-xs">
              {result.data.rows.map((row) => (
                <li
                  key={row.line}
                  className={cn(
                    "flex items-start gap-3 rounded-md px-2 py-1.5",
                    row.action === "error" && "bg-destructive/10",
                  )}
                >
                  <span className="text-ink-dim tabular w-10 shrink-0">
                    {row.line}
                  </span>
                  <span
                    className={cn(
                      "font-display w-16 shrink-0 font-semibold uppercase",
                      row.action === "create" && "text-volt",
                      row.action === "update" && "text-ink-muted",
                      row.action === "error" && "text-destructive",
                    )}
                  >
                    {row.action}
                  </span>
                  <span className="text-ink min-w-0 flex-1 truncate font-mono">
                    {row.label}
                  </span>
                  {row.errors?.length ? (
                    <span className="text-destructive min-w-0 flex-[2]">
                      {row.errors.join(" ")}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
