# Session 21 — Tailwind v4 Hover Variant (Mobile Menu), DB-Path Contract, Button Anatomy, Playwright E2E

Session numbering: `docs/session_20.md` (operator commit `debe446`) is the
operator's transcript record of the session-19 run; this log continues the
agent-authored series as session 21. The operator's brief
(`docs/prompt-to-review.md`, committed with `8a680df`) directed the audit:
mobile navigation menu + "a possible TailwindCSS v4 related bug", the
database-location contract (`DATABASE_URL="file:../db/custom.db"` with
`db/` at the repo root), vitest + playwright config, a remediation plan,
TDD execution, screenshots, `.env.example`, docs alignment, and
`task-management_SKILL.md`.

## Baseline validation (repo vs docs)

- Workspace was fresh; re-cloned at `8a680df` (== origin/main, clean).
  AGENTS.md / CLAUDE.md / README.md / PAD v1.11 / session_19.md /
  session_20.md / worklog reviewed in full; baseline gates re-verified
  green (lint 0, tsc 0, 143/143).
- **Misalignment found immediately**: the operator's `.env.example` (commit
  `8a680df`) documents `src/lib/db-path.ts` + `tests/db-path.test.ts` +
  `docs/DEPLOYMENT.md §4` — none existed. The spec described an intended
  state, not the tree.
- Scandihaven reference repo cloned and reviewed (AGENTS.md,
  Project_Architecture_Document.md, `scandihaven_SKILL.md`,
  `apps/web/playwright.config.ts` — the E2E config pattern this session
  followed). Relevant local skills consulted: `tdd`, `agent-browser`,
  `clone-app-pat-pro`, `tailwind-patterns`, `nextjs16-tailwind4`,
  `avant-garde-design-v4` (mobile-nav debugging playbook),
  `distill-codebase-skill`, `to-distill-project-into-skill`.

## Audit findings (evidence-backed; full plan in remediation-plan-session21.md)

1. **HIGH — Tailwind v4 hover variant (THE mobile-menu bug, reproduced).**
   The clone's compiled CSS wraps `hover:bg-[#E1E5F3]` in
   `@media (hover: hover)`; the reference's v3 CSS applies plain `:hover`.
   Live reproduction at 375×812: the clone's hamburger `matches(':hover')`
   with a TRANSPARENT computed background; the reference shows
   `rgb(225,229,243)`. ~150 hover utilities app-wide were dead on
   `(hover: none)` devices.
2. **HIGH — SQLite lands outside the repo (reproduced; the operator's
   spec).** `db:push` + `db:seed` both wrote `<parent>/db/custom.db` from a
   clean clone with `.env` = `file:../db/custom.db` (Prisma 6.19.2
   resolves the .env-relative URL against the .env/CWD location — even
   from `prisma/` as CWD, empirically).
3. **MEDIUM — vendored Button ships NEW shadcn anatomy** vs the reference's
   OLD (transition-all vs transition-colors; `ring-[3px] ring-ring/50` vs
   `ring-1 ring-ring`; dark-mode extras; `size-9` vs `h-9 w-9`) — the same
   drift class the repo already fixed for Badge/Switch/Select.
4. **MEDIUM — no Playwright suite** (the repo's own "tracked next step";
   operator requirement).
5. **LOW — `db:seed` exit-1 on successful runs** (unhandled `$disconnect`
   rejection) + raw P2021 with no actionable message.
6. **LOW — `.gitignore` blocked `tests/`** (the operator's spec pins a
   committed `tests/db-path.test.ts`); `.env.example` cited a nonexistent
   `docs/DEPLOYMENT.md`.

## Remediation executed (TDD, one logical change per commit)

1. **Hover variant** — `@custom-variant hover (&:hover);` in
   `src/app/globals.css` (v4's documented mechanism for restoring v3
   behavior). Verified: regenerated CSS loses the media guard; the
   hamburger hover computes `#E1E5F3` live. `group-hover` confirmed
   NOT media-guarded in v4 (no change needed). RED→GREEN proven: the new
   `e2e/mobile-nav.spec.ts` hover test failed against the pre-fix CSS
   (`rgba(0,0,0,0)`) and passes after (a Turbopack stale-CSS episode
   during the red/green cycle was resolved by the documented
   pkill + `rm -rf .next` + restart runbook).
