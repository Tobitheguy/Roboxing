/**
 * Side-effect-free constants shared between the seed script and the app.
 *
 * This module exists specifically so that application code can know the demo
 * competition's slug WITHOUT importing `seed.ts`. That file runs `main()` at
 * module scope, so importing it from a component would delete and rewrite the
 * database as an import side effect.
 */

/** The seeded demonstration season. Its presence drives the DEMO DATA banner. */
export const DEMO_COMPETITION_SLUG = "exhibition-season-1";
