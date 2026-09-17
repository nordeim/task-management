# Remediation Plan — Session 5 (parity deep-pass #2)

> **STATUS: COMPLETE (2026-09-17).** All 34 gaps closed; phases A–K executed.
> Gates at completion: lint 0, tsc 0, 61/61 vitest tests, production build green.
> Every phase verified against the live reference with computed-style DOM
> probes; VLM side-by-side verdicts: analytics IDENTICAL, boards grid/list
> IDENTICAL, timeline IDENTICAL, board table IDENTICAL. Functional round-trip
> (add group with color → add task → status/priority/owner/date → collapse →
> delete) executed and reverted. Additional findings fixed during execution:
> table sections used the board color instead of the group's own color for the
> 4px accent; analytics section-header icon colors (blue/orange/green) and the
> nav active-state highlight were re-probed and aligned. Two reference
> experiments were run and fully reverted (list-view toggle, due-date set via
> native input keyboard).

Baseline: main @ 9afd148 (session-4 delivery). Gates at baseline: lint 0, tsc 0, 56/56 tests, build green.

Method: full re-inspection of the live reference (tuesdaycom-a6700714.base44.app) with DOM
computed-style probes as ground truth; every VLM claim verified against the DOM before being
accepted as a gap. Controlled experiments on the reference (create group, add task, set
status/priority/owner/date, collapse, menus) were run and **fully reverted** — the reference is
back to 1 board / 1 group / 1 task ("Design landing page", Low, Not Started, no date).

## Why a second pass

Session 4 achieved surface parity but several probes were mislabeled, and deeper structures
(sticky headers, scroll containers, single-card group architecture, dialog flows) were not
inspected. This pass re-derives the ground truth from scratch.

## Gap inventory (all verified against reference DOM)

### A. Domain vocabulary (TDD — domain.ts + domain.test.ts)

1. **View trigger labels are short on the reference**: the dropdown *menu* items read
   "Main Table / Kanban Board / Calendar View / Timeline / Unassigned Tasks", but the *trigger*
   shows "Main table", "Kanban", "Calendar", "Timeline". Clone shows the long labels on the
   trigger.
2. **Kanban card left border is a fixed neutral `#E1E5F3`** on the reference (verified with a
   Done task AND a Not Started task — both `rgb(225,229,243)`). Session 4 made it status-colored.
3. **Priority badge font-weight 400** on the reference (`font-normal`), clone uses 500.
4. **Completed task titles are never struck through** on the reference (verified with a Done
   task). Clone strikes through + greys completed titles.

### B. Board table architecture (board-table.tsx — restructure)

5. **One white card wraps ALL groups + the Add New Group zone**: reference renders
   `bg-white rounded-xl shadow-sm border border-[#E1E5F3] overflow-hidden` with N group zones
   (`border-b border-[#E1E5F3] last:border-b-0`) + a final `p-4 border-t` zone holding the
   Add New Group button. Clone renders each group as its own card and Add New Group as a
   standalone button outside.
6. **Per-group horizontal scroll container**: `overflow-x-auto relative` wrapping the column
   header + rows + summary, with `min-width: 926px` rows and **sticky columns**:
   drag-handle 24px sticky left:0, checkbox 32px sticky left:24px, title 250px sticky left:56px,
   action 50px sticky right. Clone uses a plain grid (36px checkbox col), no scroll, no stickies.
7. **Column header row**: `flex bg-[#F5F6F8] border-b sticky top-0 z-10`, labels
   `font-medium text-[#323338] text-sm` (clone: text-xs), each column is a settings dropdown
   (hover-revealed `lucide-settings` w-3 h-3; menu: Rename Column / Change Column Type /
   Configure Column / Hide from Group), and the action column header holds a **blue plus**
   (`text-[#0073EA]`) add-task-to-group button.
8. **Task rows**: `flex items-stretch border-b hover:bg-[#F5F6F8] min-h-[48px] group` with
   hover-revealed grip handle (`grip-vertical w-3 h-3 text-[#676879]`), hover-revealed checkbox,
   title chip `text-[#323338] font-medium hover:bg-[#E1E5F3] px-2 py-1 -mx-2 -my-1`
   (clone: always-visible checkbox, no handle, hover:bg-secondary).
9. **Due Date column 150px** (clone 130px). Column set: 24 + 32 + 250 + 120 + 150 + 150 + 150 + spacer + 50.
10. **Add-task row**: an empty task row (same chrome) whose title cell holds a hover-revealed
    grey text button "+ Add task" (`text-[#676879] hover:text-[#0073EA] h-auto p-0 font-normal
    opacity-0 group-hover:opacity-100`). Clone renders a full-width dashed blue h-10 button —
    that style belongs to Add New Group only.
11. **Summary row**: `flex items-stretch bg-gray-50 border-b border-[#E1E5F3] min-h-[40px]
    text-xs` + sticky gutters + min-width 926: task cell "N items" (`text-gray-600`), priority
    chips `rounded-md border font-semibold px-1.5 py-0.5` ("N low"), status bars `w-2 h-4
    rounded-sm` titled "N Done", owner/date "-". Clone has border-t, grid layout, chips without
    border.
