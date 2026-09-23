# Remediation Plan — Session 33 (Cycle 30)

**Scope:** the fifth consecutive verification cycle — full reference drift check,
VLM parity sweep (12 surfaces), computed-style contract probes, functional
mutation smoke via the pinned E2E suite, and a deep token-level audit of the
shadcn design tokens against the live reference. The audit surfaced one genuine
systemic defect class (the `--background` token) plus one always-visible micro
drift (the board-header sub-row separators); both are fixed under TDD with two
new computed-style parity specs. Then: fresh screenshots, docs alignment,
atomic commits, SSH-wrapper push.

**Baseline:** `git pull` to `e35e8cd` (== origin/main — the session-31 delivery
`c72b23d` + the operator's `session_32.md` transcript). Gates green on arrival:
lint 0 · tsc 0 · 185/185 unit · standalone build · **25/25 E2E** · DB at the
canonical seed (4 boards / 9 groups / 25 tasks / 4 users / 7 done, verified
through the app's own `src/lib/db-path.ts` resolution). `.env` byte-identical to
`.env.example` (`DATABASE_URL="file:../db/custom.db"`).

## Drift check (executed this session)

- **The reference was NOT redeployed — fourth consecutive stable cycle.** Both
  bundles re-verified UNCHANGED: the platform login page still ships
  `/static/index-BZ3m2EKw.js` + `index-DuUT6T6n.css`; the authed SPA still ships
  `/assets/index-BuEJAhK4.js` + `/assets/index-DjjZtFMQ.css` (verified in the
  live post-login DOM). All parity specs remain valid.
- The reference's login DOM re-verified live: the mobile spacer footer
  (`mt-8 text-center text-xs text-slate-400 sm:hidden`, text `&nbsp;`) and the
  Google button's trailing `group` class are both present — matching the
  clone's session-29 port exactly.
- The reference was left pristine throughout (1 board / 1 pending task /
  0 completed / not favorited — re-verified at the end; no mutations were
  performed this session).

## Parity sweep (12 surfaces, VLM + computed styles)

- Fresh 12-surface capture on both apps at 1440×900 + 375×812 (login,
  dashboard, boards, board-table, board-kanban, board-calendar, board-timeline,
  board-unassigned, analytics, Board Analytics modal, mobile-dashboard,
  mobile-nav-open). After triage: **12/12 effective MATCH** — every DIFF flag
  resolved to per-record DATA (the clone's seeded "Q4 Product Launch" board is
  purple `#a25ddb` + favorited vs the reference's blue unfavorited
  "Product Launch"; calendar chips/timeline rows exist only where tasks have
  due dates; the reference's calendar is empty because its single task has no
  due date), the documented dev-mode N badge (dev server only), the Add New
  Group button below the fold on the taller clone board (verified present in
  the DOM, `inViewport: false`), or the already-triaged conditional Team
  Workload card (`{workload.length > 0 && …}`, PAD §10 / session 31).
- Mobile KPI deco circles re-verified at 2× zoom crop: "visually identical in
  position, size, and opacity" — the full-image VLM flag was a false positive.
- Capture-hygiene lesson (recorded for future sweeps): the clone's first
  `/Board` visit on a cold dev server needs on-demand route compilation — the
  click's 2.5 s wait raced the compile and the first board-table capture
  landed on the boards page; re-captured after the route warmed. The
  `find --name "Product Launch"` semantic locator also SUBSTRING-matches the
  clone's "Q4 Product Launch" board (the clone has no board of that exact
  name) — board color/favorite flags that followed were data noise.
- The mobile-nav sweep: panel opens/closes, content matches, and the
  hamburger-hover contract holds (pinned by `e2e/mobile-nav.spec.ts`, 3/3
  green in the suite run this session).

## Findings (evidence on both live apps this session)

1. **HIGH — the `--background` token is drifted: `#f5f6f8` here vs
   `hsl(0 0% 100%)` (white) on the reference** (probed on the reference's
   `document.documentElement`). The token comment lists the probed shadcn
   defaults (primary/foreground/accent) but `--background` was set to the
   page gray instead of the reference's white — and `bg-background` is a
   LIVE consumer across six rendered surface classes, all probed different
   on the two apps this session:
   - **Dialog panels** — every Radix `DialogContent`/`AlertDialogContent`
     carries `bg-background` (`src/components/ui/dialog.tsx:63`,
     `alert-dialog.tsx:57`): clone Board Analytics panel computes
     `rgb(245, 246, 248)` vs the reference's `rgb(255, 255, 255)`
     (its panel is an explicit `bg-white`). Affects all nine dialogs
     (Edit Task, Create Task, Create Board, Edit Board, Create Group,
     Board Analytics, Integrations, Automations, delete confirms).
   - **Board toolbar outline buttons** (Person/Filter/Sort/Hide/Group by —
     the `variant="outline"` base `bg-background`): the reference renders
     ALL of them `rgb(255, 255, 255)` (probed each by name); the clone
     renders `#F5F6F8`.
   - **Board header buttons** (Analytics/Integrate/Automate — same outline
     base): reference all white (probed); clone `#F5F6F8`.
   - **Boards page buttons** (Analytics, Filter, the inactive view toggle —
     `boards-view.tsx:161/174/181/191`): reference Filter probed
     `rgb(255, 255, 255)`; clone `#F5F6F8`.
   - **Dashboard hero "View Analytics" button**
     (`dashboard-view.tsx:233`): reference white (probed); clone
     `#F5F6F8` — the drift the mobile VLM pair surfaced ("slightly thicker
     border and darker text" — a gray fill on the white gradient card).
   - **Switch thumbs** (`switch.tsx:23` `bg-background`): the reference's
     Integrations modal switch thumb computes `rgb(255, 255, 255)`
     (track `rgb(229, 231, 235)`); the clone's thumb renders `#F5F6F8`.
   **Action:** `--background: hsl(0 0% 100%)` in `globals.css` `:root`
   (one line — every consumer above then renders the reference's white).
   Side effects audited: the `<body>` (`bg-background`) becomes white but is
   fully covered by every page root's own background (login has its own
   gradient — pixel-verified equal this session; authed pages carry
   `bg-[#F5F6F8]` on the shell/page roots); the app-shell loading splash and
   the toast/calendar defaults become the shadcn white (correct — they are
   shadcn-derived surfaces on the reference too).

2. **MEDIUM — the board-header sub-row separators render the wrong color.**
   The clone's two `|` spans use `text-muted-foreground/50`
   (`board-view.tsx:677/692`) → `oklab(0.5225 0.0059 -0.0259 / 0.5)` ≈
   rgb(179, 180, 188) (blue-tinted, from `--muted-foreground: #676879`), while
   the reference's separators are `text-[#A0A0A0]` (probed: class
   `text-[#A0A0A0]`, computed `rgb(160, 160, 160)`, opacity 1) — the SAME
   explicit color the clone already uses for the adjacent "N items ▪ Saved"
   meta (`board-view.tsx:696-700`). **Action:** the two separator spans get
   `text-[#A0A0A0]`, making the whole sub-row consistent with the reference.

3. **INFO — token hygiene:** `--muted` (`#f0f1f2`) also deviates from the
   reference's probed `0 0% 96.1%`; its `bg-muted` consumers live only in
   unused vendored primitives (toggle/table/slider/avatar — verified none
   render), so it is aligned to the reference value as zero-risk hygiene.
   `--muted-foreground` stays at the monday gray `#676879` BY DESIGN this
   session: its remaining rendered consumers (board-table title placeholder,
   date-cell hover icon, dashboard empty/error states, the unassigned-card
   texts) are micro, transient, or documented-deviation surfaces that could
   NOT be probed against the reference (its task has no date set; its
   unassigned view is a no-op) — changing them without probe evidence would
   violate the repo's verification-labeling rule. Verified-equal tokens (no
   action): `--popover` (white both), `--card` (white both), `--primary`,
   `--foreground`, `--accent`, `--secondary`, `--border`, `--input`,
   `--ring`.

