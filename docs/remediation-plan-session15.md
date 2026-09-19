# Session 15 Remediation Plan — Typography, Select Primitive, Mock Chrome, Date Boundary

Probed live on 2026-09-19 against `https://tuesdaycom-a6700714.base44.app/`
(logged in as sepnetflix2023@outlook.com, viewport 1440×900). The reference's
compiled bundle is UNCHANGED since session 9 (`/assets/index-BuEJAhK4.js`) and
its stylesheet is `index-DjjZtFMQ.css` — all prior decompiled specs remain
valid. This cycle re-ran the controlled experiment with a fresh throwaway board
("S14 Probe Board", 10 tasks, 3 owners + 2 unassigned, dates Sep 14 – Oct 10)
seeded on BOTH apps, captured 12 view pairs (24 screenshots), and ran a VLM
side-by-side drift sweep. Verdicts after probe-data alignment: MATCH on login,
kanban, modal-integrations; every remaining DIFF was triaged with live DOM
probes, computed styles, and bundle decompilation. Six verified gaps below;
everything else decomposed into documented deviations, data-only differences,
or disproven VLM hallucinations.

## Finding 1 — the reference ships the SYSTEM font stack; the clone ships Inter (SYSTEMIC)

Ground truth (reference stylesheet + live `document.fonts`):

- Reference CSS contains exactly one sans `font-family`:
  `ui-sans-serif,system-ui,sans-serif,"Apple Color Emoji","Segoe UI Emoji",…`
  — Tailwind v4's DEFAULT `--font-sans`. There are ZERO `@font-face` rules and
  no font link tags; `document.fonts` is empty. The reference renders in
  whatever the OS provides.
- Reference `<body>` has NO classes; computed `-webkit-font-smoothing` is
  `auto` (NOT antialiased). Colors come from a CSS rule
  (`body{background-color:hsl(var(--background));color:hsl(var(--foreground))}`).
- The clone loads `Inter` from `next/font/google` in `src/app/layout.tsx`
  (`variable: "--font-inter"`) and maps it in `src/app/globals.css`
  (`--font-sans: var(--font-inter)`), plus `antialiased` on `<body>`.

Consequences (both measured live on the probe board):

- Same string, different metrics: calendar chip `<p>` `scrollWidth` 187px on
  the reference vs 178px on the clone → the clone's chips show ~1 more
  character before truncation (VLM flagged "se…" vs "…", "messa…" vs "mess…").
- Table titles wrap at different points → reference row 1/2 = 65px (2-line
  title), clone = 53/57px (1-line) → different rows fit the viewport.
- Every text surface renders in a different family than the reference on any
  machine (Inter vs the OS font).

