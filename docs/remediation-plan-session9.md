# Session 9 Remediation Plan — Interactive Surfaces: Edit Modal, Owner Free-Text, Toolbar Cards, Kanban Avatars

Probed live on 2026-09-17 against `https://tuesdaycom-a6700714.base44.app/`
(logged in as sepnetflix2023@outlook.com, viewport 1440×900). The reference's
data is still sparse (1 board, 1 task), so this cycle's drift sweep ran a
**controlled experiment**: a throwaway board ("S9 Template Probe") was created
on the reference and seeded with 10 tasks via the base44 entities API
(all 4 statuses, all 4 priorities, 3 distinct string owners + unassigned,
dates spanning Sep 15 – Oct 10) to observe the multi-task states that
session 8 could not. Every gap below was additionally verified against the
reference's compiled JS bundle (`/assets/index-BuEJAhK4.js`, decompiled
component-by-component), which gives exact class strings for behaviors that
the sparse live data cannot show. Both experiment artifacts (test board +
"S9 probe task" on Product Launch) are deleted at delivery time.

## Corrections to session-8 understanding

- **The reference's OwnerCell is FREE TEXT.** The decompiled component (`hZ`)
  has no member list at all: clicking "Assign" swaps in a bare
  `<Input placeholder="Enter name..." className="border-none bg-transparent
  p-0 h-auto focus:ring-0 text-[#323338]" autoFocus>`; blur or Enter commits
  the typed string (`data.owner` is a plain string, verified via API
  round-trip: "John Doe"), Escape cancels. Assigned state renders a solid
  `w-6 h-6 bg-[#0073EA]` circle with the **first letter only**
  (`charAt(0).toUpperCase()`) plus the name in `text-sm text-[#323338]`.
  Our searchable member popover (built in session 7 from a sparse-data
  misread) is a functional deviation.
- **The reference's group header shows PER-STATUS dots with counts** (probed
  with 10 tasks: green "2", yellow "3", gray "4", red "1"), in
  **first-encounter order** — the counts object is built by iterating items,
  so the dot order follows the first task that has each status. Session 7
  read the single gray dot (sparse data: one Not Started task) as a "total
  count dot"; the clone's current header renders exactly that misreading.
- **The group footer's priority badges are capped at 3 with a "+N" overflow**
  (`Object.entries(w).slice(0,3)` badges in first-encounter order, then
  `<span class="text-xs text-gray-400">+{keys-3}</span>` when more priority
  types exist). Probed: "3 high 3 medium 2 critical +1".
- **The toolbar dropdowns are Cards, not compact popovers**: every one
  (Person / Filter / Sort / Hide / Group by) is a `w-64 shadow-lg
  border-[#E1E5F3]` card with a `text-lg font-bold text-[#323338]` title and
  an X close button (`text-[#676879] hover:text-[#323338]`, X icon w-4 h-4),
  header `flex flex-row items-center justify-between pb-3`, content rows.
- **The Sort menu lists ALL columns** — Task Name, Created Date, Updated
  Date, then every board column (Priority, Status, Owner, Due Date) — and
  toggles asc⇄desc with NO "off" state and no clear button
  (`r(u, e===u && t==="asc" ? "desc" : "asc")`). The Sort button itself
  always reads just "Sort" (ArrowUpDown icon) — no live field label.
- **The Person filter is MULTI-select over distinct owner strings** found on
  the board's items (not a member list): checkbox + label rows with solid
  blue first-letter avatars, an empty state (User icon w-8 h-8 opacity-50 +
  "No people assigned yet"), and a red "Clear selection" link
  (`text-sm text-[#E2445C] hover:underline`, `pt-3 border-t`). The Person /
  Filter / Hide buttons carry **blue count badges**
  (`ml-2 bg-[#0073EA] text-white rounded-full w-5 h-5 text-xs p-0 flex
  items-center justify-center`) when active; Hide swaps its Eye icon to
  EyeOff when columns are hidden.
