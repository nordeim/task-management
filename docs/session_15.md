# Session 15 — System Font, Select Anatomy, Mock Chrome, Date Boundary (Parity Deep-Pass #9)

Recovered from an interrupted session: the repo's working tree already
carried the six verified gap fixes (uncommitted), gates were green
(143/143), and live browser verification was mid-flight — the final VLM
convergence sweep had been started but the clock crossed local midnight,
making the reference's captures stale relative to the clone's. This
session re-established both browser tabs, re-ran the entire capture set
under one fresh date state, completed the convergence sweep, triaged
every remaining verdict, cleaned up the probe data, aligned the docs,
and delivered.

## What the interrupted session had established (recap)

- No reference bundle drift (`index-BuEJAhK4.js` unchanged) — every
  prior decompiled spec remained valid. Reference pristine (1 board,
  1 item) before probing.
- Controlled experiment re-run ("S14 Probe Board", 10 tasks, 3 owners
  John Doe/Jane Smith/Mike Brown at 3/3/2 + 2 unassigned, all 4
  statuses/priorities, dates Sep 14–Oct 10) on BOTH apps — reference
  via the base44 entities API, clone via its own API (create + PATCH
  per task: the createTaskSchema is title+groupId only, matching the
  reference's UI surface).
- Six verified gaps, remediated TDD-first (12 red → 143 green):
  G1 font (reference ships Tailwind v4's DEFAULT system stack, no
  Inter), G2 Select primitive (OLD-shadcn anatomy, plain `h-9` trigger
  utilities), G3 avatar "U" hardcode + mobile placeholders, G4 team-row
  mock (JD/JS/MJ/SW, tooltips, pulsing dots, one row-level popover),
  G5 date-cell overdue boundary (today never red), G6 boards grid
  placeholder ("No description provided.").
- En-passant row-geometry fixes found during live measurement: the
  title cell's 16px/24px inheritance (no `text-sm`), content-sized
  title div (no `w-full`), hover-only rounding.
- Functional regression checks on every Select consumer in the
  browser (priority/status swaps persist, Edit Task modal, analytics
  filters, kanban grouping, dialog selects).

## This session's work

1. **Gates re-verified on the recovered tree** — lint 0, tsc 0,
   143/143, dev server alive on :3000.
2. **Both browser sessions re-established** (the reference tab kept
   its token; the clone tab re-logged-in).
3. **Full 24-capture re-run under one date state** (post-midnight
   Sep 19): reference dashboard/boards/board×5/analytics/modals×3 +
   login (isolated session), then the clone's matching set — all at
   1440×900, canonical route casings (`/Boards`, `/Analytics`) after
   the first sweep exposed the nav-highlight capture artifact.
4. **VLM convergence sweep** — 5 direct MATCH (login, boards,
   board-kanban, board-calendar, modal-integrations) + 7 DIFF, every
   DIFF triaged to ground truth:
   - timeline trigger "visible border" — DISPROVEN (computed 0px on
     both apps; same hallucination class as the session-13 calendar
     trigger claim);
   - timeline "blue indicators on day headers" — the VLM misattributed
     the row bars (clone: 3 board-blue 32×28px bars, DOM-verified;
     reference: zero bars — the documented deliberate deviation);
   - board-performance "different colored avatars" — board-color tiles
     (`w-4 h-4 rounded-lg` + inline color) on both sides, data-only;
   - status-distribution ordering — both apps run the same
     first-encounter-over-updatedAt-desc algorithm (decompiled +
     replicated); different data → different order;
   - everything else: data-only (different board inventories /
     timestamps), the documented checkbox↔status deviation, the
     documented priority-distribution / unassigned / timeline-bars /
     dateless deviations, and the ignored Next.js dev widget.
5. **Cleanup** — reference restored to pristine (probe board deleted;
   the 10 orphaned items cascade-deleted via the entities API;
   verified 1 board / 1 item); clone probe board deleted (canonical
   4-board seed state); `next-env.d.ts` restored to the dev variant
   after the build gate.
6. **Gates** — lint 0, tsc 0, 143/143, standalone production build OK.
7. **Docs aligned** — PAD v1.11 (revision block, §5.1 typography =
   system stack, §5.3 Select anatomy contract, §11 key files);
   README (typography section, test table 143, shell + due-date
   rows); CLAUDE.md (inventory + counts); AGENTS.md (five new
   invariants: Select anatomy, no-webfont, mock chrome, isOverdueDate,
   title-cell geometry); remediation plan closure; this log; worklog.

## Delivered

- **Code** (12 files): `globals.css` (font override removed, pulse
  keyframes), `layout.tsx` (Inter import removed, `antialiased`
  dropped), `app-header.tsx` (literal "U" + placeholders),
  `board-table.tsx` (title-cell geometry), `board-view.tsx`
  (`TEAM_MEMBERS` mock + Tooltip + row-level Popover + pulsing dots),
  `boards-view.tsx` (grid placeholder), `date-cell.tsx`
  (`isOverdueDate`), `domain.ts` (the seam), `select.tsx` (OLD-shadcn
  rewrite), `domain.test.ts` (+8), `primitives.test.ts` (+4).
- **Docs**: PAD v1.11, README, CLAUDE.md, AGENTS.md,
  `docs/remediation-plan-session15.md` (with execution closure),
  `docs/session_15.md` (this file), `docs/worklog.md`.
- **Git**: atomic commits on main, pushed via the SSH wrapper
  (`docs/ssh_git_wrapper_v3.py`, operator runbook
  `docs/how-to-git-push-using-ssh-wrapper_SKILL.md`), key shredded
  after use.

## Suggested next steps

Smoke-test the pushed clone: open any board — the team row should read
JD/JS/MJ + "+1" with tooltips and a pulsing dot, the header avatar
should read "U", table rows should match the reference's height
rhythm, and a task due today should never render a red date chip.
For another cycle, upload the next session transcript and the drift
sweep will re-run against the same unchanged bundle premise.
