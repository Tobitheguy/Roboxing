"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

/**
 * Route-level error boundary.
 *
 * Step 3's pages read the database directly in their bodies, so a transient
 * Neon failure has somewhere to land other than Next's default error screen.
 * Deliberately does not use --color-live: red on this site means broadcasting,
 * not broken.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[route error]", error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center">
      <p className="eyebrow mb-3">Something went wrong</p>
      <h1 className="font-display text-hero text-ink uppercase">
        This page didn&apos;t load
      </h1>
      <p className="text-ink-muted mt-4 text-sm">
        The problem has been logged. Trying again usually works — most failures
        here are a momentary hiccup talking to the database.
      </p>
      {error.digest ? (
        <p className="text-ink-dim mt-4 font-mono text-xs">
          Reference: {error.digest}
        </p>
      ) : null}
      <div className="mt-8">
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  );
}