Action: delete the Inter import and the `--font-sans` override so the app
falls through to Tailwind v4's default stack — identical to the reference's
CSS. Drop `antialiased` (reference is `auto`). Keep `bg-background
text-foreground` (matches the reference's body CSS rule). This also removes
the Google-Fonts network dependency from `next build` (a known transient
failure mode, see session-8 worklog).

Blast radius: purely rendering — no logic. The login/kanban/integrations pairs
that already MATCHED will re-render in the system font like the reference and
stay matched (verified reasoning: the reference itself renders in that stack).

## Finding 2 — vendored Select ships NEW shadcn anatomy; the reference ships OLD (SYSTEMIC, row-height root cause)

Computed-style ground truth (probe board, Main Table):

| property | reference | clone |
|----------|-----------|-------|
| row 3 height (single-line title) | 47px | 52–53px |
| priority trigger height | 31px (follows cell: 48px in the 65px row) | 36px fixed |
| trigger height source | plain `h-9` utility — consumer `h-full` wins via tailwind-merge | `data-[size=default]:h-9` attribute variant — tailwind-merge cannot strip a differently-vectored class; the attribute selector also outspecifies `.h-full` |

Decompiled from the bundle (exact OLD-shadcn strings):

- **SelectTrigger**: `flex h-9 w-full items-center justify-between
  whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2
  text-sm shadow-sm ring-offset-background data-[placeholder]:text-muted-foreground
  focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed
  disabled:opacity-50 [&>span]:line-clamp-1` + chevron `h-4 w-4 opacity-50`
  (v3 `shadow-sm` ports to v4 `shadow-xs`; v3 `focus:outline-none` ports to v4
  `focus:outline-hidden`).
- **SelectContent**: `relative z-50 max-h-96 min-w-[8rem] overflow-hidden
  rounded-md border bg-popover text-popover-foreground shadow-md` + the
  standard animate/slide set + popper translate classes; viewport `p-1` +
  popper `h-[var(--radix-select-trigger-height)] w-full
  min-w-[var(--radix-select-trigger-width)]`.
- **SelectItem**: `relative flex w-full cursor-default select-none
  items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none
  focus:bg-accent focus:text-accent-foreground
  data-[disabled]:pointer-events-none data-[disabled]:opacity-50` + indicator
  span `absolute right-2 flex h-3.5 w-3.5 items-center justify-center` +
  Check `h-4 w-4`.
- **SelectLabel** `px-2 py-1.5 text-sm font-semibold`; **SelectSeparator**
  `-mx-1 my-1 h-px bg-muted`; scroll buttons `flex cursor-default
  items-center justify-center py-1` with `h-4 w-4` chevrons.

The functional difference is the trigger's height/width plumbing: with plain
`h-9`/`w-full` utilities, a consumer's `h-full` / `w-48` / `h-auto` merges
them away in `cn()` (tailwind-merge) exactly like the reference. The NEW
anatomy's `data-[size=default]:h-9` and `w-fit` ignore those overrides, which
is why every board-table row is ~5px taller than the reference (the priority
cell trigger is pinned at 36px instead of filling the 31px cell).

Consumer audit (all 8 SelectTrigger call sites): `priority-cell.tsx` passes
`h-full w-full border-none bg-transparent p-1 text-sm shadow-none focus:ring-0`
(THE fix target — rows shrink to reference height); `status-cell.tsx` open
state passes `h-auto w-full border-none p-0 focus:ring-0` (equivalent after
port); dialog triggers pass `w-full` (unchanged rendering); analytics filters
pass `w-48`/`w-40` (tailwind-merge keeps them, same rendering); the kanban
grouping trigger passes explicit `h-9 w-32 …` (same rendering). No consumer
uses the `size` prop — the prop and its data-size plumbing are dropped.

Action: rewrite `src/components/ui/select.tsx` to the decompiled OLD-shadcn
anatomy (with the v3→v4 shadow/outline renames), export the trigger class
constant, and lock it with contract tests in
`src/components/ui/primitives.test.ts` (session-13 pattern).

## Finding 3 — header avatars are hardcoded mock chrome

Decompiled (exact): the desktop header trigger renders
`w-8 h-8 bg-gradient-to-r from-[#0073EA] to-[#00C875] rounded-full flex
items-center justify-center` with `<span className="text-white font-bold
text-xs">U</span>` — the letter is the LITERAL string "U", not a derived
initial (live-verified: reference shows "U" while greeting says
"sepnetflix2023"). The mobile panel renders the same anatomy at `w-10 h-10`
with `text-sm`, plus literal placeholder texts `User Name` and
`user@example.com` (decompiled strings; live-verified in the open mobile
menu). The clone renders `initialsOf(user.name)` ("S"), `{user.name}`, and
`{user.email}`.

Action: hardcode "U" in both avatar spans and the two placeholder strings in
the mobile panel (app-header.tsx), with a comment citing the decompiled
source. This mirrors the reference's mock/dead UI exactly (same class as the
avatar-quirk deviations already in §10).

## Finding 4 — the board-header team row is a hardcoded mock (with tooltips + one row-level popover)

Decompiled (board header `zq`): the team is a local
`useState([{id:1,name:"John Doe",avatar:"JD",online:true,role:"Owner"},
{id:2,name:"Jane Smith",avatar:"JS",online:true,role:"Editor"},
{id:3,name:"Mike Johnson",avatar:"MJ",online:false,role:"Viewer"},
{id:4,name:"Sarah Wilson",avatar:"SW",online:true,role:"Editor"}])` — never
fetched, identical on every board. Rendered anatomy:

