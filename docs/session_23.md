# Session 23 — Auth Rate Limiting (the PAD §10 Open Medium Item), Full Re-Verification, Screenshots, Docs

Session numbering: `docs/session_22.md` (operator commit `9e9f6ab`) is the
operator's transcript record of the session-21 run; this log continues the
agent-authored series as session 23. The operator's brief re-issued the full
cycle: workspace refresh, doc review + codebase validation, parity iteration
against `https://tuesdaycom-a6700714.base44.app/`, mobile-navigation +
Tailwind v4 attention, the DB-location contract, vitest + playwright
suites, a TDD remediation plan, screenshots, `.env.example`, docs
alignment, and the SSH-wrapper push to main.

## Baseline validation (repo vs docs)

- `git pull` brought in exactly one commit (`9e9f6ab` — the operator's
  `docs/session_22.md` transcript; zero code delta). Tree clean at
  `9e9f6ab` == origin/main.
- AGENTS.md / CLAUDE.md / README.md / PAD v1.12 / task-management_SKILL.md
  reviewed in full; session_21.md, worklog, remediation-plan-session21.md,
  session_22.md reviewed. Every session-21 marker re-confirmed in the tree:
  `@custom-variant hover (&:hover)` (globals.css:13), `src/lib/db-path.ts`,
  `tests/db-path.test.ts`, `scripts/prisma-cli.ts`, `playwright.config.ts`,
  `e2e/` (4 spec files), OLD-anatomy Button, `.env.example` byte-identical
  to the working `.env`, `db/custom.db` inside the repo.
- Baseline gates re-run green: lint 0 · tsc 0 · 160/160 unit · dev server
  200 with login + dashboard API round-trip (canonical 4 boards / 7 done /
  18 pending / 28%). One documented Turbopack cache panic on first boot
  (stale `.next` from the prior session) — resolved by the documented
  runbook (pkill + `rm -rf .next` + restart).

## Parity verification (reference live, 2026-09-22)

- **Bundle drift check**: the reference still ships
  `index-BuEJAhK4.js` / `index-DjjZtFMQ.css` — unchanged since session 9;
  every decompiled spec remains valid.
