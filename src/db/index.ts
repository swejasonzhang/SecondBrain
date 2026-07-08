import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

/**
 * Neon serverless (HTTP) connection. We fall back to a syntactically-valid
 * placeholder when DATABASE_URL is unset so that importing this module never
 * throws at build time — a real query simply fails at runtime, and callers
 * (e.g. the home page) surface a friendly "connect your database" message.
 */
const connectionString =
  process.env.DATABASE_URL ?? "postgresql://user:pass@localhost/placeholder";

const sql = neon(connectionString);

export const db = drizzle(sql, { schema });
export { schema };
