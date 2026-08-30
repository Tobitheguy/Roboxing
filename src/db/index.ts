import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

/**
 * The database handle.
 *
 * Created lazily on first use rather than at module load. Importing this file
 * must not throw: Next evaluates modules during build and during static
 * analysis, and a top-level throw on a missing DATABASE_URL turns a clear
 * configuration problem into an opaque build crash with no route attached.
 *
 * Uses Neon's HTTP driver, which opens no persistent connection — the right
 * shape for serverless functions, and the reason the POOLED connection string
 * is the one that belongs in DATABASE_URL.
 */
let cached: ReturnType<typeof create> | null = null;

function create() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and paste the " +
        "POOLED Neon connection string (the host contains '-pooler').",
    );
  }
  return drizzle(neon(url), { schema });
}

export const db = new Proxy({} as ReturnType<typeof create>, {
  get(_target, prop) {
    cached ??= create();
    return Reflect.get(cached, prop, cached);
  },
});

export { schema };
