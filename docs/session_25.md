# Session 25 — Reference Redeploy: Platform-Login Parity, Vendored Input/Textarea/Label Anatomy, v3→v4 Shadow + space-y Ports

Session numbering: `docs/session_24.md` (operator commit `9cf3123`) is the
operator's transcript record of the session-23 run; this log continues the
agent-authored series as session 25. The operator's brief re-issued the full
cycle: workspace refresh, doc review + codebase validation, parity iteration
against `https://tuesdaycom-a6700714.base44.app/`, mobile-navigation +
Tailwind v4 attention, the DB-location contract, the test suites, a TDD
remediation plan, screenshots, `.env.example`, docs alignment, and the
SSH-wrapper push to main.

## Baseline validation (repo vs docs)

- `git pull` brought in exactly one commit (`9cf3123` — the operator's
  `docs/session_24.md` transcript; zero code delta). Tree clean at
  `9cf3123` == origin/main.
- AGENTS.md / CLAUDE.md / README.md / PAD v1.13 / task-management_SKILL.md
  v1.1.0 reviewed in full; session_23.md, worklog,
  remediation-plan-session23.md, session_24.md reviewed. Every session-21/23
  marker re-confirmed in the tree: hover variant (globals.css), db-path
  contract + tests, rate-limit module + login/signup wiring + E2E spec,
  OLD-anatomy Button/Badge/Switch/Select, 14 screenshots, `.env.example`
  byte-identical to `.env`, `db/custom.db` inside the repo at the canonical
  seed (4 boards / 9 groups / 25 tasks / 7 done).
- Baseline gates green: lint 0 · tsc 0 · 172/172 unit · dev server boots
  (login + dashboard API round-trip, canonical 4/7/18/28%).

## The headline audit finding: the reference was REDEPLOYED

The standing assumption — reference bundle `index-BuEJAhK4.js` unchanged
since session 9 — broke this session, but only on ONE surface:

- **The authed app is UNCHANGED.** After login the SPA still runs
  `/assets/index-BuEJAhK4.js` + `/assets/index-DjjZtFMQ.css` (verified in the
  live DOM and the server-rendered HTML). All decompiled authed-surface
  specs remain valid.
- **The unauthenticated `/login` route was REBUILT** as a platform-level
  page: new `/static/index-CWZT4F4c.js` + `/static/index-CE8lozEC.css` +
  the Tailwind v4 RUNTIME (`cdn.tailwindcss.com`) + the Google GSI client.
  Fresh 5-pair VLM sweep of the authed app (dashboard, boards, board-table,
  analytics, isolated mobile-nav panel): **5/5 MATCH** — parity held.
  The new login shell was then DOM-dumped end to end (login + signup
  modes) and audited against the clone.

## Findings (all evidence-backed, computed-style/DOM probes this session)

1. **HIGH — Platform signup redesigned.** The reference's signup now
   renders Back-to-sign-in + "Create your account" h2 + Email / Password /
   Confirm Password (NO Full name), h-10/sm:h-11 inputs, slate-400
   placeholders/icons, "Create account" submit; no logo/Google/footer. The
   platform derives display names from the email prefix (the demo account
   renders as `sepnetflix2023`).
2. **HIGH — Systematic v3→v4 `shadow-sm` porting miss.** 20 app-level
   sites kept the literal `shadow-sm` (the vendored primitives honor the
   rename; app components ported from decompiled strings did not) — every
   one renders at DOUBLE the reference's v3 shadow (computed evidence:
   nav `0.1 0 1px 3px` vs the reference's `0.05 0 1px 2px`).
3. **MEDIUM — Vendored Input/Textarea/Label never locked.** The scaffold's
   NEW-shadcn anatomy (`ring-[3px]` + `ring-ring/50`, `field-sizing-content`
   auto-grow textarea, selection:/dark:/aria-invalid extras) vs the
   reference's OLD anatomy — the same drift class as the Card (s11),
   Badge/Switch (s13), Select (s15), Button (s21) fixes.