2. **DB-path contract** — RED `tests/db-path.test.ts` → GREEN
   `src/lib/db-path.ts` (`resolveDatabaseUrl`: schema-directory anchor,
   CWD + module-dir walk, **`.next` build-output skip**) → wired into
   `src/lib/db.ts`, `scripts/seed.ts`, and the new
   `scripts/prisma-cli.ts` wrapper (`db:push`/`db:migrate`/`db:reset`).
   Two extra findings fixed mid-cycle: the anchor initially resolved to
   the repo ROOT (tests caught it — the anchor must be `prisma/`), and
   Next's standalone server was found to `chdir` into `.next/standalone`
   which contains a TRACED schema copy (the DB lived inside the
   disposable build until the `.next` skip landed — RED→GREEN again).
   End-to-end verification: fresh push+seed lands `db/custom.db` INSIDE
   the repo; login round-trips; the standalone production build reads and
   writes the SAME file (a mutation probe changed only the repo file's
   mtime).
3. **Button anatomy** — RED (6 failing contract tests in
   `primitives.test.ts`) → GREEN (OLD-shadcn rewrite with the repo's
   v3→v4 renames). Live probe: the header button now computes
   `transition: color, background-color, …` with the reference's ring-1
   focus chrome; consumer overrides merge as before.
4. **Playwright E2E** — `@playwright/test` 1.63.0 (devDependency),
   `playwright.config.ts` (Chromium-only, webServer = the standalone
   artifact via `bun run start`, `reuseExistingServer`), and 4 spec files
   (12 specs): auth golden path (+invalid credentials +`from_url`
   redirect), board golden path (boards → open board → status-pill
   round-trip persisted across reload, seed state restored), mobile
   navigation (panel content + the hover-variant regression in a
   `hasTouch: true` context + tap-navigation closing the panel), and the
   route surface (case-insensitivity, styled 404, back/forward). Spec
   locator bugs found and fixed during the red/green loop: board cards
   open via `role="link"` divs; `waitForURL` regexes need `/i` for the
   capitalized ROUTE_PATHS; the aria-label parse needed a regex anchor.
5. **Seed hardening** — `$disconnect` guarded; P2021 gets an actionable
   message; `.gitignore` `tests/` entry removed; `docs/DEPLOYMENT.md`
   created (§4 = the absolute-path guidance `.env.example` cites).

## Verification (all executed this session)

- Gates: lint 0 · tsc 0 · **160/160 unit tests** · standalone build green ·
  **12/12 Playwright specs** against the production artifact.
- Live parity: fresh 14-screenshot set (12 desktop surfaces + mobile
  dashboard + mobile nav open) captured on the dev server into
  `docs/screenshots/`; VLM side-by-side vs the live reference: **MATCH on
  mobile-nav-open (hover applied on both), MATCH on dashboard, MATCH on
  boards**. Computed-style ground truth on the mobile menu pair: both
  apps' hovered hamburger = `rgb(225, 229, 243)`.
- Functional smoke: kanban drag ("Content audit" → Done column) persisted
  via the API (board done 3→4) and was restored; the DB ended
  task-for-task at the seed state (7 done / 18 pending, coupling
  consistent).
- `.env.example`: variable block byte-identical to the working `.env`
  that booted this session's servers; every file it references
  (`src/lib/db-path.ts`, `tests/db-path.test.ts`, `docs/DEPLOYMENT.md`)
  now exists.

## Deliverables

- Code: `src/lib/db-path.ts`, `tests/db-path.test.ts`,
  `scripts/prisma-cli.ts`, `playwright.config.ts`, `e2e/` (4 specs +
  helpers), the globals.css variant override, the OLD-anatomy Button, the
  hardened seed.
- Docs: this log, `docs/remediation-plan-session21.md` (plan + validation
  record), `docs/DEPLOYMENT.md`, README/AGENTS/CLAUDE/PAD v1.12 updates,
  `task-management_SKILL.md` (built via `skills/distill-codebase-skill` +
  `skills/to-distill-project-into-skill`), worklog append.
- Screenshots: 14 PNGs under `docs/screenshots/` (the 12 canonical
  surfaces re-captured on the remediated codebase + 2 mobile captures).
- `.env.example` verified and committed with the delivery.

## Outcome

- All six findings closed; zero deferred work beyond the PAD §10 backlog
  (login rate limiting remains the standing Medium item).
- Delivery: atomic commits on main, pushed via the SSH wrapper
  (`docs/ssh_git_wrapper_v3.py` + the operator runbook), key shredded
  after use.

## Suggested next steps

Nothing pending from the brief. If the reference's asset hash ever
changes (`index-BuEJAhK4.js`), re-decompile before trusting prior specs.
The Playwright suite is the natural place to pin any new user-facing flow.
