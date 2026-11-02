// Applies the SQL migrations in ./drizzle to DATABASE_URL.
// Usage: pnpm db:migrate   (reads .env / .env.local)
import { config } from "dotenv";
config({ path: [".env.local", ".env"], quiet: true });

import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Add it to .env.local (see .env.example).");
  process.exit(1);
}

const local = /localhost|127\.0\.0\.1/.test(url);
const pool = new Pool({ connectionString: url, ssl: local ? undefined : { rejectUnauthorized: true } });

try {
  await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
  console.log("✓ Migrations applied");
} finally {
  await pool.end();
}
