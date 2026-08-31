"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useReverification, useUser } from "@clerk/nextjs";
import { QRCodeSVG } from "qrcode.react";

type Stage = "creating" | "scan" | "backup" | "unavailable";

/**
 * Second-factor enrolment.
 *
 * Mandatory for every account, so this screen is on the critical path of the
 * very first session. That shapes it: it explains before it demands, it never
 * strands someone without a way forward, and it refuses to let them leave
 * until the recovery codes have actually been dealt with.
 *
 * TOTP with recovery codes, no SMS. SMS is defeated by a SIM swap — the
 * attack that specifically targets accounts worth taking over — and it bills
 * per message. An authenticator app is free, offline, and stronger.
 */
export function TwoFactorSetup({ destination }: { destination: string }) {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  const [stage, setStage] = useState<Stage>("creating");
  const [uri, setUri] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [codes, setCodes] = useState<string[]>([]);
  const [entered, setEntered] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState<"secret" | "codes" | null>(null);

  // Clerk requires a recently-verified session before it will change security
  // settings. Wrapping the calls means Clerk can put its own re-auth prompt
  // in front of them instead of the call simply failing.
  const createTOTP = useReverification(() => user!.createTOTP());
  const verifyTOTP = useReverification((code: string) =>
    user!.verifyTOTP({ code }),
  );
  const createBackupCodes = useReverification(() => user!.createBackupCode());

  // Strict Mode runs effects twice; a second createTOTP would throw away the
  // secret already on screen and invalidate a code the user is mid-way
  // through typing.
  const started = useRef(false);

  useEffect(() => {
    if (!isLoaded || !user || started.current) return;
    started.current = true;

    // Already enrolled — nothing to do here. Can happen on a refresh, or if
    // two tabs were open during setup.
    if (user.twoFactorEnabled) {
      router.replace(
        `/welcome?redirect_url=${encodeURIComponent(destination)}`,
      );
      return;
    }

    createTOTP()
      .then((totp) => {
        setUri(totp.uri ?? null);
        setSecret(totp.secret ?? null);
        setStage("scan");
      })
      .catch((cause) => {
        console.error("[2fa] could not start TOTP enrolment:", cause);
        setStage("unavailable");
      });
  }, [isLoaded, user, createTOTP, router, destination]);

  const submitCode = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (busy || entered.length < 6) return;

      setBusy(true);
      setError(null);

      try {
        const result = await verifyTOTP(entered);

        // Clerk sometimes returns the recovery codes with the verification
        // and sometimes not, depending on instance settings. Ask for them
        // explicitly when they are absent rather than leaving an account
        // with a second factor and no way back in if the phone is lost.
        let recovery = result.backupCodes ?? [];
        if (recovery.length === 0) {
          try {
            recovery = (await createBackupCodes()).codes;
          } catch (cause) {
            console.error("[2fa] could not create recovery codes:", cause);
          }
        }

        setCodes(recovery);
        setStage("backup");
      } catch (cause) {
        console.error("[2fa] verification failed:", cause);
        setError(
          "That code was not accepted. Codes change every 30 seconds — wait for the next one and try again.",
        );
        setEntered("");
      } finally {
        setBusy(false);
      }
    },
    [busy, entered, verifyTOTP, createBackupCodes],
  );

  const copy = useCallback(async (text: string, what: "secret" | "codes") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      // Clipboard access can be refused outright. The value is on screen and
      // selectable either way, so this is not worth an error message.
    }
  }, []);

  const downloadCodes = useCallback(() => {
    const body = [
      "Roboxing recovery codes",
      "",
      "Each code works once. Use one if you lose access to your",
      "authenticator app. Keep them somewhere other than your phone.",
      "",
      ...codes,
      "",
    ].join("\n");

    const url = URL.createObjectURL(
      new Blob([body], { type: "text/plain;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "roboxing-recovery-codes.txt";
    link.click();
    URL.revokeObjectURL(url);
    setSaved(true);
  }, [codes]);

  if (!isLoaded || stage === "creating") {
    return (
      <p className="text-ink-muted text-sm" role="status" aria-live="polite">
        Preparing your security setup&hellip;
      </p>
    );
  }

  if (stage === "unavailable") {
    return (
      <div className="border-line bg-surface w-full max-w-md rounded-lg border p-6">
        <h1 className="font-display text-title text-ink">
          Setup could not start
        </h1>
        <p className="text-ink-muted mt-3 text-sm leading-relaxed">
          Something went wrong preparing two-factor authentication. Your
          account was created — nothing was lost. Reload to try again.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="bg-volt text-volt-ink hover:bg-volt-dim focus-visible:ring-volt mt-5 w-full rounded-md px-4 py-2.5 text-sm font-semibold focus-visible:ring-2 focus-visible:outline-none"
        >
          Try again
        </button>
      </div>
    );
  }

  if (stage === "backup") {
    return (
      <div className="border-line bg-surface w-full max-w-md rounded-lg border p-6">
        <p className="text-eyebrow text-volt font-semibold uppercase">
          Step 2 of 2
        </p>
        <h1 className="font-display text-title text-ink mt-2">
          Save your recovery codes
        </h1>
        <p className="text-ink-muted mt-3 text-sm leading-relaxed">
          These are the only way back into your account if you lose your phone.
          Each one works once. Store them somewhere that is not your phone.
        </p>

        {codes.length > 0 ? (
          <>
            <ul className="border-line bg-canvas mt-5 grid grid-cols-2 gap-x-4 gap-y-2 rounded-md border p-4 font-mono text-sm">
              {codes.map((code) => (
                <li key={code} className="text-ink tracking-wider">
                  {code}
                </li>
              ))}
            </ul>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={downloadCodes}
                className="border-line text-ink hover:bg-surface-2 focus-visible:ring-volt flex-1 rounded-md border px-3 py-2 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none"
              >
                Download
              </button>
              <button
                type="button"
                onClick={() => {
                  void copy(codes.join("\n"), "codes");
                  setSaved(true);
                }}
                className="border-line text-ink hover:bg-surface-2 focus-visible:ring-volt flex-1 rounded-md border px-3 py-2 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none"
              >
                {copied === "codes" ? "Copied" : "Copy"}
              </button>
            </div>
          </>
        ) : (
          // Enrolment succeeded but the codes did not come back. Saying so is
          // better than showing an empty box: the account IS protected, and
          // the codes can be generated later from account settings.
          <p className="border-line bg-canvas text-ink-muted mt-5 rounded-md border p-4 text-sm leading-relaxed">
            Two-factor authentication is switched on, but recovery codes could
            not be generated just now. You can create them later from your
            account settings — do that before you lose your phone.
          </p>
        )}

        {codes.length > 0 && (
          <label className="mt-5 flex cursor-pointer items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={saved}
              onChange={(event) => setSaved(event.target.checked)}
              className="accent-volt mt-0.5 h-4 w-4 shrink-0"
            />
            <span className="text-ink-muted">
              I have saved these codes somewhere safe.
            </span>
          </label>
        )}

        <button
          type="button"
          disabled={codes.length > 0 && !saved}
          onClick={() =>
            router.replace(
              `/welcome?redirect_url=${encodeURIComponent(destination)}`,
            )
          }
          className="bg-volt text-volt-ink hover:bg-volt-dim focus-visible:ring-volt mt-5 w-full rounded-md px-4 py-2.5 text-sm font-semibold transition-opacity focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
        >
          Continue to Roboxing
        </button>
      </div>
    );
  }

  return (
    <div className="border-line bg-surface w-full max-w-md rounded-lg border p-6">
      <p className="text-eyebrow text-volt font-semibold uppercase">
        Step 1 of 2
      </p>
      <h1 className="font-display text-title text-ink mt-2">
        Secure your account
      </h1>
      <p className="text-ink-muted mt-3 text-sm leading-relaxed">
        Roboxing requires two-factor authentication. Scan this with an
        authenticator app — Google Authenticator, 1Password, Authy, or any
        other — then enter the six-digit code it shows.
      </p>

      {uri && (
        <div className="mt-5 flex justify-center">
          {/* White quiet zone around the code on purpose: scanners need the
              contrast, and a dark-on-dark QR fails on half of phones. */}
          <div className="rounded-lg bg-white p-3">
            <QRCodeSVG value={uri} size={168} level="M" />
          </div>
        </div>
      )}

      {secret && (
        <details className="group mt-4">
          <summary className="text-ink-muted hover:text-ink cursor-pointer list-none text-xs underline underline-offset-4">
            Can&rsquo;t scan it? Enter the key by hand
          </summary>
          <div className="border-line bg-canvas mt-2 flex items-center gap-2 rounded-md border p-3">
            <code className="text-ink flex-1 font-mono text-xs break-all">
              {secret}
            </code>
            <button
              type="button"
              onClick={() => void copy(secret, "secret")}
              className="text-volt hover:text-volt-dim shrink-0 text-xs font-semibold"
            >
              {copied === "secret" ? "Copied" : "Copy"}
            </button>
          </div>
        </details>
      )}

      <form onSubmit={submitCode} className="mt-5">
        <label
          htmlFor="totp-code"
          className="text-ink mb-2 block text-sm font-medium"
        >
          Six-digit code
        </label>
        <input
          id="totp-code"
          value={entered}
          onChange={(event) =>
            setEntered(event.target.value.replace(/[^0-9]/g, "").slice(0, 6))
          }
          inputMode="numeric"
          autoComplete="one-time-code"
          // Not `pattern`: the value is already constrained on input, and a
          // failing pattern shows a browser bubble instead of our message.
          placeholder="000000"
          aria-describedby={error ? "totp-error" : undefined}
          aria-invalid={error ? true : undefined}
          className="border-line bg-canvas text-ink placeholder:text-ink-dim focus:border-volt focus-visible:ring-volt w-full rounded-md border px-4 py-3 text-center font-mono text-xl tracking-[0.4em] focus-visible:ring-1 focus-visible:outline-none"
        />

        {error && (
          <p id="totp-error" role="alert" className="text-destructive mt-2 text-sm">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy || entered.length < 6}
          className="bg-volt text-volt-ink hover:bg-volt-dim focus-visible:ring-volt mt-4 w-full rounded-md px-4 py-2.5 text-sm font-semibold transition-opacity focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "Checking…" : "Turn on two-factor"}
        </button>
      </form>
    </div>
  );
}
