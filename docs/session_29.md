# Session 29 — Third Platform-Login Redeploy: Identical Design, Mobile Spacer Footer Port

Session numbering: `docs/session_28.md` is the operator's transcript record of
the session-27 run (which pushed `95acea9` + the log commit `4b9525c`); this
log continues the agent-authored series as session 29. The operator's brief
re-issued the full cycle: workspace refresh, doc review + codebase
validation, parity iteration against
`https://tuesdaycom-a6700714.base44.app/`, mobile-navigation + Tailwind v4
attention, the DB-location contract, the test suites, a TDD remediation
plan, screenshots, `.env.example`, docs alignment, and the SSH-wrapper push
to main.

## Baseline validation (repo vs docs)

- Workspace had been reset; re-cloned
  `https://github.com/nordeim/task-management.git` at `4b9525c`
  (== origin/main, the session-27 delivery + the operator's session_28.md
  transcript; zero code delta after it). Tree clean.
- AGENTS.md / CLAUDE.md v1.8.0 / README.md / PAD v1.15 /
  task-management_SKILL.md v1.3.0 reviewed in full; session_27.md,
  session_28.md, worklog, remediation-plan-session27.md reviewed. Every
  session-27 marker re-confirmed in the tree: `e2e/parity.spec.ts` (5
  computed-style contracts), login-view's `shadow-xs`/`backdrop-blur-xs`/
  `focus-visible:ring-slate-400` ports, dashboard-view's five
  `backdrop-blur-xs` sites, the globals.css hover variant + space-y
  restoration, `.env.example` byte-identical to the working `.env`.
- The scandihaven repo was cloned as the tech-stack pattern reference and
  its skills catalog reviewed (the E2E lesson — validate the production
  artifact — is already baked into `playwright.config.ts`; the Tailwind v4
  skill guidance matches the repo's documented `@custom-variant hover` +
  space-y + shadow-rename invariants).
- Environment bootstrapped per README: `bun install`, `cp .env.example .env`
  (`DATABASE_URL="file:../db/custom.db"`), `db:push` + `db:seed` →
  `db/custom.db` INSIDE the repo at the canonical seed (4 boards / 9 groups
  / 25 tasks / 4 users / 7 done — the db-path contract holds on a fresh
  clone).
- Baseline gates green: lint 0 · tsc 0 · 185/185 unit.

## Drift check (the session-27 "suggested next" executed)

- **The reference's platform login page was redeployed a THIRD time**: new
  hashes `/static/index-BZ3m2EKw.js` + `/static/index-DuUT6T6n.css` (session
  27 saw `index-BFhVa28D.js` + `index-D2_CMDc1.css`). Login AND signup modes
  were DOM-dumped end to end: **the design is identical** to the
  session-25/27 clone — every class string matches, the Tailwind v3 play
  CDN is still the compiler, Google GSI still loads. A rebuild, not a
  redesign.
- **The authed SPA bundle is UNCHANGED** (`/assets/index-BuEJAhK4.js` +
  `/assets/index-DjjZtFMQ.css` — verified in the live post-login DOM).
- Fresh 7-pair VLM sweep (login, dashboard, boards, board-table, analytics,
  mobile-dashboard, mobile-nav-open): **7/7 MATCH**.
- Session-27 computed-style contracts re-verified live on BOTH apps:
  Sign-in button resting shadow `rgba(0,0,0,0.05) 0px 1px 2px 0px` ==
  reference; login card `blur(4px)` == reference; focused email input ring
  = slate-400 on both (v4 oklch serializes as `lab(65.5349 …)` — the
  color-space-neutral probe convention).
