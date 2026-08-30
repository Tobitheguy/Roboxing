import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// drizzle-kit runs outside Next, so it does not get Next's automatic .env
// loading. Without this, `db:generate` and `db:push` see an empty environment.
config({ path: ".env.local" });
config({ path: ".env" });

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // Loud about what it is going to do. This runs against a real database.
  verbose: true,
  strict: true,
});
