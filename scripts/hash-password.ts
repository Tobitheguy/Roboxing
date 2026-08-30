import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

import { hashPassword } from "../src/lib/auth-tokens";

/**
 * Generate an ADMIN_PASSWORD_HASH.
 *
 * Reads the password from a prompt rather than argv on purpose: an argument
 * lands in shell history and in the process list, where anyone on the machine
 * can read it. The plaintext never touches a file — it goes in a password
 * manager, and only the hash goes in the environment.
 */
async function main() {
  const rl = createInterface({ input: stdin, output: stdout });

  const password = await rl.question("Admin password: ");
  const again = await rl.question("Confirm: ");
  rl.close();

  if (!password) {
    console.error("\nNo password entered.");
    process.exit(1);
  }
  if (password !== again) {
    console.error("\nPasswords do not match.");
    process.exit(1);
  }
  if (password.length < 12) {
    console.error(
      "\nUse at least 12 characters. This one credential controls the " +
        "database and the live broadcast.",
    );
    process.exit(1);
  }

  const hash = await hashPassword(password);

  console.log("\nAdd this to .env.local and to the Vercel project settings:\n");
  console.log(`ADMIN_PASSWORD_HASH="${hash}"`);
  console.log(
    "\nKeep the password itself in a password manager. Do not put it in any " +
      "file in this repository.",
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
