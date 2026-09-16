# Remediation Plan — Session 4: Reference Parity Pass 3

**Date:** 2026-09-17
**Trigger:** The reference app (`https://tuesdaycom-a6700714.base44.app/`) was
redeployed/reset after session 3. Its demo data now holds a single board
("Product Launch"), and — more importantly — its color system and several
component presentations changed to monday.com's canonical palette. This plan
re-aligns the clone with the CURRENT reference state.

**Method:** Every finding below was verified against the live reference via
computed-style DOM probes (agent-browser `eval`), not screenshots alone. VLM
side-by-side comparisons were used as a lead generator only; each VLM claim was
individually confirmed or discarded against the DOM. Screenshots and probes are
archived in the session workspace.

---

## Evidence Summary (reference, probed 2026-09-17)

| Element | Reference (current) | Clone (session 3) |
|---|---|---|
| Status colors | `#c4c4c4` / `#ffcb00` / `#00c875` / `#e2445c` | `#e8e9eb` / `#fddf3d` / `#00ca72` / `#e2445c` |
| Status pill text | white for all four | dark for Not Started / Working |
| Priority colors | `#787d80` / `#ffcb00` / `#fdab3d` / `#e2445c` | `#579bfc` / `#fcc203` / `#ff642e` / `#e2445c` |
| Priority display | text badge, bg @ 12.5% alpha + colored text | 1–4 signal-bar flag |
| Board palette | `#0073ea #00c875 #ffcb00 #e2445c #a25ddb #00d9ff` | `#0073ea #00ca72 #ff642e #e2445c #a25ddb #00d5c0` |
| Visibility labels | Private / **Shared** | Private / Public |
| App background | `#f5f6f8` | `#f5f7fa` |
| Page containers | dashboard/boards/analytics `max-w-7xl`; board detail `max-w-full` | `max-w-[1400px]` everywhere |
| Board header | back arrow + 2-row left stack; avatars in right group | no back arrow; avatars in left group |
| Group header | `border-left: 4px solid <board color>`, grey count dot | no accent bar; section-colored dot |
| Summary status cell | `w-2 h-4` colored bars (`title="N <Status>"`) | "N done" text |
| Add task row | full-width dashed blue `h-10` button in `p-4 border-t` | plain ghost text button |
| Task row | 48px, title 16px/500, hover `#f5f6f8` | py-1.5, 14px title |
| Kanban heading | standalone gradient tile `from-blue-50 to-purple-50 rounded-2xl border-blue-100`, gradient icon tile, subtitle "Drag and drop to manage your tasks" | small lavender pill inside card header |
| Kanban cards | `rounded-2xl border-l-4 p-4 mb-4 shadow-lg hover:-translate-y-1`, title `font-bold text-lg` | `rounded-lg border p-3 shadow-sm`, 14px title |
| Dashboard hero | gradient card `from-white via-white to-blue-50/30`, `w-10 h-10` gradient icon tile, default-size buttons | solid card, `h-12 w-12` solid tile, lg buttons |
| Dashboard lower grid | `xl:grid-cols-4 gap-8`, boards `col-span-3` | `xl:grid-cols-3 gap-6`, boards `col-span-2` |
| Dashboard board items | hover gradient `blue-50/80→purple-50/80`, `w-12 h-12` icon + `group-hover:scale-110` | hover `bg-secondary/60`, `h-10 w-10` icon |
| Analytics distributions | single-line row: dot+label left, `w-24` bar + count right | bar stacked under label row |
| Login toggle | "Need an account? Sign up" | "Sign up" |

Verified as ALREADY matching: dashboard/analytics KPI gradients (`to right
bottom` / `to right` pairs), deco discs, folder-tile board cards (boards page),
Sun-first calendar, timeline zoom + Today controls, toolbar (Search / Person /
Filter / Sort / Hide / Group by, Main-Table-only scoping), Edit Board dialog
fields (512px, title/description/6 colors/Private–Shared visibility), Options
menu (Edit Board / Delete Board), status select options with colored dots,
analytics section labels and stat-card subtitles, login structure.

