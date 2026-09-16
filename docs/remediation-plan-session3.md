# Remediation Plan — Session 3 (Parity Deep-Pass)

**Date:** 2026-09-16
**Input:** Live inspection of `https://tuesdaycom-a6700714.base44.app/` (logged in as the
demo account) side-by-side with the local clone at HEAD `0ab29dc`, plus DOM/computed-style
probes of both apps, plus VLM screenshot comparisons of all five views and the login page.
**Baseline gates at plan time:** lint 0 errors · `tsc --noEmit` 0 errors · Vitest 23/23 ·
dev server boots and serves the seeded demo dataset.
**Method:** every finding below carries an evidence label — `Verified` (executed/probed on
the live reference or the running clone), `Reasoned` (code inspection), `Assumed`.
Execution follows the repo's TDD contract: failing pure-seam test first, implementation in
`src/lib/domain.ts`, then wiring; UI-only slices are verified in the browser.

The previous session (session_2.md) shipped a first parity pass. This plan is the
second, deeper pass: it closes the remaining functional gaps (live reference behavior
that the clone lacks) and re-syncs the visual language (the reference renders gradient
KPI cards, a briefcase logo, reference-specific toolbar icons, a per-group summary row,
and several cell/trigger styles that differ from our current rendering).

---

## Findings and slices

Severity: **P0** = functional gap or clearly wrong visuals · **P1** = visible style drift ·
**P2** = polish/docs.

### Phase A — Functional parity (P0)

| ID | Finding | Evidence | Fix (TDD seam) |
|----|---------|----------|----------------|
| A1 | **Edit Board dialog missing.** Reference board card Options menu has "Edit Board" (dialog: title\*, description, 6 color swatches, Private/Public combobox, Cancel/Save Changes). Clone options menu only has Open board / favorites / Delete; `PATCH /api/boards/[id]` schema lacks `visibility`. | Verified (reference DOM + dialog probe; `boards-view.tsx` L303-319; `boards/[id]/route.ts` L10-15) | Add `visibility` to the PATCH Zod schema; new `edit-board-dialog.tsx` (fresh-mount form pattern); wire Options → Edit Board. Pure seam: `VISIBILITY_OPTIONS` const in `domain.ts` + test. |
| A2 | **Filter popover missing.** Reference toolbar Filter opens "Filter Items" with Status (4) and Priority (4) checkboxes that filter rows. Clone's Filter button is dead (no handler). | Verified (reference popover dump; `board-view.tsx` L596-598) | Popover + `statusFilter`/`priorityFilter` sets applied in the task pipeline. Pure seam: `filterTasks(tasks, criteria)` in `domain.ts` — red tests first (status, priority, combined, empty-set = all). |
| A3 | **Hide popover missing ("Show/Hide Columns").** Reference toggles Task/Priority/Status/Owner/Due Date columns. Clone's Hide button dishonestly clears the search box. | Verified (reference popover dump; `board-view.tsx` L609-611) | `hiddenColumns` state + popover with checkboxes; `board-table` renders dynamic columns. Pure seam: `visibleColumns(hidden)` → ordered list + grid template string. |
| A4 | **Sort popover mismatched.** Reference: "Sort By" popover with Task Name / Created Date / Updated Date. Clone: 3-state title-only cycle. `TaskDTO` lacks `updatedAt` so Updated-Date sorting is impossible today. | Verified (reference popover; `domain.ts` TaskDTO; `board-view.tsx` L599-608) | Add `updatedAt` to `TaskDTO` + `toTaskDTO`; sort state `{field, dir}`. Pure seam: `sortTasks(tasks, {field, dir})` with tests per field × direction. |
| A5 | **Toolbar renders in every view.** Reference shows the New Task/search/Person/Filter/Sort/Hide/Group-by toolbar ONLY in Main Table; Kanban/Calendar/Timeline/Unassigned render just their own headers. | Verified (reference view-switch probes: `New Task` absent in Kanban/Calendar) | Wrap the toolbar block in `subView === "table"` conditional in `board-view.tsx`. |
| A6 | **Owner cell lacks name search.** Reference owner picker opens a searchable "Enter name…" input over the member list. Clone shows a fixed list. | Verified (reference cell probe → `textbox "Enter name..."`) | Add a filter input at the top of the owner popover; filters `members` by name/email. |
| A7 | **Date cell uses Radix Calendar; reference uses a native date input.** Reference shows a display state ("Set date" + calendar icon) that swaps to `<input type="date">` on click. | Verified (reference probe → Month/Day/Year spinbuttons + "Show date picker") | Rebuild `date-cell.tsx` around a native date input, keeping the noon-storage convention (12:00 local before ISO) and overdue styling. |
| A8 | **Priority cell trigger differs.** Reference renders a bordered shadcn-Select-style combobox ("Low" + chevron). Clone renders flag bars + label with a custom popover. | Verified (reference DOM probe of the combobox trigger) | Keep the flag glyph inside the options (scannability) but render the trigger as a bordered `rounded-md border` combobox matching the reference. |
| A9 | **Status pill shape differs.** Reference pill is `rounded-md border text-xs` (shadcn Select trigger). Clone is `rounded-full`, borderless. | Verified (reference DOM probe) | Switch trigger to `rounded-md border border-black/10` + chevron. |

