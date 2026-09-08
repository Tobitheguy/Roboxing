import type { BoutMethodValue } from "@/db/schema";

/**
 * The rules of the prediction game.
 *
 * Pure functions, no database. Two of them — `arePicksOpen` and
 * `gradePrediction` — decide whether a pick counts and whether it was right,
 * and both are asked by the UI and again by the server. Keeping them here
 * means the button the viewer sees disabled and the action that refuses them
 * are reading the same rule, rather than two implementations that agree until
 * one is edited.
 */

/**
 * When picks close.
 *
 * At the EVENT's start time, for every bout on the card at once — not at each
 * bout's own start.
 *
 * The alternative, locking bout by bout as an admin marks them live, sounds
 * fairer and is not. It makes the deadline depend on how fast one person
 * clicks a button while running a broadcast, and the stream sits roughly half
 * a minute behind reality — so there is a window in which someone watching can
 * see a knockdown and still pick the winner. A free game does not survive
 * being winnable that way; the first person to notice tells everyone.
 *
 * Closing everything at the first bell has no such window, needs nobody to do
 * anything, and explains itself in five words. It also puts the whole game in
 * the pre-event window, which is exactly when we want people on the site.
 */
export function arePicksOpen(event: {
  startsAt: Date;
  status: "scheduled" | "live" | "completed" | "cancelled";
}, now: Date = new Date()): boolean {
  if (event.status !== "scheduled") return false;
  return event.startsAt.getTime() > now.getTime();
}

/** Why picks are closed, for a message the viewer can act on. */
export function picksClosedReason(event: {
  startsAt: Date;
  status: "scheduled" | "live" | "completed" | "cancelled";
}): string {
  if (event.status === "cancelled") return "This event was cancelled.";
  if (event.status === "completed") return "This event is over.";
  if (event.status === "live") return "Picks closed when the event started.";
  return "Picks closed when the event started.";
}

export type PredictionGrade = "correct" | "wrong" | "void" | "pending";

/**
 * Was this pick right?
 *
 * A draw or a no contest is VOID, not a loss. The pick was between two robots
 * and neither of the offered answers happened, so scoring it against the
 * person would punish them for the only outcome they were not allowed to
 * choose. Void picks are excluded from the record entirely rather than counted
 * as a half — the same reasoning the standings use for a no contest.
 */
export function gradePrediction(
  pickedRobotId: number,
  result: { winnerRobotId: number | null; method: BoutMethodValue } | null,
): PredictionGrade {
  if (!result) return "pending";
  if (result.method === "draw" || result.method === "no_contest") return "void";
  if (result.winnerRobotId == null) return "void";
  return result.winnerRobotId === pickedRobotId ? "correct" : "wrong";
}

export type PredictionRecord = {
  correct: number;
  wrong: number;
  void: number;
  pending: number;
  /** Of the picks that were actually settled. Null when none have been. */
  accuracy: number | null;
  settled: number;
};

/** Someone's record across a set of graded picks. */
export function summarizeRecord(grades: PredictionGrade[]): PredictionRecord {
  const correct = grades.filter((g) => g === "correct").length;
  const wrong = grades.filter((g) => g === "wrong").length;
  const settled = correct + wrong;

  return {
    correct,
    wrong,
    void: grades.filter((g) => g === "void").length,
    pending: grades.filter((g) => g === "pending").length,
    settled,
    // Null rather than 0 when nothing has settled. A new player showing "0%"
    // reads as "you have been wrong", which is both untrue and the worst
    // possible first impression of a game you just joined.
    accuracy: settled === 0 ? null : correct / settled,
  };
}

/**
 * How the crowd split on one bout.
 *
 * Percentages are rounded so they SUM TO 100 rather than each being rounded
 * independently — 1/3 and 2/3 round to 33 and 67, not 33 and 67 by luck. One
 * side is rounded and the other takes the remainder, which is the only way two
 * numbers printed side by side never add up to 99.
 */
export function crowdSplit(
  countA: number,
  countB: number,
): { total: number; percentA: number; percentB: number } | null {
  const total = countA + countB;
  // No split to show for a bout nobody has picked, and dividing by zero here
  // would render "NaN%" on a public page.
  if (total === 0) return null;

  const percentA = Math.round((countA / total) * 100);
  return { total, percentA, percentB: 100 - percentA };
}