- **Mobile navigation (the operator's standing attention item)**: logged
  into the reference at 375×812, opened the hamburger panel, and probed
  computed styles — the reference's hovered hamburger computes
  `rgb(225,229,243)` with `matchMedia('(hover: hover)') === false`. The
  clone probed identically: SAME computed color in the same no-hover
  environment — the session-21 `@custom-variant hover` fix holds. Panel
  content matches (Dashboard / My Boards / Analytics links + search + user
  section); tap-navigation navigates AND closes the panel
  (`/Boards` reached, `aria-expanded=false` after).
- **VLM sweep**: fresh 5-pair captures (mobile-nav-open, dashboard,
  boards, board-table, analytics) on both apps — **5/5 MATCH**.
- **Functional smoke**: kanban card drag ("Content audit" → Done column)
  persisted via the API with the status↔completed coupling intact
  (`status=done`, `completed=true`); restored through the app's PATCH
  contract; DB re-verified at the canonical seed (4/9/25/7).
- Reference state left pristine throughout (1 board, 1 pending task).

## Audit finding (the repo's own tracked open item)

**MEDIUM — No login rate limiting** (PAD §10's only open Medium row):
`POST /api/auth/login` accepted unlimited attempts (each running
`findUnique` + `scryptSync` — brute-force + CPU-amplification surface);
`POST /api/auth/signup` the same (enumeration oracle + account spam). No
other new gaps: code hygiene clean (zero TODO/console.log), all gates
green, DB contract intact, parity converged.

Plan: `docs/remediation-plan-session23.md` — written and validated against
the tree BEFORE execution (no existing limiter; the api-client flows any
status's envelope so the 429 message renders inline with zero client
changes; the E2E demo email accrues only one failure per run).

## Remediation executed (TDD, one logical change per commit)

1. **RED** `src/lib/rate-limit.test.ts` — 12 contract tests (module
   absent → suite red). One test bug caught in the loop (a `check()`-based
   pruning assertion — `check` never inserts by design; fixed the TEST to
   use `recordFailure`).
2. **GREEN** `src/lib/rate-limit.ts` — `createRateLimiter({ windowMs, max,
   maxKeys })`: fixed window from the FIRST failure; failures-only login
   counting with `reset()` on success; all-attempts signup counting;
   expired-entry pruning on every check; `maxKeys` cap (default 10 000)
   against key-rotation memory growth; `clientIp` (x-forwarded-for first
   hop → x-real-ip → "unknown"). Singletons `loginLimiter` (5/15 min) and
   `signupLimiter` (10/15 min) with exported bounds as module constants.
3. **Wiring** — login route: key `login:${ip}:${email}`, gate BEFORE the
   scrypt work, 401 → `recordFailure`, success → `reset`, blocked → 429 +
   `Retry-After` + friendly envelope. Signup route: key `signup:${ip}`,
   every parsed POST counts, same 429 shape. Zero client changes (the
   envelope flows through `api-client`).
4. **E2E regression** — `e2e/auth.spec.ts` gained the rate-limit spec:
   unique throwaway email → 5×401 → 6th POST asserts 429 +
   `Retry-After` ≥ 1 + the friendly message.

## Verification (all executed this session)

- Gates: lint 0 · tsc 0 · **172/172 unit tests** · standalone build green
  · **13/13 Playwright specs** against the production artifact (the suite
  restored the DB to the canonical seed state afterwards).
- **Live probes** on the dev server: 5×401 then 429 with
  `Retry-After: 900` and "Too many attempts. Please try again in about 15
  minutes."; the message renders inline in the login form's alert (agent-
  browser); demo login still works after the block (different key);
  fail-then-succeed round-trip (reset semantics); malformed body → 400
  (never consumes budget).
- Screenshots: fresh 14-surface dev-server set captured into
  `docs/screenshots/` (login, dashboard, boards, board table/kanban/
  calendar/timeline/unassigned, analytics, three board-header modals,
  mobile dashboard + mobile nav open) — 1440×900 + 375×812.
- `.env.example`: re-verified byte-identical to the working `.env`; no new
  env vars (limiter bounds are module constants per the repo's
  "no speculative knobs" rule).

## Deliverables

- Code: `src/lib/rate-limit.ts`, `src/lib/rate-limit.test.ts`, the
  login/signup wiring, the E2E rate-limit spec.
- Docs: PAD v1.13 (revision block; §6.1 rule 9; §6.2 utilities; §6.4
  threat-model rows; §7.1 distribution table incl. a corrected unit-test
  subtotal 145→149; §7.2 E2E patterns; §10 row closed; §11 key files),
  README (auth feature row + testing table + TDD paragraph), AGENTS.md
  (the auth-limiter invariant appended to the auth bullet), CLAUDE.md
  (counts + inventory + E2E note), task-management_SKILL.md v1.1.0
  (frontmatter, invariants table row, counts, audit-history row), this
  log, `docs/remediation-plan-session23.md`, worklog append.
- Screenshots: 14 fresh PNGs under `docs/screenshots/`.

## Outcome

- The repository's last open Medium item is closed; every gate is green;
  parity re-verified on a fresh sweep; the remaining PAD §10 rows are
  pre-triaged deliberate deviations (Info) and Low product decisions.
- Delivery: atomic commits on main, pushed via the SSH wrapper
  (`docs/ssh_git_wrapper_v3.py` + the operator runbook), key shredded
  after use.

## Suggested next steps

Nothing pending from the brief. If the reference's asset hash ever
changes (`index-BuEJAhK4.js`), re-decompile before trusting prior specs.
The natural next hardening steps (all Low/product decisions, tracked in
PAD §10): full-text search, span-bar timeline via a `startDate` column,
and a real BoardMember model when collaboration lands.
