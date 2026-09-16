# AGENTS.md

Instructions for AI coding agents working in this repository. Every line answers: "would you get this wrong without being told?" Verified against the toolchain on 2026-09-15.

## Commands

Run from the repo root. **Bun** is the package manager (`bun.lock` is committed) — never mix npm/yarn installs.

| Command | What it does |
|---|---|
| `bun install` | Install dependencies |
| `bun run db:push` | Create/migrate `./db/custom.db` from `prisma/schema.prisma` (SQLite) |
| `bun run db:seed` | Idempotent seed via `scripts/seed.ts` — demo account + 4 boards + 25 tasks; safe to re-run |
| `bun run dev` | Dev server on :3000 (Turbopack) |
| `bun run lint` | ESLint 9 flat config (`eslint-config-next` defaults, **zero rule weakening**) — must exit 0 before pushing |
| `bun run typecheck` | `tsc --noEmit` — must report no errors; `skills/` and `docs/` are excluded from the compile |
| `bun run test` | Vitest unit suite over the pure domain seams — red first, then implement |
| `bun run build` | Standalone production build (also copies static assets into `.next/standalone`) |
| `bun run start` | Serve the standalone build on :3000 |
| `cat /secure/key \| python3 docs/ssh_git_wrapper_v3.py --key-stdin --remote git@github.com:nordeim/task-management.git` | The only sanctioned push path (see `docs/how-to-git-push-using-ssh-wrapper_SKILL.md`) |

Order for a clean check: `bun run lint && bun run typecheck && bun run test`. After schema edits: `bun run db:push` (then re-seed if you wiped the DB). `DATABASE_URL` must be set (`.env`, from `.env.example`) or every Prisma call fails at import time. The `skills/` folder is the owner's vendored skill library — it is excluded from lint, typecheck, tests, and build; never let it into a gate.

## Architecture invariants

- **Single user-visible route.** Everything lives in `src/app/page.tsx`: an auth gate that boots `/api/auth/me`, then `<AuthedShell>` switching client-side between dashboard / boards / board / analytics views held in `AppProvider` context (`src/components/app/app-context.tsx`). Do not add page routes — the sandbox only exposes `/`, and the whole point is that no surface renders outside the session check.
- **All mutations return the `ActionResult<T>` envelope** (`{ ok: true, data } | { ok: false, error }`, defined in `src/lib/domain.ts`). Route handlers never throw across the boundary; the client (`src/lib/api-client.ts`) never parses throws. New endpoints follow the same contract.
- **`status` ↔ `completed` are one fact in two columns.** The coupling is the exported `resolveStatusCompletedPatch` in `src/lib/domain.ts`; the server applies it in `PATCH /api/tasks/[id]` and the client mirrors it in `board-view.tsx` after confirmation. If you write a new mutation path (bulk edit, import, automation), call the same function or the table checkbox, kanban, and analytics will disagree.
- **Every API input is Zod-parsed** (`loginSchema`, `createBoardSchema`, `updateTaskSchema`, …). Reject with a 400 + human-readable message from `parsed.error.issues[0]`; never fall back to raw `body as T`.
- **Pure logic lives in `src/lib/domain.ts` and is unit-tested** (`src/lib/domain.test.ts`). New logic follows TDD: failing test first, then the implementation. The status↔completed coupling is ONE exported function (`resolveStatusCompletedPatch`) consumed by both the PATCH handler and the client mirror — new mutation paths must call it instead of re-deriving the coupling. The board toolbar pipeline (search + person + status/priority + sort) runs through the unit-tested seams `filterTasks`/`sortTasks`; column hiding runs through `visibleColumns`; the group footer row through `groupSummary`; boards-card time through `relativeBoardTime`. Wire new toolbar behavior into those seams, not inline lambdas.
- **Auth is cookie+session-table.** scrypt hashes (`src/lib/auth.ts`), opaque 32-byte tokens in the httpOnly `tuesday_session` cookie, 30-day TTL, lazy expiry cleanup on read. Ownership checks are `findFirst({ where: { id, ownerId: user.id } })` — a missing row means 404, which is also the not-authorized answer (no existence leak).
- **Domain vocabulary is closed.** Statuses, priorities, the six board colors, and board visibility (`private`/`public`) are `const` arrays in `src/lib/domain.ts`. UI components and API validation both derive from them — never hardcode a status string in a component.
- **The board toolbar renders only in the Main Table view** (reference behavior — Kanban/Calendar/Timeline/Unassigned show just their own headers). Filter state (status/priority sets, person, sort, hidden columns) lives in `board-view.tsx` and applies to every view's task list even though the controls are table-only.

## Framework quirks (verified the hard way)

