/**
 * Tell Next's control-flow signals apart from real failures.
 *
 * `redirect()`, `notFound()`, and "this route must render dynamically" are all
 * implemented as thrown errors that Next itself catches higher up. A component
 * that wraps a data read in try/catch — which is the right thing to do so a
 * database hiccup does not take the page down — will swallow those signals too,
 * and the symptom is bizarre: a redirect that silently does nothing, or a
 * header that renders its signed-out state on every page because the "error"
 * it caught was Next asking it to opt out of static rendering.
 *
 * Every such signal carries a `digest`. Real errors do not.
 */
export function isNextControlFlowError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string"
  );
}

/**
 * Rethrow Next's signals, hand everything else back to be handled.
 *
 *   } catch (error) {
 *     rethrowControlFlow(error);
 *     console.error("...", error);
 *     return null;
 *   }
 */
export function rethrowControlFlow(error: unknown): void {
  if (isNextControlFlowError(error)) throw error;
}
