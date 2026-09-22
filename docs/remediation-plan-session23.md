# Session 23 Remediation Plan — Auth Rate Limiting (the PAD §10 open Medium item)

Probed live on 2026-09-22 against `https://tuesdaycom-a6700714.base44.app/`
(logged in as sepnetflix2023@outlook.com; mobile 375×812 and desktop 1440×900)
and against the local dev server + standalone production build. The reference's
compiled bundle remains `index-BuEJAhK4.js` / `index-DjjZtFMQ.css` — unchanged
since session 9 — so every decompiled parity spec stays valid.

This cycle's audit re-verified the full session-21 delivery first (workspace
refresh at `9e9f6ab`, all code markers present, baseline gates green), then
swept parity and functionality end to end. Exactly one actionable finding
remains — the repository's own tracked open item.

## Cycle audit results (evidence-backed, all executed this session)

1. **Workspace/docs/codebase alignment — VERIFIED.** `git pull` brought in
   `9e9f6ab` (operator's `docs/session_22.md` transcript only; zero code
   delta). All session-21 markers confirmed in the tree:
   `@custom-variant hover (&:hover)` (globals.css:13), `src/lib/db-path.ts`,
   `tests/db-path.test.ts`, `scripts/prisma-cli.ts`, `playwright.config.ts`,
   `e2e/` (4 specs), OLD-anatomy Button, 14 screenshots, `.env.example`
   byte-identical to the working `.env`.
2. **Gates — GREEN.** lint 0 · tsc 0 · 160/160 unit · 12/12 Playwright specs
   against the standalone production build (re-built this session).
3. **DB-path contract — INTACT.** `db/custom.db` inside the repo with the
   canonical seed (4 boards / 9 groups / 25 tasks / 7 done); the E2E suite's
   restore leg brought the DB back to seed state after its mutation specs.
4. **Parity — UNCHANGED BUNDLE, 5/5 MATCH.** Fresh capture pairs (mobile
   nav open, dashboard, boards, board table, analytics) VLM-compared:
   MATCH on all five. Mobile nav additionally verified at computed-style
   level: both apps' hamburger computes `rgb(225,229,243)` on hover in a
   `matchMedia('(hover: hover)') === false` context — the session-21 fix
   holds. Panel opens, tap-navigation navigates AND closes the panel
   (`/Boards` reached, `aria-expanded=false` after).
5. **Functional smoke — PASS.** Kanban card drag ("Content audit" → Done)
   persisted via the API with the status↔completed coupling (`status=done`,
   `completed=true`); seed state restored through the app's own PATCH
   contract; DB re-verified at 7 done / 25 tasks.
6. **Code hygiene — CLEAN.** Zero TODO/FIXME markers in `src/`; zero
   `console.log` in shipped code; login/signup handlers follow every
   documented invariant (Zod parse, uniform 401 message, ActionResult
   envelope).

## Finding 1 — No login rate limiting: unauthenticated brute-force + scrypt-amplification surface (MEDIUM — the PAD §10 open item, verified)

`POST /api/auth/login` accepts unlimited attempts. Each attempt runs
`db.user.findUnique` + `scryptSync` (64 MB difficulty) — an attacker can
brute-force credentials at line rate AND cheaply burn server CPU (scrypt is
per-attempt, CPU-bound, on the request path). `POST /api/auth/signup` has the
same shape: unlimited attempts enumerate registered emails (409 oracle) and
enable account-creation spam. The repo's own PAD §10 has tracked this since
before v1.12: *"No login rate limiting — brute-force surface on public
deployments — add per-email+IP limiter before internet exposure."*

