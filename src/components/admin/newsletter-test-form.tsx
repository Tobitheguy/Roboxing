"use client";

import { useActionState } from "react";
import { Send } from "lucide-react";

import { sendTestAction } from "@/app/(app)/admin/newsletter/actions";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/admin-action";

type Result = ActionResult<{ email: string; delivered: number }>;

/**
 * Send the current digest to one address.
 *
 * Defaults to the signed-in administrator's own address, because that is who
 * is almost always testing and retyping it every time is friction on the one
 * action you want taken often. It stays editable — checking how the mail
 * renders in a different client means sending it somewhere else.
 */
export function NewsletterTestForm({ defaultEmail }: { defaultEmail: string }) {
  const [state, formAction, pending] = useActionState<Result | null, FormData>(
    sendTestAction,
    null,
  );

  return (
    <form action={formAction} className="flex flex-col gap-3 px-4 py-4 sm:px-6">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          name="email"
          required
          defaultValue={defaultEmail}
          placeholder="you@example.com"
          className="border-line focus:border-ink min-w-0 flex-1 rounded border bg-white px-3 py-2 text-sm outline-none"
        />
        <Button type="submit" disabled={pending}>
          <Send />
          {pending ? "Sending…" : "Send test"}
        </Button>
      </div>

      {state?.ok ? (
        <p className="text-sm">Sent to {state.data.email}.</p>
      ) : null}
      {state && !state.ok ? (
        <p className="text-destructive text-sm">{state.error}</p>
      ) : null}
    </form>
  );
}
