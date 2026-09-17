# Session 6 Remediation Plan — URL Routing, Board Chrome & Dashboard Parity

Probed live on 2026-09-17 against `https://tuesdaycom-a6700714.base44.app/`
(logged in as sepnetflix2023@outlook.com, viewport 1512×900). Every gap below
was verified with computed-style DOM probes on BOTH apps; VLM claims were only
accepted after probe confirmation (several were rejected as false positives —
e.g. the "FAB N button" is the Next.js dev-tools artifact; hero icon tile
already matches; kanban tile markup already matches).

## Corrections to session-5 understanding

- **The reference's real route surface** (mis-modeled as `/boards/:slug` in
  session 4/5 — the title pattern `"<Titlecased path> | Task Management"` on
  the styled 404 page masked it):
  - `/` and `/Dashboard` → dashboard, title `Task Management`
  - `/login` → login (renders the login form even when authed)
  - `/Boards` → boards list, title `Boards | Task Management`
  - `/Board?id=<entityId>` → board detail, title `Board | Task Management`
    (sub-views are client state — URL never changes)
  - `/Analytics` → analytics, title `Analytics | Task Management`
  - unknown paths → styled 404, title `<Titlecased last segment> | Task Management`
  - paths are case-insensitive (`/boards` == `/Boards`)
  - logged-out visits to protected routes redirect to
    `/login?from_url=<original>` and return after sign-in
  - `/Board` (no id) → stuck "Loading board…"; `/Board?id=<unknown>` →
    in-app "Board not found" card with a "Back to Boards" button
- The blue `h-1` strip on the board header is a **static accent**, not a
  scroll-progress bar (verified: full width, no transform, unchanged on scroll).
- The boards-page **Filter button is dead UI** on the reference (opens nothing).
- Recent Activity on the dashboard lists **recently-updated tasks**
  (title + absolute time, clock icon) — not an event log.

## Verified gaps (30)

### A. Routing & document shell (functional) — gaps 1–4
1. Real URL routes: dashboard `/`, login `/login`, boards `/Boards`,
   board `/Board?id=`, analytics `/Analytics`; browser back/forward works;
   nav links are real anchors (`/Dashboard`, `/Boards`, `/Analytics`).
2. Styled 404 page (slate palette): `min-h-screen flex items-center justify-center
   p-6 bg-slate-50`; `max-w-md` card; `text-7xl font-light text-slate-300` "404";
   `h-0.5 w-16 bg-slate-200` divider; `text-2xl font-medium text-slate-800`
   "Page Not Found"; message `The page "<path>" could not be found in this
   application.` with path in `font-medium text-slate-700`; "Go Home" button
   (white, border-slate-200, home icon `w-4 h-4 mr-2`) → `/`.
3. Per-route titles: `Task Management` (dashboard, login), `Boards | Task
   Management`, `Board | Task Management`, `Analytics | Task Management`,
   404 → `<Titlecased segment> | Task Management`. Root title becomes
   `Task Management` (drop the "Tuesday.com — " prefix).
4. Login redirect: logged-out users on protected routes land on
   `/login?from_url=<original>` and are returned after sign-in.

### B. Board header, toolbar & page shell — gaps 5–11
5. View trigger: constant `Table2` icon `w-3 h-3 mr-1` + chevron `w-3 h-3 ml-1`
   (never per-view icons); `bg-[#E1E5F3]`; h 24px; `12px/500`; text `#171717`;
   `px-2` (0 8px); radius 6px; no border.
6. Favorite button: compact pill h 24px, `12px/500`, `px-2`; icon `w-3 h-3 mr-1`;
   unfavored color `#676879` (text+icon); favored color `#ca8a04` (text+icon,
   `fill-current`).
7. `N items` / `Saved` meta spans: `text-[#A0A0A0]` 12px.
8. Right buttons (Analytics/Integrate/Automate): white bg, 1px `#E1E5F3` border,
   h 32px, `12px/500`, `px-3`, text `#0a0a0a`, icons `w-3 h-3 mr-1`
   (trending-up / activity / zap).
9. Back arrow: `<a href="/Boards">` wrapping an `h-9 w-9` button with
   `hover:bg-[#E1E5F3] rounded-lg transition-all hover:scale-105`;
   `arrow-left w-4 h-4`.
10. Board page shell: outer `sticky top-0 z-20 bg-[#F5F6F8] pb-4` wrapper
    around the full-width (edge-to-edge) white `sticky top-16 z-40 shadow-sm
    border-b border-[#E1E5F3]` header; content zone `px-6 py-6`; blue `h-1`
    accent STATIC full-width `bg-[#0073EA]` (remove scroll-progress transform);
    toolbar card `mb-6`.