- Row container `flex items-center -space-x-2 cursor-pointer` is ONE popover
  trigger for the members popover.
- First 3 avatars: `w-8 h-8 rounded-full border-2 border-white … text-xs
  font-medium relative` + POSITION colors (index 0 `bg-blue-500`, 1
  `bg-green-500`, else `bg-purple-500`), content = the precomputed `avatar`
  initials, and per-avatar TOOLTIPS rendering `{name} ({role})`.
- Presence dots `w-2.5 h-2.5 bg-green-400 rounded-full border border-white`
  PULSE (framer scale keyframes) on the row; popover dots are `w-2`.
- Overflow chip `w-8 h-8 rounded-full bg-gray-400 border-2 border-white …
  text-xs` with `+{n-3}`.
- Popover (`w-80`): header `Team (4)` + Invite (`size="sm" variant="outline"`
  + UserPlus `w-3 h-3 mr-1`); member rows `p-2 rounded-lg hover:bg-gray-50`
  with avatar colors keyed `id%3` (0 blue / 1 green / else purple), name
  `text-sm font-medium`, role `text-xs text-gray-500`, Mail/MessageSquare
  ghost `h-6 w-6` buttons with `w-3 h-3` icons.

The clone derives `board.members` from the users table (initials differ:
S/JD/JS vs the reference's JD/JS/MJ; count changes with the user table — the
VLM saw "+4" vs "+1"), opens a popover per avatar (no tooltips), and renders
static presence dots.

Action: replace the derived members with the decompiled mock (a local const,
initials rendered from the mock's `avatar` field), switch to ONE row-level
Popover + per-avatar Tooltips, and add a subtle CSS pulse to the row presence
dots (respecting `prefers-reduced-motion`). The `TeamMembersPopover` body
keeps its current anatomy (it already matches the decompiled popover spec)
but consumes the mock. The users API and `board.members` stay untouched —
only the board header's chrome changes.

## Finding 5 — date-cell overdue boundary: today must never render red

Decompiled date cell (`pZ`): the overdue test is
`new Date(e) < new Date && new Date(e).toDateString() !== new Date().toDateString()`
— a date is red only if it is before now AND not today. The clone's
`date-cell.tsx` line 33 is `date !== null && date < new Date()` — with
noon-stored dates, every task due TODAY turns red after 12:00 local. Verified
live: the clone rendered "Sep 18" (today, due 12:00) as a red chip while the
reference rendered it plain; "Sep 14" rendered red on BOTH.

The Board Analytics modal's overdue count (Ote:
`new Date(due) < new Date && status !== "Done"`) has NO today-guard on either
side — verified identical — so only the date cell changes.

Action (TDD): add a pure `isOverdueDate(date: Date, now: Date): boolean` seam
to `src/lib/domain.ts` implementing the decompiled rule (red tests first:
yesterday-red, today-noon-NOT-red, today-23:59-NOT-red, future-plain, null
handled at the call site), then wire it into `date-cell.tsx`.

## Finding 6 — boards grid card placeholder text

Decompiled boards grid card: `e.description || "No description provided."`
(classes `text-gray-600 text-sm mb-5 line-clamp-2 flex-grow` — the clone's
classes already match). The clone renders "No description" at
`boards-view.tsx:291`. The list-row placeholder (decompiled
`e.description || "No description"` with `text-gray-500 text-xs mt-0.5
truncate`) already matches the clone's line 366 — only the grid card changes.

## Verified matching / no action (with evidence)

- **Row checkbox on done rows** — the reference's checkbox is decompiled
  `useState(false)` + `opacity-0 group-hover:opacity-100
  data-[state=checked]:opacity-100` (transient dead UI, never
  status-coupled); the clone's coupling is the documented deliberate
  deviation (PAD §10 / v1.2 revision block). No change.
- **Calendar view-trigger "black border"** (VLM claim) — computed border is
  `0px` on both apps at rest; the VLM reversed its own verdict when shown
  zoomed crops. Hallucination, no action.
