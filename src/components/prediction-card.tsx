"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { Check, Lock, Minus, X } from "lucide-react";

import { Card, CardBody, CardBodyFlush, CardHeader } from "@/components/card";
import { Button } from "@/components/ui/button";
import { savePrediction } from "@/app/prediction-actions";
// Not from the actions file: a "use server" module may only export async
// functions, so the initial state object lives on its own.
import { initialPickState } from "@/lib/pick-state";
import { crowdSplit, type PredictionGrade } from "@/lib/predictions";
import { cn } from "@/lib/utils";

/**
 * Pick who wins.
 *
 * Free to play — there is no stake and there will not be one; see the note on
 * the `predictions` table. What it is for is the thing a media property needs
 * before it has anything to sell: a count of people who committed to an
 * opinion about a fight before it happened. That number means something. A
 * pageview does not.
 *
 * It is also the first reason on this site to have an account. Until now
 * signing in only unlocked reading, which is a bad trade nobody takes; this
 * unlocks doing something, and it is the reason the login wall came off the
 * content and moved here.
 */

export type PickableBout = {
  boutId: number;
  orderIndex: number;
  robotA: { id: number; name: string; teamName: string };
  robotB: { id: number; name: string; teamName: string };
  /** This viewer's pick, or null. Always null when signed out. */
  myPick: number | null;
  countA: number;
  countB: number;
  /** "pending" until the result is in. */
  grade: PredictionGrade;
  winnerRobotId: number | null;
};

function PickButton({
  robotId,
  name,
  teamName,
  selected,
  disabled,
  isWinner,
  align,
}: {
  robotId: number;
  name: string;
  teamName: string;
  selected: boolean;
  disabled: boolean;
  isWinner: boolean;
  align: "left" | "right";
}) {
  // Reads the enclosing form's status, so it has to be its own component —
  // called in the parent it would always report "not pending".
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      name="robotId"
      value={robotId}
      disabled={disabled || pending}
      aria-pressed={selected}
      className={cn(
        "group flex min-w-0 flex-1 flex-col rounded-md border px-3 py-2.5 text-left transition-colors",
        align === "right" && "items-end text-right",
        selected
          ? "border-volt bg-volt/10"
          : "border-line bg-surface-2 enabled:hover:border-ink-dim",
        disabled && !selected && "opacity-60",
        // A settled bout marks the actual winner regardless of what anyone
        // picked, so the card reads as a result and not only as a scorecard.
        isWinner && !selected && "border-ink-dim",
      )}
    >
      <span
        className={cn(
          "font-display truncate text-sm font-semibold uppercase",
          selected ? "text-volt" : "text-ink",
        )}
      >
        {name}
      </span>
      <span className="text-ink-dim truncate text-xs">{teamName}</span>
    </button>
  );
}

/** The crowd's split, as a two-tone bar. */
function SplitBar({ countA, countB }: { countA: number; countB: number }) {
  const split = crowdSplit(countA, countB);

  if (!split) {
    return (
      <p className="text-ink-dim mt-2 text-center text-xs">
        No picks yet — be the first.
      </p>
    );
  }

  return (
    <div className="mt-2.5">
      <div
        className="bg-surface-2 flex h-1.5 overflow-hidden rounded-full"
        role="img"
        aria-label={`${split.percentA}% to ${split.percentB}%, from ${split.total} picks`}
      >
        <div className="bg-volt" style={{ width: `${split.percentA}%` }} />
        <div className="bg-ink-dim/50" style={{ width: `${split.percentB}%` }} />
      </div>
      <div className="text-ink-dim tabular mt-1.5 flex justify-between text-xs">
        <span>{split.percentA}%</span>
        <span>
          {split.total} {split.total === 1 ? "pick" : "picks"}
        </span>
        <span>{split.percentB}%</span>
      </div>
    </div>
  );
}

