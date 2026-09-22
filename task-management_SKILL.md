---
name: task-management
description: "Tuesday.com — a monday.com-style task management platform: Next.js 16.1.3 + React 19.2 + Tailwind v4 CSS-first (plain :hover variant, v3 space-y semantics, v3→v4 shadow/blur renames incl. the v3-play-CDN platform login page) + Prisma 6.19/SQLite (repo-anchored db-path) + shadcn OLD-anatomy primitives — boards/groups/tasks with five views, real URL routes, ActionResult envelopes, auth rate limiting, platform-parity login/signup, Vitest 185 + Playwright 21"
version: 1.3.0
last_updated: 2026-09-22
project_state: "Parity-converged (5/5 MATCH authed sweep session 27; platform login/signup at computed-style equality incl. shadow/blur/ring values), session-21 remediation delivered (hover variant, db-path contract, Button anatomy, Playwright E2E), session-23 auth rate limiting delivered, session-25 reference-redeploy remediation delivered (platform login/signup parity, Input/Textarea/Label anatomy, v3→v4 shadow + space-y ports), session-27 second-redeploy remediation delivered (v3 play-CDN compile semantics documented, shadow/blur ports on login + dashboard, slate-400 focus ring), 185 unit tests + 21 E2E specs green"
audience: "engineers + AI agents extending, debugging, onboarding, or replicating this task-management codebase"
tags: [nextjs16, react19, tailwind-v4, prisma, sqlite, shadcn, zod, vitest, playwright, dnd-kit]
---

# Tuesday.com — Task Management: Master Engineering Skill

> **How to use this document.** You are an agent about to work on this
> codebase. **Do not guess** — this file is the single source of every
> hard-won lesson the codebase will not tell you by reading one file.
> - Styling or UI parity → **§4 Design System + §5 Components + §19 Colors**
> - Database or env problems → **§3 Bootstrapping + §10 Debugging**
> - A mutation path (status/owner/drag) → **§9 Anti-Patterns + §15 Patterns**
> - Shipping a change → **§11 Pre-Ship Checklist** (gates as bash, in order)
> - New feature or data shape → **§5 Architecture + §20 Interfaces**
> - Onboarding or "why is X like this?" → **§1 Identity + §2 Stack + Appendix A**
> Every claim cites `file:line` or a command that was executed. If it is not
> cited, treat it as unverified.

---

## Table of Contents

