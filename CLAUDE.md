---
IMPORTANT: File is read fresh for every conversation. Be brief and practical.
project_type: nextjs-single-app
version: 1.0.0
last_updated: 2026-09-15
---

# Tuesday.com — Task Management

A monday.com-style work management platform: boards → groups → tasks with five
views (Main Table, Kanban with drag-and-drop, Calendar, Timeline, Unassigned),
inline cell editing, an analytics dashboard, and email/password auth. Single
Next.js process over Prisma + SQLite. Maintained as a solo/private project,
built and verified by AI coding agents under the contract below.

**Stack**: Bun · Next.js 16.1.3 (App Router, Turbopack) · React 19.2 ·
TypeScript 5 (strict, no overrides) · Tailwind CSS 4.1 (CSS-first `@theme
inline`, no tailwind.config.js) · shadcn/ui (new-york) on Radix · Prisma 6.19 +
SQLite · Zod 4 · @dnd-kit 6 · date-fns 4 · lucide-react · Vitest (unit).

## Core Identity & Purpose

Tuesday.com is a pixel-faithful, production-grade clone of the reference app
at `https://tuesdaycom-a6700714.base44.app/` (monday.com's table-first work
management metaphor). It exists so the owner has a self-hostable, modifiable
version of that product: the same dashboard KPI cards, the same group-accented
table, the same status-pill vocabulary, the same analytics page — with no
vendor lock-in and a one-command local boot.

## Foundational Principles

### Meticulous Approach (Six-Phase Workflow)

Follow this six-phase workflow for all implementation tasks:

1. **ANALYZE** — Read the relevant component, `src/lib/domain.ts`, and the API
   route you will touch, in full. Identify which vocabulary (status, priority,
   board color) the change belongs to.
2. **PLAN** — State the smallest correct implementation path; name the files
   touched and which invariants (below) apply.
3. **VALIDATE** — Confirm scope for anything touching auth, ownership checks,
   or the status↔completed coupling before coding.
4. **IMPLEMENT** — Modular, typed increments. UI in `src/components/app/`,
   API contracts in `src/lib/domain.ts`, handlers under `src/app/api/`.
5. **VERIFY** — Run the gate: `bun run lint && bun run typecheck`, then
   exercise the feature in the browser (dev server + agent-browser). Claims of
   "works" require executed evidence; database persistence must be confirmed
   against the DB, not just the UI.
6. **DELIVER** — Note what was verified, what was not, and any deferred work.

### Project-Specific Principles

- **One source of truth per fact.** Status/priority/color/visibility vocabulary, DTO
  shapes, and the `ActionResult<T>` envelope live in `src/lib/domain.ts`.
  Components and handlers derive from it; duplicated literals are a defect.
- **The server is authoritative.** Local state patches only after the API
  confirms (`ok: true`). Optimistic UI (group collapse) must revert on failure.
- **Honesty over completeness.** Unconfigured integrations (Google OAuth,
  password reset, Integrate, Automate) say so in the UI. No dead buttons, no
  faked success, no placeholder credentials presented as real ones.
- **Closed vocabulary, open surface.** Adding a status means editing
  `TASK_STATUSES` in one file — every picker, pill, kanban column, chart, and
  Zod schema updates from it.

## Implementation Standards

### General Coding Practices

- Early returns over nesting; composition over inheritance; self-documenting
  names; no speculative abstractions or unused configuration knobs.
- Strict TypeScript: `unknown` instead of `any`; explicit Zod parse at every
  API boundary; `interface` for object shapes, `type` for unions.

### Language & Framework Guidelines

- **Next.js 16 App Router**: `cookies()`/`params`/`searchParams` are async —
  always `await`. Page files export only framework-known keys.
- **Single route discipline**: the app is one client-side view switch inside
  `src/app/page.tsx` behind the auth gate. API routes are the only other
  surface. Do not introduce new pages.
- **Client components by necessity**: `"use client"` on the interactive
  leaves; `src/app/api/**` stays server-only.
- **React hooks lint is strict** (`react-hooks/set-state-in-effect`): data
  loads as `load().then(setState)` with a cancelled-flag cleanup; dialog forms
  mount fresh inside `<DialogContent>` instead of resetting via effect.