function GradeChip({ grade }: { grade: PredictionGrade }) {
  if (grade === "pending") return null;

  const map = {
    correct: { icon: Check, label: "You called it", cls: "text-volt" },
    wrong: { icon: X, label: "Missed", cls: "text-ink-muted" },
    void: { icon: Minus, label: "Void — no winner", cls: "text-ink-dim" },
  } as const;

  const { icon: Icon, label, cls } = map[grade];
  return (
    <span className={cn("flex items-center gap-1 text-xs font-medium", cls)}>
      <Icon className="size-3.5" />
      {label}
    </span>
  );
}

function BoutPick({
  bout,
  open,
  signedIn,
}: {
  bout: PickableBout;
  open: boolean;
  signedIn: boolean;
}) {
  const [state, formAction] = useActionState(savePrediction, initialPickState);

  // The action echoes back what it saved, so the button highlights immediately
  // rather than waiting for the page to revalidate. Scoped to this bout's id
  // because every bout on the card has its own action state.
  const selected =
    state.status === "saved" && state.boutId === bout.boutId
      ? (state.robotId ?? null)
      : bout.myPick;

  const disabled = !open || !signedIn;

  return (
    <li className="border-line/60 border-b px-4 py-4 last:border-b-0 sm:px-6">
      <form action={formAction}>
        <input type="hidden" name="boutId" value={bout.boutId} />

        <div className="flex items-stretch gap-2">
          <PickButton
            robotId={bout.robotA.id}
            name={bout.robotA.name}
            teamName={bout.robotA.teamName}
            selected={selected === bout.robotA.id}
            disabled={disabled}
            isWinner={bout.winnerRobotId === bout.robotA.id}
            align="left"
          />
          <span className="font-display text-ink-dim self-center text-xs font-semibold tracking-widest uppercase">
            vs
          </span>
          <PickButton
            robotId={bout.robotB.id}
            name={bout.robotB.name}
            teamName={bout.robotB.teamName}
            selected={selected === bout.robotB.id}
            disabled={disabled}
            isWinner={bout.winnerRobotId === bout.robotB.id}
            align="right"
          />
        </div>

        <SplitBar countA={bout.countA} countB={bout.countB} />

        {(state.status === "error" || bout.grade !== "pending") && (
          <div className="mt-2 flex justify-center">
            {state.status === "error" ? (
              <p role="alert" className="text-destructive text-xs">
                {state.message}
              </p>
            ) : (
              <GradeChip grade={bout.grade} />
            )}
          </div>
        )}
      </form>
    </li>
  );
}

export function PredictionCard({
  bouts,
  open,
  closedReason,
  signedIn,
  eventSlug,
}: {
  bouts: PickableBout[];
  /** Whether picks are still being accepted. Re-checked on the server. */
  open: boolean;
  closedReason: string;
  signedIn: boolean;
  eventSlug: string;
}) {
  if (bouts.length === 0) return null;

  return (
    <Card>
      <CardHeader
        title="Who wins?"
        action={
          open ? (
            <span className="text-ink-dim text-xs">Free to play</span>
          ) : (
            <span className="text-ink-dim flex items-center gap-1 text-xs">
              <Lock className="size-3" />
              Closed
            </span>
          )
        }
      />

      {!signedIn && open ? (
        <CardBody className="border-line border-b">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-ink-muted text-sm">
              Sign in to lock in your picks and keep a record.
            </p>
            <Button asChild size="sm">
              {/* Back to this event afterwards, not to the home page — a
                  redirect that loses the page someone was on is how a signup
                  gets abandoned halfway. */}
              <Link href={`/sign-in?redirect_url=/events/${eventSlug}`}>
                Sign in
              </Link>
            </Button>
          </div>
        </CardBody>
      ) : null}

      <CardBodyFlush>
        <ul>
          {bouts.map((bout) => (
            <BoutPick
              key={bout.boutId}
              bout={bout}
              open={open}
              signedIn={signedIn}
            />
          ))}
        </ul>
      </CardBodyFlush>

      <CardBody className="border-line border-t">
        <p className="text-ink-dim text-xs">
          {open
            ? "Picks close when the event starts. Change your mind any time until then."
            : closedReason}{" "}
          No stake, no payout — this is a free prediction game.
        </p>
      </CardBody>
    </Card>
  );
}