**Action** (TDD, red first; the repo's conventions applied end to end):

- `src/lib/rate-limit.test.ts` — RED contract suite for a new pure module:
  allows under max; blocks at max with `retryAfterSec`; window expiry resets
  counting; per-key isolation; `reset()` clears (successful login); failure
  counting only (`recordFailure`); pruning of expired entries; `maxKeys` cap.
- `src/lib/rate-limit.ts` — `createRateLimiter({ windowMs, max, maxKeys })`
  returning `{ check, recordFailure, reset }` over an in-memory
  `Map<string, { failures, resetAt }>`. Fixed window measured from the FIRST
  failure. Module-level singletons: `loginLimiter` (5 failures / 15 min) and
  `signupLimiter` (10 attempts / 15 min). In-memory is correct here: the PAD
  documents a single Next.js process; a restart clears counters (acceptable —
  the Session table remains the durable auth state). Prunes expired entries
  on every check; caps the map at `maxKeys` (default 10 000) so a
  key-rotating attacker cannot grow memory unbounded.
- `src/app/api/auth/login/route.ts` — key `login:${ip}:${email}` (per-email+IP
  exactly as PAD §10 words it). `check` before the credential query → 429 +
  `Retry-After` header + `{ ok: false, error: "Too many attempts…" }`
  (the api-client flows any status's envelope through, so the login form
  renders the message inline — zero client changes). 401 → `recordFailure`;
  successful login → `reset` (a legitimate user with transient typos is never
  locked out; only failures count, so the E2E suite's ~6 successful demo
  logins per run never trip the limit).
- `src/app/api/auth/signup/route.ts` — key `signup:${ip}`, every parsed POST
  counts (creation is the guarded action), same 429 envelope.
- IP extraction: `x-forwarded-for` first hop → `x-real-ip` → `"unknown"` —
  documented for the single-process/edge-proxy deployment in
  `docs/DEPLOYMENT.md`.
- `e2e/auth.spec.ts` — one new spec: a unique throwaway email
  (`ratelimit-<timestamp>@example.test`) takes 5 bad-password 401s, then the
  6th POST asserts 429 + the friendly message + `Retry-After` ≥ 1. Unique key
  per run isolates it from the other specs; the demo email sees exactly one
  failure per suite run (the invalid-credentials spec) — under the limit.

Blast radius: one new pure module + its tests, two route handlers (guard
clauses), one E2E spec, docs. No schema, no client, no API contract change
(the envelope already covers 429). Verification: gates + a live
5-failures-then-429-then-login-still-works probe on the dev server + the
full Playwright suite against the rebuilt artifact.

## Everything else — no new gaps

The full audit surface above re-verified green. The remaining PAD §10 rows
are pre-triaged deliberate deviations (Info) and Low backlog items that are
product decisions, not defects (multi-tenant membership, full-text search,
span-bar timeline) — out of scope for a remediation cycle whose brief is
bug/gap fixing against the reference.

## Deliverables beyond the code fix

1. **Screenshots** — fresh dev-server captures of the remediated codebase
   into `docs/screenshots/` (the canonical 14-surface set).
2. **`.env.example`** — re-verify byte-level against the working `.env`; no
   new env vars (the limiter's bounds are module constants — the repo's
   "no speculative knobs" rule; document them in the module and PAD).
3. **Docs** — PAD v1.13 (revision block, §7 testing counts, §10 row closed,
   key-files row), README (features + testing table), AGENTS.md (invariant:
  the auth limiter + its reset semantics), CLAUDE.md (counts + inventory),
   `task-management_SKILL.md` (security section + counts),
   `docs/session_23.md`, `docs/worklog.md` append, this plan's execution
   record.
4. **Commit series + push** — atomic commits on main via
   `docs/ssh_git_wrapper_v3.py` (dry-run → real → remote verify; key
   shredded after use; no new branches).

## Execution order (TDD, one logical change per commit)

1. RED `src/lib/rate-limit.test.ts` → GREEN `src/lib/rate-limit.ts`.
2. Wire login route (429 + Retry-After + recordFailure/reset) — live probe.
3. Wire signup route.
4. E2E spec addition → rebuild → full suite (expect 13 specs).
5. Full gates: lint · typecheck · unit · build · e2e.
6. Dev-server screenshots → docs; .env.example re-verify.
7. Docs phase (PAD/README/AGENTS/CLAUDE/SKILL/session log/worklog).
8. Atomic commits on main + SSH-wrapper push.

## Validation of this plan against the codebase (performed before execution)

- `rg -i "rate.?limit|429|Retry-After" src/` — zero hits: no existing limiter
  (Finding 1 premise confirmed).
- `src/app/api/auth/login/route.ts` + `signup/route.ts` read in full — both
  guard-less; scrypt verification confirmed on the login path
  (`verifyPassword` → `scryptSync`).
- `src/lib/api-client.ts` read — any status's JSON envelope flows through
  `{ ok, error }`; the login form's error alert renders `result.error`
  (`login-view.tsx:194`) — the 429 message surfaces with zero client changes.
- `e2e/auth.spec.ts` + `e2e/helpers.ts` read — the demo email accrues exactly
  one failure per suite run (invalid-credentials spec); all other specs sign
  in successfully (reset) — the new spec cannot cross-contaminate.
- Vitest colocated-suites convention confirmed (`src/lib/*.test.ts` is the
  established pattern; 160 tests today).
- Gates at baseline: lint 0 / tsc 0 / 160 unit / 12 E2E / build green
  (re-verified this session before this plan was written).
