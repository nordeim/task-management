/**
 * Prisma CLI wrapper — runs `prisma <args…>` with DATABASE_URL rewritten to
 * the absolute, repo-anchored URL from src/lib/db-path.ts.
 *
 * Why: the Prisma 6.19.2 CLI resolves a RELATIVE `file:` URL from .env
 * against the .env/CWD location (the repo root), so `file:../db/custom.db`
 * creates <parent>/db/custom.db — outside the repo (reproduced 2026-09-22,
 * remediation-plan-session21.md Finding 2). Overriding the env var with the
 * resolved absolute URL makes the CLI agree with the app runtime on ONE
 * database file: <repo>/db/custom.db. An explicit process-env DATABASE_URL
 * already takes precedence over .env, so the override is authoritative.
 *
 * Usage (from package.json scripts):
 *   bun scripts/prisma-cli.ts db push --accept-data-loss
 *   bun scripts/prisma-cli.ts migrate dev
 */
import { spawnSync } from "node:child_process";
import { resolveDatabaseUrl } from "../src/lib/db-path";

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: bun scripts/prisma-cli.ts <prisma args…> (e.g. `db push`)");
  process.exit(64); // EX_USAGE
}

const url = resolveDatabaseUrl();
console.log(`[prisma-cli] DATABASE_URL -> ${url}`);

const result = spawnSync("bunx", ["prisma", ...args], {
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: url },
});

if (result.error) {
  console.error("[prisma-cli] failed to spawn `bunx prisma`:", result.error.message);
  process.exit(1);
}
process.exit(result.status ?? 1);
