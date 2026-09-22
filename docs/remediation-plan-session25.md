# Session 25 Remediation Plan — Reference Redeploy: Platform-Login Parity, Vendored Input/Textarea/Label Anatomy, v3→v4 Shadow Port

Probed live on 2026-09-22 against `https://tuesdaycom-a6700714.base44.app/`
(logged in as sepnetflix2023@outlook.com; mobile 375×812 and desktop 1440×900)
and against the local dev server. Every finding below carries executed evidence
(computed-style probes / DOM dumps), reproduced this session.

## The headline: the reference was REDEPLOYED

The operator's standing assumption — "the reference bundle is
`index-BuEJAhK4.js`, unchanged since session 9" — is now HALF true:

- **The authed app is UNCHANGED.** After login, the SPA still runs
  `/assets/index-BuEJAhK4.js` + `/assets/index-DjjZtFMQ.css` (verified in the
  live DOM and in the server-rendered HTML). Every decompiled authed-surface
  spec from sessions 9–23 remains valid.
- **The platform LOGIN page was REBUILT.** The unauthenticated route
  (`/` → client redirect → `/login?from_url=…`) now serves a new static shell:
  `/static/index-CWZT4F4c.js` + `/static/index-CE8lozEC.css` + the Tailwind v4
  RUNTIME (`cdn.tailwindcss.com`) + the Google GSI client. The login surface
  we cloned (from the old static build) is visually close but measurably
  drifted, and its SIGNUP mode was redesigned end to end.

This cycle's audit therefore re-verified the authed app (fresh 5-pair VLM
sweep — **MATCH on dashboard, boards, board-table, analytics, and the isolated
mobile-nav panel**; mobile panel content parity re-confirmed: the bell button,
the `User Name`/`user@example.com` mock, and the Your Profile / Settings /
Sign out links are all present in both) and then swept the NEW login shell
plus the vendored primitives it exposes.

## Cycle audit results (evidence-backed, all executed this session)

1. **Workspace/docs/codebase alignment — VERIFIED.** `git pull` brought in
   `9cf3123` (operator's `docs/session_24.md` transcript only; zero code
   delta). All session-21/23 markers re-confirmed in the tree: hover variant
   (globals.css:13), db-path contract + tests, rate-limit module + wiring,
   OLD-anatomy Button/Badge/Switch/Select, 14 screenshots, `.env.example`
   byte-identical to `.env`, `db/custom.db` at the repo root with the
   canonical seed (4 boards / 9 groups / 25 tasks / 7 done).
2. **Baseline gates — GREEN.** lint 0 · tsc 0 · 172/172 unit · dev server
   boots (login + dashboard API round-trip, canonical 4/7/18/28%).
3. **Authed parity — 5/5 MATCH** (VLM pairs listed above) on the unchanged
   bundle.
4. **Login shell — DRIFTED** (findings F1, F3 partial).
5. **Computed-style sweep of authed surfaces — one systematic miss found**
   (F2): the v3→v4 `shadow-sm` rename was applied to the vendored primitives
   (sessions 13–21) but NOT to app-level components ported with decompiled
   class strings — every authed-app `shadow-sm` compiles at the v4 value,
   which is DOUBLE the reference's v3 render (evidence below).

## Finding 1 — Platform login page redesigned (HIGH)

**Signup mode is structurally different.** The reference's signup now renders:
a "Back to sign in" button (arrow-left icon, `text-sm text-slate-500
hover:text-slate-700 font-medium transition-colors -mb-2`), an h2 "Create your
account" (`text-xl sm:text-2xl font-bold text-slate-900`), and a
3-field form — **Email / Password / Confirm Password — NO Full name field** —
with inputs `h-10 sm:h-11` (not h-11/sm:h-12), `placeholder:text-slate-400`
(login mode uses `placeholder:text-slate-600`), `text-sm sm:text-base`, icons
`text-slate-400` (login mode uses `text-slate-500`), placeholders
"you@example.com" / "Min. 8 characters" / "Re-enter password", and a
"Create account" submit (`px-3 py-2 w-full h-10 sm:h-11 bg-slate-900
hover:bg-slate-800 … shadow-sm rounded-xl transition-all duration-200`). No
logo, no Google button, no footer links in signup mode. The clone's signup
still renders the old surface (Full name + hint + Sign up + footer links).