- **Tailwind v4**: utility classes + theme tokens from `globals.css` only.
  No JS theme config, no hardcoded hex outside `src/lib/domain.ts` and the
  documented design tokens.
- **shadcn/ui primitives first**: wrap/styled library components (Dialog,
  Popover, Select, Calendar, DropdownMenu, AlertDialog) instead of building
  custom equivalents.
- **Accessibility floor**: labeled interactive elements, `aria-pressed` /
  `aria-expanded` on toggles, visible focus rings (`focus-visible:ring-2`),
  44px touch targets on primary controls, `prefers-reduced-motion` respected
  (global CSS).

## Development Workflow

### Environment Setup

```bash
bun install
cp .env.example .env        # DATABASE_URL=file:../db/custom.db (relative to prisma/)
bun run db:push             # create ./db/custom.db
bun run db:seed             # demo account + 4 boards + 25 tasks (idempotent)
bun run dev                 # http://localhost:3000
```

Demo login: `sepnetflix2023@outlook.com` / `Abcd1234` (seeded, intentionally
public demo credentials).

### Build Commands

| Command | Purpose |
|---------|---------|
| `bun run dev` | Development server on :3000 |
| `bun run build` | Standalone production build |
| `bun run start` | Serve the standalone build |
| `bun run lint` | ESLint — must exit 0 (`eslint-config-next` defaults, no rule weakening) |
| `bun run typecheck` | `tsc --noEmit` — no errors; `skills/` and `docs/` excluded from the compile |
| `bun run test` | Vitest unit suite over the pure domain seams |
| `bun run db:push` / `db:seed` / `db:generate` | Schema sync / demo data / client regen |

## Testing Strategy

- **Gate before every delivery**: `bun run lint && bun run typecheck &&
  bun run test` — all green or the work is not done.
- **Unit suite (Vitest)**: colocated `src/lib/*.test.ts` covering the pure
  seams — `statusMeta`/`priorityMeta`, the shared status↔completed coupling
  (`resolveStatusCompletedPatch`), timeline window math (`timelineRange`),
  kanban grouping (`groupTasksByStatus`/`groupTasksByPerson`), analytics
  bars (`distributionBars`), the saved indicator (`formatSavedAt`), the board
  toolbar pipeline (`filterTasks`/`sortTasks`), column visibility
  (`visibleColumns`), the group footer row (`groupSummary`), boards-card
  relative time (`relativeBoardTime`), the reference palette (status/priority/
  board-color hexes), the priority badge recipe (`priorityBadgeStyle`), and
  visibility labels (`visibilityLabel`/`VISIBILITY_OPTIONS`).
- **TDD is the rule for new logic**: write the failing test first (red),
  implement the pure function in `src/lib/domain.ts` (green), then wire it
  into components/routes. Bug fixes require a regression test that fails
  before the fix and passes after.
- **Behavioral smoke (manual/agent-browser)**: sign in, create board + task,
  edit a board via the Options menu, filter/hide/sort in the table, edit a
  status pill, drag a kanban card, reload, confirm persistence against the
  database — not just the UI.
- **E2E (Playwright) is the tracked next step** (PAD §10): golden path
  login → board → mutation → reload → persisted. A red test is a regression
  or a wrong test — never skip to pass.

## Code Quality Standards

### Linting & Formatting

```bash
bun run lint
```

ESLint 9 flat config with `next/core-web-vitals` and the React hooks rules
enforced (including `set-state-in-effect`). The `ignores` list excludes
sandbox-only directories — keep it intact.

## Git & Version Control

- Branch `main` only — the SSH wrapper pushes `HEAD:refs/heads/main`.
- Conventional Commits, atomic scope: `feat(kanban): persist drag status`.
- Never commit `.env`, `db/*.db`, logs, or SSH keys. `.gitignore` covers the
  first three; a key in the tree means rotation, not just deletion.
- Pushes go through `docs/ssh_git_wrapper_v3.py` with an external key — see
  `docs/how-to-git-push-using-ssh-wrapper_SKILL.md` for the runbook and exit
  codes.

