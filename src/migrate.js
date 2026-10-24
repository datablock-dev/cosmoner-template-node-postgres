import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const MIGRATIONS_DIR = fileURLToPath(new URL("../migrations/", import.meta.url));

// Any constant works, as long as nothing else in the database uses it. Holding
// this lock means only one instance applies migrations at a time, so several
// instances starting together cannot apply the same file twice.
const LOCK_ID = 727_245_001;

/**
 * Applies every .sql file in migrations/ that has not been applied yet, in
 * file name order. Each file runs in its own transaction and is recorded in
 * schema_migrations, so a failed file leaves nothing half-applied.
 */
export async function migrate(pool) {
  const client = await pool.connect();
  try {
    await client.query("SELECT pg_advisory_lock($1)", [LOCK_ID]);
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name       text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    const { rows } = await client.query("SELECT name FROM schema_migrations");
    const applied = new Set(rows.map((row) => row.name));
    const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith(".sql")).sort();

    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = await readFile(join(MIGRATIONS_DIR, file), "utf8");
      try {
        await client.query("BEGIN");
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
        await client.query("COMMIT");
        console.log(`Applied migration ${file}`);
      } catch (err) {
        await client.query("ROLLBACK");
        throw new Error(`Migration ${file} failed: ${err.message}`, { cause: err });
      }
    }
  } finally {
    await client.query("SELECT pg_advisory_unlock($1)", [LOCK_ID]).catch(() => {});
    client.release();
  }
}

// `npm run migrate` applies migrations without starting the server.
if (import.meta.main) {
  const { pool } = await import("./db.js");
  try {
    await migrate(pool);
    console.log("Migrations are up to date");
  } finally {
    await pool.end();
  }
}
