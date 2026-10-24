# Node.js and PostgreSQL on Cosmoner

[![Deploy to Cosmoner](https://cosmoner.com/deploy-button.svg)](https://cosmoner.com/deploy?repo=https://github.com/datablock-dev/cosmoner-template-node-postgres)

A small Node.js web service backed by PostgreSQL, ready to run on
[Cosmoner](https://cosmoner.com). It uses the `pg` driver and no framework,
and brings its own migrations.

| Route | Does |
|-------|------|
| `GET /health` | `200` when the app and the database both answer, `503` otherwise |
| `GET /api/notes` | Lists the latest notes |
| `POST /api/notes` | Adds a note: `{"body": "Hello"}` |

## Migrations

SQL files in `migrations/` are applied in file name order when the app starts,
before it takes traffic. Each file runs once, in a transaction, and is recorded
in a `schema_migrations` table. A database lock makes it safe for several
instances to start at the same time.

To change the schema, add a new file such as `migrations/002_add_title.sql`
rather than editing one that has already run. `npm run migrate` applies
pending migrations without starting the server.

## Deploy

This app needs a PostgreSQL database and a `DATABASE_URL` secret before it can
start.

1. In your Cosmoner project, create a
   [PostgreSQL database](https://cosmoner.com/docs/guides/databases).
2. Store its connection string as a
   [secret](https://cosmoner.com/docs/guides/secrets) named `DATABASE_URL`. Use
   the internal host, which apps in the same project connect to.
3. Select the button above, copy the template to your GitHub account, and
   deploy your copy. The wizard can fill in every setting from
   `.cosmoner/deployment.yaml`, which links `DATABASE_URL` to that secret.

The app is built automatically from `package.json` and started by the
`Procfile`. It listens on the port in the `PORT` environment variable, which
Cosmoner sets for you.

## Run locally

Requires Node.js 24 and a PostgreSQL database.

```bash
npm install
export DATABASE_URL=postgresql://user:password@localhost:5432/app
npm run dev
```

The app answers on http://localhost:3000:

```bash
curl -X POST localhost:3000/api/notes -H 'Content-Type: application/json' -d '{"body":"Hello"}'
curl localhost:3000/api/notes
```

## License

MIT
