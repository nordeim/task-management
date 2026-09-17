# Session 7 Remediation Plan — Reference Drift & Token-Level Parity

Probed live on 2026-09-17 against `https://tuesdaycom-a6700714.base44.app/`
(logged in as sepnetflix2023@outlook.com, viewport 1440×900, plus a 375×812
mobile pass). Every gap below was verified with computed-style DOM probes on
BOTH apps; VLM claims were only accepted after probe confirmation. Where the
reference's behavior could only be observed through controlled experiments
(API-assigned owner / due-date, then reverted), the reference was restored to
its original state afterwards and re-verified clean.

## Corrections to session-6 understanding

- **Nav active state is NEW reference drift.** The reference NOW highlights
  the current route's nav link — `bg-[#E1E5F3] text-[#0073EA]` — on an exact,
  case-sensitive `pathname === href` match (verified on `/Boards`,
  `/Analytics`, `/Dashboard`; NOT on `/` — Dashboard's href is `/Dashboard` —
  not on `/Board?id=`, and not on lowercase paths). Session 5/6 documented
  "no active-state highlight"; that invariant is now obsolete.
- **The reference's team avatars are hardcoded mock data** in their bundle:
  `[{id:1,name:"John Doe",avatar:"JD",online:true,role:"Owner"}, …]`. The
  logged-in user ("U", sepnetflix2023) is NOT part of that team array. Avatar
  colors are position-based in the header row (`bg-blue-500`, `bg-green-500`,
  `bg-purple-500`) and `id % 3`-based inside the team popover — i.e. unstable
  mock colors, not a per-user palette.
- **The reference's mobile menu is an inline collapsible panel** under the
  header (classic Tailwind-UI pattern, conditionally rendered), not a Sheet.
- **The reference's `--primary` is shadcn's near-black** (`0 0% 9%`), and
  `--foreground`/`--accent` are shadcn defaults too; every blue in their UI is
  hardcoded (`bg-[#0073EA]`, `text-[#0073EA]`). The clone customized the
  shadcn tokens to a blue palette — correct in explicit-class spots, but
  subtly wrong wherever shadcn primitives inherit (checkbox checked state,
  button label colors, primitive hover tints).
- The row-empty **Owner cell renders an affordance** (user icon + "Assign",
  `text-[#676879]`, hover `bg-[#E1E5F3]`) — same shape as the already-matched
  Date cell ("Set date").
- The **summary row's Owner/Date cells render aggregates**, not dashes:
  users icon `w-3 h-3` + "N people"; calendar icon `w-3 h-3` + "Sep 25", or
  "Sep 18 - Sep 25" when the min/max due dates differ; dash only when empty.
- The **row trailing action is a small Trash2 dropdown trigger**
  (`w-3 h-3 text-[#676879]` in a hover-revealed `h-6 w-6` ghost button,
  `hover:bg-[#E1E5F3]`), opening a single "Delete Task" item — not an
  ellipsis. The reference's delete itself is broken (client-side only, no
  API call — task reappears on reload); the clone keeps its working delete
  (documented deviation).
- **Calendar grid renders exactly the weeks needed** (35 cells / `grid-rows-5`
  for Sep 2026), not a fixed 42.
- New reference-side quirks confirmed and documented as deliberate deviations:
  reference never updates `document.title` on SPA navigation; `/Board` without
  id hangs forever on "Loading board…"; reference row-trash delete is
  non-persistent; the user menu items are dead links to `/Board`.

## Verified gaps (18)

### A. Navigation & header — gaps 1–4
1. **Nav active state (desktop)**: `px-3 py-2 rounded-md text-sm font-medium
   transition-colors` + active `bg-[#E1E5F3] text-[#0073EA]` (replacing
   `text-[#323338] hover:bg-[#F5F6F8] hover:text-[#0073EA]`); computed from
   exact case-sensitive `pathname === href`, not from the derived view.
2. **Mobile nav**: replace the Sheet with the reference's inline collapsible
   panel (`md:hidden border-t border-[#E1E5F3]`, conditionally rendered,
   hamburger is a `h-10 w-10` ghost `hover:bg-[#E1E5F3] rounded-lg` button
   whose icon swaps Menu↔X, sr-only "Open main menu"). Panel sections:
   nav links (`block px-3 py-2 rounded-md text-base font-medium …` + same
   active rule) in `px-2 pt-2 pb-3 space-y-1 sm:px-3`; mobile search
   (`pt-4 pb-3 border-t border-gray-200`, input `block w-full pl-10 pr-3
   py-2 h-9 border border-gray-300 rounded-md leading-5 bg-white
   placeholder-gray-500 focus:ring-1 focus:ring-[#0073EA]
   focus:border-[#0073EA] sm:text-sm`, icon `absolute left-0 pl-3 h-5 w-5
   text-gray-400`); user section (`pt-4 pb-3 border-t border-gray-200`,
   `flex items-center px-5`, 40px gradient avatar `w-10 h-10
   bg-gradient-to-r from-[#0073EA] to-[#00C875]` + `text-white font-bold
   text-sm` initial, name/email `text-base font-medium text-gray-800` /
   `text-sm font-medium text-gray-500`, bell ghost button `ml-auto
   hover:bg-[#E1E5F3] rounded-lg h-10 w-10` + `Bell w-5 h-5
   text-[#676879]`); footer links `mt-3 px-2 space-y-1` — Your Profile /
   Settings / Sign out (`block px-3 py-2 rounded-md text-base font-medium
   text-gray-700 hover:text-gray-900 hover:bg-gray-50`).