---

## Phases

### Phase A — Domain vocabulary (TDD: tests RED first, then implement)

Files: `src/lib/domain.ts`, `src/lib/domain.test.ts`, `src/app/globals.css`.

- **A1** `TASK_STATUSES`: bg `#c4c4c4` / `#ffcb00` / `#00c875` / `#e2445c`;
  `text: "#ffffff"` for all four (verified: reference renders white on every
  pill including grey Not Started — accepted contrast deviation, parity wins).
- **A2** `TASK_PRIORITIES`: colors `#787d80` / `#ffcb00` / `#fdab3d` / `#e2445c`.
- **A3** New pure helper `priorityBadgeStyle(priority)` returning
  `{ backgroundColor: <color>@12.5% alpha, color: <color> }`-compatible strings
  (8-digit hex) — the reference's tinted badge recipe. Unit-tested.
- **A4** `BOARD_COLORS`: `#0073ea` (Ocean Blue), `#00c875` (Success Green),
  `#ffcb00` (Sunny Yellow), `#e2445c` (Danger Red), `#a25ddb` (Purple),
  `#00d9ff` (Cyan).
- **A5** `VISIBILITY_OPTIONS`: label "Public" → "Shared" (stored value stays
  `public` — API/Zod stable, no migration).
- **A6** New pure helper `visibilityLabel(value)` → "Private" | "Shared"
  (lowercase variant for card badges). Unit-tested.
- **A7** `globals.css`: `--background: #f5f6f8`.
- **A8** Update seed.ts board colors to the new palette (data is disposable).
- **A9** Regression test updates in `domain.test.ts` for every changed hex +
  the two new helpers (RED → GREEN).

### Phase B — Board header restructure (`board-view.tsx`)

- **B1** Add back arrow: icon-only ghost button (ArrowLeft), left of the board
  icon tile, `aria-label="Back to boards"`, `navigate("boards")`.
- **B2** Layout: outer `flex items-center justify-between`; left column stacks
  row 1 `[back][board icon][h1 title+pencil]` and row 2 `[view dropdown |
  favorites | items ▪ Saved]`; right group `[Analytics][Integrate][Automate][avatar row]`.
  Fixes the Automate wrap seen at 1512px.
- **B3** Avatar row: `flex items-center -space-x-2`, avatars `h-8 w-8
  border-2 border-card`, decorative green presence dot (`aria-hidden`,
  absolute bottom-right) — purely decorative chrome matching the reference;
  remains the members popover trigger.
- **B4** Board icon tile: add `absolute inset-0 bg-white/20` shine overlay.
- **B5** Title button: `group` + `group-hover:text-[#0073EA]` +
  `Pencil w-3 h-3 opacity-0 group-hover:opacity-100`.

### Phase C — Board table chrome (`board-table.tsx`)

- **C1** `GroupSection` gets `boardColor`; group header row gets
  `border-left: 4px solid ${boardColor}` (reference uses the board color).
- **C2** Group count dot: `#c4c4c4` (grey) instead of section color.
- **C3** Delete-group button: `h-7 w-7 text-red-500 opacity-50 hover:opacity-100
  hover:bg-red-100 hover:text-red-600`, `title="Delete group"`.
- **C4** `COLUMN_WIDTHS`: priority `120px`, task `minmax(250px,1fr)`.
- **C5** Summary row status cell: one `w-2 h-4 rounded-sm` bar per non-zero
  status count, `title="{count} {label}"`, bg = status color.
- **C6** Add-task row: wrapper `p-4 border-t border-[#E1E5F3]`; button
  `w-full h-10 rounded-lg border border-dashed border-[#0073EA] text-[#0073EA]
  hover:bg-[#0073EA]/10` with Plus icon.
- **C7** Add New Group: `h-10 rounded-lg` (from `py-3 rounded-xl`).
- **C8** Task rows: `min-h-12` + title `text-base font-medium`; hover
  `hover:bg-[#F5F6F8]`.

