/**
 * Who operates this site, and when the legal pages last changed.
 *
 * One module because three pages state the same facts, and the failure mode of
 * three copies is not inconsistency in the abstract — it is a privacy policy
 * naming one contact address and an Impressum naming another, which is exactly
 * the discrepancy a complaint is built on.
 *
 * WHY THERE IS NO POSTAL ADDRESS HERE
 * -----------------------------------
 * Because this repository is public, and a home address committed to it is
 * public permanently — git keeps it after any later deletion. Every page below
 * renders the address only `if (OPERATOR.address)`, so filling it in is one
 * edit and leaving it out breaks nothing.
 *
 * It is left out on purpose rather than forgotten. Two things to know before
 * setting it:
 *
 * - A GERMAN IMPRESSUM UNDER §5 DDG REQUIRES ONE. If Roboxing is ever operated
 *   from an establishment in Germany, the address is not optional and
 *   /impressum is incomplete without it.
 * - THE OPERATOR IS IN THE UNITED STATES. On that basis §5 DDG does not attach
 *   in the first place, /impressum is a courtesy page, and the address can stay
 *   out — which is why it ships this way rather than with a placeholder. A
 *   placeholder on a live legal page is worse than an absence: it reads as a
 *   statement of fact.
 *
 * If a business address (not a home address) ever exists, put it here.
 */
export const OPERATOR = {
  name: "Tobias Hock",
  /**
   * The alias on the `hello@` mailbox is `news@`; this is the third name that
   * has to reach a human. It is a real mailbox on Google Workspace — a legal
   * page promising a contact route that bounces is the one failure worth
   * avoiding here.
   */
  email: "tobias@roboxing.tv",
  /** See the note above. `null` is a decision, not a gap. */
  address: null as string | null,
  country: "United States",
} as const;

/**
 * Printed at the head of each legal page.
 *
 * Hard-coded rather than derived from the file's mtime or the build date: a
 * "last updated" that moves every time the site is deployed tells a reader
 * nothing, and quietly claims the terms changed when they did not. Change this
 * line when the WORDS change, and only then.
 */
export const LEGAL_LAST_UPDATED = "15 September 2026";

/**
 * The law these terms are read under.
 *
 * Washington because that is where the operator is resident — the same fact
 * that decided the betting question. It is stated in one place so /terms and
 * any future dispute clause cannot drift apart.
 */
export const GOVERNING_LAW = "the State of Washington, United States";
