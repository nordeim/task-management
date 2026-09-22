import { existsSync } from "node:fs";
import path from "node:path";

/**
 * SQLite database URL resolution — the single place that guarantees the
 * database file lands inside the repo (the operator's contract, commit
 * 8a680df, pinned by tests/db-path.test.ts).
 *
 * Why this exists (reproduced 2026-09-22): Prisma 6.19.2 resolves a
 * RELATIVE `file:` URL from .env against the .env/CWD location — the repo
 * root — so `file:../db/custom.db` lands one directory OUTSIDE the repo
 * (<parent>/db/custom.db) for the CLI, the seed script, and the Next.js
 * runtime alike. Anchoring the same relative URL at the directory that
 * contains prisma/schema.prisma (the documented Prisma semantics) lands it
 * at <repo>/db/custom.db, which is what every doc and the .env.example
 * promise.
 *
 * The anchor is located by walking up from the search directories — the
 * process working directory first, then this module's own directory — so
 * the resolution is independent of where the process was started (dev
 * server, standalone build, seed script, or test runner).
 */

/** The documented default — mirrors .env.example byte-for-byte. */
export const DEFAULT_DATABASE_URL = "file:../db/custom.db";

/** The repo is identified by the Prisma schema it ships. */
const SCHEMA_MARKER = path.join("prisma", "schema.prisma");

/** Build-output trees (`.next/...`) can contain TRACED copies of the schema — they are not repo anchors. */
function isBuildOutput(dir: string): boolean {
  return path.resolve(dir).split(path.sep).includes(".next");
}

/** First prisma/ directory (walking up from each start dir) that contains the schema marker. */
function findSchemaDir(startDirs: readonly string[]): string | null {
  for (const start of startDirs) {
    if (!start) continue;
    let dir = path.resolve(start);
    // Walk upward until a prisma/schema.prisma appears; stop at the FS root.
    // The ANCHOR is the marker's own directory (prisma/) — a relative URL
    // resolves as if relative to the schema file, exactly like the
    // documented Prisma semantics ("resolved against prisma/schema.prisma").
    // Next's standalone server chdir's into .next/standalone, where a TRACED
    // schema copy lives — skipping build-output anchors keeps the database
    // at the REPO's db/ folder instead of inside the disposable build.
    for (;;) {
      if (existsSync(path.join(dir, SCHEMA_MARKER)) && !isBuildOutput(dir)) {
        return path.join(dir, "prisma");
      }
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }
  return null;
}

function moduleDirname(): string | null {
  // CJS contexts (bun scripts, vitest) define __dirname; a bare `typeof`
  // probe on an undeclared global is safe in ESM too.
  if (typeof __dirname === "string" && __dirname) return __dirname;
  return null;
}

function defaultSearchDirs(): string[] {
  const dirs = [process.cwd()];
  const mod = moduleDirname();
  if (mod) dirs.push(mod);
  return dirs;
}

/**
 * Resolve DATABASE_URL to a URL the Prisma client can open from any CWD:
 *
 * - non-`file:` URLs (e.g. postgresql://) pass through untouched;
 * - absolute `file:` URLs pass through untouched;
 * - relative `file:` URLs anchor at the prisma/ directory of the repo
 *   found by walking up from `startDirs` (default: the process CWD, then
 *   this module's own directory), so `file:../db/custom.db` always means
 *   <repo>/db/custom.db regardless of the working directory;
 * - when no schema marker is reachable, the URL resolves against the first
 *   start directory (documented fallback — production deployments should
 *   use an absolute path, see docs/DEPLOYMENT.md §4).
 */
export function resolveDatabaseUrl(
  envUrl?: string,
  startDirs?: readonly string[],
): string {
  const url = envUrl?.trim() || DEFAULT_DATABASE_URL;
  if (!url.startsWith("file:")) return url;

  const raw = url.slice("file:".length);
  if (raw.startsWith("/") || path.isAbsolute(raw)) return url;

  const dirs = startDirs ?? defaultSearchDirs();
  const anchorDir = findSchemaDir(dirs) ?? path.resolve(dirs[0] ?? process.cwd());
  return `file:${path.resolve(anchorDir, raw)}`;
}