## Error Handling & Debugging

- API failures surface as `{ ok: false, error }` with a human-safe message;
  the client renders them inline (form alerts) or as destructive toasts.
  Operator detail stays in `console.error` on the server — never in the DOM.
- Ownership misses return 404 "Board/Task/Group not found" (no existence
  oracle). Invalid input returns 400 with the first Zod issue message.
- **Debug order**: reproduce with the exact command → read the dev-server log
  → isolate → fix the root cause. Turbopack cache panics ("Failed to restore
  task data") mean `rm -rf .next` + restart, not source changes.
- A UI that disagrees with the DB after a mutation is usually a missed local
  mirror of a server-side coupling (see status↔completed below).

## Communication & Documentation

- Explain "why" in comments, not "what". Non-obvious couplings and quirks get
  a comment at the coupling site.
- `AGENTS.md` holds the agent-facing gotchas; `README.md` the human onboarding;
  `Project_Architecture_Document.md` the full blueprint with ADRs. Update the
  relevant one when behavior or setup changes — a stale doc is a defect.
- Label verification claims: Verified (executed) / Reasoned (inferred) /
  Assumed. Never present a guess as a fact.

## Project-Specific Standards

### Architecture

```
src/app/page.tsx      auth gate → AuthedShell (client-side view switch)
src/app/api/**        JSON route handlers, ActionResult envelopes
src/components/app/** product UI (header, views, cells, dialogs — incl. edit-board-dialog)
src/components/ui/**  shadcn primitives (vendored)
src/lib/domain.ts     vocabulary + DTOs + ActionResult + pure helpers (single source)
src/lib/domain.test.ts Vitest unit suite over the pure seams
src/lib/auth.ts       scrypt + cookie sessions
src/lib/api-client.ts typed fetch (never throws)
prisma/schema.prisma  User · Session · Board · Group · Task · Activity
scripts/seed.ts       idempotent demo dataset
```

### API Design

- Mutations: `POST /api/boards`, `POST /api/boards/[id]/groups`,
  `POST /api/tasks`; updates: `PATCH /api/{boards,tasks,groups}/[id]`
  (boards accept title/description/color/**visibility**/isFavorite); deletes:
  `DELETE` on the same. Reads: `GET /api/boards`,
  `GET /api/boards/[id]`, `GET /api/dashboard`, `GET /api/analytics`,
  `GET /api/users`. All authenticated by the session cookie.
- **Invariant**: `PATCH /api/tasks/[id]` couples `status` and `completed`
  (either field derives the other). The client mirrors this in
  `board-view.tsx` before patching state — every new mutation path must too.
- Analytics `GET` takes `?boardId=<id|all>&days=<7|30|90>`; the window bounds
  task `updatedAt` while board performance stays unbounded (intentional).

### Database / Data Layer

- SQLite via the `db` export in `src/lib/db.ts` (global-singleton client).
  Cascades: `Board → Group → Task`; `Task.ownerId` is `SetNull`.
  Indexes on `boardId`, `groupId`, `ownerId`, `userId`, `createdAt`.
- Schema edits: update `prisma/schema.prisma` → `bun run db:push` → (dev)
  re-seed. The DB file is disposable; the schema + seed are the truth.

### Environment Variables

| Variable | Purpose | Notes |
|----------|---------|-------|
| `DATABASE_URL` | SQLite file URL | Resolved relative to `prisma/` — use `file:../db/custom.db` |

## Anti-Patterns to Avoid

- New page routes or a router — the app is deliberately one client-switched route.
- Hardcoding status/priority/color strings in components instead of `src/lib/domain.ts`.
- `useEffect(() => { if (open) reset() })` in dialogs — mount the form inside `<DialogContent>` instead.
- Async `load()` helpers that call `setState` internally (lint blocks it; return the promise).
- Per-board aggregate queries in `boards/route.ts` — the grouped-query pattern is there for a reason.
- Suppressing lint/type failures to ship. A red gate is a finding, not an obstacle.
- Committing demo/seed credentials as if they were production secrets (they are documented public demo values) — or worse, committing real ones.
