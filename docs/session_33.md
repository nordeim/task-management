# Session 33 — Background-Token Parity: The White `--background`

Session numbering: `docs/session_32.md` is the operator's transcript record of
the session-31 run (which pushed `58d76f0` + the docs commit `c72b23d`, then
the transcript commit `e35e8cd`); this log continues the agent-authored series
as session 33 (cycle 30). The operator's brief re-issued the full cycle:
workspace refresh, doc review + codebase validation, parity iteration against
`https://tuesdaycom-a6700714.base44.app/`, mobile-navigation + Tailwind v4
attention, the DB-location contract, the test suites, a TDD remediation plan,
screenshots, `.env.example`, docs alignment, and the SSH-wrapper push to main.

## Baseline validation (repo vs docs)

- `git pull` to `e35e8cd` (== origin/main — the session-31 delivery + the
  operator's `session_32.md` transcript). Tree clean; `node_modules`,
  `db/custom.db`, and `.env` already bootstrapped from the prior cycle.
- AGENTS.md / CLAUDE.md v1.10.0 / README.md / PAD v1.17 /
  task-management_SKILL.md v1.5.0 reviewed; `docs/session_31.md`,
  `docs/session_32.md`, `docs/worklog.md` (Task IDs 1–19),
  `docs/remediation-plan-session31.md`, and
  `docs/Tailwind-V4-Validation-Report.md` reviewed. Every session-31 marker
  re-confirmed in the tree: the three `e2e/board.spec.ts` mutation pins
  (suite 25), the four E2E spec-writing gotchas in AGENTS.md, the
  `@custom-variant hover` + v3 `space-y` restoration in globals.css, the
  login-view mobile spacer footer + Google `group` class, the 15-surface
  screenshot set, `.env.example` byte-identical to `.env`.
- Baseline gates green on arrival: lint 0 · tsc 0 · **185/185 unit** ·
  standalone build · **25/25 E2E** · DB at the canonical seed (4 boards /
  9 groups / 25 tasks / 4 users / 7 done) verified through the app's own
  `src/lib/db-path.ts` resolution (`db/custom.db` INSIDE the repo).

## Drift check (the session-31 "suggested next" executed)

- **The reference was NOT redeployed — the FOURTH consecutive stable
  cycle.** Both bundles re-verified UNCHANGED: the platform login page
  still ships `/static/index-BZ3m2EKw.js` + `index-DuUT6T6n.css`; the
  authed SPA still ships `/assets/index-BuEJAhK4.js` +
  `/assets/index-DjjZtFMQ.css` (verified in the live post-login DOM). All
  parity specs remain valid.
- The reference's login DOM re-verified live: the mobile spacer footer
  (`mt-8 text-center text-xs text-slate-400 sm:hidden`, text `&nbsp;`) and
  the Google button's trailing `group` class are both present — matching
  the clone's session-29 port exactly.
- The reference left pristine throughout: 1 board / 1 pending task /
  0 completed / not favorited, re-verified at the end (no mutations
  performed this session — all probing was read-only).

## Parity sweep (12 surfaces)

- Fresh 12-surface capture on both apps at 1440×900 + 375×812 (login,
  dashboard, boards, board-table, board-kanban, board-calendar,
  board-timeline, board-unassigned, analytics, Board Analytics modal,
  mobile-dashboard, mobile-nav-open). After triage: **12/12 effective
  MATCH**. Every DIFF flag resolved to per-record DATA (the clone's seeded
  "Q4 Product Launch" board is purple `#a25ddb` + favorited vs the
  reference's blue, unfavorited "Product Launch"; the reference's calendar
  is empty because its single task has no due date; unassigned content
  differs per the PAD §10 deviation), the documented dev-mode N badge
  (dev server only), or the already-triaged Team Workload conditional.
- Capture-hygiene lessons recorded this session: (1) the clone's first
  `/Board` visit on a cold dev server needs on-demand Turbopack route
  compilation — a 2.5 s wait raced the compile and one capture landed on
  the boards page (re-captured after the route warmed; all other views
  were fine); (2) agent-browser's `find --name` is SUBSTRING-based —
  `--name "Product Launch"` matches the clone's "Q4 Product Launch" board,
  so board-color/favorite flags that followed were data noise, not design.
- Mobile KPI deco circles re-verified at a 2× zoom crop: "visually
  identical in position, size, and opacity" — the full-image VLM flag was
  a false positive. The mobile-nav sweep stayed green (pinned by
  `e2e/mobile-nav.spec.ts` in the suite).

## Findings (evidence on both live apps this session)

1. **HIGH — the `--background` token was drifted.** Probing the reference's
   `document.documentElement` revealed its shadcn token values
   (`--background 0 0% 100%`, `--popover`/`--card` white, `--primary 0 0%
   9%`, `--accent`/`--secondary`/`--muted 0 0% 96.1%`, `--muted-foreground
   0 0% 45.1%`) — every token matched ours except `--background`
   (`#f5f6f8` here vs WHITE there), `--muted`, and `--muted-foreground`.
   `bg-background` is a live consumer across SIX rendered surface classes,
   every one probed different on the two apps:
   - all Radix dialog panels (clone `rgb(245,246,248)` vs reference
     `rgb(255,255,255)` — its Board Analytics panel is an explicit
     `bg-white`);
   - the board toolbar outline buttons (Person/Filter/Sort/Hide/Group by —
     the reference renders ALL white, probed each by name);
   - the board header buttons (Analytics/Integrate/Automate — all white);
   - the boards-page buttons (Filter probed white);
   - the dashboard hero's View Analytics button (white — the drift the
     mobile VLM pair surfaced as "slightly thicker border and darker
     text");
   - switch thumbs (reference thumb `rgb(255,255,255)` on track
     `rgb(229,231,235)`).
   The subtle ~4%-luminance tint had escaped every prior VLM sweep and
   computed-style contract (none pinned background colors).
2. **MEDIUM — the board-header sub-row separators rendered the wrong
   color**: `text-muted-foreground/50` (blue-tinted ≈rgb(179,180,188) from
   the monday-gray token) vs the reference's `|` spans at
   `text-[#A0A0A0]` (probed: `rgb(160,160,160)`, opaque — the same
   explicit color our adjacent "N items ▪ Saved" meta already uses).
3. **INFO — the reference's Unassigned view is a structural no-op**
   (content container `innerHTML: ""`, `childCount: 0`, even with its
   ownerless task rendering the "Assign" owner-cell placeholder) —
   strengthening PAD §10's existing "reference-side defect" rationale for
   our deliberate deviation. No action.
4. **ZERO functional defects.** The full 25-spec E2E suite passed against
   the standalone build on arrival; DB at the canonical seed after.

### Verified equal — no action

- Both reference bundles (hashes above); login backdrops pixel-sampled
  equal at four corners (the login surface's own gradient covers the body
  — unaffected by the token fix).
- Tokens: `--popover`, `--card` (white both), `--primary`, `--foreground`,
  `--accent`, `--secondary`, `--border`, `--input`, `--ring`.
- `--muted-foreground` deliberately KEPT at `#676879`: its remaining
  rendered consumers (title placeholder, date-cell hover icon, empty
  states, unassigned-card texts) are micro/transient/deviation surfaces
  that could not be probed against the reference — changing them without
  probe evidence would violate the verification-labeling rule.

## Remediation executed (TDD, per docs/remediation-plan-session33.md)

1. **RED:** two new specs in `e2e/parity.spec.ts` (the session-27
   computed-style tradition — `expect.poll` + same-page probes):
   `bg-background surfaces render the reference's white token` (six probes:
   dialog panel, toolbar Person, header Analytics, boards Filter,
   dashboard View Analytics, switch thumb — each against a same-page
   `bg-white` probe) and `board header sub-row separators render #A0A0A0`
   (against a same-page `text-[#A0A0A0]` probe). Both failed against the
   pre-fix standalone build exactly as predicted (2 failed / 25 passed).
2. **GREEN:** `globals.css` `:root` — `--background: #f5f6f8` →
   `hsl(0 0% 100%)` and `--muted: #f0f1f2` → `hsl(0 0% 96.1%)` (zero-risk
   hygiene: `bg-muted` consumers live only in unused vendored primitives,
   verified none render) + a corrected token comment;
   `board-view.tsx` — both separator spans `text-muted-foreground/50` →
   `text-[#A0A0A0]`. The other 25 specs were unaffected (verified none
   asserts a `#F5F6F8`-dependent value).
3. **Gates:** lint 0 · tsc 0 · 185/185 unit · standalone build ·
   **27/27 E2E**; idempotency re-proven (27/27 twice consecutively, DB at
   the canonical seed after both runs).
4. **Live verification (all executed on the remediated dev server):**
   every fixed surface re-probed and equal to the reference's probed
   values — View Analytics `rgb(255,255,255)`, boards Filter
   `rgb(255,255,255)`, header Analytics `rgb(255,255,255)`, toolbar
   Person `rgb(255,255,255)`, Board Analytics dialog `rgb(255,255,255)`,
   Integrations dialog `rgb(255,255,255)`, switch thumb `rgb(255,255,255)`
   with track equal to the reference's `rgb(229,231,235)` (lab-serialized
   on our side, converted and compared), separators `rgb(160,160,160)` ×2.
   Post-fix VLM pairs (dashboard, boards, board-table, Board Analytics
   modal): all effective MATCH.
