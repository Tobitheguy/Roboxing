"use client";

import { useCallback, useId, useRef, useState } from "react";

import { MAX_UPLOAD_BYTES, rejectionMessage, validateUpload } from "@/lib/uploads";
import { cn } from "@/lib/utils";

type Stage = "idle" | "preparing" | "uploading" | "done" | "error";

/**
 * Pick an image, put it in R2, keep the resulting URL in a form field.
 *
 * The URL field stays visible and editable rather than being hidden behind the
 * upload button. Two reasons, both practical: an image that already lives
 * somewhere (a team's own site, a press kit) should not have to be
 * re-uploaded, and when an upload fails the administrator can still finish the
 * form by pasting a link instead of being stuck.
 *
 * The file goes browser → R2 directly. It never passes through our server, so
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
  const inputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);

  const [value, setValue] = useState(defaultValue ?? "");
  const [stage, setStage] = useState<Stage>("idle");
  const [message, setMessage] = useState<string | null>(null);

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
        // These headers are part of the signature. R2 rejects the request if
        // they do not match what was signed, which is what makes the type and
        // size limits real rather than advisory.
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
      setMessage("Uploaded.");
    } catch (error) {
      console.error("[upload] failed:", error);
      setStage("error");
      // A cross-origin PUT that the bucket has not allowed fails here, as a
      // thrown TypeError with no status — indistinguishable from being offline
      // unless we say so. Naming the likely cause turns a dead end into a fix.
      setMessage(
        "The upload did not complete. If this is the first upload, the R2 " +
          "bucket may need a CORS rule allowing PUT from this site. You can " +
          "paste a URL instead.",
      );
    }
  }, []);

  const busy = stage === "preparing" || stage === "uploading";

  return (
    <div className="space-y-2">
      <label htmlFor={inputId} className="text-ink block text-sm font-medium">
        {label}
      </label>

      <div className="flex gap-2">
        <input
          id={inputId}
          name={name}
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setStage("idle");
            setMessage(null);
          }}
          placeholder="https://…"
          className="border-line bg-canvas text-ink placeholder:text-ink-dim focus:border-volt focus-visible:ring-volt min-w-0 flex-1 rounded-md border px-3 py-2 text-sm focus-visible:ring-1 focus-visible:outline-none"
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="border-line text-ink hover:bg-surface-2 focus-visible:ring-volt shrink-0 rounded-md border px-3 py-2 text-sm font-medium whitespace-nowrap focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50"
        >
          {stage === "preparing"
            ? "Preparing…"
            : stage === "uploading"
              ? "Uploading…"
              : "Upload"}
        </button>
      </div>

      {/* Deliberately outside the form's own submission: a file input with a
          name would post the bytes to the server action too. */}
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          // Reset so choosing the same file twice still fires a change.
          event.target.value = "";
          if (file) void upload(file);
        }}
      />

      {value ? (
        <div className="border-line bg-canvas flex items-center gap-3 rounded-md border p-2">
          {/* A plain <img>, not next/image: this is an arbitrary URL an admin
              may have just pasted, and the optimizer only accepts hosts in the
              remotePatterns allowlist. A broken preview here would look like a
              broken upload. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt=""
            className="border-line size-12 shrink-0 rounded border object-cover"
            onError={(event) => {
              event.currentTarget.style.visibility = "hidden";
            }}
          />
          <span className="text-ink-dim truncate text-xs">{value}</span>
        </div>
      ) : null}

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

      {hint && !message ? (
        <p className="text-ink-dim text-xs">
          {hint} Up to {Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))} MB.
        </p>
      ) : null}

      {errors?.length ? (
        <p className="text-destructive text-xs" role="alert">
          {errors.join(" ")}
        </p>
      ) : null}
    </div>
  );
}