- **The reference's Filter menu priority rows have NO color dots** (status
  rows do), and its "Clear all filters" link clears only status+priority
  (people survive).
- **The kanban card avatar is a gradient** from an 8-entry palette indexed
  by `name.charCodeAt(0) % 8` — `#667eea→#764ba2`, `#f093fb→#f5576c`,
  `#4facfe→#00f2fe`, `#43e97b→#38f9d7`, `#fa709a→#fee140`, `#a8edea→#fed6e3`,
  `#ff9a9e→#fecfef`, `#a18cd1→#fbc2eb` — with initials =
  `name.substring(0, 2).toUpperCase()` ("John Doe" → "JO"). Verified live:
  JA / JO / MI chips on the seeded cards. The table cell avatar stays the
  solid blue 24px circle.
- **The kanban card is CLICKABLE** — it opens the reference's **Edit Task
  modal** (as does the Ellipsis button and the calendar chip). The modal
  (`sm:max-w-2xl max-h-[80vh] overflow-y-auto`) has an "Edit Task"
  `text-2xl font-bold` title + X, a Task Title field (Label font-medium
  text-base + Input `text-lg font-medium`), a `grid grid-cols-1
  md:grid-cols-2 gap-4` of column fields (Priority select, Status select,
  Owner free-text, Due Date calendar popover with "PPP" button label), and a
  `flex justify-between pt-4 border-t` footer: Delete Task
  (`bg-red-500 hover:bg-red-600`, `window.confirm`) | Cancel + Save Changes
  (`bg-[#0073EA] hover:bg-[#0056B3]`). **The clone has no edit modal at all.**
- **Kanban drag states**: a dragged card gets `shadow-2xl ring-4
  ring-blue-200 scale-105` + a white→#f8faff gradient fill; a drag-over
  COLUMN gets `shadow-2xl scale-105` + its own color tinted at 12.5%/6.25%
  (`linear-gradient(135deg, ${color}20, ${color}10)`). The clone dims the
  card (opacity-40) and rings the column blue.
- **Kanban people columns list only owners who own tasks** (distinct owner
  strings in first-encounter order, badge colors from the 8-color
  `LE` palette: `#6C5CE7 #A29BFE #FD79A8 #E17055 #00B894 #0984E3 #6C5CE7
  #FDCB6E`), with the Unassigned column present only when it holds items
  (or when no people exist at all); its empty-state hint reads "Drag
  unassigned tasks here". No header avatar, no sublabel. The clone renders
  every member plus an always-present Unassigned column with an avatar and
  a "No one assigned" sublabel.
- **The kanban date chip has no overdue variant** — always
  `bg-blue-50` + `text-blue-500` CalendarDays + `text-blue-700` label. The
  clone added a red overdue variant the reference lacks.
- **The board dialog color names re-drifted**: the live Create Board dialog
  titles its swatches "Ocean Blue, Success Green, **Warning Orange**, Danger
  Red, Purple, **Teal**" (the VALUES are unchanged — #ffcb00 and #00d9ff).
  The clone's BOARD_COLORS still says "Sunny Yellow" / "Cyan".
- **New-boards keep the dropdown-type priority column** (verified by
  creating a board on the reference and reading its columns), so the kanban
  card border stays the neutral `#E1E5F3` everywhere and the reference's
  grouping-dependent border/chips code is dead — our fixed
  `KANBAN_CARD_BORDER` stays correct.

## Verified gaps (19)

### 1. Edit Task modal (new component `edit-task-dialog.tsx`)
- Anatomy as decompiled above; edits title / priority / status / owner /
  due date; deletes with `window.confirm`. Opened from: kanban card click,
  kanban Ellipsis button, calendar chip click (`onOpenTask`, currently
  unwired). Fresh-mount form pattern (state initializes on mount — no
  `useEffect` reset; lint rule `react-hooks/set-state-in-effect`).