3. **Header user avatar**: 32px gradient — `w-8 h-8 bg-gradient-to-r
   from-[#0073EA] to-[#00C875] rounded-full flex items-center justify-center`
   + `text-white font-bold text-xs` initial (replaces the 36px solid
   avatarColor Avatar).
4. **User menu**: label is the plain "My Account" (`px-2 py-1.5 text-sm
   font-semibold`), ONE separator after it, then Your Profile / Settings /
   Sign out as standard-color items (no icons, no red Sign out, no second
   separator). Profile/Settings keep the honest "not configured" toasts;
   Sign out keeps working (documented deviations).

### B. Board header & team — gaps 5–6
5. **Team avatar row**: wrapper `flex items-center -space-x-2 cursor-pointer`;
   first 3 members as `w-8 h-8 rounded-full border-2 border-white flex
   items-center justify-center text-white text-xs font-medium relative` +
   position colors (`bg-blue-500` / `bg-green-500` / `bg-purple-500`) +
   `transition-transform hover:scale-110 hover:z-10 active:scale-95`;
   presence dot only when the member is online — `absolute -bottom-0.5
   -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border border-white`
   (1px border); overflow chip `w-8 h-8 rounded-full bg-gray-400 border-2
   border-white flex items-center justify-center text-white text-xs` → "+N".
6. **Team popover** (per-avatar trigger, `w-80`): header `flex items-center
   justify-between` → `h4 font-medium` "Team (N)" + Invite button (outline
   `h-8 rounded-md px-3 text-xs border-[#E1E5F3] hover:border-purple-500`,
   UserPlus `w-3 h-3 mr-1`); members `space-y-2 max-h-64 overflow-y-auto` →
   rows `flex items-center justify-between p-2 rounded-lg hover:bg-gray-50`
   with `flex items-center gap-3` avatar (`w-8 h-8 rounded-full … relative` +
   id-mod-3 colors) + presence dot `w-2 h-2`, name/role (`text-sm
   font-medium` + `text-xs text-gray-500`), and right-aligned `flex
   items-center gap-1` ghost icon buttons `h-6 w-6` (Mail `w-3 h-3`,
   MessageSquare `w-3 h-3`). Requires `role` + `online` on the User model
   (schema + seed + DTO + API selects).

### C. Board table — gaps 7–12
7. **Checkbox**: shadcn base aligned to the reference's older shadcn style —
   `h-4 w-4 shrink-0 rounded-sm border border-primary shadow` +
   `data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground`;
   the task-row instance drops its green overrides (`#00c875`) so the
   checked state renders near-black `#171717`.
8. **Task-row rails**: HandleRail carries zone-level `cursor-grab
   hover:cursor-grabbing opacity-0 group-hover:opacity-100
   transition-opacity p-1 bg-white group-hover:bg-[#F5F6F8]`; CheckRail
   `bg-white group-hover:bg-[#F5F6F8]`; spacer `flex-1 min-w-0 bg-white
   group-hover:bg-[#F5F6F8]`; ActionRail gains `border-l border-[#E1E5F3]
   bg-white group-hover:bg-[#F5F6F8]` (all as classes, replacing inline
   styles, so group-hover works).
9. **Row trailing action**: ghost trigger `h-6 w-6 opacity-0
   group-hover:opacity-100 transition-opacity hover:bg-[#E1E5F3]` with
   `Trash2 w-3 h-3 text-[#676879]` (replaces the ellipsis); the menu's
   single "Delete Task" item loses its destructive red (standard color) but
   keeps the working API delete.
10. **Add-task row**: all zones transparent (no rail backgrounds); the task
    zone is `flex-1 px-3 py-2` (not a fixed-width sticky cell), matching the
    reference's row anatomy.
11. **Summary row aggregates**: Owner cell → users icon `w-3 h-3` + "N
    people" (`flex items-center gap-1 text-xs text-gray-600`), dash when
    none; Date cell → calendar icon `w-3 h-3` + "Sep 25", or "Sep 18 -
    Sep 25" when min ≠ max due dates, dash when none.