- **Mobile navigation re-verified live on both apps**: the clone's visible
  40×40 hamburger computes `rgb(225, 229, 243)` (#E1E5F3) under `:hover` ==
  reference (the session-21 `@custom-variant hover` fix holds). One probe
  lesson recorded: two buttons carry the "Open main menu" aria-label (the
  hidden desktop avatar + the mobile hamburger) — always filter on
  visibility (`offsetParent !== null`) when probing; the E2E suite's
  role-based locator is unaffected. Panel content + tap-navigation-closes-
  panel re-verified against the reference.
- The reference's `/api/frontend-config.js` fetched — base44 platform
  infrastructure config (backend URLs, Turnstile/Google client IDs), not
  parity-relevant.

## Findings (DOM/computed evidence on both live apps this session)

1. **LOW — the clone lacked the reference's mobile-only spacer footer on
   the platform login page.** The reference renders
   `<div class="mt-8 text-center text-xs text-slate-400 sm:hidden"><p>&nbsp;</p></div>`
   AFTER the card, INSIDE the `w-full max-w-md` wrapper, in BOTH login and
   signup modes. Measured on the reference at 375×812: `display:block`,
   343×16px at y≈755, `margin-top: 32px`, 12px text — a whitespace strip
   below the card on mobile, hidden ≥640px. The gap had escaped prior port
   audits (no interactive role, invisible in desktop captures; present in
   the session-25/27 DOM dumps but never diffed).
2. **INFO — the reference's Google button carries a trailing `group`
   class** — inert (no `group-hover:` consumer inside its subtree), carried
   for class-string parity.

### Verified equal — no action

- The authed SPA bundle (unchanged hashes) and every authed surface's VLM
  pair (7/7 MATCH).
- Login/signup DOM structure and every class string — identical to the
  session-25/27 port (leading mail/lock icons + `pl-10`, `h-11 sm:h-12`
  login / `h-10 sm:h-11` signup fields, slate-400 focus rings, the
  shadow/blur ports — all present on BOTH apps).
- `rounded-sm` (4px both), button focus rings, the OR divider, footer
  links, the top gradient strip, the logo block — all byte-parity.
- `.env.example` byte-identical to the working `.env`; no new env vars.

## Remediation executed (TDD, per docs/remediation-plan-session29.md)

1. **RED**: one new spec in `e2e/auth.spec.ts`'s login-surface describe —
   "the mobile spacer footer renders below the card and hides at sm"
   (mobile: visible + `margin-top: 32px` + `font-size: 12px` + below the
   card; signup mode: visible; desktop: hidden). Run against the standalone
   build — **1 failed** as expected.
2. **GREEN**: the footer div added to `login-view.tsx` after the card,
   inside the `w-full max-w-md` wrapper, outside the mode conditional;
   `group` appended to the Google button's class string; the porting
   comment extended. One in-loop correction: the first footer edit carried
   a stray bare `hidden` (which would have hidden it at ALL sizes) — caught
   before the rebuild and removed; `sm:hidden` alone is the reference's
   string.
3. **Gates**: lint 0 · tsc 0 · 185/185 unit · standalone build green ·
   **22/22 Playwright specs** against the rebuilt artifact; DB re-verified
   at the canonical seed afterwards (4/9/25/4/7 via the app's own db-path
   client).

## Verification (all executed this session)

- **Live computed-style/geometry equality, clone vs reference**: the
  footer at 375×812 renders `{x:16, y:755, w:343, h:16, display:block,
  margin:32px, fontSize:12px}` on the clone == the reference's measured
  values (pixel-identical); desktop `display: none` on both; signup-mode
  visibility on both.
- **VLM pairs post-fix**: mobile login **MATCH** (the only flag: the
  dev-server "N" badge — documented). Desktop `login.png`/`signup.png`
  captures byte-identical to the committed set — the footer is mobile-only
  and `group` is inert, so the desktop render is unchanged.
- **Mobile nav**: hover feedback + panel + close-on-navigate re-verified;
  E2E mobile-nav specs green (3/3).
- Screenshots: fresh 15-surface dev-server set into `docs/screenshots/`
  (login, signup, dashboard, boards, all five board views, analytics, three
  board-header modals, mobile dashboard, mobile nav open) at 1440×900 +
  375×812. board-table.png re-captured after a skeleton-state first take
  (dev-server cold compile).
- `.env.example`: re-verified byte-identical to the working `.env`; no new
  env vars.
- The reference was left pristine throughout (login session only; no data
  mutations).

## Deliverables

- Code: `src/components/app/login-view.tsx` (mobile spacer footer + Google
  `group` class + extended porting comment).
- Tests: `e2e/auth.spec.ts` (+1 spec — the footer contract; suite now 22).
- Docs: `docs/remediation-plan-session29.md`, PAD v1.16 (revision block +
  §7 testing + §10 third-redeploy row), AGENTS.md (footer/group invariant +
  22-spec count), CLAUDE.md v1.9.0 (counts, E2E inventory), README.md
  (testing table), task-management_SKILL.md v1.4.0, this log,
  `docs/worklog.md` append.
- Screenshots: 15 fresh PNGs under `docs/screenshots/`.

## Outcome

- The third platform-login redeploy is absorbed (rebuild with an identical
  design — no structural drift), and the one gap the fresh audit surfaced —
  the mobile-only spacer footer — is ported at pixel-identical geometry and
  pinned by the 22nd E2E spec.
- All gates green (185 unit / 22 E2E / build); DB at the canonical seed;
  reference left pristine.
- Delivery: atomic commits on main, pushed via the SSH wrapper
  (`docs/ssh_git_wrapper_v3.py` + the operator runbook), key shredded after
  use.

## Suggested next steps

Re-check both reference asset hashes next cycle (`index-BZ3m2EKw.js` for
the platform login page, `index-BuEJAhK4.js` for the authed app). The
remaining PAD §10 rows are Low/Info product decisions (unchanged). The
platform page has now been redeployed three times with an identical design
each time — if a fourth redeploy changes hashes again, diff the DOM before
assuming a rebuild; if it ever drops the v3 play CDN for a real v4 build,
re-audit the login surface's shadow/blur/ring values.
