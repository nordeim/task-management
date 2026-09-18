# Session 13 Remediation Plan — Primitive Anatomy Convergence (Badge, Switch)

Probed live on 2026-09-18 against `https://tuesdaycom-a6700714.base44.app/`
(logged in as sepnetflix2023@outlook.com, viewport 1440×900). The reference's
compiled bundle is UNCHANGED since session 9 (`/assets/index-BuEJAhK4.js`,
byte-identical), so all prior decompiled specs remain valid. This cycle
re-ran the controlled experiment with a fresh throwaway board ("S12 Probe
Board", 10 tasks, 3 owners + unassigned, dates Sep 14 – Oct 10) seeded on
BOTH apps, captured 12 view pairs (24 screenshots), and ran a VLM
side-by-side drift sweep: **11 of 12 pairs returned MATCH**. The single
verdict difference was triaged with live DOM probes and computed-style
ground truth, exposing two systemic vendored-primitive gaps that every
previous VLM pass had missed because they are sub-perceptual (2px padding,
font-weight, 3px thumb offset, 1px border).

## Finding 1 — Team Workload "missing panel" is a probe-data artifact (NO app fix)

The VLM flagged the Board Analytics modal's bottom-right card: reference
shows Team Workload, clone showed Recent Activity. Live triage:

- The clone's probe seeding script resolved owners by NAME against the
  clone's user table; the reference's probe owners (John Doe / Jane Smith /
  Mike Brown) do not exist in the clone's seed (Jane Doe / John Smith /
  Mike Jones), so `ownerId` was never written and the panel legitimately
  hid (`workload.length === 0`).
- On the clone's Website Redesign board (9 owned tasks) the Team Workload
  card renders correctly (3 members, avatar initials, task-count badges).
- On the reference's owner-less Product Launch board the panel is hidden
  too — the clone's conditional rendering matches the reference in BOTH
  states.
- Verified row anatomy against the reference: avatar `w-8 h-8 bg-blue-500
  rounded-full text-white text-sm font-bold` initial, name
  `font-medium` — identical.

Action: fix the local probe tooling (outside the repo), re-seed the clone's
probe board with real owners, re-capture, and re-run the VLM pair to obtain
the clean MATCH verdict. No application code changes.

## Finding 2 — vendored Badge ships NEW shadcn anatomy; the reference ships OLD

Computed-style ground truth (Board Analytics modal):

| property | reference | clone (current) |
|----------|-----------|-----------------|
| outline badge padding | `2px 10px` | `2px 8px` |
| outline badge font-weight | 600 | 500 |
| default badge shadow | `0 1px 3px rgb(0 0 0/.1), 0 1px 2px -1px …` | none |

Decompiled from the bundle (exact cva):

- base: `inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs
  font-semibold transition-colors focus:outline-none focus:ring-2
  focus:ring-ring focus:ring-offset-2`
- default: `border-transparent bg-primary text-primary-foreground shadow
  hover:bg-primary/80`
- secondary: `border-transparent bg-secondary text-secondary-foreground
  hover:bg-secondary/80`
- destructive: `border-transparent bg-destructive
  text-destructive-foreground shadow hover:bg-destructive/80`
- outline: `text-foreground`

Blast radius (all consumers audited): `board-analytics-dialog.tsx` (the %
and workload badges — the actual visible gap), `integrations-dialog.tsx`
and `automations-dialog.tsx` (already pass `px-2.5 font-semibold` consumer
overrides — identical rendering after the fix, overrides become redundant),
`dashboard-view.tsx` visibility badges are custom spans (unaffected),
status/priority pills are custom (unaffected).

## Finding 3 — vendored Switch ships NEW shadcn anatomy; the reference ships OLD

Computed-style ground truth (Integrations Center modal):

| property | reference | clone (current) |
|----------|-----------|-----------------|
| track size | 20×36px | 20×36px (consumer `h-5 w-9` override) |
| track border | 2px (transparent) | 1px |
| checked thumb offset | 18px from track left | 15px |
| thumb shadow | shadow-lg (`0 10px 15px -3px …`) | none |

Decompiled from the bundle (exact):

- track: `peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center
  rounded-full border-2 border-transparent shadow-sm transition-colors
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
  focus-visible:ring-offset-2 focus-visible:ring-offset-background
  disabled:cursor-not-allowed disabled:opacity-50
  data-[state=checked]:bg-primary data-[state=unchecked]:bg-input`
- thumb: `pointer-events-none block h-4 w-4 rounded-full bg-background
  shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4
  data-[state=unchecked]:translate-x-0`

Tailwind v3→v4 shadow rename map applied when porting (verified against
computed values): v3 `shadow-sm` → v4 `shadow-xs` (track), v3 `shadow` →
v4 `shadow-sm` (badge default), v3/v4 `shadow-lg` identical (thumb).

Consumers (`integrations-dialog.tsx`, `automations-dialog.tsx`) pass
`h-5 w-9` + checked/unchecked color overrides which become redundant but
stay harmless (identical values).

## Verified matching (no action)

- Progress bar: 8px height, green-300 track, rgb(23,23,23) fill, full
  radius — identical on both apps.
- Configure / Customize buttons: 32px height, 12px horizontal padding,
  font-weight 500, size 12px — identical at rest.
- Modal container + grid: `max-w-6xl rounded-2xl shadow-2xl` +
  `p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`, six cards
  with matching span classes — identical.
- Button base: the reference's cva differs only in focus-ring geometry and
  transition property; every live button surface was DOM-verified by
  sessions 9–11 and the at-rest computed styles match (Configure probe
  above). No change — spec-level rewrite without a visible gap is out of
  scope for this pass.

## Execution plan (TDD)

1. **RED** — `src/components/ui/primitives.test.ts`: class-contract tests
   asserting the decompiled anatomy markers for `badgeVariants` (all four
   variants) and the Switch track/thumb constants. Expect failures against
   the current NEW-shadcn classes.
2. **GREEN** — rewrite `src/components/ui/badge.tsx` cva and
   `src/components/ui/switch.tsx` class constants to the decompiled
   strings (with the v3→v4 shadow renames). Export the Switch constants so
   the contract tests can import them without a DOM.
3. **Browser verification** — computed-style probes on both live apps:
   outline/default badges (padding 2px 10px, weight 600, default shadow),
   switch (border 2px, thumb offset 18px, thumb shadow present).
4. **Probe loop closure** — fix the local seed script (resolve owners
   against the actual user table), re-seed the clone's probe board owners,
   re-capture the modal pair, re-run the VLM comparison (expect MATCH).
5. **Cleanup** — delete the S12 Probe Board + items on the reference
   (entities API, verify pristine 1 board / 1 task) and on the clone
   (restore the canonical 4-board seed state).
6. **Gates** — lint 0, tsc 0, tests green (120 + new contract tests),
   production build.
7. **Docs** — session_13.md, this plan, worklog append, README/AGENTS/
   CLAUDE/PAD alignment (primitive anatomy notes, test count).
8. **Delivery** — atomic commits on main, SSH-wrapper push (dry-run, real,
   remote verify, key shred).

## Non-goals

- No Button base rewrite (no verified at-rest gap; focus-only diffs).
- No new features, no behavioral changes — primitives render the same
  states with the reference's geometry.
- No replication of reference quirks (ESC handling, SPA-nav /login 404,
  boards-page analytics external link) — all remain documented deviations.
