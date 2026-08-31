"use client";

import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/admin-action";
import { cn } from "@/lib/utils";

/**
 * The admin form kit.
 *
 * Small on purpose. Every admin screen is the same shape — a handful of
 * labelled inputs, per-field errors, one save button — and building each one
 * by hand is how they drift apart and how one of them quietly forgets to show
 * its validation errors.
 */

type FieldProps = {
  label: string;
  name: string;
  hint?: string;
  errors?: string[];
  required?: boolean;
  className?: string;
};

function FieldShell({
  label,
  name,
  hint,
  errors,
  required,
  className,
  children,
}: FieldProps & { children: React.ReactNode }) {
  const errorId = errors?.length ? `${name}-error` : undefined;
  return (
    <div className={className}>
      <label htmlFor={name} className="eyebrow mb-1.5 block">
        {label}
        {required ? <span className="text-volt"> *</span> : null}
      </label>
      {children}
      {hint ? <p className="text-ink-dim mt-1 text-xs">{hint}</p> : null}
      {errors?.length ? (
        <p id={errorId} role="alert" className="text-destructive mt-1 text-xs">
          {errors.join(" ")}
        </p>
      ) : null}
    </div>
  );
}

const inputClass =
  "border-input bg-surface-2 text-ink focus-visible:border-volt w-full rounded-md border px-3 py-2 text-sm outline-none";

export function TextField({
  type = "text",
  defaultValue,
  placeholder,
  ...props
}: FieldProps & {
  type?: string;
  defaultValue?: string | number | null;
  placeholder?: string;
}) {
  return (
    <FieldShell {...props}>
      <input
        id={props.name}
        name={props.name}
        type={type}
        defaultValue={defaultValue ?? undefined}
        placeholder={placeholder}
        aria-invalid={props.errors?.length ? true : undefined}
        aria-describedby={props.errors?.length ? `${props.name}-error` : undefined}
        className={inputClass}
      />
    </FieldShell>
  );
}

export function TextArea({
  defaultValue,
  rows = 4,
  ...props
}: FieldProps & { defaultValue?: string | null; rows?: number }) {
  return (
    <FieldShell {...props}>
      <textarea
        id={props.name}
        name={props.name}
        rows={rows}
        defaultValue={defaultValue ?? undefined}
        className={cn(inputClass, "resize-y")}
      />
    </FieldShell>
  );
}

export function SelectField({
  options,
  defaultValue,
  ...props
}: FieldProps & {
  options: { value: string | number; label: string }[];
  defaultValue?: string | number | null;
}) {
  return (
    <FieldShell {...props}>
      <select
        id={props.name}
        name={props.name}
        defaultValue={defaultValue ?? undefined}
        className={inputClass}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

/**
 * Result banner for a submitted form.
 *
 * Separate from the form element itself because a render prop cannot cross the
 * server/client boundary — each entity's form is its own client component that
 * owns its useActionState, and shares these pieces.
 */
export function FormStatus<T>({
  state,
  successMessage = "Saved.",
}: {
  state: ActionResult<T> | null;
  successMessage?: string;
}) {
  if (!state) return null;

  return state.ok ? (
    <p className="border-volt/30 bg-volt/10 text-volt rounded-md border px-3 py-2 text-sm">
      {successMessage}
    </p>
  ) : (
    <p
      role="alert"
      className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm"
    >
      {state.error}
    </p>
  );
}

export function SubmitButton({
  pending,
  label = "Save",
}: {
  pending: boolean;
  label?: string;
}) {
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? "Saving…" : label}
    </Button>
  );
}

/** Pulls per-field errors out of an action result. */
export function fieldErrorsOf<T>(
  state: ActionResult<T> | null,
): Record<string, string[]> {
  return state && !state.ok ? (state.fieldErrors ?? {}) : {};
}