### Phase D — Cells

- **D1** `status-cell.tsx`: white text (from `meta.text` = white), `px-3 py-1
  rounded-md shadow hover:opacity-80`; popover items keep colored dots (now
  reference colors).
- **D2** `priority-cell.tsx`: replace flag bars with tinted text badge
  (Phase A3 helper) inside the bordered combobox trigger; popover items render
  colored badges + labels.

### Phase E — Dashboard (`dashboard-view.tsx`)

- **E1** Container `max-w-7xl space-y-8`; boards-view + analytics-view the
  same; board detail container `max-w-full` (reference probes).
- **E2** Hero: `bg-gradient-to-br from-white via-white to-blue-50/30
  border-white/60` card; icon tile `h-10 w-10 bg-gradient-to-br from-blue-500
  to-blue-600 shadow-lg`; hero buttons default size.
- **E3** Lower grid `grid-cols-1 xl:grid-cols-4 gap-8`; Recent Boards
  `xl:col-span-3`; right sidebar `space-y-8`.
- **E4** Recent-board items: `rounded-xl`, hover
  `hover:bg-gradient-to-r hover:from-blue-50/80 hover:to-purple-50/80
  hover:border-blue-100 group-hover:shadow-md`; folder tile `h-12 w-12
  rounded-xl shadow-lg transition-transform group-hover:scale-110`.

### Phase F — Kanban (`board-kanban.tsx`)

- **F1** Heading: standalone `mb-6 p-4 bg-gradient-to-r from-blue-50
  to-purple-50 rounded-2xl border border-blue-100` tile; icon `h-10 w-10
  bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl` with MoreHorizontal
  (ellipsis) icon; `h2 text-xl font-bold` + `p text-sm` subtitle "Drag and drop
  to manage your tasks"; right side keeps `Group by:` + select (h-9).
- **F2** Cards: `rounded-2xl border-l-4 p-4 mb-4 shadow-lg hover:shadow-xl
  hover:-translate-y-1` with `border-left-color` = status color; title
  `font-bold text-lg`; keep owner/date/priority footer (reference shows these
  when populated).

### Phase G — Analytics (`analytics-view.tsx`)

- **G1** Distribution rows: single line — `flex items-center justify-between`;
  left: `w-4 h-4` dot + `text-sm font-medium` label; right: `w-24 h-2` bar
  (track `bg-gray-200`, fill = color) + count `text-sm text-gray-600 w-12`.

### Phase H — Boards page / login / shell

- **H1** `boards-view.tsx` container `max-w-7xl`; visibility badge text via
  `visibilityLabel()` (lowercase for card badge).
- **H2** `login-view.tsx`: login-form toggle copy "Need an account? Sign up".
- **H3** Verify header/nav unchanged (already matches).

### Phase I — Verification & docs

- **I1** Gates: `bun run lint && bun run typecheck && bun run test` — all green.
- **I2** Browser: side-by-side re-probe of every changed surface; persistence
  round-trip (status change → reload → DB check); Edit Board dialog with new
  palette; create board with new swatches.
- **I3** Docs: README design-token tables, AGENTS.md vocabulary lines, PAD
  revision block v1.3 + §5 tokens + §10 deviations update, CLAUDE.md status.
- **I4** Conventional atomic commits; push via `docs/ssh_git_wrapper_v3.py`.

---

## Deliberate deviations kept (unchanged)

- Timeline renders due-date bars (reference requires start+end dates its data
  never populates → effectively always empty; our richer rendering is the
  documented deviation, PAD §10).
- Analytics counts actual priorities (reference reports Medium for a Low task —
  reference-side bug).
- Boards-page Favorites filter functional (reference Filter button inert).
- Radix-standard popover dismiss (reference keeps popovers mounted after Escape).
- Unassigned view helpful empty state (reference renders an empty div).

## Out of scope

- No new routes/pages (single-route invariant).
- No schema changes; visibility stored value remains `public`.
- No changes to `skills/` (excluded from all gates).
