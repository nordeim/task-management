# Deployment Guide

Tuesday.com — Task Management is a single Next.js process over SQLite
(Prisma). It deploys as a standalone server on any host with Bun (or
Node ≥ 20) and a writable filesystem.

## 1. Build

```bash
bun install
cp .env.example .env        # then edit DATABASE_URL (see §4)
bun run db:push             # create ./db/custom.db from prisma/schema.prisma
bun run db:seed             # optional: demo dataset (idempotent)
bun run build               # standalone production build (.next/standalone)
```

## 2. Run

```bash
bun run start               # NODE_ENV=production node .next/standalone/server.js
```

The server listens on port 3000. Put a TLS-terminating reverse proxy
(Caddy, nginx, Cloudflare) in front for public deployments.

## 3. Database location

Dev and CI use `DATABASE_URL="file:../db/custom.db"`. The application
resolves relative `file:` URLs through `src/lib/db-path.ts`, anchoring them
at the repo's `prisma/` directory — so the runtime, the seed script, and
the `scripts/prisma-cli.ts` wrapper all agree on `<repo>/db/custom.db`
regardless of the process working directory. `db/*.db` is git-ignored; the
schema + seed are the source of truth, so the file is always recreatable.

## 4. Production: use an ABSOLUTE path

For deployments where the process CWD is not the repo root (systemd unit,
container, `node .next/standalone/server.js` from another directory), set
an absolute SQLite path so no directory walk is involved:

```bash
DATABASE_URL="file:/var/lib/task-management/custom.db"
```

The resolution contract (`src/lib/db-path.ts`) passes absolute `file:`
URLs through untouched and non-`file:` URLs (PostgreSQL connection
strings) straight to Prisma — switching the provider only requires editing
`prisma/schema.prisma` plus the URL.

## 5. Backups

SQLite is a single file: back up `db/custom.db` with the server stopped,
or use `sqlite3 db/custom.db ".backup '/backup/custom.db'"` for an online
consistent copy.
