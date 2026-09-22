# Remediation Plan — Session 27 (Cycle 24)

**Scope:** absorb the second platform-login redeploy (hash-only — the design is
identical) and close the v3→v4 compile-semantics gaps it exposed on the login
surface, plus the same drift class found on the authed dashboard.

**Baseline:** clean clone at `65f7f7d` (== origin/main, the session-25
delivery). Gates green on arrival: lint 0 · tsc 0 · 185/185 unit · DB at the
canonical seed (4 boards / 9 groups / 25 tasks) via the repo's own db-path
resolution. `.env` copied from `.env.example` (`DATABASE_URL="file:../db/custom.db"`).

## Drift check (executed this session)

- **The reference's platform login page was redeployed AGAIN** — new hashes
  `/static/index-BFhVa28D.js` + `/static/index-D2_CMDc1.css` (session 25 saw
  `index-CWZT4F4c.js` + `index-CE8lozEC.css`). Login AND signup modes were
  DOM-dumped end to end: the design is **identical** to what session 25 cloned
  (card, logo, hero, Google button, divider, form anatomy, footer, back-link,
  three-field signup — every class string matches the session-25 port). This
  redeploy is a rebuild, not a redesign.
- **The authed SPA bundle is UNCHANGED** — still `/assets/index-BuEJAhK4.js`
  + `/assets/index-DjjZtFMQ.css` (verified in the live post-login DOM). All
  authed-surface specs remain valid. Fresh 5-pair VLM sweep (dashboard, boards,
  board-table, analytics, mobile-nav open): **5/5 MATCH** (the board-table
  DIFF claims were triaged live: board/group COLORS are per-record seed data,
  and the "N" badge is the dev-mode indicator).
- **Key discovery that reframes the session-25 porting rule:** the platform
  login page compiles under the **Tailwind v3 play CDN**
  (`cdn.tailwindcss.com` + `window.tailwind.config = { darkMode: 'class' }` —
  the v3 runtime API), NOT a v4 runtime as session 25 concluded. The authed
  app's CSS is a **customized Tailwind v4 build** whose theme pins two v3-era
  values: `.shadow-sm { 0 1px 2px 0 rgb(0 0 0 / .05) }` and
  `.backdrop-blur-sm { blur(4px) }` (plus a shadcn `--radius: .5rem` rounded
  scale that happens to equal stock v4). Session 25's shadow port was correct
  in COMPUTED effect; the "port the platform page VERBATIM (no renames)" rule
  was wrong in mechanism and hides three real value drifts (below).

## Findings (all computed-style verified on both live apps this session)

1. **HIGH — login-view literal `shadow-sm` renders at DOUBLE the reference
   value (3 sites).** The platform page's v3 CDN compiles `shadow-sm` to
   `rgba(0,0,0,0.05) 0px 1px 2px 0px`; our v4 build compiles the same token
   to `rgba(0,0,0,0.1) 0px 1px 3px 0px, rgba(0,0,0,0.1) 0px 1px 2px -1px`.
   Measured on the Sign-in button (resting AND focus states) —
   `login-view.tsx:197` (Sign in), `:328` (Create account), `:102`
   (`hover:shadow-sm` on the Google button). The same drift class session 25
   fixed on 20 authed-app sites; the login surface was exempted under the
   (wrong) verbatim rule. **Action:** rename to `shadow-xs` /
   `hover:shadow-xs` at the three sites.

2. **HIGH — focused login/signup inputs render a near-black ring; the
   reference renders slate-400.** The reference's focused email input
   computes `rgb(148,163,184) 0px 0px 0px 4px` (slate-400 — its
   `focus:ring-slate-400` wins the cascade); the clone computes
   `rgb(10,10,10) 0px 0px 0px 4px` (--ring). Root cause: Tailwind v4 sorts
   `focus:` BEFORE `focus-visible:`, so the vendored Input base's
   `focus-visible:ring-ring` beats the consumer's `focus:ring-slate-400`
   whenever both match (keyboard focus); the v3 play CDN generates utilities
   in class-string order, where `focus:ring-slate-400` comes last and wins.
   Affects all five platform-page inputs (login email/password, signup
   email/password/confirm). **Action:** add
   `focus-visible:ring-slate-400` to the five consumer class strings —
   tailwind-merge then drops the base's `focus-visible:ring-ring` and
   slate-400 becomes the ring color on every focus path.

