"use client";

import { useCallback, useRef, useState } from "react";
import { ImageUp, Link2, Trash2 } from "lucide-react";

import {
  MAX_UPLOAD_BYTES,
  rejectionMessage,
  validateUpload,
} from "@/lib/uploads";
import { cn } from "@/lib/utils";

type Stage = "idle" | "preparing" | "uploading" | "done" | "error";

const ACCEPTED = "image/jpeg,image/png,image/webp,image/avif,image/gif";

/**
 * Pick an image, put it in R2, keep the resulting URL in a form field.
 *
 * Choosing a file is the primary action and looks like it. The first version
 * of this put a URL text input first with a small Upload button beside it,
 * which read as "typing a link is normal, uploading is the exception" — the
 * opposite of the truth, and the first person to use it asked why they were
 * being made to paste a URL at all.
 *
 * Pasting a URL is still possible, behind a link. Two reasons it stays: an
 * image that already lives somewhere (a team's own site, a press kit) should
 * not have to be re-uploaded, and when an upload fails the administrator can
 * still finish the form instead of being stuck. It is an escape hatch, so it
 * is sized like one.
 *
 * The file goes browser → R2 directly and never passes through our server, so
 * a large image is not a serverless invocation carrying eight megabytes.
 */
export function ImageField({
  label,
  name,
  defaultValue,
  hint,
  errors,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  hint?: string;
  errors?: string[];
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  const [value, setValue] = useState(defaultValue ?? "");
  const [stage, setStage] = useState<Stage>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [showUrl, setShowUrl] = useState(false);
  const [dragging, setDragging] = useState(false);

  const upload = useCallback(async (file: File) => {
    setMessage(null);

    // Checked here so an obviously wrong file is refused instantly, and
    // checked again on the server — this copy is a courtesy, not the control.
    const verdict = validateUpload({
      contentType: file.type,
      sizeBytes: file.size,
    });
    if (!verdict.ok) {
      setStage("error");
      setMessage(rejectionMessage(verdict.reason));
      return;
    }

    setStage("preparing");
    try {
      const presign = await fetch("/api/admin/uploads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentType: file.type,
          sizeBytes: file.size,
        }),
      });

      if (!presign.ok) {
        const body = await presign.json().catch(() => null);
        setStage("error");
        setMessage(body?.error ?? "Could not prepare the upload.");
        return;
      }

      const { uploadUrl, publicUrl, headers } = await presign.json();

      setStage("uploading");
      const put = await fetch(uploadUrl, {
        method: "PUT",
        headers,
        body: file,
      });

      if (!put.ok) {
        setStage("error");
        setMessage(
          `The storage service refused the upload (${put.status}). Nothing was saved.`,
        );
        return;
      }

      setValue(publicUrl);
      setStage("done");
      setMessage("Uploaded. Remember to save the form.");
    } catch (error) {
      console.error("[upload] failed:", error);
      setStage("error");
      // A cross-origin PUT the bucket has not allowed fails here, as a thrown
      // TypeError with no status — indistinguishable from being offline unless
      // we say so. Naming the likely cause turns a dead end into a fix.
      setMessage(
        "The upload did not complete. If this is the first upload, the R2 " +
          "bucket may need a CORS rule allowing PUT from this site. You can " +
          "paste a URL instead.",
      );
      setShowUrl(true);
    }
  }, []);

  const busy = stage === "preparing" || stage === "uploading";

  const take = (file: File | undefined) => {
    if (file) void upload(file);
  };

  return (
    <div className="space-y-2">
      <span className="text-ink block text-sm font-medium">{label}</span>

      {/* The value that actually posts. Hidden while the URL box is closed, so
          there is exactly one input carrying it either way. */}
      {!showUrl ? <input type="hidden" name={name} value={value} /> : null}

      {value ? (
        <div className="border-line bg-canvas flex items-center gap-3 rounded-md border p-2">
          {/* A plain <img>, not next/image: this may be an arbitrary URL an
              admin just pasted, and the optimizer only accepts hosts in the
              remotePatterns allowlist. A broken preview would look like a
              broken upload. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt=""
            className="border-line size-14 shrink-0 rounded border object-cover"
            onError={(event) => {
              event.currentTarget.style.visibility = "hidden";
            }}
          />
          <span className="text-ink-dim min-w-0 flex-1 truncate text-xs">
            {value}
          </span>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="border-line text-ink hover:bg-surface-2 shrink-0 rounded-md border px-3 py-1.5 text-xs font-medium disabled:opacity-50"
          >
            {busy ? "Uploading…" : "Replace"}
          </button>
          <button
            type="button"
            aria-label="Remove image"
            onClick={() => {
              setValue("");
              setStage("idle");
              setMessage(null);
            }}
            className="border-line text-ink-muted hover:text-destructive hover:bg-surface-2 shrink-0 rounded-md border p-1.5"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            take(event.dataTransfer.files?.[0]);
          }}
          disabled={busy}
          className={cn(
            "flex w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed px-4 py-7 text-sm transition-colors",
            dragging
              ? "border-volt bg-volt/5 text-ink"
              : "border-line bg-canvas text-ink-muted hover:border-line-strong hover:text-ink",
            busy && "opacity-60",
          )}
        >
          <ImageUp className="text-ink-dim size-6" />
          <span className="font-medium">
            {stage === "preparing"
              ? "Preparing…"
              : stage === "uploading"
                ? "Uploading…"
                : "Choose an image or drop one here"}
          </span>
          <span className="text-ink-dim text-xs">
            JPG, PNG, WEBP, AVIF or GIF · up to{" "}
            {Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))} MB
          </span>
        </button>
      )}

      <input
        ref={fileRef}
        type="file"
        accept={ACCEPTED}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          // Reset so choosing the same file twice still fires a change.
          event.target.value = "";
          take(file);
        }}
      />

      {showUrl ? (
        <div className="space-y-1">
          <input
            name={name}
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setStage("idle");
            }}
            placeholder="https://…"
            className="border-line bg-canvas text-ink placeholder:text-ink-dim focus:border-volt focus-visible:ring-volt w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-1 focus-visible:outline-none"
          />
          <button
            type="button"
            onClick={() => setShowUrl(false)}
            className="text-ink-dim hover:text-ink text-xs underline underline-offset-4"
          >
            Hide the URL box
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowUrl(true)}
          className="text-ink-dim hover:text-ink inline-flex items-center gap-1.5 text-xs underline underline-offset-4"
        >
          <Link2 className="size-3" />
          Or paste a URL instead
        </button>
      )}

      {message ? (
        <p
          className={cn(
            "text-xs",
            stage === "error" ? "text-destructive" : "text-volt",
          )}
          role={stage === "error" ? "alert" : "status"}
        >
          {message}
        </p>
      ) : null}

      {hint && !message ? <p className="text-ink-dim text-xs">{hint}</p> : null}

      {errors?.length ? (
        <p className="text-destructive text-xs" role="alert">
          {errors.join(" ")}
        </p>
      ) : null}
    </div>
  );
}
