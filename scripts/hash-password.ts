import { stdin, stdout } from "node:process";

import { hashPassword } from "../src/lib/auth-tokens";

/**
 * Generate an ADMIN_PASSWORD_HASH.
 *
 * The password is read from a prompt rather than argv, because an argument
 * lands in shell history and in the process list where anyone on the machine
 * can read it. The plaintext never touches a file — it belongs in a password
 * manager, and only the hash goes into the environment.
 */

/** Lines read up-front when stdin is a pipe rather than a terminal. */
let pipedLines: string[] | null = null;

async function readPipedLines(): Promise<string[]> {
  const chunks: Buffer[] = [];
  for await (const chunk of stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8").split(/\r?\n/);
}

/**
 * Prompt for a secret without echoing it.
 *
 * readline echoes typed characters and offers no supported way to stop, so a
 * password entered through it sits in the terminal's scrollback — readable by
 * anyone who scrolls up, and captured by any screenshot or screen recording.
 * Raw mode reads the keypresses directly and prints nothing.
 *
 * Falls back to reading a piped line when stdin is not a terminal, which is
 * what makes this script testable at all.
 */
async function askHidden(prompt: string): Promise<string> {
  stdout.write(prompt);

  if (!stdin.isTTY) {
    pipedLines ??= await readPipedLines();
    const line = pipedLines.shift() ?? "";
    stdout.write("\n");
    return line;
  }

  return new Promise<string>((resolve) => {
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");

    let buffer = "";

    const onData = (char: string) => {
      switch (char) {
        case "\r":
        case "\n":
        case "": // Ctrl-D
          stdin.setRawMode(false);
          stdin.pause();
          stdin.removeListener("data", onData);
          stdout.write("\n");
          resolve(buffer);
          return;
        case "": // Ctrl-C — leave the terminal usable on the way out.
          stdin.setRawMode(false);
          stdout.write("\n");
          process.exit(130);
          return;
        case "": // Backspace
        case "\b":
          buffer = buffer.slice(0, -1);
          return;
        default:
          // Ignore other control characters; take everything else verbatim.
          if (char >= " ") buffer += char;
      }
    };

    stdin.on("data", onData);
  });
}

async function main() {
  const password = await askHidden("Admin password: ");
  const again = await askHidden("Confirm password: ");

  if (!password) {
    console.error("No password entered.");
    process.exit(1);
  }
  if (password !== again) {
    console.error("Passwords do not match.");
    process.exit(1);
  }
  if (password.length < 12) {
    console.error(
      "Use at least 12 characters. This one credential controls the " +
        "database and the live broadcast.",
    );
    process.exit(1);
  }

  const hash = await hashPassword(password);

  console.log("────────────────────────────────────────────────────────");
  console.log("Copy the line below — all of it, without quotes:\n");
  console.log(hash);
  console.log("\n────────────────────────────────────────────────────────");
  console.log(
    "Paste it as ADMIN_PASSWORD_HASH in the Vercel dashboard\n" +
      "(Settings -> Environment Variables -> Production).\n\n" +
      "Keep the password itself in a password manager. It does not belong\n" +
      "in any file in this repository.",
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
