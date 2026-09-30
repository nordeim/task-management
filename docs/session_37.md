# Session 37 — Both Bundles Stable + Hamburger DOM-Parity Fix

Session numbering: `docs/session_36.md` is the operator's transcript record
of the session-35 run (which pushed `b409429` + the transcript commit
`0f302d6`); this log continues the agent-authored series as session 37
(cycle 34). The operator's brief re-issued the full cycle: workspace
refresh, doc review + codebase validation, parity iteration against
`https://tuesdaycom-a6700714.base44.app/` with mobile-navigation and
Tailwind v4 attention, the DB-location contract, the test suites, a TDD
remediation plan validated before execution, screenshots, `.env.example`,
docs alignment, and the SSH-wrapper push to main.

## Baseline validation (repo vs docs)

- Fresh `git clone` at `0f302d6` (== origin/main — the session-35
  delivery `b409429` + the operator's `session_36.md` transcript).
  Bootstrapped `.env` from `.env.example` (byte-identical;
  `DATABASE_URL="file:../db/custom.db"`), `bun install`, `db:push` +
  `db:seed` — `db/custom.db` lands INSIDE the repo (the db-path contract)
  at the canonical seed (4 boards / 9 groups / 25 tasks / 4 users /
  7 done, verified through the app's own `src/lib/db-path.ts` resolution
  via a scratch client, removed before commit).
- AGENTS.md / CLAUDE.md v1.12.0 / README.md / PAD v1.19 /
  task-management_SKILL.md v1.6.1 reviewed; `docs/session_35.md`,
  `docs/session_36.md` (operator transcript), `docs/worklog.md`,
  `docs/remediation-plan-session35.md` reviewed. Every session-35 marker
  re-confirmed in the tree: the white `--background` token, the `#A0A0A0`
  separators, `@custom-variant hover` + the v3 `space-y` restoration, the
  login spacer footer + Google `group` class, the 15-surface screenshot
  set, `.env.example` byte-identical to `.env`.
- Baseline gates green on arrival: lint 0 · tsc 0 · **185/185 unit** ·
  standalone build · **27/27 E2E** · DB re-verified at the canonical seed
  after the suite run (self-healing confirmed).

## Drift check (the session-35 "suggested next" executed)

- **BOTH bundle surfaces are UNCHANGED — the first fully stable cycle
  after the session-35 login redeploy.** The platform login page still
  serves `/static/index-C409vFv3.js` + `index-DiXSDIK_.css` and the
  authed SPA still serves `/assets/index-BuEJAhK4.js` (both verified in
  the live DOM, pre- and post-login).
- **The i18n bundle is inert machinery** (session 35's optional probe,
  executed): `<html lang="en">`, no language switcher or locale-candidate
  controls anywhere on the login page, all visible strings English —
  the locale bundle ships but never activates. No user-visible change;
  no code action.
- The clone's login body text probed byte-identical to the reference's
  (toaster mount · "Welcome to Task Management" · "Sign in to continue" ·
  "Continue with Google" · "OR" · Email/Password/Sign in · "Forgot
  password?" · "Need an account? Sign up").
- The reference was left pristine throughout (1 board / 1 pending task /
  0 completed / 0% rate — re-verified; every probe read-only except the
  two documented auth smoke logins and one open/close of its own mobile
  menu).

## Parity sweep (15 surfaces)

- Fresh 15-surface capture on both apps at 1440×900 + 375×812 (login,
  signup, mobile-login, dashboard, boards, board-table, board-kanban,
  board-calendar, board-timeline, board-unassigned, analytics, Board
  Analytics modal, mobile-dashboard, mobile-nav-open). Result: **13
  direct MATCH + 2 DIFF, both triaged to documented conditionals →
  15/15 effective MATCH**:
  - *board-unassigned* — the reference's Unassigned view is the §10
    documented structural no-op (empty innerHTML even with an ownerless
    task); the clone renders its working surface. Deliberate documented
    deviation; the "N" badge is the dev-mode Next.js indicator.
  - *modal-board-analytics* — the documented Team Workload conditional
    (`workload.length > 0`): the reference's ownerless board does not
    render the card, our board with owners does.
- Post-fix VLM re-check of the mobile-nav-open pair: effective MATCH
  (only flag = the hero task count, pure data).

## Mobile navigation focus pass (the operator's brief)

- Hamburger hover `#E1E5F3` verified with a REAL pointer move on BOTH
  apps (`rgb(225, 229, 243)` both) — the Tailwind v4 hover-variant
  regression class holds (`@custom-variant hover (&:hover);` confirmed
  in the tree at `globals.css:13`).
- The panel opens, renders the reference's mock chrome (`User Name` /
  `user@example.com`), swaps Menu→X, navigates on link tap (My Boards →
  `/Boards`), and closes on navigation (verified live on both apps;
  `e2e/mobile-nav.spec.ts` pins all three in the suite).
- Geometry identical: hamburger 40×40 at x=319 y=12 on both apps.

## Findings (evidence on both live apps this session)

1. **MICRO GAP (fixed) — hamburger accessible-name mechanism.** The
   reference's hamburger carries NO `aria-label`; its accessible name
   "Open main menu" comes from a `<span class="sr-only">` INSIDE the
   button (probed both states — the name does not change when open).
   The clone used `aria-label="Open main menu"`. The session-35 log's
   "the clone already matches this pattern" was inaccurate at the DOM
   level — corrected this cycle.
2. **MICRO GAP (fixed) — hamburger icon utility class.** The reference's
   icons render `lucide lucide-menu block h-6 w-6` / `lucide lucide-x
   block h-6 w-6`; the clone's lacked the `block` utility. Visually
   inert (a lone SVG flex-centered in its button), but class-string
   parity is the project standard on ported surfaces.
3. **INFO — deliberate deviation kept:** the clone's hamburger carries
   `aria-expanded={menuOpen}`; the reference has no such attribute.
   This is the CLAUDE.md a11y floor ("`aria-expanded` on toggles") —
   an intentional quality improvement, now documented in PAD §10 so
   future cycles do not flag it.
4. **ZERO other functional/visual defects.** Hygiene scan clean: zero
   TODO/FIXME, zero `console.log` in app code (the three hits are the
   seed + prisma-cli CLI tools' intentional output), `next-env.d.ts`
   unchanged, `.env` byte-identical to `.env.example`, no dev-server
   runtime errors across the capture session (one documented Turbopack
   cache panic resolved per the runbook: `rm -rf .next` + restart).

## Remediation (docs/remediation-plan-session37.md — validated, then executed)

- TDD exactly as planned:
  - **RED** — `e2e/mobile-nav.spec.ts` spec 4 ("hamburger DOM mirrors
    the reference's sr-only accessible-name pattern"): no `aria-label`,
    an sr-only span with text "Open main menu", and the `block` utility
    on the closed-state Menu icon and the open-state X icon. Failed
    against the pre-fix tree exactly as predicted (the 3 existing specs
    stayed green — they use name-based `getByRole` lookups).
  - **GREEN** — `src/components/app/app-header.tsx`: dropped
    `aria-label`, rendered the sr-only span, added `block` to both
    icons; kept `aria-expanded` (Finding 3).
- Post-fix live verification on the dev server — the clone's hamburger
  DOM probe == the reference's probe in both states: sr-only span
  present, `aria-label` null, `lucide-menu block h-6 w-6` /
  `lucide-x block h-6 w-6`, 40×40 at the same coordinates, hover still
  `#E1E5F3` under a real pointer move, open/navigate/close intact.
- The DB-location contract re-verified live: `db/custom.db` at the repo
  root for the CLI, the seed, the dev server, and the standalone
  runtime; canonical seed counts confirmed after every suite run;
  `tests/db-path.test.ts` green in the unit run.
- The Vitest + Playwright contracts re-verified: `vitest.config.ts`
  unchanged (185 tests) and `playwright.config.ts` unchanged (Chromium,
  webServer = the standalone artifact, `reuseExistingServer`,
  `fullyParallel: false` for SQLite write isolation) — suite 27 → 28.

## Screenshots

- Fresh 15-surface set from the dev server of the verified tree into
  `docs/screenshots/` (canonical names; 1440×900 desktop + 375×812
  mobile; spot-checked fully rendered — no skeleton states: VLM
  "RENDERED" on mobile-nav-open, board-table, login, dashboard, and
  modal-board-analytics).

## Gates (final)

- `bun run lint` → 0 findings. `bun run typecheck` → 0 errors.
- `bun run test` → **185/185**. `bun run build` → standalone artifact.
- `bun run test:e2e` → **28/28** (27 existing + the new hamburger
  DOM-parity spec); DB at the canonical seed after the run.
- Reference left pristine; no data mutations performed.

## Push

- Atomic commits on `main` via `docs/ssh_git_wrapper_v3.py` with the
  operator-supplied deploy key (dry-run → real → verify → shred), per
  `docs/how-to-git-push-using-ssh-wrapper_SKILL.md`.

## Suggested next (session 39)

- Keep re-checking BOTH asset hashes each cycle (login
  `index-C409vFv3.js` + `index-DiXSDIK_.css`, authed SPA
  `index-BuEJAhK4.js`) — the login page's bundle graph changed
  materially in session 35; a fifth redeploy may follow the same
  rebuild pattern.
- The `--muted-foreground` micro-consumers (placeholder, hover icons)
  remain unprobe-comparable on the reference's current data — revisit
  only if the reference's state ever makes them comparable.
- Optional deeper probe: the reference login page's mixpanel utils and
  `react-hot-toast` mount are inert on this deployment (verified for
  the toaster in session 35); a locale-switch trigger, if one ever
  ships, would be a new parity surface.