- **Tailwind v4 is CSS-first.** There is no `tailwind.config.js` (a leftover v3-style config was dead weight and was removed). Tokens live in `src/app/globals.css` under `@theme inline`; shadcn semantic tokens are literal hex in `:root`. Do not reintroduce a JS config.
- **`react-hooks/set-state-in-effect` is enforced.** Two compliant patterns are load-bearing in this codebase:
  1. **Data loading**: `load()` is a pure `() => api(...)`; the effect does `load().then(result => …setState)` with a `cancelled` flag in cleanup. Never call an async `load` that setStates internally.
  2. **Dialog forms**: form state lives in a component **inside `<DialogContent>`** — Radix unmounts closed dialogs, so every open starts from `useState` initializers. Never add a `useEffect(() => open && reset())` — lint blocks it.
- **`BoardView` is keyed by board id** in `page.tsx` (`<BoardView key={view.boardId}>`). Switching boards remounts the component — that is the view-state reset mechanism. If you lift state out of it, you re-introduce the reset problem it solves.
- **Turbopack dev cache corrupts** if config files change while the server runs (panic: "Failed to restore task data"). Fix: `pkill -f "next dev"; rm -rf .next` and restart. Do not "fix" source files when the error is a cache panic.
- **`next-env.d.ts` churns** between `dev` and `build` (the type-root reference flips between `.next/types` and `.next/dev/types`). Restore the committed state (`git checkout -- next-env.d.ts`) before committing — never bundle the churn into feature commits.
- **Next 16 async request APIs**: `cookies()`, `params`, `searchParams` are Promises — always `await`. Page files may export only the framework-known keys.
- **Prisma + SQLite**: relative `DATABASE_URL` resolves against `prisma/schema.prisma`, not the repo root — hence `file:../db/custom.db`. `db/*.db` is gitignored; the DB is always recreatable via `db:push` + `db:seed`.
- **ESLint `ignores`** cover sandbox-only directories (`refs/`, `examples/`, `skills/`, `mini-services/`, `tests/`, `.zscripts/`, `tool-results/`, `upload/`, `download/`, `Caddyfile`). Those exist in the dev sandbox, not in a fresh clone — keep the list when editing `eslint.config.mjs`, or lint suddenly reports thousands of errors from vendored skill scripts.

## Money-sharp edges in this domain

- Due dates are stored at **local noon** (`date-cell.tsx` converts the native date input's value to 12:00 before `toISOString`) so timezone edges never shift the rendered day. Keep that when adding date inputs. The timeline's day columns rely on the same noon-stable comparison.
- Group collapse is **optimistic** (`toggleCollapse` patches UI first, reverts on API failure). New optimistic paths must have the same revert-on-failure shape.
- The analytics `days` window bounds tasks by `updatedAt`; **board performance deliberately ignores the window** (a board isn't "inactive" because nothing was edited). Preserve that asymmetry — it mirrors the reference product.
- `boards/route.ts` aggregates task counts with ONE grouped query + in-memory join, not per-board queries. Keep it that way as boards grow.
- Kanban drag IDs are namespaced (`status:<value>`, `person:<id|unassigned>`) so the same DnD context serves both groupings; parse the prefix in `onDragEnd`.
- The timeline grid math (`timelineRange`) is a pure, unit-tested function in `domain.ts` — week windows start Monday, month windows span calendar days. Change the grid, change the tests first.
- `TaskDTO` carries **both** `createdAt` and `updatedAt` — the Sort popover offers Created Date / Updated Date and both must round-trip from `toTaskDTO` in `boards/[id]/route.ts` (Prisma returns them by default; just map them).
- The board-table grid template is built per render from `visibleColumns(hiddenColumns)` (`gridTemplate()` in `board-table.tsx`). Column pixel widths live in `COLUMN_WIDTHS`; adding a column means updating that map + the Hide popover's `COLUMN_KEYS` + `domain.ts`'s `ALL_COLUMNS`.

## Conventions that differ from defaults

- No `console.log` in shipped code (`console.error` with context is allowed on caught failures); the Prisma client logs `warn`/`error` only.
- Untested claims are labeled. When you verify behavior, say what you ran; when you couldn't, say that.
- Conventional Commits, atomic scope (`feat(board): …`). Never commit `.env`, `db/*.db`, logs, or the SSH key — `.gitignore` enforces the first three; the key must never enter the tree at all (rotate if it ever does).
- Buttons that depend on unconfigured integrations (Google OAuth, password reset, Integrate, Automate) render **honest "not configured" messages** — never fake success or leave dead buttons.

## Reference

- `README.md` — human onboarding (setup, architecture, design tokens).
- `Project_Architecture_Document.md` — the full engineering blueprint (ADRs, layer model, data architecture, security).
- `CLAUDE.md` — the six-phase workflow contract used for all implementation tasks.
- `docs/ssh_git_wrapper_v3.py` + `docs/how-to-git-push-using-ssh-wrapper_SKILL.md` — the push path.
- `scripts/seed.ts` — the demo dataset and its shape.
