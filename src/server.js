import { createServer } from "node:http";
import { pool } from "./db.js";
import { migrate } from "./migrate.js";

const MAX_BODY_BYTES = 16 * 1024;

function send(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw Object.assign(new Error("Body too large"), { status: 413 });
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  } catch {
    throw Object.assign(new Error("Body must be JSON"), { status: 400 });
  }
}

async function handle(req, res) {
  const { pathname } = new URL(req.url, "http://localhost");

  if (req.method === "GET" && pathname === "/") {
    return send(res, 200, {
      name: "cosmoner-template-node-postgres",
      routes: ["GET /health", "GET /api/notes", "POST /api/notes"],
    });
  }

  // Answers 200 only when the database does too.
  if (req.method === "GET" && pathname === "/health") {
    try {
      await pool.query("SELECT 1");
      return send(res, 200, { status: "ok", database: "ok" });
    } catch {
      return send(res, 503, { status: "error", database: "unreachable" });
    }
  }

  if (req.method === "GET" && pathname === "/api/notes") {
    const { rows } = await pool.query(
      "SELECT id, body, created_at FROM notes ORDER BY id DESC LIMIT 100",
    );
    return send(res, 200, { notes: rows });
  }

  if (req.method === "POST" && pathname === "/api/notes") {
    const { body } = await readJson(req);
    if (typeof body !== "string" || body.trim() === "" || body.length > 1000) {
      return send(res, 400, { error: "body must be a non-empty string of at most 1000 characters" });
    }
    const { rows } = await pool.query(
      "INSERT INTO notes (body) VALUES ($1) RETURNING id, body, created_at",
      [body.trim()],
    );
    return send(res, 201, rows[0]);
  }

  return send(res, 404, { error: "Not found" });
}

// Bring the schema up to date before taking traffic.
await migrate(pool);

const server = createServer((req, res) => {
  handle(req, res).catch((err) => {
    if (err.status) return send(res, err.status, { error: err.message });
    console.error(err);
    send(res, 500, { error: "Internal server error" });
  });
});

const port = Number(process.env.PORT) || 3000;
server.listen(port, () => console.log(`Listening on port ${port}`));

// Finish in-flight requests and close the pool when the platform stops the app.
for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => {
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
    server.closeIdleConnections();
  });
}