5. One documented Turbopack cache panic (dev server booted against a
   `.next` holding a production build → 500s) resolved per the AGENTS.md
   runbook (pkill + `rm -rf .next` + restart) — twice this session, both
   times after build→dev transitions; not a source defect.

## Verification (all executed this session)

- Drift check + login DOM markers + pristine check (above).
- Baseline 25/25 E2E; RED run 2 failed as predicted; post-fix 27/27 ×2
  (idempotency) with DB re-verified at the canonical seed after each phase
  via the app's own db-path client.
- Live computed-style re-probes on all 9 fixed surfaces (above).
- Screenshots: fresh 15-surface dev-server set into `docs/screenshots/`
  (login, signup, dashboard, boards, all five board views, analytics,
  three board-header modals, mobile dashboard, mobile nav open) at
  1440×900 + 375×812; VLM spot-checks confirm fully rendered captures;
  `login.png`/`signup.png` byte-identical to the committed set (expected —
  the login backdrop is its own gradient, unaffected by the token).
- `.env.example` re-verified byte-identical to the working `.env`.

## Deliverables

- Code: `src/app/globals.css` (token fix + comment), 
  `src/components/app/board-view.tsx` (separator color + comment).
- Tests: `e2e/parity.spec.ts` (+2 specs — background-token parity
  contracts; suite now 27).
