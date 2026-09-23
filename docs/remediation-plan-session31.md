# Remediation Plan — Session 31 (Cycle 28)

**Scope:** the fourth consecutive zero-drift verification cycle — full reference
drift check, VLM parity sweep, computed-style contract probes, functional
mutation smoke, API audit, and code-quality audit — plus closing the one
genuine gap the audit surfaced: the dialog-based mutation paths (task
create/delete, board CRUD, group collapse) are re-verified by hand every
session but are not pinned by the Playwright suite. Three new E2E specs
convert that manual smoke into permanent regression coverage using the
established restore-to-seed pattern. Then: fresh screenshots, docs
alignment, atomic commits, SSH-wrapper push.

**Baseline:** clean clone at `7e82da2` (== origin/main — the session-29
delivery + the operator's session_30.md transcript commit). Gates green on
arrival: lint 0 · tsc 0 · 185/185 unit · DB at the canonical seed (4 boards /
9 groups / 25 tasks / 4 users / 7 done) inside the repo via the app's own
db-path resolution. `.env` copied from `.env.example`
(`DATABASE_URL="file:../db/custom.db"`).

## Drift check (executed this session)

- **The reference's platform login page is UNCHANGED** since session 29:
  still `/static/index-BZ3m2EKw.js` + `/static/index-DuUT6T6n.css` (no
  fourth redeploy). Login DOM re-verified live: the mobile spacer footer
  (`mt-8 text-center text-xs text-slate-400 sm:hidden`, computed
  `margin-top: 32px`) and the Google button's trailing `group` class are
  both present — matching the clone's session-29 port exactly.
- **The authed SPA bundle is UNCHANGED**: still
  `/assets/index-BuEJAhK4.js` + `/assets/index-DjjZtFMQ.css` (verified in
  the live post-login DOM). All authed-surface specs remain valid.
- **Fresh VLM parity sweep — 12 surfaces, 12 effective MATCH** (login,
  dashboard, boards, board-table, kanban, calendar, timeline, unassigned,
  analytics, Board Analytics modal, mobile-dashboard, mobile-nav-open).
  Every DIFF flag triaged with DOM evidence: data-only board records
  (reference 1 blue board vs clone's 4 colored boards — titles/colors are
  per-record data, not design), and the Board Analytics modal's Team
  Workload card (the reference's board is ownerless so its conditional
  `{workload.length > 0}` card does not render; the clone's board has
  owners — verified against `board-analytics-dialog.tsx:142`).
- **Session-27/29 computed-style contracts re-verified live on BOTH apps**:
  Sign-in button resting shadow `rgba(0,0,0,0.05) 0px 1px 2px 0px`;
  login card `blur(4px)`; focused email input ring = slate-400
  (`lab(65.5349 …)` serialization on both); the clone's mobile footer
  geometry `{x:16, y:755, w:343, h:16, mt:32px, fs:12px}` at 375×812 ==
  the reference's measured values; the clone's mobile hamburger hover
  computes `rgb(225, 229, 243)` (#E1E5F3) under a REAL mouse move ==
  reference (probe lesson re-confirmed: synthetic `mouseover` dispatches do
  NOT activate CSS `:hover` — only real pointer moves do; the E2E suite's
  `menuButton.hover()` is the authoritative probe and stays green).
- The reference was left pristine throughout (1 board / 1 ownerless task /
  not favorited — re-verified at the end).

## Findings (evidence on both live apps this session)

1. **ZERO code defects.** Functional smoke over 12 mutation paths, all
   API-confirmed against SQLite and restored: task create (dialog → POST →
   row + DB), checkbox→status coupling (`done` + `completed: true` in DB),
   kanban drag (card → "Working on it" column → `working`/`false` in DB),
   task delete (row trash → cascade → gone from DB), group collapse +
   uncollapse (`collapsed` persisted both ways), favorite toggle
   (round-trip, DB restored), board search filter ("Pricing" shows the
   pricing task, hides the webinar task), 404, board create (POST → list →
   DB), board edit (rename + color → DB), board delete (confirm dialog →
   cascade → DB), group create (dialog + color → DB) + group delete
   (confirm → cascade → DB). API probes: `/api/users`, `/api/dashboard`,
   `/api/analytics?boardId=all&days=7`, `?boardId=<id>&days=90`, invalid
   `days=45` → graceful fallback to 30, and the login rate limiter
   (5×401 → 429 + `Retry-After: 900` + friendly message, throwaway email).
   One documented Turbopack cache panic after building while the dev
   server ran — resolved per the AGENTS.md runbook (pkill + `rm -rf .next`
   + restart); not a source defect.
2. **LOW (the session's remediation) — the dialog-based mutation paths are
   not pinned by the E2E suite.** `e2e/board.spec.ts` covers the boards
   list and the status-pill round-trip; `e2e/auth.spec.ts` covers the
   auth surface; but task creation via the New Task dialog, task deletion
   via the row trash, board create/edit/delete via the Options menu, and
   group collapse persistence are re-verified MANUALLY every session (the
   worklog records "functional smoke on NEW mutation paths" in sessions
   19, 23, 25, 27, 29 — the exact flows most likely to regress silently:
   Radix dialog mounting, dropdown triggers, optimistic updates, cascade
   deletes). **Action:** three new specs in `e2e/board.spec.ts` using the
   established restore-to-seed pattern (mutate → assert persistence →
   restore → assert seed state):
   - "task creation via the New Task dialog persists and the row trash
     deletes it" (create → row visible → reload → still visible → row
     trash → gone → reload → still gone — the cleanup IS the delete test),
   - "board create → edit via Options → delete round-trips the boards
     list" (Create Board → navigates to the new board → back to /Boards →
     Options → Edit Board rename → card reflects it → Options → Delete
     Board → confirm → card gone, the four seeded boards intact),
   - "group collapse persists across reload and restores" (click group
     header → task rows hidden → reload → still hidden → click → visible
     again).

   These pins document existing verified behavior — they are expected
   GREEN immediately (a failure would reveal a real regression or a spec
   bug, caught in the loop). This follows the suite's own precedent: the
   session-27 parity specs and the session-29 footer spec were red-first
   because behavior was missing; session-21's mobile-nav structure spec
   pinned existing structure.

### Verified equal — no action

- Both reference bundles (hashes above) and every authed surface's VLM
  pair (12/12 effective MATCH).
- All standing computed-style contracts (shadow, blur, ring, footer
  geometry, hamburger hover).
- `.env.example` byte-identical to the working `.env`; `DATABASE_URL` is
  the only user-set variable; no new env vars.
- Unit coverage: every runtime export of `src/lib/domain.ts` is
  referenced by `domain.test.ts` (the 22 unreferenced exports are all
  compile-time types/interfaces — DTOs, ActionResult, vocabulary unions).
- Code hygiene: zero TODO/FIXME markers, zero `console.log`,
  `console.error` only in `api-client.ts` (per convention).

## TDD execution order (one logical change per commit)

1. **SPEC**: extend `e2e/board.spec.ts` with the three mutation specs
   (Finding 2). Run against the standalone build — expect 25/25 (the pins
   document working behavior; any red is a real finding to triage).
2. **Gates**: lint 0 · tsc 0 · 185/185 unit · standalone build · 25/25
   E2E. Re-verify the DB at the canonical seed after the run (the specs
   restore as they go).
3. **Live verification**: dev-server spot-check that the three pinned
   flows still behave (already executed in this session's smoke —
   re-confirm the DB count line at the end).
4. Screenshots → `docs/screenshots/` (fresh 15-surface set at 1440×900 +
   375×812).
5. `.env.example` re-verify (byte-identical).
6. Docs: PAD v1.17 (revision block + §7 E2E row 22→25), AGENTS.md (E2E
   inventory), CLAUDE.md v1.10.0 (counts), README.md (testing table),
   task-management_SKILL.md v1.5.0 (frontmatter + audit history),
   `docs/session_31.md`, worklog append.
7. Atomic commits on main + SSH-wrapper push (dry-run → real → verify →
   shred key).

## Validation of this plan against the codebase (performed before execution)

- `e2e/board.spec.ts` read in full — the golden-path describe block is
  the established home for board mutation specs; `login()` from
  `helpers.ts` and the restore-in-place pattern (status spec lines 52-62)
  are the conventions the new specs follow.
- Accessible names verified live in the browser this session: New Task
  dialog (heading "Create New Task", textbox "Task Title", button
  "Create Task"), row trash ("Actions for <title>" → menuitem "Delete
  Task"), board Options ("Options" → menuitem "Edit Board"/"Delete
  Board", confirm "Delete board"), group header (h3 with the group name;
  clicks bubble to the cursor-pointer parent), board create dialog
  (heading "Create New Board", textbox "Board Title", "Create Board").
- Every flow was executed end-to-end with DB verification this session
  (see Finding 1) — the specs encode proven behavior, not guesses.
- Baseline gates re-run on arrival: lint 0 · tsc 0 · 185/185 · 22/22
  E2E against the standalone artifact · DB at canonical seed.