4. **MEDIUM — Board dialogs rendered 36px/64px fields** (missing consumer
   overrides; the reference's dialogs render 48px inputs / 80px textareas).
   Original gap, not a regression.
5. **LOW — create-task/create-group raw `<input>` strings** carried literal
   v3 `shadow-sm` (double render) and a divergent focus ring.
6. **HIGH — Tailwind v4 `space-y` semantics flip (the deepest find).**
   v4 applies margin-BOTTOM to `:not(:last-child)`; v3 applied margin-TOP
   to every child except the first. Vertical margins are inert on INLINE
   children — and the (Radix) Label renders `display: inline` — so every
   form group shaped `<Label/><Input/>` collapsed: the clone rendered a
   4px label→field gap where the reference renders 12px (measured live on
   both apps' Create Board dialogs and login cards; the login card was
   724px vs 746px). Fixed by restoring v3 semantics in `globals.css`
   (`@layer utilities` overrides for every space-y value + the sm:
   variants used here — cascade-safe, consumer margin utilities still win).

## Remediation executed (TDD, one logical change per commit)

1. **RED→GREEN** `primitives.test.ts` +9 contract tests → vendored
   `input.tsx`/`textarea.tsx`/`label.tsx` rewritten to the OLD-shadcn
   anatomy (decompiled this session), exporting `INPUT_CLASS` /
   `TEXTAREA_CLASS` / `LABEL_CLASS` (the Switch/Select export pattern).
   181 unit tests green.
2. **Shadow port**: `shadow-sm` → `shadow-xs` at the enumerated authed-app
   sites (header, board chrome, toolbar card, table card, boards toolbar,
   dashboard cards/quick-actions/badges, kanban count badge, calendar chip,
   mobile+toolbar search inputs). Verified: clone nav computed shadow ==
   reference (`rgba(0,0,0,0.05) 0px 1px 2px 0px`).
3. **Board dialogs**: consumer overrides added (`h-12 rounded-xl
   border-[#E1E5F3] focus:ring-2 focus:ring-[#0073EA]/20` input; `min-h-20`
   textarea). Verified live: 48px / 80px, label gap 12px, v3-equivalent
   resting shadow, `field-sizing: fixed`.
4. **create-task/create-group**: raw inputs switched to the vendored Input
   with the reference's exact consumer string; the Select trigger consumer
   dropped its `shadow-sm` override.
5. **RED→GREEN** `deriveSignupName` (4 unit tests in domain.test.ts) →
   `POST /api/auth/signup` accepts `{email, password}` (name optional,
   derived). 185 unit tests green.
6. **login-view restructure**: login mode kept (labels `leading-5`, inputs
   `py-2 shadow-none focus-visible:ring-2 focus-visible:ring-offset-2`,
   Sign-in `gap-1 ring-2 ring-offset-2`, Google button as a PLAIN button
   with the platform's verbatim class string + classic "G" svg paths);
   signup mode rewritten to the platform structure with client-side
   confirm-match validation feeding the existing inline alert.
7. **E2E**: 3 new specs (`e2e/auth.spec.ts` — login surface structure,
   signup toggle round-trip, mismatch inline error). One locator fix
   in-loop (`getByLabel("Password", { exact: true })` — "Confirm Password"
   also matches). **16/16 green** against the rebuilt standalone artifact;
   DB re-verified at the canonical seed afterwards.

## Verification (all executed this session)

- Gates: lint 0 · tsc 0 · **185/185 unit** · standalone build green ·
  **16/16 Playwright specs**.
- **Login parity re-verified post-fix**: card geometry now EXACT (746px ==
  746px; field block 172 == 172; label gap 10 == 10; label line-height
  20px == 20px); VLM pairs — login desktop **MATCH**, login mobile
  **MATCH**, signup desktop **MATCH**.
- **Authed regression sweep** (the space-y port is global): fresh 5-pair
  captures; computed-style ground truth re-confirmed equal (nav shadow,
  dialog field geometry, footer badges `border px-1.5 py-0.5 text-xs
  font-semibold text-foreground`, recent-board rows transparent at rest);
  remaining VLM flags triaged as data-driven noise (reference pristine
  1 board / 1 task vs the clone's 4/25 seed) and dev-indicator artifacts
  (the production build has none).
- **Mobile nav re-verified**: the hamburger computes the reference's
  `#E1E5F3` hover in a `(hover:none)` context (session-21 fix intact);
  panel content parity (bell + User Name/user@example.com mock + Your
  Profile/Settings/Sign out) re-confirmed by DOM dump; isolated-panel VLM
  pair MATCH.
- Screenshots: fresh 15-surface dev-server set into `docs/screenshots/`
  (the canonical 14 + the redesigned signup surface) — 1440×900 + 375×812.
- `.env.example`: re-verified byte-identical to the working `.env`; no new
  env vars.

## Deliverables

- Code: `src/components/ui/{input,textarea,label}.tsx` (OLD anatomy +
  exported class constants), the 20-site shadow port, board/create-task/
  create-group dialog overrides, `src/lib/domain.ts` (`deriveSignupName`),
  `src/app/api/auth/signup/route.ts`, `src/components/app/login-view.tsx`
  (platform parity), `src/app/globals.css` (v3 space-y restoration).
- Tests: `primitives.test.ts` (+9), `domain.test.ts` (+4),
  `e2e/auth.spec.ts` (+3 specs).
- Docs: PAD v1.14 (revision block, §7 testing, §10 row, key files),
  README (auth row, testing table, screenshots), AGENTS.md (space-y +
  shadow-port + signup invariants), CLAUDE.md (counts + inventory),
  task-management_SKILL.md v1.2.0, `docs/remediation-plan-session25.md`,
  this log, `docs/worklog.md` append.
- Screenshots: 15 fresh PNGs under `docs/screenshots/`.

## Outcome

- The reference redeploy is fully absorbed: the authed app was re-verified
  unchanged (5/5 MATCH), and the rebuilt platform login/signup surfaces
  are now cloned at computed-style equality. The deepest find — Tailwind
  v4's `space-y` margin-direction flip silently collapsing every
  Label→field gap on inline labels — is fixed globally and pinned by
  contract tests.
- All gates green (185 unit / 16 E2E / build); DB at the canonical seed;
  reference left pristine throughout.
- Delivery: atomic commits on main, pushed via the SSH wrapper
  (`docs/ssh_git_wrapper_v3.py` + the operator runbook), key shredded
  after use.

## Suggested next steps

Re-check the reference's asset hashes before the next parity cycle
(`index-BuEJAhK4.js` for the authed app, `index-CWZT4F4c.js` for the
platform login page). The remaining PAD §10 rows are Low/Info product
decisions (unchanged).
