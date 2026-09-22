# Session 21 Remediation Plan — Tailwind v4 Hover Variant, DB Path Resolution, Button Anatomy, Playwright E2E

Probed live on 2026-09-22 against `https://tuesdaycom-a6700714.base44.app/`
(logged in as sepnetflix2023@outlook.com, mobile viewport 375×812 and desktop
1440×900). The reference's compiled bundle remains `index-BuEJAhK4.js` /
`index-DjjZtFMQ.css` — unchanged since session 9, so all decompiled specs
stay valid. This cycle's audit focused where the operator's brief pointed:
the mobile navigation menu (with a TailwindCSS v4 bug hunt), the database
location contract (`.env` → `db/` at the repo root), the test-suite surface
(vitest + playwright config), and the `.env.example` spec commit `8a680df`,
which documents an intended state that the tree does not yet implement.
Baseline gates at `8a680df`: lint 0, tsc 0, 143/143 tests, dev server 200.

Every finding below is evidence-backed (commands run and DOM/CSS probes
captured this session). Severity per the audit taxonomy; fixes are surgical
and TDD-first (red → green → refactor), one logical change per commit.

---

## Finding 1 — Tailwind v4 guards every `hover:*` utility behind `@media (hover: hover)`; the mobile menu loses its hover feedback (HIGH — reproduced)

The operator's hint was correct and the bug is real. Ground truth, both
stylesheets fetched and diffed this session:

- **Reference CSS** (v3-compiled): `.hover\:bg-\[\#E1E5F3\]:hover{…
background-color:rgb(225 229 243 / var(--tw-bg-opacity,1))}` — a **plain
`:hover`** selector with no media guard. It applies on any device.
- **Clone CSS** (Tailwind v4.1.18): `@media (hover: hover) {
.hover\:bg-\[\#E1E5F3\]:hover { background-color: #e1e5f3; } }` — the rule
only exists inside a hover-capability media query.

