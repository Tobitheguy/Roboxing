import { readFileSync } from "node:fs";
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

import { neon } from "@neondatabase/serverless";

/**
 * Apply one migration file, statement by statement.
 *
 * `drizzle-kit push` is the tool that would normally do this and it is not
 * usable against this database: it diffs the schema file against the live
 * database, and the live database has drifted — it is missing constraints the
 * schema declares. Push therefore proposes to add them, and for the UNIQUE on
 * `bouts` it offers to TRUNCATE the table to do it. That is a data-loss
 * prompt attached to an unrelated change.
 *
 * `drizzle-kit migrate` is no safer here: whether the journal matches what was
 * actually applied is exactly the thing in doubt.
 *
 * So: run the statements that were generated for the change being made, and
 * nothing else. The drift is a separate problem with a separate fix.
 *
 * Usage: npx tsx scripts/apply-migration.ts drizzle/0005_fair_luckman.sql
 */
async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error("Usage: tsx scripts/apply-migration.ts <path-to.sql>");
    process.exit(1);
  }

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  const sql = neon(url);
  const statements = readFileSync(file, "utf8")
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter(Boolean);

  console.log(`${file}: ${statements.length} statements`);

  for (const [i, statement] of statements.entries()) {
    const preview = statement.replace(/\s+/g, " ").slice(0, 90);
    try {
      await sql.query(statement);
      console.log(`  [${i + 1}] ok    ${preview}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // Re-running a migration must not be destructive. "already exists" means
      // the statement's effect is present, which is the outcome we wanted.
      if (/already exists/i.test(message)) {
        console.log(`  [${i + 1}] skip  ${preview}  (already applied)`);
        continue;
      }
      console.error(`  [${i + 1}] FAIL  ${preview}`);
      throw error;
    }
  }

  console.log("done");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
