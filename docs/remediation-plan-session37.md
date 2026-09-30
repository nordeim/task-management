# Remediation Plan — Session 37 (Cycle 34)

**Scope:** the ninth consecutive verification cycle — full reference drift
check (both bundle surfaces), a 15-surface VLM parity sweep, the
mobile-navigation focus pass the operator's brief calls out (the Tailwind v4
hover-variant regression class), the session-35 suggested-next items (both
hash re-checks + the login page's i18n bundle probe), a code-hygiene audit,
and the standing gate battery. This cycle found **two micro class-string
parity gaps on the mobile hamburger** (the session-35 log over-claimed one of
them); everything else is verification-green, so the plan is one surgical
TDD fix plus the delivery work (fresh screenshots, docs alignment, session
log, atomic commits, SSH-wrapper push).

**Baseline:** fresh `git clone` at `0f302d6` (== origin/main — the session-35
delivery `b409429` + the operator's `session_36.md` transcript). Bootstrapped
`.env` (byte-identical to `.env.example`,
`DATABASE_URL="file:../db/custom.db"`), `bun install`, `db:push` +
`db:seed` — `db/custom.db` lands INSIDE the repo at the canonical seed
(4 boards / 9 groups / 25 tasks / 4 users / 7 done, verified through the
app's own `src/lib/db-path.ts` resolution via a scratch client). Gates green
on arrival: lint 0 · tsc 0 · **185/185 unit** · standalone build · **27/27
E2E** · DB re-verified at the canonical seed after the suite run
(self-healing confirmed).

## Drift check (executed this session — the session-35 suggested next)

- **BOTH bundle surfaces are UNCHANGED — the first fully stable cycle after
  the session-35 login redeploy.** The platform login page still serves
  `/static/index-C409vFv3.js` + `/static/index-DiXSDIK_.css` (the session-35
  baseline) and the authed SPA still serves `/assets/index-BuEJAhK4.js`
  (verified in the live post-login DOM). No redeploy on either surface.
- **The i18n bundle is inert machinery** (session-35's optional probe,
  executed): `<html lang="en">`, no language switcher or locale-candidate
  controls anywhere on the login page, all visible strings English — the
  locale bundle ships but never activates. No user-visible change, no code
  action.
- The clone's login body text is byte-identical to the reference's ("T"
  toaster mount · "Welcome to Task Management" · "Sign in to continue" ·
  "Continue with Google" · "OR" · Email/Password/Sign in · "Forgot
  password?" · "Need an account? Sign up").
- The reference was left pristine throughout (1 board / 1 pending task /
  0 completed / 0% rate, re-verified; every probe read-only except the two
  documented auth smoke logins and one open/close of its own mobile menu).

## Parity sweep (15 surfaces, VLM + DOM + computed styles)

- Fresh 15-surface capture on both apps at 1440×900 + 375×812 (login,
  signup, mobile-login, dashboard, boards, board-table, board-kanban,
  board-calendar, board-timeline, board-unassigned, analytics, Board
  Analytics modal, mobile-dashboard, mobile-nav-open). Result: **13 direct
  MATCH + 2 DIFF, both triaged to documented conditionals → 15/15 effective
  MATCH**:
  - *board-unassigned* — the reference's Unassigned view is the documented
    structural no-op (session 33, PAD §10: empty innerHTML even with an
    ownerless task); the clone renders its working surface ("0 waiting for
    an owner" + empty-state message on the fully-assigned Website Redesign
    board). Deliberate documented deviation; the "N" badge is the dev-mode
    Next.js indicator.
  - *modal-board-analytics* — the documented Team Workload conditional
    (`board-analytics-dialog.tsx`, `workload.length > 0`): the reference's
    ownerless board does not render the card, our board with owners does —
    reference-mirroring behavior triaged in sessions 31/33/35.
- **Mobile navigation focus pass (the operator's brief):**
  - Hamburger hover `#E1E5F3` verified with a REAL pointer move on BOTH
    apps (`rgb(225, 229, 243)` both) — the Tailwind v4 hover-variant
    regression class holds (`@custom-variant hover (&:hover);` in the tree).
  - The panel opens, renders the reference's mock chrome
    (`User Name` / `user@example.com`), swaps Menu→X, navigates on link tap
    (My Boards → `/Boards`), and closes on navigation (verified live; the
    e2e/mobile-nav.spec.ts suite pins all three).
  - Geometry identical: hamburger at x=319 y=12, 40×40 on both apps.

## Findings (evidence on both live apps this session)

1. **MICRO GAP — hamburger accessible-name mechanism (class-string parity;
   FIX).** The reference's hamburger carries NO `aria-label`; its accessible
   name "Open main menu" comes from a `<span class="sr-only">` INSIDE the
   button (probed both states — the name does not change when open). The
   clone implements the same name via `aria-label="Open main menu"`
   (`app-header.tsx:287`). Functionally equivalent (identical accessible
   name), but the session-35 log's "the clone already matches this pattern"
   was inaccurate at the DOM level. Fix: port the sr-only span.
2. **MICRO GAP — hamburger icon utility class (class-string parity; FIX).**
   The reference's icons render `lucide lucide-menu block h-6 w-6` /
   `lucide lucide-x block h-6 w-6`; the clone's lack the `block` utility
   (`lucide lucide-menu h-6 w-6` / `lucide lucide-x h-6 w-6`). Visually
   inert (a lone SVG flex-centered in its button), but class-string parity
   is the project standard on ported surfaces. Fix: add `block`.
3. **INFO — deliberate deviation to KEEP:** the clone's hamburger carries
   `aria-expanded={menuOpen}` (asserted by `e2e/mobile-nav.spec.ts`); the
   reference has no such attribute. This is the CLAUDE.md a11y floor
   ("`aria-expanded` on toggles") — an intentional quality improvement over
   the reference, documented here so the next cycle does not flag it.
4. **ZERO functional/visual defects otherwise.** Hygiene scan clean: zero
   TODO/FIXME, zero `console.log` in app code (the three hits are the seed
   and prisma-cli CLI tools' intentional output), `next-env.d.ts`
   unchanged, `.env` byte-identical to `.env.example`, no dev-server
   runtime errors across the capture session, `db/custom.db` inside the
   repo (git-ignored).

## Remediation (TDD — one logical change)

1. **RED** — extend `e2e/mobile-nav.spec.ts` with a fourth spec,
   "hamburger DOM mirrors the reference's sr-only accessible-name pattern
   (session 37)": assert the button has NO `aria-label`, contains a
   `span.sr-only` with text "Open main menu", and its closed-state Menu
   icon carries the `block` utility; open the panel and repeat for the X
   icon. Fails against the current tree exactly as predicted.
2. **GREEN** — `src/components/app/app-header.tsx`:
   - drop `aria-label="Open main menu"`; render
     `<span className="sr-only">Open main menu</span>` inside the Button
     (the reference's mechanism; the accessible name is unchanged, so the
     existing three specs and their `getByRole` lookups stay green);
   - `<Menu className="block h-6 w-6" />` and `<X className="block h-6
     w-6" />` (the reference's exact icon classes).
   - KEEP `aria-expanded` (the documented a11y-floor deviation, Finding 3).
3. **Live re-verification** — probe the clone's fixed hamburger DOM on the
   dev server and diff against the reference's probe (sr-only span present,
   no aria-label, `block` on both icons, hover still `#E1E5F3` under a real
   pointer move, panel still opens/navigates/closes).

## Execution order (one logical change per commit)

1. The TDD fix above (RED spec → GREEN implementation → live re-verify).
2. Full gate battery: `bun run lint && bun run typecheck && bun run test &&
   bun run build && bun run test:e2e` (suite grows 27 → 28 specs); DB
   re-verified at the canonical seed after the run.
3. Fresh 15-surface screenshot set from the dev server of the verified tree
   into `docs/screenshots/` (canonical names; 1440×900 desktop + 375×812
   mobile; spot-checked fully rendered, no skeleton states).
4. `.env.example` re-verify (byte-identical) — no change expected.
5. Remove the session's scratch DB-state helper (`scripts/db-state-check.ts`)
   — dev-only tooling, keep the tree surgical.
6. Docs alignment:
   - PAD v1.20 — revision block (session 37: both bundles stable, the
     hamburger DOM-parity fix) + the §10 mobile-menu row update.
   - AGENTS.md — the E2E spec count 27 → 28.
   - CLAUDE.md v1.13.0 — version bump + the session-37 note.
   - README.md — the E2E count in the testing table.
   - task-management_SKILL.md v1.6.2 — frontmatter (project_state,
     last_updated) + Appendix B audit-history row for session 37.
   - `docs/session_37.md` (session log), `docs/worklog.md` append.
7. Final gate battery on the committed state.
8. Atomic commits on main + SSH-wrapper push (dry-run → real → verify →
   shred key), per `docs/how-to-git-push-using-ssh-wrapper_SKILL.md`.

## Validation of this plan against the codebase (performed before execution)

- The hamburger's current implementation read at
  `src/components/app/app-header.tsx:281-293` (`aria-label` + non-`block`
  icons) and matched against this session's live reference DOM probes
  (sr-only span, `block h-6 w-6` icons, 40×40 at the same coordinates).
- The reference's hamburger probed in BOTH states (closed + open): the
  sr-only name stays "Open main menu", the icon swaps
  `lucide-menu block h-6 w-6` → `lucide-x block h-6 w-6`, and there is no
  `aria-expanded` attribute (Finding 3's deviation note).
- The existing `e2e/mobile-nav.spec.ts` (3 specs) re-read: all three use
  `getByRole("button", { name: "Open main menu" })` — name-based lookups
  that pass under either naming mechanism, so the fix cannot break them;
  the `aria-expanded` assertion (spec 3) targets the attribute we keep.
- `sr-only` is already a used utility in the clone
  (`app-header.tsx:324`, the mobile search label) — no new dependency.
- The 27-spec E2E inventory re-scanned (`e2e/*.spec.ts`); the new spec
  follows the suite's conventions (helpers.login, touch context, poll-based
  style assertions).
- The DB contract re-verified live: `db/custom.db` at the repo root after
  `db:push` + `db:seed`; canonical seed counts via the app's own client.
- The screenshot set's canonical names enumerated from `docs/screenshots/`
  (15 files) and matched 1:1 to the fresh captures.
