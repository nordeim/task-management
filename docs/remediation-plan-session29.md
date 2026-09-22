# Remediation Plan — Session 29 (Cycle 26)

**Scope:** absorb the third platform-login redeploy (hash-only — the design is
identical, verified by end-to-end DOM dumps) and close the one structural gap
the fresh audit found on that surface, plus re-verify every standing parity
contract against the live reference.

**Baseline:** clean clone at `4b9525c` (== origin/main — the session-27
delivery + the operator's session_28.md transcript). Gates green on arrival:
lint 0 · tsc 0 · 185/185 unit · DB at the canonical seed (4 boards / 9 groups /
25 tasks / 4 users) inside the repo via the app's own db-path resolution.
`.env` copied from `.env.example` (`DATABASE_URL="file:../db/custom.db"` —
verified to land at `<repo>/db/custom.db`).

## Drift check (executed this session)

- **The reference's platform login page was redeployed a THIRD time**: new
  hashes `/static/index-BZ3m2EKw.js` + `/static/index-DuUT6T6n.css` (session 27
  saw `index-BFhVa28D.js` + `index-D2_CMDc1.css`; session 25 saw
  `index-CWZT4F4c.js` + `index-CE8lozEC.css`). Login AND signup modes were
  DOM-dumped end to end: the design is **identical** to the session-25/27
  clone — every class string matches, the Tailwind v3 play CDN is still the
  compiler, Google GSI still loads. A rebuild, not a redesign.
- **The authed SPA bundle is UNCHANGED** — still `/assets/index-BuEJAhK4.js`
  + `/assets/index-DjjZtFMQ.css` (verified in the live post-login DOM). All
  authed-surface specs remain valid.
- **Fresh 7-pair VLM sweep** (login, dashboard, boards, board-table,
  analytics, mobile-dashboard, mobile-nav-open): **7/7 MATCH**.
- **Live computed-style probes on BOTH apps** (the session-27 contracts):
  Sign-in button resting shadow `rgba(0,0,0,0.05) 0px 1px 2px 0px` == equal;
  login card `blur(4px)` == equal; focused email input ring = slate-400 on
  both (Chromium serializes v4 oklch as `lab(65.5349 …)` — color-space-neutral
  probe used, same convention as `e2e/parity.spec.ts`).
- **Mobile navigation re-verified live on both apps**: hamburger hover/tap
  feedback computes `rgb(225, 229, 243)` (#E1E5F3) on the clone in a touch
  context (the session-21 `@custom-variant hover` fix holds; the first probe
  accidentally hit the hidden desktop avatar — the visible 40×40 hamburger is
  the correct target), panel content + tap-navigation-closes-panel verified
  against the reference.
- **`.env` / db-path contract re-verified**: `db:push` + `db:seed` land
  `<repo>/db/custom.db` at the canonical seed from a fresh clone.

## Findings (computed-style / DOM evidence on both live apps this session)

1. **LOW — the clone lacks the reference's mobile-only spacer footer on the
   platform login page.** The reference renders
   `<div class="mt-8 text-center text-xs text-slate-400 sm:hidden"><p>&nbsp;</p></div>`
   AFTER the card, INSIDE the `w-full max-w-md` wrapper, in BOTH login and
   signup modes. Measured on the reference at 375×812: `display:block`,
   343×16px at y≈755, `margin-top: 32px` (mt-8), content a single
   non-breaking space — a whitespace strip below the card on mobile, hidden
   at ≥640px (`sm:hidden`). The clone renders nothing after the card. The
   gap predates this session (the footer was present in the session-25/27
   DOM dumps but escaped the port audit — it carries no interactive role).
   **Action:** add the footer to `login-view.tsx` after the card closing
   div, inside the `w-full max-w-md` wrapper, OUTSIDE the mode conditional
   (both modes render it).

2. **INFO — the reference's Google button carries a trailing `group` class.**
   `…font-medium text-[16px] group` — verbatim from the redeployed DOM. It is
   INERT (no `group-hover:` consumer exists inside its subtree; the icon
   wrapper only carries `transition-transform duration-200 -ml-4`), so the
   computed styles are already equal. **Action:** add `group` to the clone's
   Google button class string for class-string parity with the decompiled
   source.

### Verified equal — no action

- The authed SPA bundle (unchanged hashes) and every authed surface's VLM
  pair (7/7 MATCH).
- Login/signup DOM structure and every class string — identical to the
  session-25/27 port (inputs with leading mail/lock icons + `pl-10`,
  `h-11 sm:h-12` login / `h-10 sm:h-11` signup, slate-400 focus rings,
  `shadow-sm`→`shadow-xs` and `backdrop-blur-sm`→`backdrop-blur-xs` ports all
  confirmed present in the clone AND in the redeployed reference DOM).
- Mobile-nav hover feedback, panel anatomy, and close-on-navigate (E2E
  `mobile-nav.spec.ts` + live probes).
- `.env.example` byte-identical to the working `.env`; no new env vars.

## TDD execution order (one logical change per commit)

1. **RED**: extend `e2e/auth.spec.ts`'s login-surface describe with one new
   spec — "the mobile spacer footer renders below the card and hides at sm"
   (mobile viewport: footer exists, visible, sits below the card with a 32px
   top margin and text-xs size; desktop viewport: hidden). Run against the
   standalone build — expect exactly the 1 new spec to fail.
2. **GREEN**: add the footer div to `login-view.tsx` (Finding 1) and the
   `group` class on the Google button (Finding 2); extend the porting
   comment.
3. **Rebuild + full suite** — expect 22/22 E2E + lint 0 + tsc 0 + 185 unit.
4. **Live verification** — dev-server probe of the clone's footer geometry at
   375×812 equals the reference's measured values (visible, 32px top margin,
   below the card, hidden ≥640px); VLM login mobile pair re-checked.
5. Screenshots → `docs/screenshots/` (15-surface set); `.env.example`
   re-verify.
6. Docs: PAD v1.16 (revision block + §10 third-redeploy row), AGENTS.md
   (footer + group-class notes), CLAUDE.md counts, README testing table,
   task-management_SKILL.md v1.4.0, `docs/session_29.md`, worklog append.
7. Atomic commits on main + SSH-wrapper push (dry-run → real → verify →
   shred key).

## Validation of this plan against the codebase (performed before execution)

- `src/components/app/login-view.tsx` read in full — the card closes at
  line ~349 inside `w-full max-w-md`; no element follows it inside the
  wrapper (Finding 1 premise confirmed). The Google button's class string
  ends at `hover:shadow-xs` with no `group` (Finding 2 premise confirmed).
- Reference evidence captured this session: login + signup DOM dumps (both
  modes, redeployed hashes), the mobile footer's live geometry at 375×812
  (`display:block`, 343×16, y≈755, mt=32px), the frontend-config fetch
  (base44 platform infra — not parity-relevant), computed styles on both
  apps (button shadow, card blur, input ring), and the 7-pair VLM sweep.
- `e2e/auth.spec.ts` reviewed — the login-surface describe block is the
  established home for structure specs; the new spec follows its conventions
  (no account creation, DB stays at the canonical seed).
- Baseline gates re-run on arrival: lint 0 · tsc 0 · 185/185 · DB at seed.