12. **Board title edit input**: reference spec — `flex rounded-md border
    border-input bg-transparent px-3 py-1 shadow-sm text-xl font-bold h-8
    w-64` + `focus-visible:ring-1 focus-visible:ring-ring` (replaces
    `border-none bg-accent ring-1 ring-primary/40`).

### D. Owner cell — gap 13
13. **OwnerCell rendering**: empty state = the affordance (`cursor-pointer
    text-[#676879] hover:bg-[#E1E5F3] hover:rounded px-2 py-1 -mx-2 -my-1
    transition-colors flex items-center gap-2` + `User w-4 h-4` +
    "Assign"); assigned state = `cursor-pointer hover:opacity-80
    transition-opacity` wrapper → `flex items-center gap-2` → `w-6 h-6
    bg-[#0073EA] rounded-full flex items-center justify-center` avatar with
    `text-white text-xs font-medium` initial + `text-[#323338] text-sm`
    name. Picker behavior unchanged (working member search).

### E. Calendar — gaps 14–16
14. **Dynamic week count**: render `ceil((firstWeekdayOffset +
    daysInMonth) / 7)` weeks (35 cells for Sep 2026), not a fixed 42.
15. **Cell anatomy**: every cell renders a bare number `<span
    class="text-xs font-medium">` (in-month inherits foreground `#0a0a0a`;
    out-month cell adds `text-gray-400` with solid `bg-[#F9FAFB]`, not
    `/60` alpha) + events container `mt-1 space-y-1 overflow-y-auto
    max-h-[70px]`; today cell keeps `bg-white ring-2 ring-[#0073EA]
    ring-inset` + blue number; the extra "Add task today" plus button is
    removed.
16. **Weekday row**: `grid grid-cols-7 text-center text-xs font-medium
    text-[#676879] mb-2` with `py-2 border-b` cells (replaces
    `text-muted-foreground`, no border).

### F. Design tokens — gaps 17–18
17. **Token realignment** (globals.css, both theme blocks): `--primary:
    0 0% 9%`, `--primary-foreground: 0 0% 98%` (light) / inverted in dark;
    `--ring: 0 0% 3.9%`; `--foreground` / `--card-foreground` /
    `--popover-foreground: 0 0% 3.9%`; `--accent: 0 0% 96.1%` +
    `--accent-foreground: 0 0% 9%`; `--secondary: 0 0% 96.1%`;
    `--muted-foreground: #676879` (the reference's dominant explicit gray).
    Rationale: the reference keeps shadcn's neutral tokens and hardcodes
    blues; the clone's customized blue tokens leak into every inheriting
    primitive (checkbox, button labels, hover tints, focus rings).
    `--background`, `--border`, `--input`, `--destructive` stay customized
    (visually equivalent where probed; documented).
18. **Blue-semantics sweep**: every app-level `text-primary` /
    `border-primary` / `ring-primary/30` usage becomes explicit
    `text-[#0073EA]` / `border-[#0073EA]` / `ring-[#0073EA]/30`
    (~25 spots: picker checkmarks, toolbar active borders, dashboard link,
    boards-card hover, kanban drag-over ring) so the token change cannot
    alter any explicitly-blue surface.

## Deliberate deviations (documented, not fixed)

- Working row delete vs the reference's client-side-only trash.
- Working Sign out (redirects to /login) vs the reference's cookie-clear +
  dead `/Board` navigation.
- Toasts for Profile/Settings/Integrate/Automate vs dead links.
- Real user data in the team row vs hardcoded mock members ("User Name" /
  "user@example.com" placeholders in the reference's mobile panel).
- SPA-nav title updates (reference keeps stale titles).
- `/Board` without id renders the "Board not found" card instead of hanging.

## TDD seams (domain.ts)

- `isNavActive(pathname, href)` — exact case-sensitive equality.
- `calendarCells(cursor)` — dynamic week-count day array.
- `summaryDateLabel(dates)` — "" / "Sep 25" / "Sep 18 - Sep 25".
- `summaryOwnerLabel(owners)` — "" / "N people".
- `teamAvatarPalette(index)` — position colors for the header row.
- `memberPopoverPalette(id)` — id-mod-3 colors for the popover.

## Verification plan

1. `bun run lint`, `bunx tsc --noEmit`, `bun vitest run` after each phase.
2. agent-browser DOM probes on the clone asserting the new class strings.
3. Side-by-side screenshots (desktop board table + calendar + boards +
   dashboard; mobile 375×812 nav panel) compared against fresh reference
   captures.
4. Controlled interaction pass: nav clicks highlight the right link; `/`
   shows none; checkbox toggles near-black; row trash menu deletes for real;
   summary aggregates update live.
