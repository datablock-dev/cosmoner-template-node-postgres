import pg from "pg";

if (!process.env.DATABASE_URL) {
  console.error(
    "DATABASE_URL is not set. Point it at a PostgreSQL database, e.g. " +
      "postgresql://user:password@localhost:5432/app",
  );
  process.exit(1);
}

// The connection string is used as given, so its parameters apply: add
// ?sslmode=require when connecting to a database over the internet.
export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.DATABASE_POOL_MAX) || 10,
});

// An idle client losing its connection (a database restart, say) must not
// take the whole process down; the pool replaces it on the next query.
pool.on("error", (err) => {
  console.error("Idle database client error:", err.message);
});
