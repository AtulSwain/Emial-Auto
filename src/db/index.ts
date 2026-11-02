import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "@/lib/env";
import * as schema from "./schema";

// One pool per server instance. Neon's pooled connection string (…-pooler…)
// handles serverless fan-out; keep the per-instance pool small.
const globalForDb = globalThis as unknown as { __otakuvaDb?: NodePgDatabase<typeof schema> };

export function db(): NodePgDatabase<typeof schema> {
  if (!globalForDb.__otakuvaDb) {
    const url = env().DATABASE_URL;
    const needsSsl = !/localhost|127\.0\.0\.1/.test(url) && !/sslmode=disable/.test(url);
    const pool = new Pool({
      connectionString: url,
      max: 5,
      idleTimeoutMillis: 10_000,
      ssl: needsSsl ? { rejectUnauthorized: true } : undefined,
    });
    globalForDb.__otakuvaDb = drizzle(pool, { schema });
  }
  return globalForDb.__otakuvaDb;
}

export { schema };