4. **INFO — the reference's Unassigned view is a structural no-op** (content
   container `innerHTML: ""`, `childCount: 0`, even though its single task is
   ownerless — the owner cell renders the "Assign" placeholder). Already
   documented as a deliberate deviation in PAD §10 ("reference-side defect —
   we list the unassigned tasks"); no action. This session's DOM evidence
   strengthens the existing §10 row's rationale.

5. **ZERO functional defects.** The full E2E suite (25 specs) passed against
   the standalone build on arrival — including the session-31 self-healing
   mutation pins (task create/delete, board CRUD, group collapse), the mobile
   nav hover regression, the auth rate limit, and the session-27/29
   computed-style contracts. DB verified at the canonical seed after the run.

### Verified equal — no action

- Both reference bundles (hashes above) and all 12 VLM surface pairs after
  triage.
- All standing computed-style contracts from sessions 27/29 (Sign-in shadow
  `rgba(0,0,0,0.05) 0 1px 2px`, card `blur(4px)`, slate-400 focus ring,
  mobile footer geometry, hamburger hover `#E1E5F3`).
- Login page backdrops: pixel-sampled equal at four corners on both apps
  (the login surface's own gradient covers the body; unaffected by the
  token fix).
- `.env.example` byte-identical to the working `.env`; `DATABASE_URL` is the
  only user-set variable.
- Code hygiene: zero TODO/FIXME, zero `console.log`, `console.error` only in
  `api-client.ts`.

## TDD execution order (one logical change per commit)

1. **RED:** two new specs in `e2e/parity.spec.ts` (the session-27
   computed-style tradition — `expect.poll` + same-page probes):
   - `bg-background surfaces render the reference's white token` — opens the
     board page + Board Analytics modal + Integrations modal + boards page +
     dashboard, polling `backgroundColor` on the dialog panel, the toolbar
     Person button, the header Analytics button, the boards Filter button,
     the dashboard View Analytics button, and a switch thumb; each must equal
     a same-page `bg-white` probe (color-space-neutral).
   - `board header sub-row separators render #A0A0A0` — the `|` spans must
     equal a same-page `text-[#A0A0A0]` probe.
   Run against the CURRENT standalone build — expect exactly these two RED
   (the values are `#F5F6F8` / oklab-muted today) and the other 25 GREEN.
2. **GREEN:** `globals.css` `--background: #f5f6f8` → `hsl(0 0% 100%)` (+
   `--muted: #f0f1f2` → `hsl(0 0% 96.1%)`); `board-view.tsx` separators →
   `text-[#A0A0A0]`. Rebuild; the two specs go green with no other spec
   affected (the 25 existing specs assert no `#F5F6F8`-dependent value —
   verified by reading each spec's assertions).
3. **Gates:** lint 0 · tsc 0 · 185/185 unit · standalone build · **27/27
   E2E**; DB re-verified at the canonical seed after the run.
4. **Live verification:** dev-server computed-style re-probes on every fixed
   surface (all white == the reference's probed values; separators
   `rgb(160, 160, 160)`); fresh VLM pairs for the most-affected surfaces
   (Board Analytics modal, board-table, dashboard, boards).
5. Screenshots → `docs/screenshots/` (fresh 15-surface set at 1440×900 +
   375×812, taken from the dev server of the remediated tree).
6. `.env.example` re-verify (byte-identical).
7. Docs: PAD v1.18 (revision block + §6 token table + §10 strengthening),
   AGENTS.md (the `--background` invariant + spec count 27), CLAUDE.md
   v1.11.0 (counts), README.md (testing table), task-management_SKILL.md
   v1.6.0 (frontmatter + invariants), `docs/session_32.md`, worklog append.
8. Atomic commits on main + SSH-wrapper push (dry-run → real → verify →
   shred key).

## Validation of this plan against the codebase (performed before execution)

- Every `bg-background` consumer enumerated (`rg "bg-background" src/`):
  layout body (covered), app-shell loading splash (transient), dialog +
  alert-dialog content (probe-confirmed drifted), switch thumb
  (probe-confirmed), button outline base (probe-confirmed on five button
  groups), menubar/toast/sheet/drawer/navigation-menu/slider/tabs/calendar
  primitives (unused or shadcn-default surfaces — toast + calendar render
  inside dialogs), dashboard/boards consumer classes (probe-confirmed).
- The reference's token values probed live this session:
  `--background 0 0% 100%`, `--popover 0 0% 100%`, `--card 0 0% 100%`,
  `--primary 0 0% 9%`, `--accent 0 0% 96.1%`, `--secondary 0 0% 96.1%`,
  `--muted 0 0% 96.1%`, `--muted-foreground 0 0% 45.1%` — the clone's
  `:root` matches every one except `--background`, `--muted`, and
  `--muted-foreground` (kept, see Finding 3).
- The separator fix target verified against the reference's live DOM
  (class `text-[#A0A0A0]`, computed `rgb(160, 160, 160)`) and the clone's
  own adjacent meta spans (`board-view.tsx:696-700` already use
  `text-[#A0A0A0]`).
- The E2E spec conventions re-read (`e2e/parity.spec.ts` in full:
  `expect.poll` + same-page probe pattern; `e2e/helpers.ts`: `login()`;
  `e2e/board.spec.ts`: dialog/menu accessible names — "Person"/"Analytics"
  buttons, the Board Analytics dialog, the Integrations dialog's switches).
- The 25 existing specs re-scanned for `#F5F6F8`/`245, 246, 248`-sensitive
  assertions: none exist (the suite pins shadows, blurs, rings, footer
  geometry, and DOM/text behavior — no background-color assertions on
  `bg-background` surfaces), so the token change cannot break them.