11. Toolbar: ONE left-packed row `[New Task | search (w-64/256px) | Person |
    Filter | Sort | Hide | Group by]` inside the `flex items-center justify-between
    mb-6 bg-white rounded-xl p-4 shadow-sm border border-[#E1E5F3]` card;
    controls are h-10 `px-4 rounded-lg border-[#E1E5F3]` outline buttons;
    New Task button h-10 `rounded-lg px-4` with `plus w-4 h-4 mr-2`.

### C. View surfaces — gaps 12–14
12. Kanban "Group by" Select trigger: add `List` icon `w-4 h-4` inside
    (reference renders list icon + Status + chevron).
13. Calendar today cell: add `ring-2 ring-[#0073EA]` around the whole cell
    (clone currently only colors the number).
14. Analytics completion bar: fill `bg-[#171717]` (near-black), `h-full w-full
    flex-1 transition-all`, `transform: translateX(-{100-value}%)` — invisible
    at 0% (clone renders a blue width-based fill).

### D. Boards page — gaps 15–16
15. Replace the "Favorites" filter toggle with a "Filter" button
    (funnel `lucide-filter w-4 h-4 mr-1.5`, h-10 outline `border-[#E1E5F3]`
    `text-[#323338]` styling). The reference's Filter is dead UI — keep the
    clone's button non-mutating to match (documented).
16. Board cards (grid + list): remove the gold favorite star from the timestamp
    zone (reference shows none even for favorited boards — verified by a
    controlled favorite experiment, reverted); add `Calendar` icon `w-3.5 h-3.5`
    before the relative timestamp.

### E. Dashboard — gaps 17–23
17. Page shell: `p-4 md:p-8` OUTSIDE the `max-w-7xl mx-auto space-y-8`
    container (clone puts responsive padding on the container itself).
18. Stat cards: full reference structure — `group perspective-1000` wrapper;
    gradient card `bg-gradient-to-br from-X-500 to-X-600 hover:from-X-600
    hover:to-X-700 shadow-lg hover:shadow-2xl border-0 rounded-xl
    overflow-hidden cursor-pointer transform-gpu`; `p-4 relative` zone with
    two deco discs (`w-16 h-16 bg-white/10` top-right, `w-12 h-12 bg-white/5`
    bottom-left, `group-hover:scale-150`); hover particle container (6 ×
    `w-1 h-1 bg-white/40` dots); `relative z-10` content: header row
    `flex items-center justify-between mb-3` with `w-10 h-10 bg-white/20
    backdrop-blur-sm rounded-lg border border-white/20 shadow-lg` icon tile +
    `w-6 h-6 bg-white/10` deco dot; value zone `space-y-1` with
    `text-xs font-medium text-white/80` label + `text-2xl font-bold` value.
    Gradients: blue (Total Boards, folder), green (Completed, circle-check),
    amber→orange (Pending, clock), purple (Rate, trending-up).
19. Hero: buttons h-10 (primary `bg-[#0073EA] hover:bg-[#0056B3]`, outline
    secondary); h1 `text-2xl md:text-3xl font-bold text-[#323338] leading-tight`
    (no tracking-tight); p `text-[#676879] text-base mt-1`.
20. Side cards: gradient cards `border-0 shadow-lg backdrop-blur-sm` — Recent
    Boards `to-indigo-50/30`, Quick Actions `to-purple-50/30`, Recent Activity
    `to-green-50/30` (all `from-white via-white`); headers `p-6 pb-6`/`pb-4`
    with `w-12 h-12 rounded-xl shadow-lg` gradient tiles (indigo→purple folder,
    purple→pink zap, green→teal activity); titles `tracking-tight text-xl/lg
    font-bold text-[#323338]`; subs `text-sm text-[#676879]`.
21. Quick action items: gradient buttons `from-blue-500 to-cyan-500` (Create
    Board, plus), `from-green-500 to-emerald-500` (Invite Team, users),
    `from-amber-500 to-orange-500` (Calendar, calendar), `from-purple-500
    to-pink-500` (Analytics, chart-column); `flex items-center gap-4 p-4
    rounded-xl shadow-md hover:shadow-lg text-white`; `w-10 h-10 bg-white/20
    backdrop-blur-sm rounded-lg border border-white/20` icon tiles; title
    `font-medium text-white`, sub `text-sm text-white/80`.