- Owner field is free text that resolves the typed name to a member
  (case-insensitive full match); unmatched input keeps the previous owner
  (our `ownerId` FK cannot store arbitrary strings — deliberate deviation,
  documented).

### 2. OwnerCell free-text (`owner-cell.tsx`)
- Replace the popover with the reference's three states: empty "Assign"
  affordance (unchanged), inline `border-none bg-transparent p-0 h-auto
  focus:ring-0 text-[#323338]` input on click (commit blur/Enter, cancel
  Escape), assigned = solid blue 24px circle with `charAt(0).toUpperCase()`
  + name. Name commit resolves to a member id.

### 3. Group header per-status dots (`domain.ts`, `board-table.tsx`)
- New seam `statusHeaderDots(tasks)` → `[{label, color, count}]` in
  first-encounter order; replaces the single gray total dot.

### 4. Footer priority badges: order + cap + overflow (`domain.ts`, `board-table.tsx`)
- `groupSummary.priorities` becomes first-encounter order, capped at 3,
  plus `overflowCount`; the footer appends `<span class="text-xs
  text-gray-400">+N</span>` when N extra types exist.

### 5. Toolbar button count badges + Hide icon (`board-view.tsx`)
- Person: `w-5 h-5` blue badge with selected-people count; Filter: badge
  with status+priority count; Hide: badge with hidden count + Eye↔EyeOff.

### 6. Sort button + menu to reference spec (`board-view.tsx`, `domain.ts`)
- Trigger always "Sort" (ArrowUpDown). Menu = card anatomy with X close;
  options Task Name, Created Date, Updated Date, Priority, Status, Owner,
  Due Date; ghost `h-auto p-3` rows, selected `bg-[#E1E5F3] text-[#0073EA]`
  + ArrowUp/ArrowDown; click = asc⇄desc toggle (no off state).
- `SortField` gains `"priority" | "status" | "owner" | "dueDate"`;
  `sortTasks` comparators: priority/status by vocabulary index, owner by
  name (nulls last), dueDate by time (nulls last).

### 7. Person filter multi-select + distinct owners (`board-view.tsx`, `domain.ts`)
- Card anatomy; checkbox rows over distinct owners (first-encounter);
  solid-blue first-letter avatars; empty state; red "Clear selection".
- `filterTasks` criteria: `personIds: readonly string[]` (OR semantics)
  replacing the single `personId`.

### 8. Filter menu card + no priority dots + red clear (`board-view.tsx`)
- Card anatomy with X; h4 "Status"/"Priority" (`font-medium text-[#323338]
  mb-3`); status rows keep dots, priority rows drop them; "Clear all
  filters" (`text-sm text-[#E2445C] hover:underline`) clears status +
  priority only.

### 9. Hide menu card + Eye/EyeOff rows (`board-view.tsx`)
- Card anatomy ("Show/Hide Columns" + X); checkbox + Eye (blue, visible) /
  EyeOff (gray, hidden) + label rows; "Show all columns"
  (`text-sm text-[#0073EA] hover:underline`) when any hidden.

### 10. Group-by menu card + close-on-select (`board-view.tsx`)
- Card anatomy ("Group By" + X); selecting an option closes the menu.

### 11. Status cell → shadcn Select swap (`status-cell.tsx`)
- Closed: current pill (matches). Open: Select with bare trigger
  (`w-full border-none p-0 h-auto focus:ring-0`); items = color dot +
  label, shadcn near-black check; content `p-1`, `min-w-[8rem]`.

### 12. Priority cell → shadcn Select (`priority-cell.tsx`)
- Always a Select (no swap): trigger `h-full w-full p-1 border-none
  bg-transparent text-sm focus:ring-0 shadow-none` containing the badge;
  items = color dot + label with the near-black check.

### 13. Kanban avatar gradient + 2-char initials (`domain.ts`, `board-kanban.tsx`)
- Seams `avatarGradient(name)` (8-palette, `charCodeAt(0) % 8`) and
  `avatarInitials(name)` (`substring(0, 2).toUpperCase()`); card footer
  avatar becomes `w-8 h-8` gradient + 2-char initials.