12. **Add New Group button**: white bg, blue text `#0073EA`, dashed `#0073EA` border,
    `rounded-lg h-10`, inside the card's `p-4 border-t` zone (clone: transparent bg, grey text,
    outside the card).
13. **Empty group** renders a centered "Add Item" button (`h-9 px-4 py-2 border-[#E1E5F3]
    rounded-lg shadow-sm` inside `p-8 text-center`); clicking swaps it to an inline input row
    ("Enter item name..."). Clone shows "No items in this group" text.
14. **Group header row click toggles collapse** (whole row `cursor-pointer`), chevron flips
    chevron-down ↔ chevron-right. The reference has NO group rename affordance; the clone's
    h3-embedded rename button must go (row click = collapse).
15. **Row action menu = single "Delete Task" item** (clone: "Rename" + "Delete task" with icon).
    Rename stays available via the inline title edit (title chip click → inline input), which the
    reference has and the clone already implements.

### C. Board page chrome (board-view.tsx, app-header.tsx)

16. **Board header is sticky**: `bg-white sticky top-16 z-40 shadow-sm border-b border-[#E1E5F3]`
    wrapping the 2-row header (back arrow + icon + title / view dropdown + favorites + items +
    saved), plus a **scroll progress bar** (`absolute top-0 left-0 right-0 h-1 bg-[#0073EA]`,
    `transform: scaleX(p)`). Clone: not sticky, no progress bar.
17. **Toolbar wrapped in a white card**: `flex items-center justify-between mb-6 bg-white
    rounded-xl p-4 shadow-sm border border-[#E1E5F3]`. Clone: bare flex-wrap on page bg.
18. **App nav z-50 + shadow-sm** (clone z-40, no shadow).

### D. Dialogs

19. **Create Task dialog**: `sm:max-w-lg` (clone max-w-md), inputs `rounded-xl border-[#E1E5F3]
    h-12` with `focus:ring-[#0073EA]/20`, placeholder "Enter task title...", group Select with
    color dots (w-3 h-3 rounded-full) in trigger + items. Clone lacks dots and uses default Input.
20. **Add New Group dialog (NEW)**: reference opens a dialog (max-w-md) with "Group Title *"
    input (h-12 rounded-xl, placeholder "e.g., To Do, In Progress") + "Group Color" 7 swatches
    (`w-8 h-8 rounded-lg border-2`; selected `border-[#323338] scale-110`; hover `scale-105`):
    Ocean Blue #0073ea, Success Green #00c875, Warning Orange #ffcb00, Danger Red #e2445c,
    Purple #a25ddb, Teal #00d9ff, Gray #676879. Cancel + Add Group (disabled until title).
    Clone POSTs "New Group" directly with no dialog.

### E. Kanban (board-kanban.tsx)

21. **Card**: fixed `border-l-4` color `#E1E5F3`; header = h4 title + hover kebab
    (h-8 w-8 rounded-full); the badge row is always empty on the reference (no priority badge);
    footer = left date chip (`flex items-center gap-1.5 px-2 py-1 bg-blue-50 rounded-full` +
    `calendar-days w-3.5 h-3.5 text-blue-500` + `text-blue-700 font-medium`) and right owner
    avatar (`w-8 h-8 rounded-full text-white font-bold text-sm shadow-md`, gradient
    `linear-gradient(135deg,#4FACFE,#00F2FE)`, initials). Clone: status-colored border,
    priority badge in footer, different chips.

### F. Calendar (board-calendar.tsx)

22. **Header**: card opens with `p-4` → `flex justify-between items-center mb-4 px-2`:
    [◀ h-9 w-9 bordered] [h2 `text-xl font-semibold` CENTERED] [▶]. Clone: left title +
    right arrow group with border-b separator.
23. **Day cells**: `p-2 border border-[#E1E5F3] min-h-[100px] hover:bg-[#F9FAFB]` (clone:
    min-h-96 p-1.5 border-b/r).
24. **Today marker**: date number in `text-[#0073EA]` (blue text, no fill). Clone: blue filled
    circle.
25. **Event chips**: white `p-1.5 mb-1 bg-white rounded-md shadow-sm border border-[#E1E5F3]
    hover:bg-gray-50` + `text-xs font-medium text-[#323338] truncate` (+ hover scale-105
    shadow-md). Clone: status-colored filled buttons.

### G. Timeline (board-timeline.tsx)

26. **Header**: `space-y-1.5 p-3 border-b flex flex-row items-center justify-between sticky
    top-0 bg-white z-10` — title LEFT (`tracking-tight text-base font-semibold`), nav RIGHT
    ([◀ h-8 w-8] [Today px-3 text-xs h-8] [▶]). Clone: arrow on the left of the title.
