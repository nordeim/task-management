# Session 27 — Second Platform-Login Redeploy: v3 Play-CDN Compile Semantics, Shadow/Blur Ports, Slate-400 Focus Ring

Session numbering: `docs/session_26.md` (operator commit `65f7f7d`) is the
operator's transcript record of the session-25 run; this log continues the
agent-authored series as session 27. The operator's brief re-issued the full
cycle: workspace refresh, doc review + codebase validation, parity iteration
against `https://tuesdaycom-a6700714.base44.app/`, mobile-navigation +
Tailwind v4 attention, the DB-location contract, the test suites, a TDD
remediation plan, screenshots, `.env.example`, docs alignment, and the
SSH-wrapper push to main.

## Baseline validation (repo vs docs)

- Workspace had been reset; re-cloned
  `https://github.com/nordeim/task-management.git` at `65f7f7d`
  (== origin/main, the session-25 delivery + the operator's session_26.md
  transcript; zero code delta after it). Tree clean.
- AGENTS.md / CLAUDE.md v1.7.0 / README.md / PAD v1.14 /
  task-management_SKILL.md v1.2.0 reviewed in full; session_25.md,
  session_26.md, worklog, remediation-plan-session25.md reviewed. Every
  session-25 marker re-confirmed in the tree: vendored
  Input/Textarea/Label anatomy + exported class constants, the globals.css
  hover variant + space-y restoration, `deriveSignupName` wiring, the 20-site
  shadow port (only the documented login-view verbatim exceptions and one
  comment remain), `.env.example` byte-identical to the working `.env`.
- Environment bootstrapped per README: `bun install`, `cp .env.example .env`,
  `db:push` + `db:seed` → `db/custom.db` INSIDE the repo at the canonical
  seed (4 boards / 9 groups / 25 tasks / 7 done / 4 users — the db-path
  contract holds on a fresh clone).
- Baseline gates green: lint 0 · tsc 0 · 185/185 unit.

## Drift check (the session-25 "suggested next" executed)

- **The reference's platform login page was redeployed AGAIN**: new hashes
  `/static/index-BFhVa28D.js` + `/static/index-D2_CMDc1.css` (session 25 saw
  `index-CWZT4F4c.js` + `index-CE8lozEC.css`). Login AND signup modes were
  DOM-dumped end to end: **the design is identical** to the session-25 clone
  (every class string matches). A rebuild, not a redesign.
- **The authed SPA bundle is UNCHANGED** (`/assets/index-BuEJAhK4.js` +
  `/assets/index-DjjZtFMQ.css` — verified in the live post-login DOM).
- Fresh 5-pair VLM sweep of the authed app (dashboard, boards, board-table,
  analytics, mobile-nav open): **5/5 MATCH** (the board-table DIFF claims
  triaged live: board/group colors are per-record seed data; the "N" badge
  is the dev-mode indicator). Mobile-nav panel content + hamburger hover
  re-verified (session-21 fix intact; E2E mobile-nav specs green).

## The reframe: TWO different Tailwind compilers on the reference

Session 25 concluded the platform login page "compiles its verbatim strings
against the v4 runtime on BOTH apps." That premise is wrong, and it hid real
value drifts:

- The **platform login page runs the Tailwind v3 PLAY CDN**
  (`cdn.tailwindcss.com` + `window.tailwind.config = { darkMode: 'class' }` —
  the v3 runtime API). v3 `shadow-sm` = `0 1px 2px 0.05`; v3
  `backdrop-blur-sm` = `blur(4px)`; v3 `space-y` = margin-top semantics; and
  its ring-color cascade resolves in class-string ORDER (the consumer's
  `focus:ring-slate-400` wins over the base's `focus-visible:ring-ring`).
- The **authed app is a customized Tailwind v4 build** whose theme pins
  v3-era values: `.shadow-sm { 0 1px 2px 0 rgb(0 0 0 / .05) }` and
  `.backdrop-blur-sm { blur(4px) }`, plus a shadcn `--radius: .5rem` rounded
  scale that computes equal to stock v4 (4px/6px/8px/12px). Session 25's
  `shadow-sm → shadow-xs` port was correct in COMPUTED effect — the
  mechanism was mislabeled, and the mislabel exempted other utilities from
  the audit.

## Findings (all computed-style verified on both live apps this session)

1. **HIGH — login-view literal `shadow-sm` renders at DOUBLE the reference
   value (3 sites: Sign in, Create account, Google hover).** Reference
   (v3 CDN): `rgba(0,0,0,0.05) 0px 1px 2px 0px`; clone (v4):
   `rgba(0,0,0,0.1) 0px 1px 3px 0px, …`. The session-25 F2 drift class,
   exempted on this surface by the wrong verbatim rule.
2. **HIGH — focused login/signup inputs render a near-black ring; the
   reference renders slate-400.** Reference focused email input:
   `rgb(148,163,184) 0px 0px 0px 4px`; clone: `rgb(10,10,10) …`. Root cause:
   Tailwind v4 sorts `focus:` BEFORE `focus-visible:`, so the vendored Input
   base's `focus-visible:ring-ring` beats the consumer's
   `focus:ring-slate-400`; the v3 CDN generates in class-string order where
   slate-400 wins.
3. **MEDIUM — the login card's `backdrop-blur-sm` renders `blur(8px)` vs the
   reference's `blur(4px)`.**
4. **MEDIUM — the authed dashboard's `backdrop-blur-sm` sites render double
   (5 class sites / 11 rendered elements: 8 icon tiles + 3 gradient side
   cards)** — the reference's authed CSS pins `.backdrop-blur-sm` to
   `blur(4px)`; stock v4 compiles it at `blur(8px)`.

### Verified equal — no action needed

- `rounded-sm` = 4px on BOTH apps (their `calc(var(--radius) - 4px)` with
  `--radius: .5rem`; stock v4 `rounded-sm` = 0.25rem) — the checkbox and
  status segments are already at parity; do NOT port them to `rounded-xs`.
- `flex-grow` / `flex-shrink-0` compile fine in v4 (deprecated aliases are
  still emitted — verified live).
- Button focus ring + offset (our vendored Button dropped
  `ring-offset-background`, so the offset defaults to white = the platform's
  white `--background`); `--ring` tokens differ by 1–2 RGB units
  (imperceptible); `outline-none` (v3) vs `outline-hidden` (v4) both compute
  invisible; `bg-gradient-to-br` is a v4 alias; the login/signup DOM
  structure is byte-parity; body background is covered by the gradient main.

## Remediation executed (TDD, per docs/remediation-plan-session27.md)

1. **RED**: new `e2e/parity.spec.ts` (5 computed-style specs in the
   mobile-nav.spec.ts `expect.poll` tradition): login button resting shadow +
   card backdrop blur; Google hover shadow; focused login input ring; signup
   button + input ring; dashboard tile blur. Run against the standalone
   build — **5 failed** as expected.
2. **GREEN**:
   - `login-view.tsx`: `shadow-sm` → `shadow-xs` (Sign in + Create account),
     `hover:shadow-sm` → `hover:shadow-xs` (Google), card
     `backdrop-blur-sm` → `backdrop-blur-xs`, and
     `focus-visible:ring-slate-400` added to all five input consumer strings
     (tailwind-merge drops the base's `focus-visible:ring-ring`, so
     slate-400 wins every focus path); the porting comment corrected to the
     v3-play-CDN rule.
   - `dashboard-view.tsx`: `backdrop-blur-sm` → `backdrop-blur-xs` at the
     five sites (KPI icon tile, 3 gradient side cards, quick-action tile) +
     the stale line-32 comment corrected.
   - One in-loop spec correction: Chromium serializes v4's oklch-defined
     slate-400 as `lab(65.5349 …)` in computed strings, so the ring
     assertions were made color-space-neutral (compared against a same-page
     `text-slate-400` probe instead of a literal `rgb(148, 163, 184)`).
3. **Gates**: lint 0 · tsc 0 · 185/185 unit · standalone build green ·
   **21/21 Playwright specs** (16 + 5 new) against the rebuilt artifact; DB
   re-verified at the canonical seed afterwards.

## Verification (all executed this session)

- **Live computed-style equality, clone vs reference**: Sign-in button
  resting shadow `rgba(0,0,0,0.05) 0px 1px 2px 0px` == reference; Google
  hover shadow == reference; login card `blur(4px)` == reference; focused
  email input ring contains the same-page slate-400 color and NOT the old
  near-black; dashboard 11/11 backdrop-blur elements at `blur(4px)` ==
  reference's 11/11.
- **VLM pairs post-fix**: login desktop **MATCH**, login mobile **MATCH**,
  signup **MATCH**.
- **Authed regression sweep** (pre-fix captures, unchanged authed bundle):
  5/5 MATCH with data-driven claims triaged live.
- One documented Turbopack cache panic (dev started against a production
  `.next`) resolved per the runbook (pkill + `rm -rf .next` + restart).
- Screenshots: fresh 15-surface dev-server set into `docs/screenshots/`
  (login, signup, dashboard, boards, all five board views, analytics, three
  board-header modals, mobile dashboard, mobile nav open) at 1440×900 +
  375×812.
- `.env.example`: re-verified byte-identical to the working `.env`; no new
  env vars.
- The reference was left pristine throughout (login session only; no data
  mutations — its 1 board / 1 task state unchanged).

## Deliverables

- Code: `src/components/app/login-view.tsx` (shadow/blur ports +
  slate-400 focus rings + corrected porting comment),
  `src/components/app/dashboard-view.tsx` (5 blur ports + comment fix).
- Tests: `e2e/parity.spec.ts` (5 computed-style parity specs).
- Docs: `docs/remediation-plan-session27.md`, PAD v1.15 (revision block +
  §7 testing + §10 redeploy row + §11 key files), AGENTS.md (corrected
  platform-page porting exception, blur rename convention, counts), CLAUDE.md
  v1.8.0 (stack note, testing counts, E2E inventory), README.md (testing
  table), task-management_SKILL.md v1.3.0, this log, `docs/worklog.md`
  append.
- Screenshots: 15 fresh PNGs under `docs/screenshots/`.

## Outcome

- The second platform-login redeploy is absorbed (rebuild with identical
  design — no structural drift), and the compile-semantics reframe closes
  the drift class the wrong "verbatim port" rule hid: the login surface now
  renders the reference's exact shadow, blur, and focus-ring values, and the
  authed dashboard's backdrop blurs match the reference's customized v4
  theme.
- All gates green (185 unit / 21 E2E / build); DB at the canonical seed;
  reference left pristine.
- Delivery: atomic commits on main, pushed via the SSH wrapper
  (`docs/ssh_git_wrapper_v3.py` + the operator runbook), key shredded after
  use.

## Suggested next steps

Re-check both reference asset hashes next cycle (`index-BuEJAhK4.js` for
the authed app, `index-BFhVa28D.js` for the platform login page). The
remaining PAD §10 rows are Low/Info product decisions (unchanged). If the
platform page ever drops the v3 play CDN for a real v4 build, re-audit the
login surface's shadow/blur/ring values against the new compiler.
