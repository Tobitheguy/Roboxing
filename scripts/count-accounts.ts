/**
 * Read-only: how many accounts exist, and what hangs off them.
 *
 * Run before any change that would swap the Clerk instance. `clerk_user_id` is
 * the only Clerk-coupled column in the schema; predictions and entitlements key
 * off the internal `users.id`. So the question "is a Clerk swap safe" reduces to
 * "how many users rows are there, and do they have picks" — which this answers.
 *
 *   npx tsx --env-file=.env.local scripts/count-accounts.ts
 */
import { neon } from "@neondatabase/serverless";

async function main() {
  const sql = neon(process.env.DATABASE_URL!);

  for (const t of ["users", "predictions", "entitlements", "subscribers"]) {
    // Table name is from the literal list above, never from input.
    const r = await sql.query(`select count(*)::int as n from ${t}`);
    console.log(t.padEnd(14), r[0].n);
  }

  const users = await sql.query(`
    select u.id,
           u.email,
           left(u.clerk_user_id, 14) as clerk_prefix,
           (select count(*)::int from predictions p where p.user_id = u.id) as picks,
           u.created_at
    from users u
    order by u.id
  `);
  console.log("\n--- users ---");
  console.table(users);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
