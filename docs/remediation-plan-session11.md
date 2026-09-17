# Session 11 Remediation Plan — Board Modals, Card Anatomy, Analytics Ordering, Surface Polish

Probed live on 2026-09-18 against `https://tuesdaycom-a6700714.base44.app/`
(logged in as sepnetflix2023@outlook.com, viewport 1440×900). The reference's
compiled bundle is UNCHANGED since session 9
(`/assets/index-BuEJAhK4.js`, byte-identical redeploy check), so every
session-9 decompiled spec remains valid and this cycle hunted for gaps the
previous passes missed. The reference's data is still sparse (1 board, 1
task), so this cycle re-ran the controlled experiment: a throwaway board
("S10 Probe Board") was created via the base44 entities API and seeded with
10 tasks (all 4 statuses, all 4 priorities, 3 string owners + unassigned,
dates Sep 14 – Oct 10), then every drift finding was verified against the
live DOM, pixel measurements, and the decompiled bundle. The experiment
artifacts are deleted at delivery time.

## Corrections to session-9 understanding

- **The board header's Analytics button does NOT navigate to /Analytics.**
  It opens a **Board Analytics modal** (`Ote` in the bundle) rendered in-place
  over the board: `fixed inset-0 bg-black/50 z-[100] flex items-center
  justify-center p-4` overlay (click closes) wrapping a `bg-white
  rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto`
  panel. Header: `p-6 border-b border-gray-200 flex justify-between
  items-center` with `h2.text-2xl font-bold text-gray-900` "Board Analytics"
  + `p.text-gray-600` "Insights and statistics for {title}" + the × pill
  (`text-gray-400 hover:text-gray-600 text-xl font-bold w-8 h-8 flex items-
  center justify-center hover:bg-gray-100 rounded-full`). Body: `p-6 grid
  grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`.
- **The Integrate button opens an "Integrations Center" modal** (max-w-4xl,
  sticky header): a blue banner (`p-4 bg-blue-50 border border-blue-200
  rounded-lg` + Zap `text-blue-600` + "Supercharge Your Workflow"
  `font-semibold text-blue-800` / desc `text-sm text-blue-700`), then a
  `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4` of 8 integration
  cards (Slack/Google Drive/GitHub/Figma/Zoom/Jira/Shopify/HubSpot) with
  brand-colored `w-10 h-10 rounded-lg` icon tiles, name
  `tracking-tight text-base font-bold text-[#323338]`, outline Badge
  category, a shadcn Switch (`h-5 w-9`,
  `data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-gray-200`,
  thumb `h-4 w-4 translate-x-4`), description `text-sm text-[#676879] mb-3`,
  and a Configure button (`h-8 rounded-md px-3 text-xs text-[#0073EA]
  hover:bg-[#0073EA]/10` + Settings `w-3 h-3 mr-1`). Toggles are
  LOCAL-STATE-ONLY — verified: flipping one, reloading, reopening shows
  unchecked again (the reference does not persist).
