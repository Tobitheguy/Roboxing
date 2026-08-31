import { config } from "dotenv";

/**
 * Load the environment once, before any test file is evaluated.
 *
 * Previously the integration test called dotenv itself at module scope. That
 * works in isolation and fails intermittently in a full run: vitest evaluates
 * test files in parallel workers, so whether DATABASE_URL was set by the time
 * that file's `skipIf` condition was computed depended on scheduling. The
 * symptom was a suite that passed alone and failed alongside its siblings —
 * the worst kind of test failure, because it looks like flakiness in the code
 * under test rather than in the harness.
 */
config({ path: ".env.local" });
config({ path: ".env" });
