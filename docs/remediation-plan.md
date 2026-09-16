# Remediation Plan — Tuesday.com Clone Parity & Quality Pass

**Date:** 2026-09-16 · **Author:** AI coding agent session 2
**Inputs:** full codebase audit, live reference walkthrough
(`https://tuesdaycom-a6700714.base44.app/`, logged in), scandihaven
standards analysis, repo skills (`tdd-workflow`, `verification-and-review-protocol`,
`plan-writing`, `lint-and-validate`, `code-quality-standards`).
**Method:** TDD (red → green → refactor) at pre-agreed pure seams; honest gates
(never weaken a rule to pass); Conventional Commits; SSH-wrapper push.

---

## Findings summary (severity: Critical / High / Medium / Low)

| # | Sev | Finding | Evidence |
|---|-----|---------|----------|
| C1 | Critical | ESLint config has ~30 quality rules disabled (`no-explicit-any`, `no-unused-vars`, `no-console`, `no-debugger`, `no-undef`, `no-unreachable`, `exhaustive-deps`, `purity`, `prefer-const`, …) — contradicts AGENTS/CLAUDE/PAD gate claims | `eslint.config.mjs` |
| C2 | Critical | `tsconfig.json` sets `noImplicitAny: false` under `strict: true`; `include: ["**/*.ts"]` pulls `skills/` into `typecheck` → gate exits 1 (2 errors in `skills/`) | `tsconfig.json`; `bun run typecheck` |
| H1 | High | Timeline view is a sorted list; reference is a Gantt timeline (Day/Week/Month zoom, day columns, "Week of X" header, Today button, empty state "No items with valid start and end dates…") | ref screenshots + a11y tree |
| H2 | High | Kanban lacks "Kanban Board" heading + subtext, Group-by combobox (Status/People), and colored empty-column placeholders | ref kanban walkthrough |
| H3 | High | Analytics stat cards are white w/ tinted icons; reference = solid colored cards (blue/green/red/purple, white text, progress bar inside completion card). Distributions are recharts donuts; reference = horizontal progress bars | ref screenshots + pixel check |
| H4 | High | Calendar grid is Mon-first; reference is Sun-first | ref a11y: "Sun Mon Tue …" |
| H5 | High | 15 dependencies have zero imports (`@tanstack/react-query`, `@tanstack/react-table`, `@mdxeditor/editor`, `framer-motion`, `next-auth`, `next-intl`, `react-markdown`, `react-syntax-highlighter`, `sharp`, `uuid`, `z-ai-web-dev-sdk`, `zustand`, `@reactuses/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`) | import scan of `src/` + `scripts/` |
| H6 | High | No automated test suite; `docs/how-to-git-push…` references nonexistent `test`/`e2e:all` scripts and a `verify-gate.yml` CI | `package.json`, `.github/` absent |
| M1 | Medium | Dashboard hero subtitle missing "You have N tasks waiting." | ref a11y |
| M2 | Medium | Board header missing "N items ▪ Saved HH:MM:SS" autosave indicator | ref a11y |
| M3 | Medium | Board toolbar missing "Group by" control (Default Groups / Status / Person / Priority) | ref popover: "Group By / Default Groups / Status / Person / Priority" |
| M4 | Medium | "Person" button filters to unassigned (`t.owner === null`); reference opens a "Filter by Person" popover | ref popover: "Filter by Person" |
| M5 | Medium | Dashboard Recent Boards item format differs (ref: "Updated Sep 15, 2026" + lock-icon visibility pill) | ref screenshots |
| M6 | Medium | Header dead controls: bell toggles a fake unread dot; Help/Settings silently navigate to dashboard; header search is inert; user-menu Profile/Settings navigate to dashboard | `app-header.tsx` |
| M7 | Medium | `board-kanban.tsx` hardcodes priority arrays + `#d0d4e1` (violates closed-vocabulary invariant in AGENTS.md) | `board-kanban.tsx:85-95` |
| M8 | Medium | `src/app/api/route.ts` is a dead "Hello, world!" scaffold that breaks the ActionResult contract | file |
| M9 | Medium | `Sort` state named `sortDesc` but sorts ascending; sorting only affects kanban, not the table | `board-view.tsx:134-136` |
| L1 | Low | PAD §11 line counts drift (domain.ts 190 vs 148 etc.) | PAD |
| L2 | Low | Reference boards page labels its filter "Filter" (ours: "Favorites") — equivalent function | ref a11y |
| — | Info | Reference avatars carry decorative presence dots — deliberate deviation: we do not fake presence data (honesty principle, CLAUDE.md) | decision |

---

## Work plan (ordered; each item = one TDD/verify cycle = atomic commit(s))

### Phase A — Honest gates & hygiene (foundation)

- **A1** `tsconfig.json`: remove `noImplicitAny: false`; add `"skills"` (and
  `docs`) to `exclude` so the type gate covers app code only, per the
  repo-owner rule that `skills/` is outside checking/testing/compilation.
  *Verify:* `bun run typecheck` exits 0.
- **A2** `eslint.config.mjs`: drop the mass rule-off block; keep only
  `eslint-config-next` core + typescript defaults, with at most a documented,
  minimal exception list. Fix every surfaced violation in `src/` by fixing
  code (no suppressions). *Verify:* `bun run lint` exits 0.
- **A3** `bun remove` the 15 zero-import deps (H5). Keep shadcn-scaffold deps
  (used by vendored `ui/` primitives). *Verify:* `bun run build` still green;
  `bun pm ls` shows them gone.
- **A4** Delete `src/app/api/route.ts`. *Verify:* `bun run build` green.
- **A5** Fix `docs/how-to-git-push-using-ssh-wrapper_SKILL.md` drift
  (wrong repo name, nonexistent CI/scripts).