- Docs: `docs/remediation-plan-session33.md`, PAD v1.18 (revision block +
  §7 E2E row + §10 rows), AGENTS.md (the `--background` invariant + 27-spec
  count), CLAUDE.md v1.11.0 (counts + token note + spec inventory),
  README.md (testing table), task-management_SKILL.md v1.6.0 (frontmatter +
  audit history row 33), this log, `docs/worklog.md` append.
- Screenshots: 15 fresh PNGs under `docs/screenshots/` (13 changed — every
  authed surface now renders the white dialogs/buttons).

## Outcome

- The fifth consecutive verification cycle confirms the reference is
  stable (no redeploy in four cycles) and closes the session's one genuine
  defect class: the `--background` token drift that silently tinted every
  dialog panel, outline button, and switch thumb ~4% gray. One token line
  + two separator spans, pinned by two new computed-style parity specs.
- All gates green (185 unit / 27 E2E / build); DB at the canonical seed;
  reference left pristine.
- Delivery: atomic commits on main, pushed via the SSH wrapper
  (`docs/ssh_git_wrapper_v3.py` + the operator runbook), key shredded
  after use.

## Suggested next steps

Re-check both reference asset hashes next cycle (`index-BZ3m2EKw.js` for
the platform login page, `index-BuEJAhK4.js` for the authed app) — the
platform page has now been stable for four consecutive cycles. The PAD §10
backlog's remaining rows are all Info-level product decisions (unchanged).
A deeper token audit is complete — every `:root` token now matches the
reference's probed value except the deliberately-kept `--muted-foreground`
(documented); a future cycle could probe its micro-consumers
(title-input placeholder, date-cell hover icon) if the reference's state
ever makes them comparable.