### 14. Kanban card click → edit modal; Ellipsis → modal (`board-kanban.tsx`)

### 15. Kanban drag visuals (`board-kanban.tsx`)
- Dragged card: `shadow-2xl ring-4 ring-blue-200 scale-105` + white→#f8faff
  fill (replaces opacity-40). Drag-over column: `shadow-2xl scale-105` +
  `${color}20 → ${color}10` gradient (replaces the blue accent ring).

### 16. Kanban people columns from distinct owners (`board-kanban.tsx`, `domain.ts`)
- New seam `distinctOwnerNames(tasks)` (first-encounter order); people
  columns = those owners only, badge colors from the reference `LE` palette
  by index; Unassigned column only when non-empty (or no owners); no header
  avatar; no sublabel; unassigned empty-hint reads "Drag unassigned tasks
  here".

### 17. Kanban date chip: drop the overdue variant (`board-kanban.tsx`)

### 18. Calendar chip click → edit modal (`board-view.tsx`)
- Wire `onOpenTask` into `BoardCalendar` (the prop already exists).

### 19. BOARD_COLORS labels ("Warning Orange", "Teal") (`domain.ts`)
- Values unchanged; names updated everywhere (dialog titles, tests, docs).

## Deliberate deviations (documented, not fixed)

- Owner commits resolve to real member accounts (reference stores arbitrary
  strings; our relational `ownerId` cannot).
- Working unassigned-task list vs the reference's empty (broken) view;
  timeline "without a due date" section; usable day-mode zoom (reference:
  5.71px cells); working row delete; SPA titles; `/Board` without id.
- Timeline bars: the reference's bar component requires a literal
  `data.startDate` key that no current board's column model produces —
  **the reference never renders timeline bars** (verified live with 10
  dated tasks; bars appear only after hand-injecting startDate/endDate via
  the API). Our due-date bars stay (the §10 row is updated with this
  deeper finding: bar spec captured as 28px rounded, board-color, 0.9
  opacity, 40px/day, if we ever need it).
- Analytics priority distribution reads the reference's top-level
  `priority` field (server default "medium") — all tasks count as Medium
  there; we count real priorities (existing deviation, now root-caused).
- Reference dashboard "Completed Tasks" KPI shows 0 while its analytics
  reports 2 Done (different completion sources) — reference-side
  inconsistency; ours stays consistent.
- Calendar chips: the reference's chip code would color-dot by priority,
  but only for priority-TYPE columns (no current board has one) — plain
  white chips everywhere; ours already matches (README wording fixed).

## TDD note

New pure seams land red-first in `src/lib/domain.test.ts`:
`avatarGradient`, `avatarInitials`, `statusHeaderDots`,
`distinctOwnerNames`, extended `groupSummary` (order + cap + overflow),
extended `sortTasks` (4 new fields + null ordering), extended `filterTasks`
(multi-person), updated `BOARD_COLORS` palette test. The 87-test suite
plus these (~20 new cases) is the regression gate; the rest is JSX/CSS
verified by DOM probes against the decompiled specs above.

## Verification plan

1. `bun run lint && bun run typecheck && bun run test` after each
   workstream.
2. DOM probes against the reference's live rich-data board (kept until
   delivery): group header dots, footer "+N", toolbar badges, card menus,
   owner free-text commit, kanban avatars (gradient + JO/JA/MI), drag
   visuals, people columns, edit modal anatomy + save round-trip (DB
   verified), calendar chip click.
3. Side-by-side VLM re-comparison of table / kanban (status + people) /
   calendar / toolbar states.
4. Functional pass: edit modal save (persisted via API read-back), delete
   via modal (confirm), owner free-text assignment, multi-person filter,
   sort by all 7 fields, kanban drag (status + owner), calendar chip modal.
5. Reference restoration: delete the test board + the Product Launch probe
   task via API; verify Product Launch is back to its single original task.
