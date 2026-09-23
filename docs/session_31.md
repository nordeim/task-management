# Session 31 — Zero-Drift Verification Cycle: E2E Mutation-Pin Coverage

Session numbering: `docs/session_30.md` is the operator's transcript record of
the session-29 run (which pushed `150556b` + the log commit `7e82da2`); this
log continues the agent-authored series as session 31. The operator's brief
re-issued the full cycle: workspace refresh, doc review + codebase
validation, parity iteration against
`https://tuesdaycom-a6700714.base44.app/`, mobile-navigation + Tailwind v4
attention, the DB-location contract, the test suites, a TDD remediation
plan, screenshots, `.env.example`, docs alignment, and the SSH-wrapper push
to main.

## Baseline validation (repo vs docs)

- Workspace had been reset; re-cloned
  `https://github.com/nordeim/task-management.git` at `7e82da2`
  (== origin/main — the session-29 delivery + the operator's session_30.md
  transcript). Tree clean.
- AGENTS.md / CLAUDE.md v1.9.0 / README.md / PAD v1.15→v1.16 headers /
  task-management_SKILL.md v1.4.0 reviewed; session_29.md, session_30.md,
  worklog, remediation-plan-session29.md, and the Tailwind-V4 validation
  report reviewed. Every session-29 marker re-confirmed in the tree: the
  `e2e/auth.spec.ts` footer contract (the 22nd spec), login-view's
  `sm:hidden` footer + Google `group` class, globals.css's
  `@custom-variant hover` + space-y restoration, `.env.example`
  (`DATABASE_URL="file:../db/custom.db"`), and the 15-surface screenshot
  set.
- The scandihaven repo re-cloned as the tech-stack pattern reference; the
  task-management repo's own skills catalog consulted (agent-browser,
  clone-app-pat-pro, tdd, tailwind-patterns, nextjs16-tailwind4 — the
  Tailwind v4 guidance matches the repo's documented invariants).
- Environment bootstrapped per README: `bun install` (517 pkgs),
  `cp .env.example .env`, `db:push` + `db:seed` → `db/custom.db` INSIDE
  the repo at the canonical seed (4 boards / 9 groups / 25 tasks / 4 users
  / 7 done — the db-path contract holds on a fresh clone).
- Baseline gates green: lint 0 · tsc 0 · 185/185 unit · 22/22 E2E against
  the standalone build.

## Drift check (the session-29 "suggested next" executed)

- **The reference was NOT redeployed.** Both bundles re-verified UNCHANGED:
  the platform login page still ships `/static/index-BZ3m2EKw.js` +
  `/static/index-DuUT6T6n.css`, and the authed SPA still ships
  `/assets/index-BuEJAhK4.js` + `/assets/index-DjjZtFMQ.css` (verified in
  the live post-login DOM).
- The reference's login DOM re-verified live: the mobile spacer footer
  (`mt-8 text-center text-xs text-slate-400 sm:hidden`, computed
  `margin-top: 32px`) and the Google button's trailing `group` class are
  both present — matching the clone's session-29 port exactly.
- **Fresh VLM parity sweep — 12 surfaces, 12 effective MATCH** (login,
  dashboard, boards, board-table, board-kanban, board-calendar,
  board-timeline, board-unassigned, analytics, the Board Analytics modal,
  mobile-dashboard, mobile-nav-open). Every DIFF flag triaged with DOM
  evidence: the boards/calendar/unassigned flags are per-record DATA
  (the reference's single blue board vs the clone's four colored boards —
  titles, counts, and colors are board records, not design), and the modal
  flag is the conditional Team Workload card
  (`{workload.length > 0 && …}` at `board-analytics-dialog.tsx:142` — the
  reference's ownerless board does not render it; the clone's owned board
  does; grid classes otherwise identical).