### Phase B — Visual parity (P0/P1)

| ID | Finding | Evidence | Fix |
|----|---------|----------|-----|
| B1 | **KPI stat cards are gradients in the reference, solid in the clone.** Dashboard: `linear-gradient(to right bottom, #3b82f6→#2563eb, #22c55e→#16a34a, #f59e0b→#f97316, #a855f7→#9333ea)`; analytics: same pairs `to right`, Overdue `#ef4444→#dc2626`. Deco: `bg-white/10` w-16 h-16 circle top-right, `bg-white/5` w-12 h-12 bottom-left, four `bg-white/40` w-1 h-1 dots. | Verified (computed `background-image` on both pages) | Gradient pairs + deco set in `dashboard-view.tsx` / `analytics-view.tsx` (+ update `.stat-card-deco` in globals.css). |
| B2 | **Logo.** Reference: 32×32 `rounded-lg bg-gradient-to-r from-[#2563EB] to-[#1D4ED8]` with a white `briefcase` icon. Clone: flat `#0073ea` square with the letter "T". | Verified (reference logo DOM) | Swap header logo (app-header) to the gradient square + Briefcase icon; keep wordmark. |
| B3 | **Hero buttons position.** Reference renders View All Boards + View Analytics BELOW the greeting, left-aligned (x≈113, y≈218 — same row). Clone right-aligns them on the greeting row (x≈874). | Verified (geometry probe both apps) | Hero card: stack greeting block then button row (left-aligned). |
| B4 | **Header search + nav.** Reference search placeholder "Search everything...", width 320px, h-9 text-base. Nav active state: `bg-[#E1E5F3] text-[#0073EA]`; inactive `text-[#323338] hover:bg-[#F5F6F8]`. Clone: "Search" placeholder, w-44/56, no active bg. | Verified (DOM probes) | Widen search (w-80), placeholder, nav tokens — add `--nav-active-bg`/`--nav-hover-bg` tokens to globals.css (documented, no scattered hex). |
| B5 | **Toolbar/header icons differ.** Reference: Person=`users`, Filter=`filter`, Sort=`arrow-up-narrow-wide`, Hide=`eye`, Group by=`group`; board-header Analytics=`trending-up`, Integrate=`activity`, Automate=`zap` (with a small purple dot). Clone: `users-round`, `funnel`, `arrow-up-down`, `eye-off`, `rows3`, `chart-column`, `sigma`. | Verified (lucide class probes both apps) | Swap imports; add the decorative dot on Automate (aria-hidden). |
| B6 | **Board header icon.** Reference: w-10 h-10 `rounded-xl` board-color square with white `table2` icon + shadow + shine overlay; title is an `h1` with pencil affordance; no back arrow. Clone: letter tile + back-arrow button + button title. | Verified (reference DOM) | Replace letter tile with Table2 icon tile; drop the back arrow (header nav covers it); keep rename inline-edit on an `h1`. |
| B7 | **Column header row background.** Reference `bg-[#F5F6F8]`; clone `bg-card` (white). | Verified (computed style) | Token `--table-header-bg` + apply in `board-table.tsx`. |
| B8 | **Group header layout.** Reference: `p-4`, `h3 font-bold text-lg`, "(N)" muted, right side = colored dot (w-3 h-3) + count (text-xs) + progress w-16 h-2 (track `#E1E5F3`, fill `#00C875`) + pct + trash. No left accent bar. Clone: thin left accent bar + name button + "(N) pct%" + w-24 progress. | Verified (reference DOM dump) | Restructure the group header to the reference layout, keep collapse + rename. |
| B9 | **Footer summary row missing.** Reference renders a `bg-gray-50` row after the add-task row: Task="N items", Priority=count badges ("1 low"), Status/Owner/Due Date="-" (cells `px-3 py-2 border-l`). | Verified (reference DOM probe) | Add per-group summary row in `board-table.tsx`. Pure seam: `groupSummary(tasks)` → items count + per-priority counts (test first). |
| B10 | **Add New Group button border.** Reference: dashed `#0073ea`. Clone: dashed default border. | Verified (computed border) | `border-dashed border-primary`. |
| B11 | **Login page styling.** Reference: page `bg-gradient-to-br from-slate-50 to-slate-100`; card `rounded-2xl shadow-2xl bg-white/95 backdrop-blur` with a 1px top gradient bar; large circular logo (h-20/24, gradient slate-100→200, dark "T", ring + blur halo); Google button white + border, `rounded-xl`; inputs carry mail/lock icons. Clone: flat bg, square blue logo, gray Google button, no input icons. | Verified (reference DOM) | Restyle `login-view.tsx` (structure unchanged, honest-UI unchanged). |
| B12 | **Boards page cards.** Reference card: folder icon on a tinted board-color square (12.5% alpha), h3 title, private badge + "about N hours ago", description, star + Options (Edit/Delete). No progress bar, no top color strip. Clone: letter tile, "private · 14 minutes ago", progress bar + "N/N done · pct%", top strip. | Verified (reference card DOM) | Match reference layout; keep the clone's functional Favorites filter (reference's own Filter button is inert — deliberate, documented deviation). Relative time gains the "about " prefix. |
| B13 | **Analytics details.** Reference stat icons: target / circle-check / clock / folder; section icons: activity / trending-up / chart-column; distribution dots w-4 h-4. Clone: clipboard-list / check-circle / alert-triangle / folder-kanban, dots h-2.5. | Verified (icon probes) | Swap icons; resize dots. |
| B14 | **Dashboard recent-board cards.** Reference: folder icon (board color), title, "Updated Sep 15, 2026", private badge; no description/progress/arrow. Clone shows description + progress + arrow. | Verified (reference card DOM) | Simplify to the reference layout. |
| B15 | **Kanban view chrome.** Reference: "Kanban Board" heading inside a lavender rounded container with icon + Status combobox; empty columns show a large colored disc + "Drag tasks here". Clone: plain h2; small placeholder. | Verified (VLM + DOM) | Wrap heading; enlarge the empty-column disc. |
| B16 | **Mobile drawer.** Reference has an "Open main menu" hamburger (Sheet drawer: Dashboard/My Boards/Analytics/Your Profile/Settings/Sign out). Clone has no hamburger. | Verified (mobile probes) | Add a Sheet-based drawer (vendored `sheet.tsx`) reusing the honest Profile/Settings toasts. |
| B17 | **Demo greeting identity.** Reference greets "sepnetflix2023!" (the account's name). Clone greets "Sep!" because the seed name is "Sep Netflix". | Verified (reference + `scripts/seed.ts` L160) | Seed the demo user as "sepnetflix2023" (data-level change; re-seed). |

### Deliberate deviations (not replicated — documented)

- Reference analytics "Priority Distribution" reported **Medium 1** while the task's
  priority is **Low** (reference-side inconsistency). We count actual priorities.
- Reference boards-page Filter button is inert; our Favorites filter is real.
- Reference popovers stay mounted in the DOM after Escape (focus-management quirk);
  we keep standard Radix dismiss behavior.
- Reference uses real routes (`/Boards`, `/Board?id=…`); we keep the single-route
  architecture per ADR-001 (deployment exposes only `/`).

### Phase C — hygiene

| ID | Finding | Fix |
|----|---------|-----|
| C1 | `next-env.d.ts` churns between `dev` and `build` type roots (working tree currently dirty from the dev server). | Restore the committed state before committing; never bundle into feature commits. |
| C2 | Docs drift after Phases A/B (features, tokens, file table). | Update README / AGENTS / CLAUDE / PAD (revision block v1.2) — Phase D. |

---

## Execution order (with gates after each phase)

1. **Phase A** — TDD seams first (`filterTasks`, `sortTasks`, `visibleColumns`,
   `groupSummary`, `VISIBILITY_OPTIONS` — red tests), then route/DTO changes
   (`updatedAt`, `visibility`), then components (edit-board-dialog, popovers, cells,
   toolbar scoping). Gate: `bun run lint && bun run typecheck && bun run test`.
2. **Phase B** — visual slices in dependency order (tokens → header/logo → hero →
   stat cards → boards/dashboard cards → table chrome → kanban/login/mobile).
   Gate: same + browser sweep of every view.
3. **Phase C/D** — hygiene + docs alignment.
4. **Final verification** — full gates + production build + fresh browser sweep
   (login → dashboard → boards → board: filter/hide/sort/edit-board/owner-search/date
   → kanban drag → reload → persistence against SQLite) + VLM side-by-side.
5. **Commit & push** — atomic Conventional Commits on `main`, pushed via
   `docs/ssh_git_wrapper_v3.py` with the externally-supplied key.

## Verification ledger (to be filled during execution)

| Check | Method | Result |
|-------|--------|--------|
| Unit suite (new seams) | `bun run test` | pending |
| Lint / typecheck | `bun run lint && bun run typecheck` | pending |
| Production build | `bun run build` | pending |
| Browser sweep | agent-browser, both apps side-by-side | pending |
| DB persistence of mutations | SQLite query after drag/edit | pending |
| Docs alignment | read-through of all four docs | pending |
