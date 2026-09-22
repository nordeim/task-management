import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { DEFAULT_DATABASE_URL, resolveDatabaseUrl } from "../src/lib/db-path";

/**
 * Database URL resolution contract (the operator's spec, commit 8a680df):
 * a RELATIVE `file:` URL must land inside the repo — anchored at the
 * directory containing prisma/schema.prisma, found by walking up from the
 * process working directory (or any provided start directory), so the
 * database file is written to <repo>/db/custom.db regardless of where the
 * server, the seed script, or the test runner was started from.
 *
 * Ground truth for the quirk this pins: with DATABASE_URL="file:../db/custom.db"
 * the Prisma 6.19.2 CLI resolves against the .env/CWD location (the repo
 * root), landing the file in the PARENT directory of the repo — reproduced
 * 2026-09-22 (remediation-plan-session21.md, Finding 2).
 */

const cleanups: string[] = [];

function makeRepoFixture(): string {
  const root = mkdtempSync(path.join(tmpdir(), "dbpath-"));
  cleanups.push(root);
  mkdirSync(path.join(root, "prisma"), { recursive: true });
  writeFileSync(path.join(root, "prisma", "schema.prisma"), "generator client {}\n");
  return root;
}

afterEach(() => {
  for (const dir of cleanups.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("relative file: URLs anchor at the schema directory", () => {
  it("resolves file:../db/custom.db against <repo>/prisma, landing at <repo>/db/custom.db", () => {
    const repo = makeRepoFixture();
    const url = resolveDatabaseUrl("file:../db/custom.db", [repo]);
    expect(url).toBe(`file:${path.join(repo, "db", "custom.db")}`);
  });

  it("finds the anchor from a nested start directory (src/lib depth)", () => {
    const repo = makeRepoFixture();
    const nested = path.join(repo, "src", "lib");
    mkdirSync(nested, { recursive: true });
    const url = resolveDatabaseUrl("file:../db/custom.db", [nested]);
    expect(url).toBe(`file:${path.join(repo, "db", "custom.db")}`);
  });

  it("prefers the FIRST start directory that can reach a schema marker", () => {
    const outer = makeRepoFixture();
    const inner = makeRepoFixture();
    const url = resolveDatabaseUrl("file:../db/custom.db", [inner, outer]);
    expect(url).toBe(`file:${path.join(inner, "db", "custom.db")}`);
  });

  it("anchors a same-directory URL at the schema directory itself", () => {
    const repo = makeRepoFixture();
    const url = resolveDatabaseUrl("file:custom.db", [repo]);
    expect(url).toBe(`file:${path.join(repo, "prisma", "custom.db")}`);
  });

  it("default call resolves inside THIS repo, independent of the runner CWD", () => {
    // The spec's headline guarantee: with no explicit start dirs, the URL
    // lands at <this repo>/db/custom.db (found via CWD or the module's own
    // location) — never in a parent directory.
    const url = resolveDatabaseUrl("file:../db/custom.db");
    expect(url).toBe(`file:${path.join(path.resolve(), "db", "custom.db")}`);
  });

  it("ignores build-output schema copies (.next/standalone) and anchors at the repo", () => {
    // Next's standalone server chdir's into .next/standalone, which contains
    // a TRACED copy of prisma/schema.prisma — without this guard the
    // database would live inside the build output and be wiped on every
    // `next build` (reproduced 2026-09-22).
    const repo = makeRepoFixture();
    const standalone = path.join(repo, ".next", "standalone");
    mkdirSync(path.join(standalone, "prisma"), { recursive: true });
    writeFileSync(path.join(standalone, "prisma", "schema.prisma"), "generator client {}\n");
    const url = resolveDatabaseUrl("file:../db/custom.db", [standalone]);
    expect(url).toBe(`file:${path.join(repo, "db", "custom.db")}`);
  });
});

describe("non-relative URLs pass through untouched", () => {
  it("absolute file: URLs are returned as-is", () => {
    const absolute = "file:/var/lib/task-management/custom.db";
    expect(resolveDatabaseUrl(absolute, [makeRepoFixture()])).toBe(absolute);
  });

  it("postgresql URLs are returned as-is (no file anchoring)", () => {
    const pg = "postgresql://user:password@localhost:5432/task_management";
    expect(resolveDatabaseUrl(pg, [makeRepoFixture()])).toBe(pg);
  });

  it("empty/whitespace input falls back to the documented default", () => {
    const repo = makeRepoFixture();
    expect(DEFAULT_DATABASE_URL).toBe("file:../db/custom.db");
    expect(resolveDatabaseUrl("   ", [repo])).toBe(
      `file:${path.join(repo, "db", "custom.db")}`,
    );
  });

  it("undefined input falls back to the documented default", () => {
    const repo = makeRepoFixture();
    expect(resolveDatabaseUrl(undefined, [repo])).toBe(
      `file:${path.join(repo, "db", "custom.db")}`,
    );
  });
});

describe("no schema marker reachable — documented CWD fallback", () => {
  it("anchors at the start directory when no prisma/schema.prisma exists above it", () => {
    const nowhere = mkdtempSync(path.join(tmpdir(), "dbpath-none-"));
    cleanups.push(nowhere);
    const url = resolveDatabaseUrl("file:../db/custom.db", [nowhere]);
    expect(url).toBe(`file:${path.resolve(nowhere, "..", "db", "custom.db")}`);
  });
});