- **Session-27/29 computed-style contracts re-verified live on BOTH apps**:
  Sign-in button resting shadow `rgba(0,0,0,0.05) 0px 1px 2px 0px`;
  login card `blur(4px)`; focused email input ring = slate-400
  (`lab(65.5349 …)` on both); the clone's mobile footer geometry
  `{x:16, y:755, w:343, h:16, mt:32px, fs:12px}` at 375×812 ==
  the reference's session-29 measurements, pixel-identical.
- **Mobile navigation re-verified live on both apps**: the clone's visible
  40×40 hamburger computes `rgb(225, 229, 243)` (#E1E5F3) under a REAL
  mouse move (agent-browser `hover`) == reference. Probe lesson recorded:
  synthetic `mouseover` dispatches do NOT activate CSS `:hover` (verified
  both ways) — only real pointer moves do; the E2E suite's
  `menuButton.hover()` remains the authoritative probe (3/3 mobile-nav
  specs green). Panel content + close-on-navigate re-verified.
- The reference was left pristine throughout (1 board / 1 ownerless task /
  not favorited — re-verified at the end).

## Findings (evidence on both live apps this session)

1. **ZERO code defects.** Functional smoke over 12 mutation paths, every
   one API-confirmed against SQLite and restored: task creation (dialog →
   POST → row + DB), checkbox→status coupling (`done` + `completed: true`
   in DB), kanban drag (card → "Working on it" → `working`/`false` in DB),
   task deletion (row trash → gone from DB), group collapse + uncollapse
   (`collapsed` persisted both ways), favorite toggle (round-trip
   restored), board search filter ("Pricing" shows the pricing task, hides
   the webinar task), 404, board create (POST → list → DB), board edit
   (rename + color → DB), board delete (confirm → cascade → DB), and group
   create + delete (dialogs + cascade → DB). API probes: `/api/users`,
   `/api/dashboard`, `/api/analytics` with `all/7`, `<board>/90`, and the
   invalid `days=45` → graceful 30 fallback; the login rate limiter
   (5×401 → 429 + `Retry-After: 900` + friendly message, unique throwaway
   email). One documented Turbopack cache panic after building while the
   dev server ran — resolved per the AGENTS.md runbook (pkill +
   `rm -rf .next` + restart); not a source defect.
2. **LOW (the session's remediation) — the dialog-based mutation paths had
   no automated coverage.** `e2e/board.spec.ts` covered the boards list +
   the status round-trip, but task creation via the New Task dialog,
   row-trash deletion, board create/edit/delete via the Options menu, and
   group-collapse persistence were re-verified MANUALLY every session (the
   worklog records "functional smoke on NEW mutation paths" in sessions
   19–29). These are the flows most likely to regress silently: Radix
   dialog mounting, dropdown triggers, optimistic updates, cascade
   deletes.

### Verified equal — no action

- Both reference bundles (hashes above) and every surface's VLM pair
  (12/12 effective MATCH).
- All standing computed-style contracts (shadow, blur, ring, footer
  geometry, hamburger hover).
- Unit coverage: every runtime export of `src/lib/domain.ts` is referenced
  by `domain.test.ts` (the 22 unreferenced exports are compile-time
  types/interfaces — DTOs, ActionResult, vocabulary unions).
- Code hygiene: zero TODO/FIXME markers, zero `console.log`,
  `console.error` only in `api-client.ts` (per convention).
- `.env.example` byte-identical to the working `.env`.

## Remediation executed (TDD, per docs/remediation-plan-session31.md)

1. **SPEC**: three new specs in `e2e/board.spec.ts` pin the mutation paths
   with the established restore-to-seed pattern (mutate → assert
   persistence → restore → assert seed state):
   - task creation via the New Task dialog → row visible → survives
     reload → row-trash delete → gone → survives reload (the cleanup IS
     the delete test);
   - board create → navigates to the board → Options → Edit Board rename
     → card reflects it → Options → Delete Board → confirm → card gone,
     seeded boards intact;
   - group collapse → rows leave the DOM (they mount under
     `{!collapsed && …}`) → survives reload → click restores.
2. **In-loop corrections (the specs earned their keep before they even
   ran green)**:
   - Playwright's `getByRole(..., { name })` matching is SUBSTRING-based —
     the task-title locator strict-mode-collided with the row's
     "Actions for <title>" trigger → `exact: true` added;
   - a mid-run spec failure leaves residue, and `e2e/auth.spec.ts` pins
     exact seed counts ("Total Boards 4", "Pending Tasks 18") → residue
     poisons the whole suite (reproduced) → the specs now use
     unique-per-run titles + a START-OF-SPEC self-heal sweep;
   - the sweep's first implementation used `page.request` — which
     **does NOT carry the browser session cookie** (reproduced: 401 on
     `/api/boards` after a UI login; `context.request` likewise; in-page
     `fetch` returns 200) → sweeps now run through `fetch` inside
     `page.evaluate`.
3. **Gates**: lint 0 · tsc 0 · 185/185 unit · standalone build green ·
   **25/25 Playwright specs** against the rebuilt artifact.
4. **Idempotency + self-heal PROVEN**: the suite ran twice consecutively
   (25/25 both times, DB at the canonical seed after each); a leftover
   task was injected directly into the DB and the task spec swept it
   (leftover count 0 after the run) while passing.

## Verification (all executed this session)

- Live parity sweep + computed-style probes on both apps (above).
- Functional smoke: 12 mutation paths, all API-confirmed (above).
- The E2E suite against the standalone artifact: 25/25, twice.
- DB re-verified at the canonical seed after every phase (4/9/25/4/7 via
  the app's own db-path client).
- Screenshots: fresh 15-surface dev-server set into `docs/screenshots/`
  (login, signup, dashboard, boards, all five board views, analytics,
  three board-header modals, mobile dashboard, mobile nav open) at
  1440×900 + 375×812; VLM spot-checks confirm fully rendered captures;
  `login.png`/`signup.png` byte-identical to the committed set (the
  desktop render is unchanged — expected).
- `.env.example` re-verified byte-identical to the working `.env`.

## Deliverables

- Tests: `e2e/board.spec.ts` (+3 specs — the mutation pins; suite now 25).
- Docs: `docs/remediation-plan-session31.md`, PAD v1.17 (revision block +
  §7 testing + §10 row closed), AGENTS.md (25-spec count + the four
  spec-writing gotchas), CLAUDE.md v1.10.0 (counts + spec conventions),
  README.md (testing table), task-management_SKILL.md v1.5.0, this log,
  `docs/worklog.md` append.
- Screenshots: 15 fresh PNGs under `docs/screenshots/`.

## Outcome

- The fourth consecutive verification cycle confirms the reference is
  stable (no redeploy since session 29) and the clone is at full parity:
  12/12 effective VLM MATCH, every computed-style contract equal, zero
  functional defects across 12 API-verified mutation paths.
- The audit's one genuine gap — manual-only coverage of the dialog-based
  mutation flows — is closed: three self-healing, idempotent E2E specs
  pin them permanently, with the hard-won Playwright lessons (substring
  name matching, cookie-less request contexts, residue poisoning)
  documented in AGENTS.md for every future spec author.
- All gates green (185 unit / 25 E2E / build); DB at the canonical seed;
  reference left pristine.
- Delivery: atomic commits on main, pushed via the SSH wrapper
  (`docs/ssh_git_wrapper_v3.py` + the operator runbook), key shredded
  after use.

## Suggested next steps

Re-check both reference asset hashes next cycle (`index-BZ3m2EKw.js` for
the platform login page, `index-BuEJAhK4.js` for the authed app) — the
platform page has now been stable across two consecutive cycles. The
remaining PAD §10 rows are Low product decisions (unchanged). If a future
cycle adds kanban-drag E2E coverage, note that @dnd-kit needs real
pointer event sequences — synthesize carefully or leave it in the manual
smoke (this cycle kept it manual).
