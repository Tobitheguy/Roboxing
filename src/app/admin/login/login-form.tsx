"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { login, type LoginState } from "@/app/admin/actions";

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    login,
    {},
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />

      <div>
        <label
          htmlFor="email"
          className="eyebrow mb-2 block"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          className="border-input bg-surface-2 text-ink focus-visible:border-volt w-full rounded-md border px-3 py-2 text-sm outline-none"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="eyebrow mb-2 block"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="border-input bg-surface-2 text-ink focus-visible:border-volt w-full rounded-md border px-3 py-2 text-sm outline-none"
        />
      </div>

      {state.error ? (
        <p
          role="alert"
          className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm"
        >
          {state.error}
        </p>
      ) : null}

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
