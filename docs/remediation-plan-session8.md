# Session 8 Remediation Plan — View-Level Geometry & Structure Parity

Probed live on 2026-09-17 against `https://tuesdaycom-a6700714.base44.app/`
(logged in as sepnetflix2023@outlook.com, viewport 1440×900, plus a 375×812
mobile pass). Every gap below was verified with computed-style DOM probes and,
where pixel questions arose (calendar grid lines), with direct pixel reads of
both screenshots. VLM claims were only accepted after probe confirmation; the
recurring "black circular N button bottom-left" flag was identified as the
Next.js dev-toolbar (`nextjs-portal`, dev-mode only — absent from production
builds) and dismissed. The reference's data has changed since session 7 (its
board now holds a single task, "Design landing page", no owner, no date), so
multi-task states were validated against the clone's own seeded data plus the
session-7 probes.

## Corrections to session-7 understanding

- **The reference calendar's day grid sits INSIDE the `p-4` header container**
  (a third child after the month row and weekday row) and carries
  `grid-rows-5 gap-px`. The clone's grid is a SIBLING of `p-4` — it spans the
  full card width (1390px vs the reference's 1358px) and starts one p-4
  bottom-padding (16px) lower. The `gap-px` plus each cell's own full border
  produces the reference's signature "double hairline" (border, 1px white
  slit, border) between cells; the clone renders a solid 2px line.
- **The reference timeline zoom is a NATIVE `<select>`**
  (`h-8 border border-gray-300 rounded-md px-2 text-sm`, Day/Week/Month) in a
  `gap-1` toolbar — not a shadcn Select. Month-mode cells are a FIXED
  ~171.43px (= 1200/7, viewport-independent, inline style) with weekday + 
  number stacked; the last header cell keeps its `border-r`. Day mode on the
  reference is broken (7 cells at 5.71px = 40/7) — the clone's usable single
  column stays (documented deviation).
- **The reference login card** carries its padding on an INNER div
  (`p-8 sm:p-10 md:pt-12 md:pb-10 md:px-10`), stacks ALL content in one
  `space-y-6 sm:space-y-8` column (Google button and footer included),
  wraps the Google icon in a `-ml-4` div, uses slate literals on the OR
  divider (`h-[1px] bg-slate-200` line, `bg-white px-3 text-slate-500
  font-medium tracking-wider` chip), and renders "Need an account? Sign up"
  as ONE button (slate-500 with a font-medium slate-700 span) inside the
  form's actions section.
- **The reference dashboard greeting card** has NO deco circles; the icon row
  is `flex items-center gap-3 mb-3` (tile beside title, vertically centered)
  with the buttons in a SEPARATE card-level row (`flex flex-wrap gap-3
  mt-6`), wrapped in real `<a href="/Boards">` / `<a href="/Analytics">`
  anchors. Buttons: primary `px-5 rounded-xl font-medium shadow-lg
  hover:shadow-xl` + Folder `mr-2` + ArrowRight; secondary `border-2
  border-[#E1E5F3] hover:border-[#0073EA] hover:bg-[#0073EA]/5 px-5
  rounded-xl font-medium`.
- **The reference kanban column** has NO inner wrapper: the droppable is the
  `w-80` column div itself, its two direct children being the `px-4 py-3
  mb-2` header zone and the `px-2 pb-2 min-h-[200px] max-h-[calc(100vh-
  300px)] overflow-y-auto custom-scrollbar group` scroll zone. Their
  `custom-scrollbar` (8px, transparent 10px-radius track, slate-300→400
  gradient thumb with 10px radius + 1px slate-200 border, hover slate-400→500)
  differs from the clone's solid-thumb `tuesday-scroll` (kanban-only usage —
  the table scroller on BOTH apps is plain `overflow-x-auto`).
- **The reference unassigned view renders an empty content area** even though
  an unassigned task exists (its owner filter never matches `null`) — a
  reference-side defect. The clone's functional list stays (documented
  deviation, same class as the working row-delete). Likewise the clone's
  "tasks without a due date" section under the timeline has no reference
  counterpart (the reference silently drops dateless tasks) — keep + document.

## Verified gaps (5)

### 1. Calendar grid geometry (board-calendar.tsx)
- Move the day grid INSIDE the `p-4` container, after the weekday row, so it
  inherits the 16px side padding and starts at the reference's Y position.
- Add `grid-rows-5 gap-px` to the grid container (the gap shows the card's
  white through the transparent grid background = the double hairline).
- Drop `overflow-hidden` from the calendar card (reference card is
  `rounded-xl border bg-card text-card-foreground shadow-lg border-[#E1E5F3]`);
  with the grid inside `p-4` nothing needs clipping.

### 2. Login card structure (login-view.tsx)
- Card: `text-card-foreground relative overflow-hidden border-0 shadow-2xl
  bg-white/95 backdrop-blur-sm rounded-2xl` with an inner
  `p-8 sm:p-10 md:pt-12 md:pb-10 md:px-10` div.
