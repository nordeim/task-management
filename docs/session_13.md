# Session 13 — Primitive Anatomy Convergence (Badge, Switch)

Session start: continuation of the interrupted session-12 drift sweep
(the VLM comparison step). Workspace recovered intact: repo at `26af4ac`
(owner's upload of the session-11 transcript as `docs/session_12.md`),
clean tree, dev server alive, 24 view captures already on disk (12
reference + 12 clone, `captures/s12/`), the controlled-experiment probe
boards live on both apps. This log records the completion of the sweep
and the follow-up convergence pass.

## Phase 1 — finishing the interrupted VLM sweep

The persisted `vlm-compare.mjs` ran all 12 view pairs side by side:
**11 of 12 returned MATCH** (dashboard, boards, board-table, board-kanban,
board-calendar, board-timeline, board-unassigned, analytics, login,
modal-integrations, modal-automations). The single difference verdict —
`modal-analytics` — claimed the reference's bottom-right card was "Team
Workload" while the clone showed "Recent Activity".

## Phase 2 — triaging the one verdict difference

The Team Workload claim decomposed into two findings:

**Probe-data artifact (not an app gap).** The clone's probe seeding
script resolved owners by NAME against the clone's user table, but the
reference probe's owners (John Doe / Jane Smith / Mike Brown) don't exist
in the clone's seed (Jane Doe / John Smith / Mike Jones) — `ownerId` was
never written, so the panel legitimately hid (`workload.length === 0`).
Verified both directions: on the clone's Website Redesign board (9 owned
tasks) the Team Workload card renders correctly (avatar initials, counts);
on the reference's owner-less Product Launch board the panel is hidden
too. The conditional rendering matches the reference in BOTH states.

**Primitive anatomy gaps (real, systemic).** Because the workload rows
had never actually rendered side by side, their badge anatomy had never
been compared. Live computed-style probes exposed the real gaps — and
the same drift in the Switch (whose row-level anatomy the prior VLM
passes had absorbed):

| element | reference (computed) | clone (before) |
|---------|---------------------|----------------|
| outline badge padding | `2px 10px` | `2px 8px` |
| outline badge font-weight | 600 | 500 |
| default badge box-shadow | `0 1px 3px / 0 1px 2px -1px` | none |
| switch track border | 2px | 1px |
| switch checked-thumb offset | 18px from track left | 15px |
| switch thumb shadow | shadow-lg | none |

The reference bundle (still `index-BuEJAhK4.js`, no drift) was fetched
and the exact OLD-shadcn cva strings decompiled for both primitives.
Blast-radius audit: only `board-analytics-dialog.tsx` rendered the
un-overridden anatomy (the two other Badge consumers already passed
`px-2.5 font-semibold` consumer overrides — the session-11 author had
compensated per-consumer instead of fixing the source); the dashboard
visibility badges are custom spans and the status/priority pills are
custom recipes (unaffected). Progress bars and the modals' Configure
buttons were computed-verified IDENTICAL and left untouched; the Button
base differs only in focus-ring geometry (no at-rest gap, all live
surfaces previously verified) — deliberately not rewritten.

## Phase 3 — TDD fix (red → green)

`docs/remediation-plan-session13.md` was written and validated against
the codebase before execution. Then:

- **RED** — new `src/components/ui/primitives.test.ts`: class-contract
  tests asserting the decompiled anatomy markers for all four Badge
  variants and the Switch track/thumb constants (exported for the
  tests). 11 failing tests against the current NEW-shadcn classes.
- **GREEN** — `ui/badge.tsx` rewritten to the decompiled cva (base
  `px-2.5 py-0.5 font-semibold`, default/secondary/destructive/outline
  per the bundle, v3 `shadow` ported as v4 `shadow-sm`);
  `ui/switch.tsx` rewritten with exported `SWITCH_TRACK_CLASS` /
  `SWITCH_THUMB_CLASS` (track `h-5 w-9 border-2 shadow-xs`, thumb
  `h-4 w-4 shadow-lg translate-x-4`, v3 `shadow-sm` ported as v4
  `shadow-xs`). Suite: **131/131** (120 domain + 11 contracts).

## Phase 4 — browser verification and loop closure

Computed-style probes after the fix, clone vs reference: outline badge
`2px 10px` / 600 / `#E5E7EB` border — identical; default workload badge
black fill, white text, identical shadow — identical; switch border 2px,
thumb shadow-lg, checked-thumb offset 18px — identical.

The local probe tooling was then fixed (owners resolved by email /
position against the actual user table, mirroring the reference's
3/3/2 + 2-unassigned distribution), the clone's probe tasks were
patched with real owners, the modal-analytics capture was re-taken, and
the VLM comparison re-run: **modal-analytics MATCH**. The
modal-integrations and modal-automations pairs were also re-captured
and re-compared post-Switch-fix (belt and braces): **MATCH**. All 12
view pairs now converge.

## Phase 5 — cleanup, gates, delivery

Reference restored to pristine via the base44 entities API (10 items +
the S12 Probe Board deleted, all 200s; verified 1 board "Product
Launch" / 1 item, re-checked in the browser). Clone's probe board
deleted (canonical 4-board seed state restored). Gates: lint 0, tsc 0,
**131/131 tests**, standalone production build OK. Docs aligned (PAD
v1.10 with the primitive-anatomy contract in §5.3, README test table,
CLAUDE.md inventory, AGENTS.md invariant next to the session-11 Card
rule). Atomic commits on main, SSH-wrapper push, operator key shredded
after delivery.