Live reproduction (agent-browser, 375×812, clone session):
`window.matchMedia('(hover: hover)').matches === false`, the hamburger
button `matches(':hover') === true`, yet computed `background-color` stays
`rgba(0,0,0,0)` — the hover feedback is dead. The same session against the
reference shows `rgb(225, 229, 243)` (#E1E5F3) on the identical button.
Tailwind v4 made the v3.3 `hoverOnlyWhenSupported` future flag the default;
the reference predates that behavior. Affected surface: every `hover:*`
utility in the app (~150 occurrences — nav links, buttons, board rows, KPI
cards, toolbar menus). `group-hover:*` is NOT guarded in v4 (verified in the
compiled CSS: `.group-hover\:scale-105:is(:where(.group):hover *)` — no
media wrapper), so only the `hover` variant needs the fix.

**Action**: add `@custom-variant hover (&:hover);` to
`src/app/globals.css` — the documented Tailwind v4 mechanism for restoring
the v3 behavior. Verified experimentally this session: the regenerated CSS
loses the media guard and the hamburger hover then computes `#E1E5F3`,
matching the reference. Blast radius: hover styling only, no logic; visual
output on hover-capable desktops is unchanged (the rule still requires
`:hover`). Regression coverage lands in the new Playwright suite (Finding 4)
with a `hasTouch: true` context — an environment where the pre-fix CSS
provably fails.

## Finding 2 — the SQLite database lands OUTSIDE the repo; the operator's db-path contract is unimplemented (HIGH — reproduced; spec'd by `.env.example` @ 8a680df)

Reproduced from a clean clone this session:

1. `cp .env.example .env` → `DATABASE_URL="file:../db/custom.db"`.
2. `bun run db:push` prints `SQLite database "custom.db" at
   "file:/home/z/my-project/db/custom.db"` — the **parent directory** of the
   repo. `<repo>/db/` stays empty.
3. Running the CLI from `prisma/` as CWD lands in the same parent location —
   the resolution basis is the `.env` location / process CWD, NOT
   `prisma/schema.prisma` (the long-standing doc claim, disproven empirically
   for Prisma 6.19.2 here).
4. `bun run db:seed` seeds the parent-dir file (the dev server then serves
   that data — the app "works", which is why this survived 20 sessions).

The operator's spec commit (`8a680df`, "update env example") documents the
intended contract: *"src/lib/db-path.ts implements this resolution;
tests/db-path.test.ts pins the contract"* — **neither file exists**; the
`.env.example` also references `docs/DEPLOYMENT.md §4`, which does not exist.

**Action** (TDD, red first):
- `tests/db-path.test.ts` — contract tests for the new pure module: relative
  `file:` URLs resolve against the repo root (located by walking up to
  `prisma/schema.prisma`), absolute `file:` and non-file URLs (PostgreSQL
  example) pass through untouched, missing-env falls back to the documented
  default.
- `src/lib/db-path.ts` — `resolveDatabaseUrl(envUrl?)`: returns an absolute
  `file:` URL anchored at the repo root regardless of process CWD; exports
  the anchor resolution so the tests pin it.
- `src/lib/db.ts` — construct the PrismaClient with
  `datasources: { db: { url: resolveDatabaseUrl() } }`.
- `scripts/seed.ts` — import and apply the same resolution (the seed's own
  `new PrismaClient()` is what wrote the parent-dir file).
- `scripts/prisma-cli.ts` + `package.json` `db:push` — wrap the Prisma CLI
  with the resolved absolute URL so `db:push` creates
  `<repo>/db/custom.db` too (CLI + runtime must agree on one file).
- `.gitignore` — remove `tests/` from the sandbox-scaffolding block (it
  becomes a committed app folder per the operator's spec); `tsconfig.json`
  already includes `**/*.ts`; `vitest.config.ts` `include` gains
  `tests/**/*.test.ts`.
- `docs/DEPLOYMENT.md` — create the minimal deployment note the
  `.env.example` cites (§4: absolute `file:` path guidance for production).

Blast radius: db client construction + seed + one npm script. The app's
queries are unchanged; the schema and seed data are identical. Verified by:
`bun run db:push && bun run db:seed` → `ls db/custom.db` inside the repo,
then login + boards API round-trip on the dev server.

## Finding 3 — the vendored Button ships NEW shadcn anatomy; the reference ships OLD (MEDIUM — verified; same drift class as Badge/Switch/Select)

Sessions 13/15 locked Badge, Switch, and Select to the reference's OLD
shadcn anatomy after finding the same drift; Button was audited only for an
at-rest gap and left NEW. This session's probe found the remaining deltas
(reference hamburger button, decompiled live):

| Token | Reference (OLD shadcn) | Clone (NEW shadcn) |
|---|---|---|
| transition | `transition-colors` | `transition-all` |
| focus ring | `focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring` | `focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]` |
| dark-mode extras | none | `dark:hover:bg-accent/50`, `dark:bg-input/30`, … |
| svg sizing | `[&_svg]:size-4` | `[&_svg:not([class*='size-'])]:size-4` |
| icon size | `h-9 w-9` | `size-9` |

At-rest geometry already matched (40×40, radius 8 — measured), which is why
the VLM sweeps passed; the observable gap is the keyboard-focus ring (3px
translucent + border ring vs the reference's 1px solid) and the transition
property, plus `shadow-xs` vs the OLD `shadow`/`shadow-sm` mapping on
default/outline variants.

**Action**: rewrite `src/components/ui/button.tsx` to the OLD shadcn anatomy
with the repo's documented v3→v4 renames (`focus-visible:outline-none` →
`focus-visible:outline-hidden`, `shadow` → `shadow-sm`,
`shadow-sm` → `shadow-xs`), drop the `data-slot` attribute, restore OLD
sizes (`h-9 px-4 py-2` / `h-8 rounded-md px-3 text-xs` / `h-10 rounded-md
px-8` / `h-9 w-9`), and pin the contract in
`src/components/ui/primitives.test.ts` (RED first — the tests fail against
the current NEW anatomy, green after the rewrite). Consumer overrides
(`h-10 w-10 rounded-lg hover:bg-[#E1E5F3]`, login's `h-11 w-full
rounded-xl …`) merge over the plain utilities exactly like the reference's
do — that is the point of the OLD anatomy.

## Finding 4 — no Playwright E2E suite (MEDIUM — operator requirement; tracked as the natural next step in PAD §10 / README)

The repo's own docs name Playwright golden-path specs as the next step;
the operator's brief requires the suite. The scandihaven reference repo
(AGENTS.md, `apps/web/playwright.config.ts`) supplies the pattern: Chromium
project, `reuseExistingServer: true`, list reporter, 30s timeout, specs in
an `e2e/` folder, and a `webServer` that boots the production artifact.

**Action**: add `@playwright/test` (devDependency, via bun), commit
`playwright.config.ts` (Chromium-only — this sandbox has no WebKit —
`testDir: "./e2e"`, `fullyParallel: false`, webServer = `bun run start`
against a built artifact when not already running; `reuseExistingServer`
lets the dev-server verification reuse a live server), and four specs:

1. `auth.spec.ts` — login golden path (seeded demo account) → dashboard
   greets sepnetflix2023; logged-out `/` redirects to `/login?from_url=`.
2. `board.spec.ts` — board table renders seeded groups; status Select
   round-trip mutates + persists across reload (the status↔completed
   coupling, asserted through the API-backed UI).
3. `mobile-nav.spec.ts` — **the Finding 1 regression test**: a
   `hasTouch: true` context (matchMedia `(hover: none)` — the exact
   environment where the pre-fix CSS provably failed) opens the hamburger
   menu, asserts the panel links, and asserts the nav link hover/tap
   feedback (`bg-#E1E5F3`) applies — fails pre-fix, passes post-fix.
4. `routes.spec.ts` — `/Boards`, `/Board?id=<real>`, `/Analytics`,
   unknown path → styled 404, case-insensitive rewrite.

`package.json` gains `test:e2e` (`playwright test`) and
`test:e2e:install` (`playwright install chromium`). The suite runs green in
this session as evidence.

## Finding 5 — `db:seed` exits 1 on a successful run when the dev server holds the DB; unhandled `$disconnect` rejection (LOW)

First seed run this session printed `Seed complete: {boards: 4, …}` yet the
bun wrapper reported `exit_code=1` (the dev server was live on the same
SQLite file). `main().catch(…).finally(() => db.$disconnect())` — a
rejecting `$disconnect` propagates as an unhandled rejection AFTER the
success log, failing the exit code while the data is committed. Also, on a
fresh DB without `db:push`, the P2021 error surfaces raw
("The table `main.User` does not exist") with no hint to run `db:push`.

**Action**: in `scripts/seed.ts`, await the disconnect inside a
`try/catch` and print an actionable message for P2021 ("run `bun run
db:push` first"). Zero behavior change on the happy path.

## Finding 6 — `.env.example`/docs alignment debts (LOW)

- `tests/` is in `.gitignore` under sandbox scaffolding — blocks the
  operator-specified `tests/db-path.test.ts` (handled in Finding 2).
- `docs/DEPLOYMENT.md` referenced but absent (handled in Finding 2).
- README/AGENTS/CLAUDE/PAD must document the hover-variant invariant, the
  db-path module, the Playwright suite, and the new test counts (handled in
  the docs phase of this plan).

## Deliverables beyond code fixes

1. **Screenshots** — fresh dev-server captures of the remediated codebase
   into `docs/screenshots/` (the existing 12 + mobile-viewport captures of
   the open hamburger menu — the surface this session fixed).
2. **`.env.example`** — verify byte-level against the working `.env` and
   the now-implemented db-path contract; keep it in the commit.
3. **`task-management_SKILL.md`** — via `skills/distill-codebase-skill`
   and `skills/to-distill-project-into-skill` (six-phase process; ~20
   sections; every claim cites file:line or a command).
4. **Docs** — `session_21.md`, `docs/worklog.md` append, README/AGENTS/
   CLAUDE/PAD updates, this plan's execution record.

## Execution order (TDD, one logical change per commit)

1. Finding 1 — globals.css custom variant (already experimentally applied
   and verified; formalize with the Playwright regression landing in step 4).
2. Finding 2 — RED `tests/db-path.test.ts` → GREEN `src/lib/db-path.ts` →
   wire `db.ts` + `seed.ts` + CLI wrapper + `.gitignore` + DEPLOYMENT.md.
3. Finding 3 — RED primitives.test.ts button contracts → GREEN button.tsx
   OLD anatomy.
4. Finding 4 — Playwright config + 4 specs (incl. the Finding-1
   regression) → install Chromium → run green.
5. Finding 5 — seed disconnect hardening.
6. Gates: `bun run lint && bun run typecheck && bun run test && bun run
   build` + live browser verification (login, boards, board views, mobile
   menu open/close, drag a kanban card, reload persistence).
7. Screenshots → docs; docs updates; SKILL.md; session log + worklog.
8. Commit series on main + SSH-wrapper push (dry-run, real, remote
   verify, key shredded after use).

## Validation of this plan against the codebase (performed before execution)

- `src/lib/db-path.ts` and `tests/` — confirmed absent (Finding 2 premise).
- `src/lib/db.ts` — confirmed no `datasources` override (Finding 2 premise).
- `src/components/ui/button.tsx` — confirmed NEW anatomy tokens exactly as
  probed (Finding 3 premise).
- `playwright.config.ts` / `e2e/` — confirmed absent; package.json has no
  playwright dependency (Finding 4 premise).
- `src/app/globals.css` — pre-fix state confirmed (no `@custom-variant
  hover`); post-fix state verified live (hover computes #E1E5F3).
- `.gitignore` — `tests/` present in the sandbox block (Finding 6 premise).
- Consumers of Button — `app-header.tsx`, `login-view.tsx`, dialogs,
  board views all pass className overrides that merge over plain
  utilities; no consumer depends on `data-slot` (verified by grep).
- Gates at baseline: lint 0 / tsc 0 / 143 tests / dev 200 (stated above).