- **The Automate button opens an "Automations Center" modal** (max-w-4xl,
  sticky header): a purple banner (bg-purple-50 border-purple-200, Zap
  text-purple-600, "Work Smarter, Not Harder" text-purple-800), a "Create
  Custom Automation" button (`h-9 px-4 py-2 bg-[#0073EA]
  hover:bg-[#0056B3] text-white shadow` + Plus `w-4 h-4 mr-2`), `h3
  text-lg font-semibold text-gray-700 mb-4` "Popular Automation Recipes",
  and 5 recipe cards with the same anatomy as integration cards
  (switch + description + Customize button): Notify on Status Change
  (Notifications, bg-blue-500, bell), Due Date Reminder (Reminders,
  bg-yellow-500, clock), Assign New Item (Assignments, bg-green-500,
  users), Priority Escalation (Workflow, bg-red-500, triangle-alert),
  Subitem Completion Update (Workflow, bg-purple-500, circle-check-big).
  "Create Custom Automation" and "Customize" clicks produce NO visible
  response on the reference (verified — inert mock buttons).
- **The site analytics distribution ordering is first-encounter over items
  sorted by updated_date DESC.** Decompiled: `j={}; m.forEach(k => { j[A] =
  (j[A]||0)+1 })` rendered via `Object.entries(j)` — probed live: items
  sorted -updated_date yield first-encounter order Working on it, Done, Not
  Started, Stuck, which is exactly the rendered order. **Zero-count rows
  are omitted entirely** (board-filtered view shows only "Not Started 1").
  The clone renders all four vocabulary rows in fixed order — a misread.
- **Board performance rows are NOT rate-sorted.** Decompiled: `E=v.map(...)`
  with no sort — the row order follows the boards array (which the
  reference loads updated-desc, same as its boards page). The clone sorts
  by completion rate desc.
- **The dashboard "Recent Activity" feed shows top 5** (`n.slice(0,5)` in
  the bundle), not 6; the clone's `/api/dashboard` takes 6.
- **The reference uses the OLD shadcn Card anatomy everywhere**: Card
  `rounded-xl border bg-card text-card-foreground shadow`; CardHeader
  `flex flex-col space-y-1.5 p-6`; CardContent `p-6 pt-0`; CardFooter
  `flex items-center p-6 pt-0`; CardTitle `font-semibold leading-none
  tracking-tight`. The clone's vendored card is the NEW style
  (`flex flex-col gap-6 rounded-xl border py-6 shadow-sm`, header `grid
  …px-6`, content `px-6`) — measured live, this puts a 24px gap between
  header and content where the reference has 0px (dashboard side cards,
  analytics cards). Systemic root cause.
- **The timeline task rows have a different anatomy than implemented.**
  Reference row: `flex border-b` with inline `height: 32px`; label
  `w-[200px] flex-shrink-0 p-2 border-r text-xs truncate` (static — not
  sticky, no status dot, no completed dimming, `title` attr, uniform
  near-black); body is ONE `flex-grow relative h-full` div — there are NO
  per-day cells and NO row-body column borders (the day columns exist only
  in the header row). The clone renders sticky labels with status dots and
  per-day bordered cells per row.
- **Login form geometry has two drifts**: (1) the OR divider zone —
  reference nests Google button + OR (`relative my-6`) + form inside ONE
  `w-full` wrapper as a single column child, so the OR→Email gap is 28px;
  the clone makes the OR a separate column sibling, stacking space-y-6 on
  top of my-6 for a 56px gap. (2) The Google button — reference is a PLAIN
  button (`w-full flex items-center justify-center gap-3 bg-white
  text-slate-700 px-5 py-3.5 rounded-xl border border-slate-200 …
  font-medium text-[16px]`, 54px tall); the clone's shadcn outline Button
  keeps its default `h-9` (36px), which overrides the py-3.5.
- **The dashboard Recent Boards card details**: the "View All" control is
  an `<a href="/Boards">` wrapping a shadcn Button (`h-9 px-4 py-2
  text-[#0073EA] hover:bg-[#0073EA]/10 rounded-xl font-medium` + ArrowRight
  `w-4 h-4 ml-2`); visibility badges are shadcn Badges (`px-3 py-1
  rounded-full shadow-sm border-0 hover:bg-secondary/80`) with GRADIENT
  fills — private `bg-gradient-to-r from-orange-100 to-red-100
  text-orange-700` (Lock `w-3 h-3 mr-1`), public `from-green-100
  to-emerald-100 text-green-700`; board rows are real `<a href="/Board?id=">`
  anchors with `border border-transparent hover:border-blue-100` and a
  chevron that turns blue on hover (`text-gray-400 group-hover:text-
  [#0073EA]`). The Recent Activity rows sit in a `space-y-3` wrapper (12px
  gaps; the clone's list has none).
- **Reference quirks verified and NOT copied** (documented deviations):
  SPA-nav to /login sometimes renders the 404 catch-all (router quirk;
  full load shows the form — our consistent form stays); the boards-page
  Analytics button is a dead external link (`<a href="https://analytics/">`
  → "site can't be reached" — ours navigates to the real /Analytics); the
  modals don't close on Escape (ours will — Radix Dialog, strictly better
  a11y with no visual change).

## Verified gaps (12)

### 1. Board Analytics modal (new component `board-analytics-dialog.tsx`)

- Opened from the board header's Analytics button (replaces the current
  `navigate("analytics")`). Data: the board's already-loaded tasks
  (client-side) — no API change.