22. Recent Activity rows: recently-updated TASKS — `flex items-center gap-3 p-3
    rounded-lg hover:bg-gradient-to-r hover:from-blue-50/50
    hover:to-green-50/50` rows; `w-8 h-8 rounded-full shadow-lg
    bg-gradient-to-r from-gray-500 to-slate-500` tile with `clock w-4 h-4`;
    title `text-sm font-medium text-[#323338] truncate`; time
    `text-xs text-[#676879]` in absolute `Sep 17, 1:36 AM` format. Dashboard
    API changes: return recent tasks (title + updatedAt) instead of the event
    log.
23. Recent Boards card header: `p-6 pb-6`, w-12 indigo→purple tile, title
    `text-xl`; items keep current hover treatment, add `group-hover:shadow-md`.

### F. Login — gaps 24–28
24. Sign in button: `bg-slate-900` (rgb(15,23,42)), h-12, `rounded-xl`,
    text-only (remove the arrow icon).
25. Footer links zone: `flex flex-col sm:flex-row items-center justify-between
    gap-2 sm:gap-0`; links `text-sm text-slate-500 hover:text-slate-700`
    ("Forgot password?" `font-medium`); "Sign up" span `font-medium
    text-slate-700` (no blue).
26. Remove the extra footer line "Tuesday.com — manage boards, tasks, and
    teamwork in one place." (reference has none).
27. Email/password inputs: h-12 (48px), `bg-slate-50/50`, `border-slate-200`,
    `rounded-xl`.
28. Logo letter: `text-xl sm:text-2xl` (clone renders text-2xl/3xl).

### G. Data & housekeeping — gaps 29–30
29. Delete the 3 ZZ round-trip test-residue rows from the Activity table
    (task_created/group_created/task_completed for "ZZ…").
30. `/Board` with missing/unknown id: render the reference's in-app
    "Board not found" card (`p-8 bg-[#F5F6F8] min-h-screen`, centered
    `text-2xl font-bold` heading, blue `Back to Boards` button) instead of a
    bare 404.

## Deliberate deviations (kept, documented in PAD §10)

- Unassigned Tasks view renders a helpful task list (reference renders an
  empty div — dead UI).
- Clone keeps functional toolbar menus (Person/Filter/Sort/Hide/Group by work);
  reference's boards-page Filter button is dead UI — we match its look, keep
  it non-mutating.
- Favorites remain toggleable from the board header; the boards page Filter
  button replaces the Favorites filter (star badges stay on dashboard/board
  surfaces where the reference shows them).
- Status↔completed coupling, timeline due-date bars, real priority counts,
  Radix dismiss, hover clear-X on dates (all pre-existing deviations).

## Execution order (TDD)

- Phase A — domain tests first (route titles, 404 titlecase helper, activity
  time format), then routing restructure (`/login`, `/Boards`, `/Board`,
  `/Analytics`, `not-found.tsx`, rewrites for case-insensitivity, auth
  redirect with `from_url`, per-route titles, nav anchors).
- Phase B — board header/toolbar/shell specs (gaps 5–11).
- Phase C — kanban select icon, calendar ring, analytics bar (gaps 12–14).
- Phase D — boards page Filter + timestamp (gaps 15–16).
- Phase E — dashboard overhaul (gaps 17–23) incl. dashboard API recent-tasks.
- Phase F — login specs (gaps 24–28).
- Phase G — data cleanup (gap 29) + full gates + live verification of every
  gap via DOM probes on the running clone.
- Phase H — docs alignment (README, AGENTS, CLAUDE, PAD v1.5).

## Validation checklist (all must pass before push)

- [x] `bun run lint` exit 0
- [x] `bun run typecheck` exit 0
- [x] `bun test` — all green (69/69, new seams included)
- [x] `bun run build` green
- [x] Deep-link round-trip: /Boards, /Board?id=<real>, /Analytics, /login
      render the right views; unknown path renders the styled 404; back /
      forward navigation works; titles correct on every route
- [x] Logged-out /Boards → /login?from_url → sign-in returns to /Boards
- [x] Live computed-style probes for gaps 5–28 match the specs above
      (corrections found during execution: trigger text #676879 with
      hover #E1E5F3 — not #171717/tinted bg; Analytics/Integrate/Automate
      carry colored hover borders; the blue h-1 strip is a BINARY
      has-scrolled marker — scaleX(0) at rest, full width at
      window.scrollY ≥ 32 — NOT a static bar and NOT a scroll-progress
      scale; page scrolls on the BODY, main's overflow is inert on
      min-h-screen pages; hero icon is Sparkles)
- [x] ZZ activity rows gone (3 rows deleted from the live DB, seed clean)
- [x] Docs updated (README, AGENTS, CLAUDE v1.2.0, PAD v1.5); secret scan clean
- [x] VLM side-by-side (ignore-data prompt): board table MATCH, dashboard MATCH