### Phase B — Test infrastructure + pure-seam extraction (TDD)

- **B1** `bun add -d vitest`; add `test` script; `vitest.config.ts` excluding
  `skills/**`; tests colocated as `src/lib/*.test.ts`.
- **B2 (RED)** Write failing tests for new pure helpers:
  - `resolveStatusCompletedPatch(patch)` — the status↔completed coupling as ONE
    exported pure function (today it is duplicated server/client);
  - `timelineRange(mode, cursor)` — Day/Week/Month window math for the Gantt;
  - `groupTasksByStatus(tasks)` / `groupTasksByPerson(tasks, members)` — kanban
    groupings incl. the "Unassigned (No one assigned)" bucket;
  - `distributionBars(dist)` — bar-row models + percentage math for analytics;
  - `formatSavedAt(date)` — "Saved h:mm:ss a" indicator string.
- **B3 (GREEN)** Implement in `src/lib/domain.ts`; refactor
  `tasks/[id]/route.ts` + `board-view.tsx` to consume the shared coupling
  helper (removes the documented duplication risk).

### Phase C — Visual & functional parity (reference clone fidelity)

- **C1** Board header: add `N items ▪ Saved h:mm:ss a` indicator (updates on
  every successful load/mutation).
- **C2** Toolbar: replace the unassigned-toggle "Person" button with a
  "Filter by Person" popover (member list, single-select + clear; honest
  "No people assigned yet" empty state); add "Group by" popover
  (Default Groups / Status / Person / Priority) that regroups the Main Table.
- **C3** Sort: honest ascending/descending title sort, applied to table +
  kanban, `aria-pressed` toggling.
- **C4** Kanban: "Kanban Board" heading + "Drag and drop to manage your
  tasks" subtext + "Group by" combobox (Status/People); People mode shows
  per-member columns + "Unassigned (No one assigned)"; empty columns render
  the reference placeholder (soft colored disc + plus + "Drag tasks here or
  click + to add new"); priority dots derive from `TASK_PRIORITIES`.
- **C5** Calendar: Sun-first grid; header reduced to ‹ "September 2026" ›.
- **C6** Timeline: real Gantt — mode combobox (Day/Week/Month), "Week of …"
  header + prev/next + Today, day-column grid, status-colored bars on due
  dates, reference empty state text.
- **C7** Analytics: solid stat cards (blue/green/red/purple, white text,
  progress bar inside Completion Rate card); distributions as horizontal bars
  (dot + label + bar + count); board performance unchanged; remove `recharts`
  + `src/components/ui/chart.tsx` once unused.
- **C8** Dashboard: hero subtitle "… You have N tasks waiting."; Recent
  Boards items switch to reference format ("Updated Sep 15, 2026", visibility
  pill w/ lock icon, chevron) — keep the progress bar (parity + utility).
- **C9** Header honesty: bell → notifications popover with honest empty
  state; Help/Settings → honest "not configured" toasts (same pattern as
  Integrate/Automate); header search → Enter jumps to My Boards and applies
  the query; user-menu Profile/Settings → honest toasts.

### Phase D — Documentation alignment

- **D1** README: feature table (Gantt timeline, kanban grouping, analytics
  bars), stack table (drop recharts), Testing section (vitest + gates).
- **D2** AGENTS.md: commands (+ `bun run test`), corrected ignores note,
  `skills/` excluded from tsc/eslint/vitest gates.
- **D3** CLAUDE.md: testing strategy update (suite now exists; red-first
  rule), stack lines.
- **D4** PAD: §1.2 stack, §3.2 tree, §5 design system (analytics cards), §7
  testing, §10 known issues, §11 key-file counts; record the two deliberate
  deviations (no fake presence dots; unassigned view keeps a helpful empty
  state where the reference renders an empty div).

### Phase E — Verification & ship

- **E1** Gates: `bun run lint && bun run typecheck && bun run test && bun run build`.
- **E2** agent-browser E2E over every changed surface + DB persistence check
  (kanban drag → SQLite row, group collapse, task CRUD).
- **E3** Worklog update; Conventional-Commits atomic commits on `main`;
  push via `docs/ssh_git_wrapper_v3.py --key-stdin`.

---

## Validation against the codebase (pre-execution alignment pass)

- Confirmed touch points exist: `eslint.config.mjs` (rule-off block),
  `tsconfig.json` (`noImplicitAny:false`, include `**/*.ts`), dead
  `src/app/api/route.ts`, `board-view.tsx` toolbar block (lines ~441-483),
  `board-kanban.tsx` (no heading/combobox; hardcoded priority arrays),
  `board-calendar.tsx` (`WEEKDAYS` Mon-first, Today button, legend),
  `analytics-view.tsx` (white cards, donuts, recharts imports),
  `dashboard-view.tsx` (subtitle line 140, board item lines 229-273),
  `app-header.tsx` (bell/help/settings/search blocks).
- Confirmed invariants preserved by the plan: single-route architecture
  (no new pages), ActionResult envelope on every endpoint, Zod parsing,
  ownership checks, status↔completed coupling (centralized, not changed),
  closed vocabulary (kanban fix strengthens it), Tailwind v4 CSS-first
  tokens (new colors go through `domain.ts`/existing tokens), no new page
  routes, `skills/` untouched by gates.
- Dependency removals verified against import scan; `recharts` removal is
  gated on C7 landing (only consumer besides vendored `ui/chart.tsx`, which
  is itself unreferenced by app code and will be removed with it).
- Risk notes: re-enabled lint rules may surface violations in `src/` —
  they will be fixed in code, not suppressed; `react-hooks/exhaustive-deps`
  will require `useCallback`-wrapping the `applyResult` helpers (behavior
  unchanged).
