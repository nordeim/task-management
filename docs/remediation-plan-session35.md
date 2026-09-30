# Remediation Plan — Session 35 (Cycle 32)

**Scope:** the seventh consecutive verification cycle — full reference drift
check (both bundle surfaces), a 14-surface VLM parity sweep, computed-style
contract verification, the mobile-navigation focus pass the operator's brief
called out (the Tailwind v4 hover-variant regression class), a code-hygiene
audit, and the standing gate battery. The cycle closed with **zero code
defects**: the reference's FOURTH platform-login redeploy shipped new bundle
hashes but an IDENTICAL design (class-string-verified), and the authed SPA
bundle is unchanged — so this plan's execution section is the delivery work
(fresh screenshots, docs alignment, session log, atomic commits, SSH-wrapper
push), not source remediation.

**Baseline:** `git clone` at `91defd2` (== origin/main — the session-33
delivery `b90c2bd` + the operator's `session_34.md` transcript commit).
Bootstrapped `.env` (byte-identical to `.env.example`,
`DATABASE_URL="file:../db/custom.db"`), `bun install`, `db:push` +
`db:seed` — `db/custom.db` lands INSIDE the repo at the canonical seed
(4 boards / 9 groups / 25 tasks / 4 users / 7 done, verified through the
app's own `src/lib/db-path.ts` resolution). Gates green on arrival:
lint 0 · tsc 0 · **185/185 unit** · standalone build · **27/27 E2E** ·
DB re-verified at the canonical seed after the suite (self-healing
confirmed).

## Drift check (executed this session)

- **The reference's platform login page was redeployed — the FIFTH distinct
  bundle set in the repo's history, but the FOURTH consecutive
  identical-design rebuild.** New hashes: `/static/index-C409vFv3.js` +
  `/static/index-DiXSDIK_.css` (session-33 baseline:
  `index-BZ3m2EKw.js` + `index-DuUT6T6n.css`). The new page is a rebuilt
  platform-auth app (rolldown runtime + vendor chunks, `AuthAPI`,
  `AuthContext`, `WorkspaceAPI`, a `react-hot-toast` toaster mount) —
  but the DESIGN is unchanged, verified at three levels:
  1. **Class-string level** — every class string in the live login and
     signup DOM matches the clone's session-25/27/29 port (modulo the
     documented v3→v4 renames: `backdrop-blur-sm`→`backdrop-blur-xs`,
     `hover:shadow-sm`→`hover:shadow-xs`, `shadow-sm`→`shadow-xs`,
     `focus-visible:outline-none`→`focus-visible:outline-hidden`): the
     `main` slate gradient, the `bg-white/95 shadow-2xl rounded-2xl` card
     with the `h-1` slate strip, `p-8 sm:p-10 md:pt-12 md:pb-10 md:px-10`
     padding, the `h-20 w-20 sm:h-24 sm:w-24` logo tile with the blur-xl
     halo, "Welcome to Task Management" / "Sign in to continue", the
     `py-3.5 text-[16px]` Google button with the `-ml-4` icon wrapper and
     trailing `group` class, the `my-6` "or" divider, the
     `h-11 sm:h-12 bg-slate-50/50 pl-10` icon inputs, the
     `h-11 sm:h-12 bg-slate-900` Sign-in button, the split footer links,
     the signup mode's Back-to-sign-in + `h-10 sm:h-11` three-field form,
     and the mobile spacer footer
     (`mt-8 text-center text-xs text-slate-400 sm:hidden`, both modes).
  2. **Computed-style level** — card `blur(4px)` / `rgba(255,255,255,0.95)`
     / radius 16px; Sign-in `rgb(15,23,42)` / radius 12px / shadow
     `rgba(0,0,0,0.05) 0px 1px 2px`; Google button `rgb(255,255,255)` /
     `rgb(226,232,240)` border / 54px; email input 48px / `pl-10` 40px /
     `rgba(248,250,252,0.5)`; body on the default system stack. All equal
     to the clone (the pinned parity specs' values).
  3. **Behavioral level** — the v3 play CDN
     (`cdn.tailwindcss.com` + `window.tailwind.config`) is still the
     compiler (the renames remain correct); failed login renders the same
     inline "Invalid email or password" alert (no toast fires); successful
     login still lands on `/`; the document title is still
     "Task Management".
- **The authed SPA is UNCHANGED** — still `/assets/index-BuEJAhK4.js`
  (verified in the live post-login DOM). All authed parity specs remain
  valid.
- The reference was left pristine throughout (1 board / 1 pending task /
  0 completed / 0% rate — re-verified at the end; every probe this session
  was read-only except the two documented auth smoke logins).

## Parity sweep (14 surfaces, VLM + computed styles + DOM)

- Fresh 14-surface capture on both apps at 1440×900 + 375×812 (login,
  signup, mobile-login, dashboard, boards, board-table, board-kanban,
  board-calendar, board-timeline, board-unassigned, analytics,
  Board Analytics modal, mobile-dashboard, mobile-nav-open). Result:
  **14/14 effective MATCH after triage**. Every DIFF flag resolved to
  per-record DATA or a documented conditional:
  - *dashboard* — the VLM missed the clone's hero subtext line; DOM probe
    shows the identical `<p class="mt-1 text-base text-[#676879]">Ready to
    make today productive? You have 18 tasks waiting.</p>` (the reference's
    reads "You have 1 tasks waiting" — data only).
  - *board-table* — the first capture hit the documented cold-route
    compile race (session 33's lesson); re-captured warm: MATCH.
  - *board-kanban / calendar / timeline / unassigned* — the board color
    tile renders the per-board `color` field (clone: Team Offsite amber
    `#ffcb00`; reference: Product Launch blue `#0073ea`); tile anatomy
    probed identical (40×40 `rounded-xl shadow-lg overflow-hidden` +
    Table2 icon + white/20 shine). Data only.
  - *Board Analytics modal* — the Team Workload conditional
    (`board-analytics-dialog.tsx:142`, `workload.length > 0`): the
    reference's ownerless board does not render the card, our board with
    owners does — the documented reference-mirroring behavior (sessions
    31/33 triage).
- Computed-style spot probes on authed surfaces: KPI gradient cards
  (12px radius, `from-blue-500 to-blue-600`, `shadow-lg`/`hover:shadow-2xl`,
  `duration-500` — clone serializes the same colors in oklab), analytics
  header/stat icon tiles (`#2563EB→#1D4ED8`, `#0073EA→#00C875`),
  board-header color tiles, and the white `--background` consumer set —
  all equal to the reference (and pinned green by the 27 E2E specs).

## Mobile navigation focus pass (the operator's brief)

- The Tailwind v4 hover-variant regression class re-verified LIVE on BOTH
  apps with a real pointer move: hamburger hover background
  `rgb(225, 229, 243)` == `#E1E5F3` on both (synthetic `mouseover` does
  not activate CSS `:hover` — documented session-31 lesson, honored).
- The panel opens from the hamburger (`sr-only` "Open main menu" — the
  reference's accessible name comes from the sr-only span, not
  `aria-label`), renders the reference's mock chrome (`User Name` /
  `user@example.com`), navigates on link tap (My Boards → `/Boards`), and
  closes on navigation. `e2e/mobile-nav.spec.ts` (3 specs: open/content,
  the hover-variant regression, tap-navigate-close) green in the suite.
- The two load-bearing Tailwind v4 fixes confirmed in the tree:
  `@custom-variant hover (&:hover);` and the `@layer utilities` v3
  `space-y` restoration in `globals.css`.

## Findings

1. **ZERO code defects.** The full gate battery passed on arrival and after
   verification (lint 0 · tsc 0 · 185/185 unit · standalone build · 27/27
   E2E · DB at the canonical seed after the run). Hygiene scan clean: zero
   TODO/FIXME, zero `console.log` (`console.error` with context only in
   `api-client.ts`), `next-env.d.ts` unchanged, no runtime errors in the
   dev-server log across the whole capture session, `.env` byte-identical
   to `.env.example`, `db/custom.db` inside the repo (git-ignored).
2. **INFO — the redeploy's bundle graph changed but not its design.** The
   new login page ships ~65 static chunks (rolldown runtime, vendor-react/
   data/utils/ui, AuthAPI/AuthContext, WorkspaceAPI, mixpanel utils, an
   i18n bundle, a toaster) versus the prior single-bundle page — worth a
   hash re-check next cycle, but nothing user-visible changed.
3. **INFO — reference login page a11y detail confirmed:** the hamburger
   "Open main menu" accessible name comes from an `sr-only` span (no
   `aria-label` attribute) — the clone already matches this pattern.

### Verified equal — no action

- All 14 VLM surface pairs after triage; all pinned computed-style
  contracts (button shadow, card blur, slate-400 ring, mobile footer
  geometry, background-token whites, `#A0A0A0` separators) via the green
  E2E suite; both DB-path contract suites; the reference's pristine state.
- `.env.example` byte-identical to the working `.env`;
  `DATABASE_URL="file:../db/custom.db"` is the only user-set variable and
  resolves to `<repo>/db/custom.db` from any CWD (CLI, seed, dev,
  standalone runtime) — the operator's requested DB contract is already
  the shipped one, re-verified by `tests/db-path.test.ts` (11 tests) and
  the live `db/custom.db` location.
- Vitest (`vitest.config.ts`: node env, colocated suites + `tests/`,
  30s timeout, `@` alias) and Playwright (`playwright.config.ts`: Chromium,
  webServer = the standalone artifact, `reuseExistingServer`,
  `fullyParallel: false` for SQLite write isolation) — both configs match
  the documented contracts and the suites pass (185 + 27).

## Execution order (one logical change per commit)

1. Remove the session's scratch DB-state helper (`scripts/db-state-check.ts`)
   — dev-only tooling, not part of the app or its documented surface
   (keep the tree surgical).
2. Fresh 15-surface screenshot set from the dev server of the verified
   tree into `docs/screenshots/` (canonical names; 1440×900 desktop +
   375×812 mobile; spot-checked fully-rendered, no skeleton states).
3. `.env.example` re-verify (byte-identical) — no change expected.
4. Docs alignment:
   - PAD v1.19 — revision block (session 35: fifth-redeploy drift check
     absorbed, zero defects), §10 redeploy row update (the new hashes).
   - AGENTS.md — the login-bundle baseline hashes in the drift-watch note.
   - CLAUDE.md v1.12.0 — the same hash baseline reference.
   - README.md — no count changes (no code changes); the screenshot-set
     note stays accurate.
   - task-management_SKILL.md v1.6.1 — frontmatter (project_state,
     last_updated), Appendix B audit-history row for session 35.
   - `docs/session_35.md` (session log), `docs/worklog.md` append.
5. Final gate battery: `bun run lint && bun run typecheck && bun run test`
   (+ build if any source-adjacent file changed — none expected).
6. Atomic commits on main + SSH-wrapper push (dry-run → real → verify →
   shred key), per `docs/how-to-git-push-using-ssh-wrapper_SKILL.md`.

## Validation of this plan against the codebase (performed before execution)

- Every class string quoted above was read from the LIVE reference DOM this
  session and compared against the clone's live DOM
  (`src/components/app/login-view.tsx` renders the same set — verified
  element by element: main/card/strip/padding/logo/h1/sub/Google/divider/
  inputs/submit/footer/spacer, both modes).
- The 27-spec E2E inventory re-read (`e2e/*.spec.ts`): every parity
  contract still asserts the values probed on the new reference bundle this
  session (shadow/blur/ring values, footer geometry, background tokens).
- The DB contract re-verified live: `db/custom.db` at the repo root after
  `db:push` + `db:seed`; `tests/db-path.test.ts` green in the unit run.
- The screenshot set's canonical names enumerated from
  `docs/screenshots/` (15 files) and matched 1:1 to the fresh captures.