**Login mode anatomy deltas** (structure/geometry already match):

- Labels: the platform runs Tailwind v4 RUNTIME, where `text-sm` carries
  `line-height: 1.25rem` (20px). Measured: reference label line-height 20px vs
  clone 14px (`leading-none` in the vendored Label) → each field group is 6px
  shorter on the clone (72 vs 78px; card 724 vs 739px).
- Inputs: the platform base is the classic OLD input (`px-3 py-2
  ring-offset-background … focus-visible:ring-2 focus-visible:ring-ring
  focus-visible:ring-offset-2`, NO shadow, no `bg-transparent`); the clone
  renders the NEW-anatomy vendored Input (`shadow-xs`, `focus-visible:ring-[3px]`
  + `ring-ring/50`), so the login inputs show a shadow the reference does not
  have and a 3px focus ring instead of 2px-with-offset.
- Sign in button: platform base has `gap-1` + `focus-visible:ring-2 +
  ring-offset-2` (+ `ring-offset-background`); the clone's OLD-anatomy Button
  base has `gap-2` + `ring-1`.
- Google button: the platform renders a PLAIN `<button>` (`w-full flex
  items-center justify-center gap-3 bg-white text-slate-700 px-5 py-3.5
  rounded-xl border border-slate-200 hover:bg-slate-50 hover:border-slate-300
  hover:shadow-sm transition-all duration-200 font-medium text-[16px] group`
  with the CLASSIC Google "G" svg paths); the clone wraps it in the vendored
  outline Button, which contaminates the surface with `shadow-xs` (the
  reference's Google button has NO resting shadow) and
  `hover:text-accent-foreground`, and ships the newer "G" path variant.

**Signup API.** With no Full name field, the platform derives the display name
from the email prefix (the demo account's name is `sepnetflix2023`). The
clone's `POST /api/auth/signup` requires `name` (min 2) — it must accept
`{email, password}` and derive the name when absent.

**Action (TDD):**

- `src/lib/domain.ts`: new pure seam `deriveSignupName(email)` (prefix before
  `@`, trimmed, fallback `"user"`), red-first unit tests in
  `domain.test.ts`.
- `src/app/api/auth/signup/route.ts`: `name` becomes optional in the Zod
  schema; missing → `deriveSignupName(email)`.
- `src/components/app/login-view.tsx`:
  - login mode: labels gain `leading-5` (20px line box); email/password
    inputs gain the platform deltas (`py-2 shadow-none focus-visible:ring-2
    focus-visible:ring-offset-2`); the Sign in button gains
    `focus-visible:ring-2 focus-visible:ring-offset-2 gap-1`; the Google
    button becomes a plain `<button>` with the exact platform class string
    and the classic Google "G" svg paths (`-ml-4` icon wrapper kept).
  - signup mode: rewritten to the reference structure (Back to sign in +
    h2 + Email/Password/Confirm Password + Create account; no logo/Google/
    footer). Client-side confirm-match validation feeding the existing
    inline error alert.
  - the platform page compiles under Tailwind v4 — classes port VERBATIM
    (no v3→v4 renames for this surface; `shadow-sm` stays `shadow-sm`).
- `e2e/auth.spec.ts`: one new spec — the login surface structure (h1, Google
  button, "or" divider, footer links) and the signup toggle round-trip
  ("Need an account? Sign up" → h2 + three labeled fields + "Create account"
  + "Back to sign in" → returns to the login form). No account is created
  (keeps the DB at seed; the rate-limit spec's budget untouched).

## Finding 2 — Systematic v3→v4 `shadow-sm` porting miss on authed-app components (HIGH)

The repo's porting convention (AGENTS.md): v3 `shadow-sm` → v4 `shadow-xs`
(computed equivalence). The vendored primitives honor it; **20 app-level
sites kept the literal `shadow-sm`**, which Tailwind v4 compiles at double
the reference's render. Computed-style evidence (this session):

- Reference nav: `rgba(0,0,0,0.05) 0px 1px 2px 0px` — clone nav:
  `rgba(0,0,0,0.1) 0px 1px 3px 0px, rgba(0,0,0,0.1) 0px 1px 2px -1px`.
- Reference class strings (DOM-dumped) all say `shadow-sm` (v3): the nav,
  the board sticky white bars, the toolbar card, the table card, the boards
  toolbar buttons (inactive toggles / Analytics / Filter), the dashboard
  side cards + quick actions, the kanban count badge, the mobile + toolbar
  search inputs, the dialog inputs/select trigger.
- Bare `shadow` sites are CORRECT (v3 `shadow` == v4 `shadow`, computed-equal
  on both apps' New Task buttons — verified; no change).
- `shadow-lg/xl/2xl/md` are v3==v4 (no change). The login-view's
  `shadow-sm`/`hover:shadow-sm` target the v4-runtime platform page (no
  change).

**Action:** rename `shadow-sm` → `shadow-xs` at the 20 authed-app sites
(app-header 96/338; board-view 557/585/631/789; board-table 445/875;
board-kanban 122; boards-view 161/174/181/191; board-calendar 115;
dashboard-view 198/231/398; create-task-dialog 90/101; create-group-dialog
82 — the last three are superseded by Finding 5's component switch), and fix
the comment at app-header:93 to state the port. Verification: computed-style
equality on nav + toolbar card + table card + kanban badge post-fix.

## Finding 3 — Vendored Input/Textarea/Label never locked to the reference anatomy (MEDIUM)

Same drift class as the Card (s11), Badge/Switch (s13), Select (s15), Button
(s21) fixes — the scaffold's NEW-shadcn Input/Textarea/Label were never
rewritten. Decompiled reference bases (authed bundle, this session):

- Input: `flex h-9 w-full rounded-md border border-input bg-transparent px-3
  py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent
  file:text-sm file:font-medium file:text-foreground
  placeholder:text-muted-foreground focus-visible:outline-none
  focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed
  disabled:opacity-50 md:text-sm` (Edit Task title = stock anatomy; the
  dialogs use the same base minus h-9/rounded-md/border-input with consumer
  overrides).
- Textarea: `flex w-full border bg-transparent px-3 py-2 text-base shadow-sm
  placeholder:text-muted-foreground focus-visible:outline-none
  focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed
  disabled:opacity-50 md:text-sm`.
- Label: `text-sm font-medium leading-none
  peer-disabled:cursor-not-allowed peer-disabled:opacity-70`.

Clone deltas: `focus-visible:ring-[3px]` + `ring-ring/50` + `border-ring`
(vs ring-1), `transition-[color,box-shadow]` (vs transition-colors),
`field-sizing-content` (v4 auto-grow — a BEHAVIORAL difference on the
board-description textarea), `min-h-16`/`rounded-md`/`border-input` extras,
`selection:*`/`dark:*`/`aria-invalid:*`/`min-w-0`/`file:inline-flex
file:h-7`/`outline-none`, and the Label's `inline`/`select-none`/
`group-data-[disabled=true]:*`.

**Action (TDD):** export `INPUT_CLASS` / `TEXTAREA_CLASS` / `LABEL_CLASS`
from the three vendored files (the Switch/Select export pattern); RED
contract tests in `primitives.test.ts` (old geometry present, NEW-only
classes absent, v3 `shadow-sm` → v4 `shadow-xs`, `focus-visible:outline-none`
→ `focus-visible:outline-hidden`); GREEN rewrites.

## Finding 4 — Create/Edit Board dialogs render 36px/64px fields (MEDIUM, original gap)

The clone's board dialogs pass NO className to Input/Textarea, so the
(NEW-anatomy) base renders `h-9` (36px) and `min-h-16` (64px) with
`border-input`/`rounded-md`. The reference's dialogs (DOM-dumped this
session): input = base + `rounded-xl border-[#E1E5F3] h-12 focus:ring-2
focus:ring-[#0073EA]/20` (48px); textarea = base + `rounded-xl
border-[#E1E5F3] min-h-20 focus:ring-2 focus:ring-[#0073EA]/20` (80px).
This surface was never in a VLM pair set — an original gap, not a
regression. **Action:** add the consumer overrides in
create-board-dialog.tsx + edit-board-dialog.tsx.

## Finding 5 — create-task/create-group raw inputs + Select trigger (LOW)

`create-task-dialog.tsx`/`create-group-dialog.tsx` carry hand-rolled raw
`<input>` strings with literal `shadow-sm` (v4 double render — computed
`rgba(0,0,0,0.1) 0px 1px 3px…` this session) and `focus-visible:ring-2`
(vs the reference's base ring-1 + consumer `focus:ring-2`). The
create-task Select trigger consumer adds `shadow-sm`, overriding the
vendored base's correct `shadow-xs`. **Action:** switch both raw inputs to
the (rewritten) vendored Input with the reference's exact consumer string;
drop `shadow-sm` from the Select trigger consumer.

## Everything else — no new gaps

Rate limiting intact (live 429 probe not re-run this cycle — unchanged code,
pinned by 12 unit tests + E2E); DB contract intact; mobile nav regression
spec green; code hygiene clean; remaining PAD §10 rows are Low/Info product
decisions (unchanged).

## Execution order (TDD, one logical change per commit)

1. RED primitives.test.ts (input/textarea/label contracts) → GREEN vendored
   rewrites (+ exports).
2. F2 shadow rename (20 sites) — computed-style verification on the dev
   server.
3. F4 board-dialog consumer overrides — live height probes (48px/80px).
4. F5 create-task/create-group Input switch + Select trigger fix.
5. RED domain.test.ts (`deriveSignupName`) → GREEN domain.ts → signup route
   name-optional wiring.
6. F1 login-view restructure (login-mode fixes + signup-mode rewrite +
   Google plain button).
7. E2E login/signup surface spec → rebuild → full suite.
8. Full gates: lint · typecheck · unit · build · e2e (expect 174+ unit /
   14 E2E).
9. Live verification: login pairs (desktop + mobile) VLM + pixel-diff;
   computed-style sweeps (nav/toolbar/table-card shadows, dialog field
   heights, login label line-height, focused-input rings).
10. Dev-server screenshots → docs/screenshots/; `.env.example` re-verify.
11. Docs phase: PAD v1.14, README, AGENTS.md, CLAUDE.md,
    task-management_SKILL.md v1.2.0, session_25.md, worklog append.
12. Atomic commits on main + SSH-wrapper push (dry-run → real → verify).

## Validation of this plan against the codebase (performed before execution)

- `rg -n "shadow-sm" src/components/app/` — 20 class-string sites + 1 comment
  enumerated (F2/F5 premise); `shadow-lg/xl/2xl/md` and bare `shadow` sites
  listed and excluded with computed evidence.
- `src/components/ui/input.tsx` / `textarea.tsx` / `label.tsx` read in full —
  NEW anatomy confirmed; no other consumers depend on the NEW-only classes
  (all Input consumers pass height/border/bg overrides that tw-merge onto
  either anatomy; owner-cell's `border-none`/`focus:ring-0`/`p-0` merge
  cleanly).
- `src/components/app/login-view.tsx` read in full (268 lines) — signup
  branch, footer links, Google button structure confirmed against the
  platform dumps.
- `src/app/api/auth/signup/route.ts` read in full — name required today; no
  test posts to signup (E2E + unit greps) → schema change is safe.
- `e2e/auth.spec.ts` structure checked — the new spec adds no signup POST
  (DB stays at seed; the demo email's login budget unaffected).
- Reference login-mode + signup-mode HTML dumped in full (card, logo, h1,
  Google, divider, form, footer, back button, h2, three field groups,
  submit) — every class string in this plan is a verbatim extract.