- Structure (decompiled `Ote`): overlay-click + × close (inner
  stopPropagation); three gradient stat cards — Total Tasks (Target icon,
  `from-blue-500 to-blue-600 text-white`, value `text-3xl font-bold`,
  sub `text-blue-100 "Active items in board"`), Completion Rate (TrendingUp,
  `from-green-500 to-green-600`, `{v}%` + `<Progress value={v}
  className="mt-2 bg-green-300" />`), Overdue Tasks (Clock,
  `from-red-500 to-red-600`, sub `text-red-100 "Need immediate
  attention"`, overdue = dueDate < now && status !== done).
- Status Distribution card (`md:col-span-2`, ChartColumn icon, plain
  CardTitle): rows for ALL FOUR statuses in vocabulary order (the
  reference iterates the column's choices — zero counts included, each
  with its `w-3 h-3` palette dot, label `font-medium`, "N tasks"
  `text-sm text-gray-600`, outline Badge "N%").
- Team Workload card (Users icon, hidden when no owners): first-encounter
  owner counts, top 5; rows = `w-8 h-8 bg-blue-500 rounded-full` avatar
  with `charAt(0).toUpperCase()` initial + `font-medium` name + default
  Badge `{n} tasks`.
- Recent Activity card (Calendar icon, hidden when no tasks): top 5 by
  updatedAt desc; rows `flex flex-col gap-1 p-2 bg-gray-50 rounded` with
  `font-medium text-sm truncate` title + `text-xs text-gray-500`
  "Updated {MMM d, HH:mm}" (24-hour).
- Empty state (0 tasks): `md:col-span-3 text-center p-8` card with
  ChartColumn `w-16 h-16 mx-auto mb-4 opacity-50`, h3 "No Data Available",
  p "Add some tasks to your board to see analytics".
- The reference's Priority Distribution section is DEAD CODE (it reads a
  `type:"priority"` column; every current board's priority column is
  dropdown-type) — not implemented, documented.

### 2. Integrations Center modal (new `integrations-dialog.tsx`)