27. **Day header row**: `flex sticky top-[53px] bg-gray-50 z-[5] border-b`; Task column
    `w-[200px] p-2 border-r font-medium text-xs text-gray-600`; day columns 40px
    `text-center p-1 border-r` with stacked `text-xs text-gray-500` day + `text-sm font-medium`
    number. **No today highlight** (clone highlights today in blue).

### H. Analytics (analytics-view.tsx)

28. **Stat cards**: `rounded-xl border shadow bg-gradient-to-r from-X-500 to-X-600 text-white`
    with header zone `flex flex-col space-y-1.5 p-6 pb-2` → label row `font-semibold
    tracking-tight text-lg flex items-center gap-2` + icon w-5 h-5 INLINE; value zone
    `p-6 pt-0` → `text-3xl font-bold` + subtitle `text-{color}-100 text-sm`. Gradients:
    blue/green/red/purple 500→600 (clone gradient colors already match). Clone stacks the icon
    tile above the label with min-h-136 — restructure.
29. **Completion Rate card**: value + `relative h-2 w-full overflow-hidden rounded-full mt-2
    bg-green-300` progressbar (full-width light-green track). Clone renders a short white bar.
30. **Board Performance**: header icon `chart-column w-5 h-5 text-green-500` (clone: h-4 w-4
    text-primary); rows `flex items-center justify-between p-4 bg-gray-50 rounded-lg
    hover:bg-gray-100` with left [dot `w-4 h-4 rounded-lg` board color + h4 `font-medium
    text-gray-900` + p `text-sm text-gray-500` "N of M tasks completed"] and right [bar
    `w-32 h-2 bg-gray-200 rounded-full` with `bg-green-500` fill + chip `rounded-md border
    px-2.5 py-0.5 text-xs font-semibold min-w-[3rem] justify-center`]. Clone: single-line rows
    with colored % text, no bar/chip.

### I. Boards page (boards-view.tsx) + shell

31. **Board cards**: top color bar `h-2 w-full` (board color) + footer zone `p-2 border-t
    border-gray-100 bg-gray-50/50` with full-width centered Options button (`h-8 rounded-md
    px-3 w-full justify-center text-xs text-gray-600 hover:bg-gray-200/70`); timestamp row
    gains `mt-auto pt-4 border-t border-gray-100`. Clone: no bar, no footer zone, Options
    inline in card body.
32. **Grid/List view toggles**: `h-10 px-3 rounded-lg border-[#E1E5F3]` buttons; active =
    solid `bg-[#0073EA]` white icon; inactive = white bordered. Clone: 28px pills with grey
    active state.
33. **Remove the app footer** — the reference has none (verified: `document.querySelectorAll
    ('footer').length === 0`). Clone renders "Tuesday.com — boards, tasks, and teamwork in one
    place." — delete it.

### J. Cells

34. **DateCell set-state**: reference shows plain `text-sm text-[#323338]` "Sep 22" with
    `hover:opacity-80`, NO calendar icon (icon only in the empty "Set date" state). Clone always
    shows the icon + muted text. Keep the hover clear-X (functional nicety).

### Deliberate deviations (keep, document in PAD §10)

- Checkbox ↔ status coupling (reference checkbox is transient dead UI; ours persists and drives
  status — monday.com-authentic). Visual sync: checked state now only shows the green check,
  never strikethrough.
- Owner picker popover vs reference free-text input (same "Assign"/"Enter name..." surface).
- Functional Favorites filter, Radix dismiss behavior, real priority counts in analytics,
  helpful Unassigned empty state, timeline due-date bars, group rename via title chip.

## Execution order (TDD where domain-level)

- **Phase A** — domain.ts vocabulary: RED tests for trigger labels, kanban border token,
  badge weight, no-strikethrough helper → GREEN.
- **Phase B** — board-table.tsx restructure (single card, scroll container, sticky columns,
  header row, task rows, add-task row, summary row, Add New Group zone, empty group, row-click
  collapse, single-item row menu).
- **Phase C** — board-view.tsx chrome: sticky board header + scroll progress bar, toolbar card,
  app-header z-50 shadow.
- **Phase D** — dialogs: create-task restyle + NEW add-group dialog with swatches.
- **Phase E** — kanban cards (border, footer, kebab, date chip, avatar).
- **Phase F** — calendar (header, cells, today, chips).
- **Phase G** — timeline (header, day row, no highlight).
- **Phase H** — analytics (stat cards, completion bar, board performance).
- **Phase I** — boards page (card bar/footer, toggles) + remove app footer.
- **Phase J** — DateCell set-state.
- **Phase K** — gates + live verification (DOM probes + VLM side-by-sides) + docs alignment
  (README / AGENTS / CLAUDE / PAD v1.4).

## Validation checklist (per phase, then end-to-end)

- lint 0 / tsc 0 / vitest all green / production build green.
- DOM probes on the running clone for every numbered gap (colors, geometry, stickiness).
- VLM side-by-side re-comparison of all views; every VLM claim re-verified via DOM.
- Functional round-trip: add group via dialog, add task inline, set status/priority/owner/date,
  collapse/expand, delete — then revert.