- One column `flex flex-col items-center text-center space-y-6 sm:space-y-8`
  holding: logo group → title block (`space-y-2 sm:space-y-3`: h1 + p) →
  Google button (inside `w-full > space-y-3`) → OR divider → form → (footer
  moves inside the form's actions section).
- Logo tile: outer span `flex shrink-0 overflow-hidden rounded-full relative
  h-20 w-20 sm:h-24 sm:w-24 shadow-lg ring-4 ring-white/50 group-hover:
  shadow-xl transition-all duration-300`; inner span `flex h-full w-full
  items-center justify-center rounded-full bg-muted bg-gradient-to-br
  from-slate-100 to-slate-200 text-xl sm:text-2xl font-bold text-slate-700`.
- Google button: `w-full flex items-center justify-center gap-3 bg-white
  text-slate-700 px-5 py-3.5 rounded-xl border border-slate-200 hover:
  bg-slate-50 hover:border-slate-300 hover:shadow-sm transition-all
  duration-200 font-medium text-[16px] group` with the svg inside a
  `-ml-4` wrapper div.
- OR divider: line `shrink-0 h-[1px] w-full bg-slate-200`; chip `bg-white
  px-3 text-slate-500 font-medium tracking-wider`.
- Form `space-y-4 sm:space-y-5` with two sections: fields wrapper
  `space-y-3 sm:space-y-4` (email + password, each `space-y-1.5`) and an
  actions wrapper `space-y-3` (submit + footer links). Inputs keep the
  current slate literals but move to `pl-10` (icon at `left-3` + w-4).
  Labels keep shadcn Label + `text-slate-700` for the reference's label color.
- Submit: `px-3 py-2 w-full h-11 sm:h-12 bg-slate-900 hover:bg-slate-800
  text-white font-medium shadow-sm rounded-xl transition-all duration-200`.
- Footer links: "Forgot password?" `text-sm text-slate-500 hover:text-
  slate-700 font-medium transition-colors`; "Need an account? Sign up" ONE
  button `text-sm text-slate-500 hover:text-slate-700 transition-colors`
  wrapping the text + `<span class="font-medium text-slate-700">Sign up</span>`
  (and the mirrored signup-mode variant). Wrapper `flex flex-col sm:flex-row
  items-center justify-between gap-2 sm:gap-0`.

### 3. Dashboard greeting card (dashboard-view.tsx)
- Remove the two deco circles; content: `relative z-10` > icon row
  `flex items-center gap-3 mb-3` [`w-10 h-10 … shadow-lg` tile + div(h1 + p)]
  > buttons row `flex flex-wrap gap-3 mt-6`.
- Buttons become real anchors (`<a href="/Boards">`, `<a href="/Analytics">`)
  wrapping shadcn Buttons: primary `py-2 bg-[#0073EA] hover:bg-[#0056B3]
  text-white rounded-xl h-10 px-5 font-medium shadow-lg hover:shadow-xl
  transition-all duration-200` (Folder `mr-2`, text, ArrowRight); secondary
  `py-2 border-2 border-[#E1E5F3] hover:border-[#0073EA] hover:bg-[#0073EA]/5
  rounded-xl h-10 px-5 font-medium transition-all duration-200 shadow-sm`
  (ChartColumn).

### 4. Timeline (board-timeline.tsx)
- Toolbar right cluster: `flex items-center gap-1`; zoom becomes a native
  `<select className="h-8 border border-gray-300 rounded-md px-2 text-sm">`
  with Day/Week/Month `<option>`s (state logic unchanged).
- Month-mode column width: fixed `w-[171.43px] shrink-0` (reference =
  1200/7, viewport-independent); week stays `w-10 shrink-0`; day keeps
  `min-w-[320px]`.
- Day cells ALWAYS render weekday over number (the month-mode
  number-twice rendering is a bug); number inherits foreground (drop
  `text-gray-900` and the dead `/50` dimming); drop `last:border-r-0` so
  every header cell keeps its right border like the reference.
- Empty state: ALWAYS render the day header row, then
  `<div class="relative"><div class="p-8 text-center text-gray-500">No items
  with valid start and end dates to display in the timeline.</div></div>`
  (replacing the message-only `px-4 py-12` variant).

### 5. Kanban column + scrollbar (board-kanban.tsx, globals.css)
- Move `ref={setNodeRef}` onto the outer `w-80` column div; delete the
  `flex flex-col` wrapper (reference column children: header zone + scroll
  zone directly).
- Header title: plain `font-bold text-lg text-gray-800` h3 (drop `truncate`
  and the `min-w-0` wrapper).
- Update `.tuesday-scroll` (kanban-only usage) to the reference's
  `custom-scrollbar` spec: 8px bar, transparent track with 10px radius,
  thumb `linear-gradient(135deg, #cbd5e1, #94a3b8)` 10px radius + 1px
  `#e2e8f0` border, hover `linear-gradient(135deg, #94a3b8, #64748b)`.
  Keep the clone's drag-over tint classes on the zone.

## Deliberate deviations (documented, not fixed)

- Working unassigned-task list vs the reference's empty (broken) view.
- Timeline "tasks without a due date" section (reference silently drops them).
- Usable single-column day mode vs the reference's 5.71px-cell day mode.
- Working row delete / Sign out / real user initials (carried over).
- SPA-nav title updates, `/Board` without id → "Board not found" card.

## TDD note

All five gaps are presentational (JSX structure, class strings, CSS) with no
new domain logic — the reference's month cell width is a constant, the zoom
state machinery already exists, and the login/greeting/calendar changes move
existing markup. The 87-test domain suite is the regression gate (must stay
green); no new seams are warranted. Fixes are verified by DOM probes against
the captured reference specs above.

## Verification plan

1. `bun run lint`, `bun run typecheck`, `bun run test` after each fix.
2. DOM probes on the clone asserting the new class strings (grid inside p-4
   with `gap-px`; login column/`-ml-4`/divider/form sections; greeting
   anchors + button classes; native select + 171.43px month cells + header
   row on empty timeline; kanban column children + scrollbar CSS).
3. Pixel check of the calendar double-hairline (border → white → border)
   between cells after the fix.
4. Side-by-side VLM re-comparison of login, dashboard, calendar, timeline,
   and kanban captures; functional pass: login sign-in round-trip, timeline
   zoom switching, kanban drag, calendar month nav.