- **Boards nav highlight** (VLM claim) — the reference DOES highlight
  "My Boards" at `/Boards` (live DOM: `bg-[#E1E5F3] text-[#0073EA]`), same
  rule as the clone. The first-run flag was a capture-path artifact
  (lowercase `/analytics` on the clone vs capitalized on the reference);
  re-captured canonically, both highlight.
- **Boards-page folder tiles** — both derive the 12.5% tint + colored icon
  from the board color (reference computed `rgba(0,115,234,0.125)`); the
  flagged color spread was data-only (clone's 4 seed boards carry 4 colors).
- **Priority/status pill anatomy, kanban, login, integrations modal** —
  MATCH verdicts this sweep; the status pill (OLD-badge `px-3 py-1
  font-medium` + inline bg) and priority badge (`${color}20` bg, colored
  text, `font-normal`) verified identical to the decompiled `fZ`/`xZ`.
- **Board Analytics overdue counts, modal grid** — matched with aligned data.
- **Timeline bars / dateless section / Unassigned listing / priority
  counting** — pre-documented deliberate deviations (PAD §10), unchanged.

## Execution plan (TDD)

1. **RED** — `src/lib/domain.test.ts`: failing tests for `isOverdueDate`
   (the decompiled boundary); `src/components/ui/primitives.test.ts`:
   failing contract tests for the OLD-shadcn Select anatomy
   (`SELECT_TRIGGER_CLASS` markers: plain `h-9`, `w-full`, `px-3 py-2`,
   `shadow-xs` port, `[&>span]:line-clamp-1`; item/label/separator markers).
2. **GREEN** — implement `isOverdueDate` in `domain.ts`; rewrite
   `ui/select.tsx` to the decompiled OLD anatomy (v3→v4 renames:
   `shadow-sm`→`shadow-xs`, `focus:outline-none`→`focus:outline-hidden`;
   drop data-size/data-slot plumbing; export `SELECT_TRIGGER_CLASS`).
3. **Chrome fixes** — `app-header.tsx`: literal "U" avatars (desktop +
   mobile) + `User Name`/`user@example.com` mobile placeholders; drop
   `antialiased`. `board-view.tsx`: hardcoded mock team + row-level Popover +
   per-avatar Tooltips + pulsing dots (CSS keyframes, reduced-motion safe).
   `boards-view.tsx:291`: "No description provided.".
4. **Font fix** — `layout.tsx`: remove the Inter import/variable;
   `globals.css`: remove `--font-sans: var(--font-inter)`.
5. **Browser verification** — computed-style probes on both live apps:
   priority trigger height (31px-equivalent = follows cell), row heights,
   calendar chip truncation boundary, font-family resolution
   (`ui-sans-serif…` + empty `document.fonts`), avatar letters, team row
   (JD/JS/MJ + "+1"), today's date NOT red. Re-capture all 12 pairs and
   re-run the VLM sweep — expect ≥ 10 MATCH with remaining DIFFs fully
   triaged to data-only/documented deviations.
6. **Functional regression checks** — status select swap persists, priority
   select persists, edit-task modal selects, analytics filters, kanban
   grouping select, dialog selects (all Select consumers), checkbox
   completion round-trip, kanban drag persist.
7. **Cleanup** — delete the S14 Probe Board on the reference (entities API;
   verify pristine 1 board / 1 item) and on the clone (DB re-seed to the
   canonical 4-board state).
8. **Gates** — lint 0, tsc 0, tests green (131 + new), standalone production
   build.
9. **Docs** — session_15.md, this plan, worklog append; PAD v1.11 (§5
   typography now the system stack, §5.3 Select anatomy contract, §10 new
   mock-chrome deviations); README (drop "Typography is Inter", test counts,
   team/avatar notes); CLAUDE.md inventory; AGENTS.md invariants (font rule,
   Select rule, mock team/avatar rule).
10. **Delivery** — atomic commits on main, SSH-wrapper push (dry-run, real,
    remote verify, key shred).

## Non-goals

- No Button base rewrite (no verified at-rest gap — session-13 finding
  stands).
- No behavioral changes: the checkbox↔status coupling, working Sign out,
  honest toasts, and functional favorites stay (documented deviations).
- No replication of the reference's other dead UI beyond the hardcoded
  avatar/team chrome specified above.
- No new features, no schema changes, no seed changes.

## Execution log (TDD) — closed 2026-09-19

**RED → GREEN.** 12 failing tests written first (8 `isOverdueDate`
boundary cases in `domain.test.ts` + 4 Select anatomy contracts in
`primitives.test.ts`), confirmed red, then implemented:
`isOverdueDate` seam + `date-cell.tsx` rewiring; `ui/select.tsx`
rewritten to the decompiled OLD-shadcn anatomy (plain `h-9 w-full`
utilities, `SELECT_TRIGGER_CLASS`/`SELECT_ITEM_CLASS` exported);
Inter import + `--font-sans` override + `antialiased` deleted; literal
"U" avatars + `User Name`/`user@example.com` mobile placeholders;
`TEAM_MEMBERS` mock with row-level Popover + per-avatar Tooltips +
`.team-presence-dot` CSS pulse keyframes (reduced-motion safe);
"No description provided." grid placeholder. Suite: **131 → 143, all
green**; lint 0; tsc 0; standalone production build OK.

**Live verification (computed styles + DOM, both apps).** Priority
trigger now follows its cell height; row heights match (65/65/48px
pattern — the title-cell 16px/24px inheritance + content-sized div +
hover-only rounding fixed en passant after live measurement flagged
them); calendar chip text metrics identical (system stack on both);
avatar letters "U"; team row JD/JS/MJ + "+1" with working tooltips and
row-level popover; the overdue sweep re-verified after local midnight
(Sep 14 + Sep 18 red on BOTH apps; the today-noon case unit-tested).
All Select consumers regression-tested in the browser (priority swap
persists, status swap, Edit Task modal, analytics filters, kanban
grouping, dialog selects).

**Final VLM convergence sweep** (fresh date-matched 24 captures, both
apps, canonical route casings): 5 direct MATCH verdicts (login,
boards, board-kanban, board-calendar, modal-integrations) + 7 DIFF
verdicts, every one fully triaged with DOM probes / computed styles /
decompilation:

- *dashboard* — data-only (different board inventories) + dev-widget.
- *board-table, modal-analytics, modal-automations* — the documented
  checkbox↔status deviation (reference checkbox is dead
  `useState(false)` UI, hidden until hover) + data-only timestamps.
- *board-timeline* — trigger-border claim DISPROVEN (computed 0px both
  sides); "blue indicators on day headers" = the documented timeline
  bars (clone renders due-date bars — reference never does); dateless
  section = documented deviation.
- *board-unassigned* — documented deviation (reference's view is dead
  empty even with unassigned tasks).
- *analytics* — data-only (different inventories; status-order is the
  shared first-encounter algorithm over different updatedAt sets;
  board-performance tile colors derive from each board's color) + the
  documented priority-distribution deviation (reference counts its
  server-default top-level `priority` field).

One capture artifact found and eliminated: the first sweep compared
lowercase `/boards`/`/analytics` on the clone vs canonical `/Boards`/
`/Analytics` on the reference — the exact-match `isNavActive` correctly
does not highlight at lowercase spellings. Re-captured canonically:
boards re-verified MATCH.

**Cleanup.** Reference restored to pristine (S14 Probe Board deleted,
10 orphaned items deleted via the entities API, verified 1 board / 1
item); the clone's probe board deleted (back to the canonical 4-board
seed). No schema, seed, or API changes.

**Docs.** PAD v1.11 (revision block, §5.1 system-stack typography, §5.3
Select anatomy contract, §11 key files); README (typography, test
table, shell/due-date rows); CLAUDE.md (inventory, counts); AGENTS.md
(Select/font/mock-chrome/title-cell/overdue invariants);
docs/session_15.md; this closure section; docs/worklog.md append.
