"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { openBillingPortal, startCheckout } from "@/app/subscribe/actions";

/**
 * Checkout and billing entry points.
 *
 * Both actions end in a redirect to Stripe, so the only thing that comes back
 * is an error — anything else means the browser has already left.
 */
export function SubscribeButton({ label = "Start free trial" }: { label?: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <Button
        size="lg"
        className="w-full"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const message = await startCheckout();
            if (message) setError(message);
          })
        }
      >
        {pending ? "Opening checkout…" : label}
      </Button>
      {error ? (
        <p role="alert" className="text-destructive mt-3 text-xs">
          {error}
        </p>
      ) : null}
    </>
  );
}

export function ManageBillingButton() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <Button
        variant="outline"
        size="lg"
        className="w-full"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const message = await openBillingPortal();
            if (message) setError(message);
          })
        }
      >
        {pending ? "Opening…" : "Manage subscription"}
      </Button>
      {error ? (
        <p role="alert" className="text-destructive mt-3 text-xs">
          {error}
        </p>
      ) : null}
    </>
  );
}