- Opened from the board header's Integrate button (replaces the
  "not configured" toast). Spec as decompiled above; integrations data:
  Slack (#4A154B, message-square, Communication), Google Drive (#4285F4,
  briefcase, File Management), GitHub (#181717, code, Development), Figma
  (#F24E1E, layers, Design), Zoom (#2D8CFF, message-square,
  Communication), Jira (#0052CC, briefcase, Development), Shopify
  (#7AB55C, shopping-cart, E-commerce), HubSpot (#FF7A59, users, CRM).
- Switch state is component-local (resets on close — reference-verified).
  Configure buttons mirror the reference's inert behavior (documented).

### 3. Automations Center modal (new `automations-dialog.tsx`)

- Opened from the board header's Automate button (replaces the
  "not configured" toast). The 5 recipes with their tiles/badges/descriptions
  as decompiled above; switches local-state; Create Custom Automation and
  Customize mirror the reference's inert behavior (documented).

### 4. Card anatomy — old shadcn style (`ui/card.tsx`)

- Card: `rounded-xl border bg-card text-card-foreground shadow`; CardHeader:
  `flex flex-col space-y-1.5 p-6`; CardTitle: `font-semibold leading-none
  tracking-tight`; CardDescription: `text-sm text-muted-foreground`;
  CardContent: `p-6 pt-0`; CardFooter: `flex items-center p-6 pt-0`.
  Consumers already pass conflicting overrides that tailwind-merge resolves
  (dashboard headers keep flex-row; empty states keep py-10). This fixes
  the 24px header→content gap on every Card at the root cause.

### 5. Analytics distribution ordering + zero-omission (`api/analytics/route.ts`, `domain.ts`)

- Tasks loaded `orderBy: { updatedAt: "desc" }`; status + priority counts
  built in first-encounter order over that sequence (new seam);
  zero-count entries omitted from both distributions.
- Board performance: drop the rate sort — keep board order (= the
  boards query's updatedAt desc), matching the reference.

### 6. Dashboard Recent Boards details (`dashboard-view.tsx`)

- "View All": `<Link href="/Boards">` wrapping a Button with the reference
  classes + ArrowRight `w-4 h-4 ml-2`.
- Visibility badges: shadcn Badge + gradient classes + Lock/Globe
  `w-3 h-3 mr-1`.
- Board rows: `<Link href="/Board?id=">` anchors + `border
  border-transparent hover:border-blue-100` + chevron
  `text-gray-400 group-hover:text-[#0073EA]`.

### 7. Recent Activity feed (`dashboard-view.tsx`, `api/dashboard/route.ts`)

- Rows in a `space-y-3` wrapper (12px gaps).
- `take: 6` → `take: 5`.

### 8. Timeline task rows (`board-timeline.tsx`)

- Row: `flex border-b` + `style={{ height: 32 }}`; label
  `w-[200px] flex-shrink-0 p-2 border-r text-xs truncate` with title attr,
  uniform near-black text, no status dot, no sticky; body = ONE
  `flex-grow relative h-full` div. The due-date bars (documented
  deliberate deviation) render absolutely inside that single container at
  `left: dayIndex * columnWidth` instead of per-day cells, so the row body
  shows no column borders — like the reference.

### 9. Login OR-divider spacing (`login-view.tsx`)

- Nest Google zone + OR (`relative my-6`) + form inside ONE `w-full`
  wrapper (a single column child), restoring the 28px OR→Email gap.

### 10. Login Google button height (`login-view.tsx`)

- Override the shadcn default sizing (`h-auto` so py-3.5 applies) → 54px,
  matching the reference's plain-button geometry.

### 11. Board-header button wiring (`board-view.tsx`)

- Analytics → open Board Analytics modal; Integrate → Integrations modal;
  Automate → Automations modal (mount all three; keep toasts nowhere).

### 12. Docs alignment (README, AGENTS.md, CLAUDE.md, PAD v1.9)

- The "Integrate/Automate render honest not-configured messages" rule is
  obsolete — they are full parity modals now (local-state mocks, like the
  reference). Unit count, seams, features rows, and the new modal specs
  land in all four docs; new session log + this plan.

## Deliberate deviations (documented, not fixed)

- Timeline due-date bars render (the reference never renders bars — its
  bar component requires `data.startDate`; deviation retained, now inside
  the reference's single-container row anatomy).
- Unassigned view lists tasks (reference renders empty — broken filter);
  timeline keeps dateless tasks reachable; day-mode zoom stays usable
  (reference renders 5.71px cells); row delete persists; SPA titles;
  /Board without id renders not-found.
- Owner commits resolve to member accounts; analytics counts real
  priorities (reference counts its server-default top-level field);
  dashboard Completed KPI stays consistent with analytics.
- The modals close on Escape (Radix Dialog) — the reference's don't;
  strictly better a11y, visually identical.
- Configure/Customize/Create-Custom-Automation buttons are inert,
  mirroring the reference's mock behavior (verified: no toast, no dialog).
- Boards-page Analytics navigates to our real /Analytics (the reference's
  is a dead external `https://analytics/` link).
- SPA-nav to /login keeps rendering the login form (the reference's
  inconsistent 404-on-SPA-nav quirk is not copied).

## TDD note

New pure seams land red-first in `src/lib/domain.test.ts`:

- `distributionEntries(tasks, keyFn)` — first-encounter-ordered counts over
  updatedAt-desc tasks, zero-count entries omitted (used by the analytics
  API for status + priority).
- `teamWorkload(tasks, limit)` — first-encounter owner counts, capped at 5.
- `recentActivityItems(tasks, limit)` — top N by updatedAt desc.
- `boardStats(tasks)` — total/done/completionRate/overdue for the modal.
- `formatBoardActivityTime(date)` — "MMM d, HH:mm" 24-hour label.

The 106-test suite plus these (~20 new cases) is the regression gate; the
rest is JSX/CSS verified by DOM probes against the decompiled specs above.

## Verification plan

1. `bun run lint && bun run typecheck && bun run test` after each
   workstream; `bun run build` before delivery.
2. DOM probes against the live reference (probe board kept until
   delivery): modal open/close (× + overlay click), stat values, status
   rows (vocabulary order, zero counts), team workload rows, recent
   activity rows + 24h times, switch toggles (local-only), card gap
   measurements (0px), login OR gap (28px) + Google button (54px),
   timeline row anatomy (32px, single body), analytics ordering +
   zero-omission + board performance order, dashboard View All/badges/
   row anchors, activity gaps (12px).
3. Side-by-side VLM re-comparison: board (with each modal open),
   dashboard, login, analytics, timeline.
4. Functional pass: modal ×/overlay/Escape close, switch flips, View All
   → /Boards, board row → board, analytics filter round-trips, sign-in
   round-trip.
5. Reference restoration: delete the probe board + its items via the
   entities API; verify Product Launch is back to its single task.