3. **MEDIUM — the login card's `backdrop-blur-sm` renders `blur(8px)` vs the
   reference's `blur(4px)`** (`login-view.tsx:65`, the `bg-white/95
   backdrop-blur-sm` card). v3 play-CDN `backdrop-blur-sm` = 4px = v4
   `backdrop-blur-xs`; our v4 `backdrop-blur-sm` = 8px. Subtle through the
   95%-opaque card, but computed-unequal. **Action:** rename to
   `backdrop-blur-xs`.

4. **MEDIUM — the authed dashboard's `backdrop-blur-sm` sites render double
   (5 class sites / 11 rendered elements).** The reference's authed CSS pins
   `.backdrop-blur-sm { blur(4px) }` (custom v4 theme, v3 value) — measured
   `blur(4px)` on all 11 of its elements (8 × `w-10 bg-white/20 backdrop-blur-sm
   rounded-lg` icon tiles across the 4 KPI cards + 4 quick-action rows, and 3
   gradient side cards). Our clone renders `blur(8px)` at the five class
   sites (`dashboard-view.tsx:279, 314, 427, 456, 471`). **Action:** rename
   to `backdrop-blur-xs` at the five sites; correct the stale line-32 comment
   ("bare backdrop-blur" — the reference actually ships `backdrop-blur-sm`).

### Verified equal — no action

- **rounded-sm = 4px on BOTH apps** (their `calc(var(--radius) - 4px)` with
  `--radius: .5rem`; stock v4 `rounded-sm` = 0.25rem). The checkbox and the
  `h-4 w-2 rounded-sm` status segments are already at parity — do NOT port
  them to `rounded-xs`.
- **`flex-grow` / `flex-shrink-0` compile fine** in our v4 build (deprecated
  aliases are still emitted; verified live: `flex-grow` → `flex-grow: 1`).
- **Button focus-state ring** — the vendored Button dropped
  `ring-offset-background`, so its offset color defaults to `#fff` — equal to
  the platform's white `--background`; ring widths and colors match
  (imperceptible `--ring` 1–2 RGB-unit difference between hsl(0 0% 3.9%) and
  hsl(240 10% 3.9%)).
- **`focus-visible:outline-none` (v3) vs our `outline-hidden` (v4)** — both
  compute to an invisible 2px transparent outline.
- **`bg-gradient-to-br`** — v4 keeps the v3 gradient names as aliases.
- **The login/signup DOM structure** — byte-level parity with the session-25
  port (this redeploy changed nothing structural).
- **Body background** (white vs `#f5f6f8`) — fully covered by the gradient
  `main`; invisible (documented session 25).

## TDD execution order (one logical change per commit)

1. **RED**: new `e2e/parity.spec.ts` (5 specs, computed-style contracts in the
   mobile-nav.spec.ts tradition — `expect(...).poll` on evaluated computed
   styles): login button resting shadow + card backdrop blur; Google hover
   shadow; focused login input ring color; signup-mode button + input ring;
   dashboard tile backdrop blur. Run against the standalone build — expect
   exactly the 5 new specs to fail (confirmed 2026-09-22: 5 failed).
2. **GREEN**: F1+F2+F3 in `login-view.tsx` (3 shadow renames, card blur
   rename, 5 × `focus-visible:ring-slate-400`); F4 in `dashboard-view.tsx`
   (5 blur renames + comment fix); correct the login-view porting comment
   (v3 play CDN — renames apply).
3. **Rebuild + full suite** — expect 20/20 E2E + lint 0 + tsc 0 + 185 unit.
4. **Live verification** — dev-server computed-style probes equal to the
   reference's measured values (button shadow `0.05 0 1px 2px`, card
   `blur(4px)`, input ring `148, 163, 184`, dashboard tiles `blur(4px)`);
   VLM pairs on login desktop/mobile + signup.
5. Screenshots → `docs/screenshots/` (15-surface set); `.env.example`
   re-verify.
6. Docs: PAD v1.15 (revision block + corrected porting rule), AGENTS.md
   (correct the "platform page ports VERBATIM" exception — it is a v3
   play-CDN surface; v3→v4 renames DO apply there), README testing table,
   CLAUDE.md counts, task-management_SKILL.md v1.3.0, `docs/session_27.md`,
   worklog append.
7. Atomic commits on main + SSH-wrapper push (dry-run → real → verify →
   shred key).

## Validation of this plan against the codebase (performed before execution)

- `rg -n "shadow-sm|backdrop-blur" src/components/app/login-view.tsx` —
  exactly the 4 sites enumerated (3 × shadow-sm + 1 × backdrop-blur-sm).
- `rg -n "backdrop-blur" src/components/app/` — dashboard-view only (5 sites
  + 1 stale comment); no other app surface ships a blur utility.
- `src/components/ui/button.tsx` read in full — no `ring-offset-background`
  in the base (offset defaults to white → platform-equal).
- `src/components/ui/input.tsx` — base carries `focus-visible:ring-1
  focus-visible:ring-ring`; consumer `focus:ring-slate-400` cannot win under
  v4's variant order (F3 premise confirmed).
- `e2e/mobile-nav.spec.ts` pattern reviewed — computed-style assertions via
  `page.evaluate` are the established E2E convention for this class of fix.
- Reference evidence captured this session: platform form HTML dumps
  (login + signup), platform CSS fetch (`index-D2_CMDc1.css`), authed CSS
  fetch (`index-DjjZtFMQ.css`), live computed styles on both apps (button
  resting/focused shadows, card backdrop-filter, input focus rings,
  dashboard blur surfaces, checkbox radius).