1. [§1 Project Identity & Design Philosophy](#1-project-identity--design-philosophy)
2. [§2 Tech Stack & Environment](#2-tech-stack--environment)
3. [§3 Bootstrapping & Configuration](#3-bootstrapping--configuration)
4. [§4 The Design System (Code-First)](#4-the-design-system-code-first)
5. [§5 Component Architecture & Patterns](#5-component-architecture--patterns)
6. [§6 Custom Logic Deep Dive (domain.ts seams)](#6-custom-logic-deep-dive-domaints-seams)
7. [§7 Data & Persistence (Prisma + the db-path contract)](#7-data--persistence-prisma--the-db-path-contract)
8. [§8 Accessibility Implementation](#8-accessibility-implementation)
9. [§9 Anti-Patterns & Common Bugs](#9-anti-patterns--common-bugs)
10. [§10 Debugging Guide](#10-debugging-guide)
11. [§11 Pre-Ship Checklist](#11-pre-ship-checklist)
12. [§12 Lessons Learnt & How to Avoid Them](#12-lessons-learnt--how-to-avoid-them)
13. [§13 Pitfalls to Avoid](#13-pitfalls-to-avoid)
14. [§14 Best Practices](#14-best-practices)
15. [§15 Coding Patterns](#15-coding-patterns)
16. [§16 Coding Anti-Patterns](#16-coding-anti-patterns)
17. [§17 Responsive Breakpoint Reference](#17-responsive-breakpoint-reference)
18. [§18 Z-Index Layer Map](#18-z-index-layer-map)
19. [§19 Color Reference (Complete)](#19-color-reference-complete)
20. [§20 The Complete TypeScript Interface Reference](#20-the-complete-typescript-interface-reference)
- [Appendix A — Architecture Decision Records](#appendix-a--architecture-decision-records)
- [Appendix B — Verification & Audit History](#appendix-b--verification--audit-history)
- [Appendix C — Deliberate Deviations from the Reference](#appendix-c--deliberate-deviations-from-the-reference)
- [Quick Reference Card](#quick-reference-card)

---

## 1. Project Identity & Design Philosophy

**One sentence.** Tuesday.com is a **pixel-faithful, production-grade clone
of a monday.com-style work management app** (`https://tuesdaycom-a6700714.base44.app/`)
— multi-group task boards with five views (Main Table, Kanban with
drag-and-drop, Calendar, Gantt Timeline, Unassigned), inline cell editing,
an analytics dashboard, and email/password auth — as a single Next.js
process over Prisma + SQLite, self-hostable with `bun install` and two
database commands.

**Design thesis — spreadsheet-first density, not dashboard airiness.** The
product metaphor is monday.com's: ONE white card holds every group zone
(`src/components/app/board-table.tsx:1`), each group carries a 4px
color-accent left border, rows are inline-editable cells (status pill,
priority select, free-text owner, native date input), and the toolbar is a
dense row of card-styled popover menus. The app blue is **not a token** —
every blue surface is an explicit `#0073EA` class, exactly like the
reference, which hardcodes blues and keeps shadcn's neutral grayscale
tokens (`src/app/globals.css:47-90`).

**Non-negotiable rules (what breaks parity if violated).**

| Rule | Why | Where enforced |
|---|---|---|
| **`@custom-variant hover (&:hover);` stays in globals.css** | Tailwind v4's default `@media (hover: hover)` guard kills hover/tap feedback on touch devices — the mobile-menu bug (session 21) | `src/app/globals.css:13`, pinned by `e2e/mobile-nav.spec.ts:39` |
| **No webfont anywhere** | The reference ships Tailwind v4's DEFAULT system stack; different glyph metrics change calendar-chip truncation and table row heights | `src/app/layout.tsx` (no next/font), `globals.css` (no `--font-sans`) |
| **Vendored primitives keep OLD shadcn anatomy** | The reference's decompiled cva strings are the contract — Badge/Button/Switch/Select geometry is locked by tests | `src/components/ui/primitives.test.ts:1` |
| **`status` ↔ `completed` are ONE fact** | Table checkbox, kanban drag, and analytics must never disagree | `src/lib/domain.ts` `resolveStatusCompletedPatch`, mirrored in `board-view.tsx` |
| **All mutations return `ActionResult<T>`** | Route handlers never throw across the boundary; the client never parses throws | `src/lib/domain.ts` + `src/lib/api-client.ts:1` |
| **Closed vocabulary, one file** | Statuses/priorities/colors/visibility are `const` arrays in `domain.ts`; components and Zod schemas derive from them — never hardcode a status string | `src/lib/domain.ts` |
| **DB path goes through `src/lib/db-path.ts`** | Prisma's .env-relative resolution lands the SQLite file OUTSIDE the repo; the contract pins it at `<repo>/db/custom.db` | `src/lib/db-path.ts:1`, pinned by `tests/db-path.test.ts:1` |
| **Auth attempts are rate-limited (failures-only on login)** | `login:${ip}:${email}` counts FAILURES (5/15 min) and a success `reset`s the key — counting successes would lock out the E2E suite's demo logins and real users; signup counts every parsed POST (10/15 min per IP); the gate runs BEFORE the scrypt work; bounds are module constants, not env | `src/lib/rate-limit.ts:1`, pinned by `src/lib/rate-limit.test.ts:1` + `e2e/auth.spec.ts:31` |
| **`space-y` must keep v3 semantics** | Tailwind v4 flipped `space-y-*` to margin-BOTTOM on `:not(:last-child)`; vertical margins are INERT on the inline Radix Label — every `<Label/><Input/>` group collapsed to a 4px gap (reference: 12px). The `@layer utilities` overrides in globals.css restore v3 margin-TOP semantics; removing them silently shrinks every form group | `src/app/globals.css` (space-y restoration block), measured on both apps' dialogs session 25 |
| **v3→v4 shadow/blur renames on every ported string** | v3 `shadow` → v4 `shadow-sm`, v3 `shadow-sm` → v4 `shadow-xs`, v3 `backdrop-blur-sm` → v4 `backdrop-blur-xs` (bare `shadow`, `shadow-lg`, `blur-xl` identical; v3 `rounded-sm` NOT renamed — both compilers render 4px); a literal v3 `shadow-sm`/`backdrop-blur-sm` under v4 renders at DOUBLE the intended value. The platform login page is NOT an exception (session 27): it compiles under the reference's Tailwind **v3 play CDN**, so its strings carry the same renames; its `focus:ring-slate-400` consumer needs a `focus-visible:ring-slate-400` twin because v4 sorts `focus:` before `focus-visible:` | `src/components/ui/*` + app components, computed-verified sessions 25 + 27, pinned by `e2e/parity.spec.ts:1` |
| **Signup derives the display name** | The redesigned platform signup collects no Full name — `POST /api/auth/signup` accepts `{email, password}` and derives the name via `deriveSignupName` (email prefix, "user" fallback); the client's confirm-match check fails fast with no request | `src/lib/domain.ts` (`deriveSignupName`), `e2e/auth.spec.ts` (surface specs) |

**North-star state:** parity-converged (authed app 5/5 MATCH re-verified
session 27; the platform login/signup surfaces at computed-style equality
including the shadow/blur/ring values after the reference's second
redeploy), gates at lint 0 /
tsc 0 / **185 unit tests** / **21 Playwright specs** / standalone build.

---

## 2. Tech Stack & Environment

**Lock discipline:** `package.json` + `bun.lock` are managed by `bun add`
only — never hand-edit dependency entries; `scripts` edits are fine.
Versions below are the installed pins (verified `bun pm ls`, 2026-09-22).

| Layer | Package | Version | Notes |
|---|---|---|---|
| Web framework | next | 16.1.3 | App Router + Turbopack dev; `output: "standalone"` (`next.config.ts:4`) |
| UI runtime | react / react-dom | 19.2.3 | Client components at the interactive leaves |
| Language | typescript | 5.9.3 | `strict: true`, no overrides (`tsconfig.json:14`) |
| Styling | tailwindcss | 4.1.18 | CSS-first `@theme inline`; NO tailwind.config.js; `@custom-variant hover` (§4) |
| PostCSS | @tailwindcss/postcss | ^4 | `postcss.config.mjs` |
| Primitives | shadcn/ui (new-york) on Radix | vendored | OLD-shadcn anatomy for Card/Badge/Button/Switch/Select (§5) |
| ORM | prisma / @prisma/client | 6.19.2 | `datasources` override from db-path (§7) |
| Validation | zod | 4.3.5 | Every API input parsed before use |
| Drag & drop | @dnd-kit/core | 6.3.1 | Kanban status + owner assignment |
| Dates | date-fns | 4.1.0 | Month grid math + formatting |
| Icons | lucide-react | 0.525.0 | Icon system |
| Unit tests | vitest | 5.0.1 | `vitest.config.ts` — node env, 30s timeout |
| E2E | @playwright/test | 1.63.0 | Chromium only; webServer = standalone artifact |
| Package manager | bun | 1.3.14 | Installs, runs scripts, runs the seed directly |

**Commands (run from the repo root).**

| Command | Purpose |
|---|---|
| `bun install` | Install dependencies |
| `bun run db:push` | Create/migrate `<repo>/db/custom.db` — goes through `scripts/prisma-cli.ts` (§7) |
| `bun run db:seed` | Idempotent demo dataset (4 boards / 9 groups / 25 tasks / 4 users) |
| `bun run dev` | Dev server on :3000 (Turbopack) |
| `bun run lint` | ESLint 9 flat config — must exit 0 |
| `bun run typecheck` | `tsc --noEmit` — must report no errors |
| `bun run test` | Vitest unit suite (185 tests) |
| `bun run test:e2e` | Playwright suite (21 specs) — run after `bun run build` |
| `bun run build` | Standalone production build |
| `bun run start` | Serve the standalone build on :3000 |

**Environment surface:** ONE user-set variable — `DATABASE_URL`
(`.env`, copied from `.env.example`; `NODE_ENV` is framework-managed). The
SSH push path (`docs/ssh_git_wrapper_v3.py` + external key) is documented in
`docs/how-to-git-push-using-ssh-wrapper_SKILL.md`.

---

## 3. Bootstrapping & Configuration

```bash
bun install
cp .env.example .env        # DATABASE_URL="file:../db/custom.db"
bun run db:push             # creates <repo>/db/custom.db (never the parent dir)
bun run db:seed             # demo account + 4 boards + 25 tasks
bun run dev                 # http://localhost:3000
```

Demo login: `sepnetflix2023@outlook.com` / `Abcd1234` (seeded, documented
public demo credentials — `scripts/seed.ts:167`).

**The database-location contract (session 21's headline fix).** With
`DATABASE_URL="file:../db/custom.db"`, Prisma 6.19.2 resolves the relative
URL against the **.env/CWD location** (the repo root), landing the file at
`<parent>/db/custom.db` — OUTSIDE the repo — for the CLI, the seed, and the
runtime alike (reproduced 2026-09-22 from a clean clone). The fix:

- `src/lib/db-path.ts` — `resolveDatabaseUrl(envUrl?, startDirs?)` anchors
  relative `file:` URLs at the repo's **`prisma/` directory**, found by
  walking up from the process CWD and the module's own directory, **skipping
  `.next/…` anchors** (Next's standalone server `chdir`s into
  `.next/standalone`, which contains a TRACED copy of the schema — without
  the skip the DB lives inside the disposable build and is wiped on every
  `next build`). Absolute `file:` and non-file URLs (PostgreSQL) pass
  through untouched; missing env falls back to the documented default.
- Wired into: `src/lib/db.ts` (PrismaClient `datasources` override),
  `scripts/seed.ts:16`, and `scripts/prisma-cli.ts` (the `db:push` /
  `db:migrate` / `db:reset` wrapper that overrides `DATABASE_URL` with the
  resolved absolute URL before spawning `bunx prisma`).
- Pinned by `tests/db-path.test.ts` (11 tests).
- Production deployments should use an ABSOLUTE `file:` path —
  `docs/DEPLOYMENT.md §4`.

**Verification of a healthy boot:** login page 200 → sign in → the dashboard
greets `sepnetflix2023` with **4 boards / 7 completed / 18 pending / 28%
completion** (README "Verify Setup"); `ls db/custom.db` shows the file INSIDE
the repo; the parent directory has no `db/` stragglers.

**Turbopack cache panic runbook** (hit when config/CSS files change while
the dev server runs, or across server stops): `pkill -f "next dev"; rm -rf
.next`; restart. A panic reading "Failed to restore task data" is a CACHE
problem, never a source problem — do not "fix" source files when you see it.

---

## 4. The Design System (Code-First)

Tokens live in `src/app/globals.css` under `@theme inline` + `:root`
(dark-mode block exists but the app renders light-only like the reference).

**The load-bearing variant override (session 21):**

```css
@custom-variant hover (&:hover);
```

Tailwind v4's default hover variant is
`@media (hover: hover) { &:hover }` — on `(hover: none)` devices (touch
phones, headless browsers) EVERY `hover:*` utility is dead. The reference's
v3-compiled CSS applies plain `:hover` (verified in its stylesheet:
`.hover\:bg-\[\#E1E5F3\]:hover{…}` with no guard). The override restores v3
behavior for all ~150 hover utilities in this codebase. `group-hover` is
NOT media-guarded in v4 (verified in the compiled CSS:
`.group-hover\:scale-105:is(:where(.group):hover *)`) and needs no
equivalent. Regression test: `e2e/mobile-nav.spec.ts:39` runs in a
`hasTouch: true` context — the exact environment where the pre-fix CSS
provably failed (hamburger matched `:hover` with a transparent computed
background).

**Tokens (light mode, `globals.css:47-90`):**

| Token | Value | Usage |
|---|---|---|
| `--background` | `#f5f6f8` | App background |
| `--card` / `--popover` | `#ffffff` | Cards, header, table rows |
| `--foreground` | `hsl(0 0% 3.9%)` | Inherited text |
| `--primary` | `hsl(0 0% 9%)` | Checkbox checked fill, default buttons |
| `--muted-foreground` | `#676879` | Secondary text |
| `--border` / `--input` | `hsl(0 0% 89.8%)` | Hairlines, card borders |
| `--destructive` | `#e2445c` | Delete actions, overdue red |
| `--table-header-bg` / `--table-track-bg` | `#f5f6f8` / `#e1e5f3` | Table header band, group progress track |
| `--group-progress-fill` | `#00c875` | Group progress fill |

The app blue is explicit `#0073EA` everywhere (nav links, New Task button,
picker checkmarks, focus accents, calendar today ring) — NOT a token, by
design. Grayscale tokens must be complete `hsl(…)` colors: Tailwind v4
passes raw `var()` values through, so `--primary: 0 0% 9%` would break.

**Status pills (all white text):** `#c4c4c4` Not Started · `#ffcb00`
Working on it · `#00c875` Done · `#e2445c` Stuck. **Priorities** render as
tinted text badges (12.5% alpha background over the solid color = the text
color): Low `#787d80` · Medium `#ffcb00` · High `#fdab3d` · Critical
`#e2445c` — via the unit-tested `priorityBadgeStyle`. **Board palette (6):**
`#0073ea #00c875 #ffcb00 #e2445c #a25ddb #00d9ff`; **group palette (7)**
adds Gray `#676879` (`GROUP_COLOR_OPTIONS`). Kanban card left borders are
the fixed neutral `#E1E5F3` (`KANBAN_CARD_BORDER`) — NOT status-colored.

**Typography:** Tailwind v4's DEFAULT system stack — no webfont, no
`--font-sans` override, no `antialiased` (verified: the reference has zero
`@font-face`, empty `document.fonts`, body NOT antialiased). Changing fonts
changes calendar-chip truncation and table row heights measurably.

**Motion:** CSS-only (gradient shines, KPI hover particles,
`team-presence-pulse` keyframes at `globals.css:192-204`); the global
`prefers-reduced-motion` block (`globals.css:206-214`) collapses all
animations to 0.01ms.

---

## 5. Component Architecture & Patterns

```
src/app/(app)/**       authed route group (AppShell layout): / · /boards · /board · /analytics
src/app/login/         /login — bare, renders even when authed (reference behavior)
src/app/[...path]/     styled 404 catch-all (server-rendered titlecased titles)
src/app/api/**         JSON route handlers (7 route families), ActionResult envelopes
src/components/app/**  26 product components + routes/ wrappers
src/components/ui/**   vendored shadcn primitives (OLD anatomy, contract-locked)
src/lib/domain.ts      vocabulary + DTOs + ActionResult + pure helpers (862 lines)
src/lib/db-path.ts     repo-anchored SQLite URL resolution
src/lib/db.ts          Prisma client singleton (db-path datasource override)
src/lib/auth.ts        scrypt + cookie sessions
src/lib/api-client.ts  typed fetch that never throws
tests/db-path.test.ts  db-path contract suite
e2e/*.spec.ts          Playwright golden-path specs + helpers
prisma/schema.prisma   User · Session · Board · Group · Task · Activity
scripts/seed.ts        idempotent demo dataset
scripts/prisma-cli.ts  Prisma CLI wrapper (resolved absolute DATABASE_URL)
```

**Client/server split:** `"use client"` on the interactive leaves; the
`(app)` layout boots `/api/auth/me` in `AppShell`
(`src/components/app/app-shell.tsx:59-76`) and redirects logged-out users to
`/login?from_url=<original>` (open-redirect-guarded). `src/app/api/**`
stays server-only.

**Vendored-primitive anatomy (the systemic drift class).** The reference
ships OLD-shadcn primitives; the repo's vendored copies are LOCKED to those
decompiled strings by `src/components/ui/primitives.test.ts` (21 tests):

| Primitive | Locked anatomy | Why it matters |
|---|---|---|
| Card | `CardHeader flex flex-col space-y-1.5 p-6`, `CardContent p-6 pt-0` | NEW style adds a 24px header→content gap on every consumer |
| Badge | `px-2.5 py-0.5 text-xs font-semibold` + `shadow-sm` on default | NEW renders 2px 8px / weight 500 — measurable geometry drift |
| Button | `transition-colors`, `focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring`, sizes `h-9 px-4 py-2`/`h-8`/`h-10`/`h-9 w-9` | NEW's `ring-[3px] ring-ring/50` + `transition-all` differs on every keyboard-focused surface |
| Switch | `h-5 w-9 border-2`, thumb `h-4 w-4 shadow-lg translate-x-4` | NEW renders 1px border + 15px calc offset, no thumb shadow |
| Select | plain `h-9 w-full` trigger utilities (no data-size variants) | consumer `h-full`/`h-auto`/`w-48` merge away in `cn()` — how the reference's table triggers follow cell height |

v3→v4 renames applied when porting decompiled strings: `shadow` →
`shadow-sm`, `shadow-sm` → `shadow-xs`, `focus:outline-none` /
`focus-visible:outline-none` → `focus-visible:outline-hidden`
(`shadow-lg` is identical in both).

**Dialog forms mount fresh** inside `<DialogContent>` (Radix unmounts
closed dialogs — every open starts from `useState` initializers). Never add
`useEffect(() => open && reset())`; `react-hooks/set-state-in-effect`
blocks it.

**Data loading pattern** (same lint rule): `load()` is a pure
`() => api(...)`; the effect does `load().then(result => …setState)` with a
`cancelled` flag in cleanup (`app-header.tsx:48-57`).

**`BoardView` is keyed by board id** (`routes/board-route.tsx`:
`<BoardView key={id} boardId={id}>`) — switching boards remounts the
component; that IS the view-state reset mechanism. Do not lift its state.

---

## 6. Custom Logic Deep Dive (domain.ts seams)

Every pure helper lives in `src/lib/domain.ts` and is unit-tested in
`src/lib/domain.test.ts` (128 tests). The load-bearing ones:

- `resolveStatusCompletedPatch` — **the status↔completed coupling**. The
  server applies it in `PATCH /api/tasks/[id]`; the client mirrors it in
  `board-view.tsx` before patching state. Every new mutation path MUST call
  it or the table checkbox, kanban, and analytics disagree.
- `filterTasks` / `sortTasks` — the board toolbar pipeline (search + people
  multi-select `personIds` + status/priority sets + ALL seven sort fields
  with nulls-last in both directions). Wire toolbar behavior into these
  seams, not inline lambdas.
- `timelineRange` — Day/Week/Month grid math (week windows start Monday).
  Change the grid, change the tests first.
- `groupTasksByStatus` / `groupTasksByPerson` — kanban groupings (people
  columns list only owners who own tasks, first-encounter order).
- `distributionBars` — analytics horizontal bars: first-encounter order
  over `updatedAt`-desc tasks with zero-count rows OMITTED (the site page)
  — the Board Analytics modal's Status Distribution is the opposite
  (vocabulary order, zero counts INCLUDED). Preserve the asymmetry.
- `isOverdueDate(date, now?)` — the decompiled overdue boundary: red chip
  only when `due < now && due.toDateString() !== now.toDateString()` (a
  task due TODAY never renders red). The Board Analytics overdue COUNT
  deliberately keeps the guardless comparison — reference asymmetry.
- `priorityBadgeStyle` — 12.5%-alpha tinted text badges.
- `avatarGradient` / `avatarInitials` — kanban OWNER avatars: 8-gradient
  palette indexed by `name.charCodeAt(0) % 8`, `substring(0,2)` initials
  (NOT the table's solid-blue first-letter circle).
- `statusHeaderDots` — group-header per-status count dots in
  first-encounter order.
- `groupSummary` — footer row with the 3-badge cap + `+N` overflow.
- `isNavActive` — exact case-sensitive `pathname === href` match;
  `/` highlights nothing (Dashboard's href is `/Dashboard`).
- `formatRecentTaskTime` / `formatBoardActivityTime` / `relativeBoardTime`
  — the three time formats (dashboard feed, board-modal 24-hour feed,
  boards cards).

**TDD rule:** failing test in the matching `*.test.ts` first (red),
implementation (green), then wire into components/routes.

---

## 7. Data & Persistence (Prisma + the db-path contract)

**Models** (`prisma/schema.prisma`): `User` (scrypt hash, mock role/online)
→ `Session` (opaque 32-byte token, 30-day TTL, lazy expiry) → `Board`
(title/description/color/visibility/isFavorite/ownerId) → `Group`
(name/boardId/collapsed/position/**color** — every group owns its accent) →
`Task` (title/status/priority/boardId mirror/groupId/ownerId/dueDate/
completed/position) → `Activity` (event log for the audit trail — the
dashboard feed reads recent TASKS, not this table).

Cascades: `Board → Group → Task`; `Task.ownerId` is `SetNull`. Indexes on
`boardId`, `groupId`, `ownerId`, `userId`, `createdAt`.

**The db-path resolution chain** (all three consumers agree on ONE file):

1. **Runtime** — `src/lib/db.ts` constructs the PrismaClient with
   `datasources: { db: { url: resolveDatabaseUrl() } }`.
2. **Seed** — `scripts/seed.ts:16` constructs its own client with the same
   resolved URL.
3. **CLI** — `scripts/prisma-cli.ts` resolves the URL, exports it as
   `DATABASE_URL` in the child env, and spawns `bunx prisma <args>`
   (package.json routes `db:push` / `db:migrate` / `db:reset` through it).

`resolveDatabaseUrl` semantics (pinned by `tests/db-path.test.ts`):
non-`file:` URLs pass through (PostgreSQL switch = edit schema provider +
URL); absolute `file:` URLs pass through; relative `file:` URLs anchor at
the first `prisma/` directory found walking up from [CWD, module dir],
**skipping `.next/…` paths**; no marker found → resolve against the first
start dir (documented fallback).

**Seed discipline:** idempotent (re-runs skip existing users); a rejected
`$disconnect` no longer fails a successful run (`scripts/seed.ts:293-310`);
P2021 prints "run `bun run db:push` first". **Never delete the DB file
while `next dev` runs** — the server keeps the deleted inode and every
mutation fails with SQLite 1032 "readonly database".

**Boards aggregation invariant:** `boards/route.ts` aggregates task counts
with ONE grouped query + in-memory join — never per-board queries.

---

## 8. Accessibility Implementation

- Labeled interactive elements throughout (`aria-label` on icon buttons,
  `aria-current="page"` on the active nav link, `aria-expanded` on the
  hamburger).
- Visible focus rings: `focus-visible:ring-2` on custom controls; the
  vendored Button's OLD-shadcn thin `focus-visible:ring-1` (the reference's
  own keyboard chrome).
- `prefers-reduced-motion` collapses ALL animations (`globals.css:206`).
- The mobile menu is an inline collapsible panel (not a sheet) with real
  `<Link>` navigation and `sr-only` labels on the search inputs.
- Known reference-inherited gaps (deliberate parity): the reference's
  modals don't close on Escape — ours DO close (Radix default), and its
  mock chrome (literal "U" avatar, "User Name" placeholders) is reproduced
  verbatim rather than "fixed".

---

## 9. Anti-Patterns & Common Bugs

1. **Removing `@custom-variant hover`** → hover/tap feedback dies on touch
   devices; `e2e/mobile-nav.spec.ts` goes red. (Fixed session 21.)
2. **Bypassing db-path** (a new `new PrismaClient()` without the
   datasource override, or calling `bunx prisma` directly) → the DB
   silently lands outside the repo or inside `.next/`. Always go through
   `src/lib/db.ts` / `scripts/prisma-cli.ts`.
3. **Re-deriving the status↔completed coupling inline** instead of calling
   `resolveStatusCompletedPatch` → table/kanban/analytics disagree.
4. **Upgrading vendored primitives** to NEW shadcn anatomy → geometry
   drift; `primitives.test.ts` goes red.
5. **Adding a webfont** (`next/font`, `--font-sans`, `antialiased`) →
   glyph metrics change; truncation boundaries and row heights drift.
6. **`useEffect(() => open && reset())` in dialogs** → lint-blocked; mount
   the form inside `<DialogContent>` instead.
7. **Async `load()` that setStates internally** → lint-blocked; return the
   promise.
8. **Per-board aggregate queries** in `boards/route.ts` → N+1 as boards
   grow; use the grouped query.
9. **Main-scroll listeners** for sticky chrome → `<main>`'s `scrollTop`
   stays 0 (the BODY scrolls on tall pages); use `window.scrollY` (the
   board header's 32px threshold strip is the canonical pattern).
10. **Hardcoding status/priority/color strings in components** → drift from
    the closed vocabulary; derive from `domain.ts`.
11. **Trusting the Prisma CLI's relative-path resolution** → reproduced
    twice (sessions 3-5 and 21): it resolves against .env/CWD, not the
    schema directory. The wrapper exists because of this.
12. **Deleting the DB under a live dev server** → SQLite 1032 "readonly
    database"; restart the server after any DB file swap.

---

## 10. Debugging Guide

| Symptom | Root cause | Fix |
|---|---|---|
| Hover styles never apply (touch/headless) | v4 `@media (hover: hover)` guard | `@custom-variant hover (&:hover);` in globals.css (verify: `matchMedia('(hover: hover)').matches` in the page) |
| `db/custom.db` missing from the repo / found in the parent dir | Prisma .env-relative resolution | db-path chain (§7); verify `bun run db:push` prints `DATABASE_URL -> file:<repo>/db/custom.db` |
| DB lives in `.next/standalone/db/` | Standalone server `chdir` + traced schema copy | db-path's `.next` skip (verify: `ls .next/standalone/db` → absent after a mutation) |
| Dev server panic "Failed to restore task data" | Turbopack cache corruption | `pkill -f "next dev"; rm -rf .next`; restart |
| Mutations fail with SQLite 1032 "readonly database" | DB file deleted under a live server | Restart the server |
| Every Prisma call fails at import | `DATABASE_URL` unset | `cp .env.example .env` |
| Table checkbox / kanban / analytics disagree | Missed coupling mirror | Call `resolveStatusCompletedPatch` in the new path |
| Dialog state stale between opens | Form outside `<DialogContent>` | Move the form component inside |
| Board view state bleeds across boards | State lifted out of the keyed `BoardView` | Restore `key={id}` remounting |
| `db:seed` exits 1 after printing counts | `$disconnect` rejection (fixed session 21) | Already hardened — if it recurs, check for a new unhandled promise in the tail |

**Debug order:** reproduce with the exact command → read the dev-server
log (`dev.log`) → isolate → fix the root cause. A UI that disagrees with
the DB after a mutation is usually a missed local mirror of a server-side
coupling.

---

## 11. Pre-Ship Checklist

```bash
bun run lint          # exit 0
bun run typecheck     # no errors (skills/docs excluded)
bun run test          # 185/185
bun run build         # standalone build green
bun run test:e2e      # 16/16 against the build (boots the standalone artifact)
```

Then the live smoke: dev server boots → login as the demo user → one
mutation round-trip (status pill or kanban drag) → reload → persisted →
`git status` clean of `.env`, `db/*.db`, logs, and keys. Commits are
Conventional and atomic (`feat(board): …`); pushes go through the SSH
wrapper with the key shredded after use.

---

## 12. Lessons Learnt & How to Avoid Them

1. **Verify variant semantics against the reference's ACTUAL CSS, not the
   framework docs.** The hover-variant bug hid for 20 sessions because
   "Tailwind v4 hover works" is true — on hover-capable devices. Diffing
   the two compiled stylesheets found it in minutes (`.hover\:bg-…:hover`
   plain vs `@media (hover: hover)`-wrapped).
2. **A quirk observed twice is a contract waiting to be written.** The DB
   landing outside the repo was documented as a curiosity in sessions 3-5
   and reproduced in 21 — the operator's `.env.example` spec turned it into
   `src/lib/db-path.ts` + tests.
3. **Bundled standalone code sees a different filesystem.** Next's
   standalone server `chdir`s into `.next/standalone` AND the build traces
   `prisma/schema.prisma` into it — any repo-root heuristic must skip
   build-output anchors or the DB dies with every rebuild.
4. **At-rest parity hides interaction parity.** The Button passed four VLM
   sweeps — its anatomy only differs on keyboard focus and the transition
   property. Computed-style probes of class strings (decompiled) catch what
   screenshots miss.
5. **The TDD loop pays for CSS too.** The hover fix's regression test
   (`hasTouch: true` context) went red against the pre-fix CSS and green
   after — a CSS change with a real safety net.
6. **Locators must match the app's real ARIA.** Board cards open via
   `role="link"` divs; status pills are buttons with
   `aria-label="Status: <label>, change status"`; route paths are
   CAPITALIZED (`/Boards` — case-insensitive regexes in specs).
7. **Test state is production state.** A failed E2E run that mutates and
   doesn't restore leaves the seed off-by-one — the auth spec's
   "Pending Tasks 18" assertion catches it, and the board spec restores
   what it changes.

---

## 13. Pitfalls to Avoid

- Do not add routes outside the reference surface (`/`, `/login`,
  `/boards`, `/board`, `/analytics`) — the catch-all 404 owns everything
  else.
- Do not introduce a `tailwind.config.js` (v3-style) — tokens are CSS-only.
- Do not put `tests/` or `e2e/` into lint/type/test ignores — they ARE the
  gates (only `skills/`, `docs/`, sandbox dirs are outside).
- Do not use WebKit/Firefox projects in the Playwright config without
  installing their browsers — the sandbox ships Chromium only.
- Do not weaken lint rules, loosen types, or skip tests to make a gate
  pass — a red gate is a finding.
- Do not commit `.env`, `db/*.db`, logs, or SSH keys — `.gitignore` covers
  the first three; a key in the tree means rotation.
- Do not "fix" the mock chrome (literal "U" avatar, "User Name"
  placeholders, `TEAM_MEMBERS`) — it mirrors the reference's decompiled
  mock verbatim.

---

## 14. Best Practices

- One source of truth per fact: vocabulary/DTOs/envelope in `domain.ts`;
  DB URL resolution in `db-path.ts`; primitive anatomy in the vendored
  files + their contract tests.
- The server is authoritative: local state patches only after
  `ok: true`; optimistic UI (group collapse) reverts on failure.
- Honesty over completeness: unconfigured integrations say so; no dead
  buttons, no faked success.
- Every API input Zod-parsed; reject with 400 + the first issue's message.
- Ownership checks return 404 (no existence oracle).
- Conventional Commits, atomic scope, main branch only.
- Screenshots + session logs under `docs/` for every verification cycle.

---

## 15. Coding Patterns

**ActionResult envelope (never throw across the boundary):**

```ts
// src/lib/domain.ts
type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };
// src/lib/api-client.ts — typed fetch that never throws
const result = await api<BoardDTO[]>("/api/boards");
if (result.ok) setBoards(result.data);
```

**The db-path chain (one file, three consumers):**

```ts
// src/lib/db.ts
new PrismaClient({ log: ["warn", "error"],
  datasources: { db: { url: resolveDatabaseUrl() } } });
// scripts/prisma-cli.ts — same resolution, exported as env for the CLI
spawnSync("bunx", ["prisma", ...args],
  { stdio: "inherit", env: { ...process.env, DATABASE_URL: url } });
```

**The coupling mirror (client side):**

```ts
// board-view.tsx — mirror the server's resolveStatusCompletedPatch
const patch = resolveStatusCompletedPatch(nextStatus);
await api(`/api/tasks/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
```

**The compliant data-load effect:**

```ts
useEffect(() => {
  let cancelled = false;
  api<BoardSummaryDTO[]>("/api/boards").then((r) => {
    if (!cancelled && r.ok) setBoards(r.data);
  });
  return () => { cancelled = true; };
}, []);
```

**The touch-context regression test:**

```ts
// e2e/mobile-nav.spec.ts — the environment IS the reproduction
test.use({ viewport: { width: 375, height: 812 }, hasTouch: true });
const hoverCapable = await page.evaluate(() =>
  window.matchMedia("(hover: hover)").matches);
expect(hoverCapable).toBe(false);            // pins the premise
await menuButton.hover();
await expect.poll(() => menuButton.evaluate((el) =>
  getComputedStyle(el).backgroundColor)).toBe("rgb(225, 229, 243)");
```

---

## 16. Coding Anti-Patterns

- `any` (use `unknown`); non-strict files; hand-edited `package.json`
  dependencies or lockfiles.
- `console.log` in shipped code (`console.error` with context is allowed
  on caught failures).
- Broad `catch {}` that swallows errors without logging.
- Magic numbers without a comment (e.g. the 32px scroll threshold, noon
  date storage, the 12.5% tint recipe).
- Snapshot tests of class strings that recompute the implementation
  (tautological) — the primitive contracts assert against DECOMPILED
  literals from the reference, an independent source of truth.
- Mocking the database in tests that claim to verify persistence — the
  E2E suite asserts the real round-trip.

---

## 17. Responsive Breakpoint Reference

Tailwind v4 defaults (no custom breakpoints):

| Breakpoint | Min width | Canonical use in this codebase |
|---|---|---|
| (none) | 0 | Mobile: hamburger (`md:hidden`), inline menu panel, `p-4` page padding |
| `sm` | 640px | Login `sm:h-12` sign-in, `sm:px-6` gutters, mobile-search `sm:text-sm` |
| `md` | 768px | **The nav breakpoint**: desktop nav `hidden md:flex` ⇄ hamburger `md:hidden` — symmetrical, no ghost menu |
| `lg` | 1024px | `lg:px-8` gutters, `lg:justify-end` desktop search, `lg:gap-10` logo gap |
| `xl` | 1280px | Boards grid `xl:grid-cols-4` |

The mobile menu is an INLINE collapsible panel under the header row
(`app-header.tsx:295-423`) — conditionally rendered, `border-t
border-[#E1E5F3] md:hidden` — not a sheet. Page containers: `max-w-7xl` on
dashboard/boards/analytics with padding OUTSIDE the container; `max-w-full`
on the board detail.

---

## 18. Z-Index Layer Map

| Value | Element | File |
|---|---|---|
| `z-50` | App nav (sticky header) | `app-header.tsx:96` |
| `z-40` | Board white header bar (`sticky top-16`) | `board-view.tsx` |
| `z-20` | Board gray sticky wrapper (`sticky top-0 pb-4`) | `board-view.tsx` |
| Radix portals | Dialogs/popovers/dropdowns (document body, above everything) | ui primitives |

The board header's blue `h-1` strip flips `scaleX(0)` → full width at
`window.scrollY >= 32` (the BODY scrolls on tall pages — see §9.9).

---

## 19. Color Reference (Complete)

**Status (white pill text):** Not Started `#c4c4c4` · Working on it
`#ffcb00` · Done `#00c875` · Stuck `#e2445c`.
**Priority (12.5% tint + colored text):** Low `#787d80` · Medium `#ffcb00`
· High `#fdab3d` · Critical `#e2445c`.
**The app blue:** `#0073EA` (explicit classes, never a token).
**Nav/toolbar neutrals:** active pill `bg-[#E1E5F3] text-[#0073EA]`;
inactive `text-[#323338] hover:bg-[#F5F6F8] hover:text-[#0073EA]`;
table hairlines `#E1E5F3`; secondary text `#676879`; meta text `#A0A0A0`.
**Board palette (6):** `#0073ea #00c875 #ffcb00 #e2445c #a25ddb #00d9ff`.
**Group palette (7):** board palette + Gray `#676879`.
**Header logo tile:** gradient `#2563EB → #1D4ED8`.
**Header avatar:** gradient `#0073EA → #00C875` with the LITERAL letter
"U".
**Overdue chip:** `bg-[#E2445C]/10 text-[#E2445C]`.
**Analytics completion fill:** `#171717` on a green-300 track.
**Kanban drag states:** card `ring-4 ring-blue-200 scale-105` +
white→`#f8faff`; drag-over column `scale-105 shadow-2xl` +
`${color}20→${color}10` gradient.

---

## 20. The Complete TypeScript Interface Reference

Core shapes (see `src/lib/domain.ts` for the full set — DTOs mirror the
Prisma models minus server-only fields):

```ts
type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

interface UserDTO { id: string; email: string; name: string;
  avatarColor: string; role: string; online: boolean; createdAt: string; }

interface BoardSummaryDTO { id: string; title: string; description: string | null;
  color: string; visibility: "private" | "public"; isFavorite: boolean;
  taskCount: number; doneCount: number; createdAt: string; updatedAt: string; }

interface GroupDTO { id: string; name: string; color: string;
  collapsed: boolean; position: number; }

interface TaskDTO { id: string; title: string;
  status: "not_started" | "working" | "done" | "stuck";
  priority: "low" | "medium" | "high" | "critical";
  boardId: string; groupId: string; ownerId: string | null;
  dueDate: string | null; completed: boolean; position: number;
  createdAt: string; updatedAt: string; }
```

API surface: `POST /api/auth/{login,signup,logout}` · `GET /api/auth/me` ·
`GET|POST /api/boards` · `GET|PATCH|DELETE /api/boards/[id]` ·
`POST /api/boards/[id]/groups` · `PATCH|DELETE /api/groups/[id]` ·
`GET|POST /api/tasks` · `PATCH|DELETE /api/tasks/[id]` ·
`GET /api/dashboard` · `GET /api/analytics?boardId=&days=` ·
`GET /api/users` — all cookie-authenticated, all `ActionResult` envelopes,
all inputs Zod-parsed.

---

## Appendix A — Architecture Decision Records

- **ADR-1: Single Next.js process (App Router) over Prisma + SQLite.** The
  product is one user's self-hostable work manager; one process + one file
  beats a service fleet. Consequence: SQLite's single-writer model — the
  E2E suite runs `fullyParallel: false`.
- **ADR-2: Real URL routes with case-insensitive rewrites.** The reference
  links `/Dashboard`, `/Boards`, `/Board`, `/Analytics` but serves lowercase
  paths case-insensitively; `next.config.ts` rewrites map both onto one page
  set, and a `[...path]` catch-all renders the styled 404.
- **ADR-3: `ActionResult<T>` envelope everywhere.** Route handlers never
  throw across the boundary; the typed client never parses throws — error
  surfaces stay uniform.
- **ADR-4: Vendored OLD-shadcn primitives.** The reference's decompiled cva
  strings are the parity contract; upgrades are regression-tested against
  them rather than adopted.
- **ADR-5: `@custom-variant hover (&:hover)`.** v3-style hover semantics —
  interaction parity with the reference on touch devices — at the cost of
  sticky-hover on touch (which the reference also has).
- **ADR-6: db-path resolution module.** One pure function owns the
  database-location contract so CLI, seed, dev, and standalone runtime
  cannot disagree; `.next` anchors are skipped because the build output is
  disposable.
- **ADR-7: Pure-seam TDD.** Logic lands in `domain.ts` (or `db-path.ts`)
  with failing tests first; components stay thin wiring.

## Appendix B — Verification & Audit History

| Session | Deliverable | Evidence |
|---|---|---|
| 1–14 | Parity deep-passes 1–8 (routes, table, kanban, calendar, timeline, analytics, modals, primitives) | `docs/session_*.md`, VLM sweeps, decompiled specs |
| 15 | System font, Select anatomy, mock chrome, overdue boundary | 143 tests, 12-pair convergence |
| 16–19 | Verification sweeps (drift checks) + `docs/screenshots/` + `.env.example` | 10 MATCH + 2 triaged DIFF ×4 cycles |
| 21 | Hover variant, db-path contract, Button anatomy, Playwright E2E | 160 tests + 12 E2E specs, VLM 3/3 MATCH (mobile menu/dashboard/boards), mutation-probe DB verification |
| 23 | Auth rate limiting (login 5 failures/15 min per email+IP w/ reset-on-success; signup 10/15 min per IP) — the PAD §10 open Medium item closed | 172 tests + 13 E2E specs, VLM 5/5 MATCH re-verification, live 429 + Retry-After probes |
| 25 | Reference redeploy absorbed: platform login/signup parity (no-Full-name signup via `deriveSignupName`), Input/Textarea/Label OLD anatomy, v3→v4 shadow port (20 sites), v3 space-y semantics restoration (the Label→field collapse) | 185 tests + 16 E2E specs, login VLM MATCH (desktop/mobile/signup), card geometry 746==746px, computed-style equality on nav/dialog/footer surfaces |
| 27 | Second platform-login redeploy absorbed (rebuild, identical design); compile semantics reframed — the platform page runs the Tailwind **v3 play CDN**, the authed app is a customized v4 build pinning v3-era `shadow-sm`/`backdrop-blur-sm` values; shadow/blur ports on login + dashboard, slate-400 login focus ring (`focus-visible:ring-slate-400` twins) | 185 tests + **21 E2E specs** (`e2e/parity.spec.ts` computed-style contracts), VLM MATCH on login desktop/mobile + signup + 5/5 authed sweep, computed equality on button shadow / card blur / input ring / dashboard 11×blur(4px) |

## Appendix C — Deliberate Deviations from the Reference

Ours works, theirs doesn't (verified live): row-trash delete calls the API;
user-menu Sign out works; `/Board` without id renders a not-found card;
document titles update; modals close on Escape; unassigned tasks are
listed; dateless tasks stay reachable in the timeline; due-date bars
render. Ours is honest where theirs is dead: Integrations/Automations
switches are local-state mocks (like the reference), Configure buttons
inert (like the reference), with toasts for unconfigured Profile/Settings.
Reference quirks reproduced verbatim: literal "U" avatars, "User Name"
placeholders, `TEAM_MEMBERS` mock team, inert boards-page Filter button.

---

## Quick Reference Card

| Need | Go to |
|---|---|
| Status/priority/color vocabulary | `src/lib/domain.ts` |
| DB location problems | `src/lib/db-path.ts` + `tests/db-path.test.ts` + `scripts/prisma-cli.ts` |
| Hover not working on touch | `src/app/globals.css:13` + `e2e/mobile-nav.spec.ts` |
| Primitive geometry | `src/components/ui/*.tsx` + `primitives.test.ts` |
| Status↔completed coupling | `resolveStatusCompletedPatch` (`domain.ts`) |
| Toolbar pipeline | `filterTasks` / `sortTasks` (`domain.ts`) |
| Kanban grouping / avatars | `groupTasksBy*` / `avatarGradient` (`domain.ts`) |
| Overdue boundary | `isOverdueDate` (`domain.ts`) |
| E2E golden path | `e2e/*.spec.ts` (run: `bun run build && bun run test:e2e`) |
| Push runbook | `docs/how-to-git-push-using-ssh-wrapper_SKILL.md` + `docs/ssh_git_wrapper_v3.py` |
| Deployment | `docs/DEPLOYMENT.md` |
| This session's plan | `docs/remediation-plan-session21.md` |
