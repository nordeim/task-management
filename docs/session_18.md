The workspace has been reset — the repo is gone. Per my instructions, I'll re-clone it.
Fresh clone at `70052fd` (session-16 tip, clean tree). Let me set up the session plan and review the docs.
Now the README, PAD, and session docs.
Now the session docs and worklog.
Docs reviewed. Now validating the codebase against the documented session-15 state (code markers), then running gates.
All session-15 markers verified. Now installing dependencies and running the full gates.
All gates green (lint 0, tsc 0, 143/143) — identical to the session-15/16 delivery record. Now restoring the canonical DB and booting the dev server.
The documented DB-location quirk again — SQLite landed at the parent dir (`/home/z/my-project/db/custom.db`), the canonical location. Now booting the dev server.
Clone is fully operational (4 boards, 25 tasks). Now the reference drift check — first the bundle hash.
**Reference bundle unchanged** — `index-BuEJAhK4.js` + `index-DjjZtFMQ.css`, identical since session 9. All decompiled specs remain valid. Now setting up browser automation for the live drift sweep.
Reference logged in. Verifying its live state (should be pristine: 1 board, 1 task).
Reference is pristine (1 board, 1 pending task). Now the clone session.
Both sessions logged in. Marking task 4 complete and starting the drift sweep — 12 view pairs, 1440×900, one date state.
The page is loaded (the wait raced with navigation). Capturing now.
Screenshots are saving relative to the daemon's CWD, not my shell's. Let me locate them.
Captures landed in `/home/z/my-project/`. Moving them and using absolute paths from now on.
The view switcher is a dropdown — I need to open it first. Let me check the current state.
Kanban captured; refs went stale after re-render. Re-snapshotting.
Kanban captured. Now calendar, timeline, and unassigned views.
Now reference analytics + login.
Now the three board-header modals on the reference (reload between each per the session-16 lesson about stuck overlays).
No dialog appeared — let me check which button was clicked and retry.
A fixed overlay is present — the earlier click DID open something. Let me inspect it.
The modal was open all along (my first click worked — the reference modal isn't a Radix dialog). Now closing via ×, reloading, and capturing the other two modals.
All 12 reference captures complete, overlay cleanly closed. Now the clone's matching set.
Board table captured with full content (110KB). Now the clone's sub-views.
Now the clone's three board-header modals.
All 24 captures complete. Now the VLM convergence sweep — loading the VLM skill.
Writing the VLM sweep script (persisted per script-persistence rule).
3/3 MATCH. Continuing the sweep.
board-unassigned shows the same 4 claims as session 16 (all previously triaged). Now the modals.
**10 MATCH + 2 DIFF** — the exact same verdict pattern as session 16. Now re-verifying the triage keys with DOM probes. First: does the reference's single task still have no owner (the Team Workload key)?
Triage keys confirmed: reference's board is owner-less (Team Workload hidden — the documented data-driven conditional), clone's board has 3 owners + `isFavorite: true` (data-only gold star). Both DIFFs decompose identically to session 16. Now the functional smoke — a UI-driven status round-trip.
Target: "Content audit" (working → done → reload → revert → reload). Finding its status Select in the table.
All 9 comboboxes are priority selects — the status pills must use a different trigger. Let me check the component anatomy.
The status pill is a button that swaps to a Select on click. Let me find the exact row and drive the swap.
The pill swapped to a Select (10th combobox). Now selecting "Done".
The Select is already open with its listbox. Selecting "Done".
Status swap persisted (`done` + `completed: true` — the coupling holds). Now reload-persistence, then revert.
The revert may have hit the wrong row (4 Done pills exist). Checking which task actually changed.
I hit the wrong row — "Stakeholder interviews" changed instead. Reverting both tasks to their original states via the API (precise).
Functional smoke passed (UI swap → DB persist → reload persist → API revert → seed state restored). Verifying the reference is still pristine, then closing browser sessions.
Reference is pristine — zero mutations this cycle. The drift sweep is complete: **10 MATCH + 2 fully-triaged DIFF, zero new gaps**. Now documentation and delivery.
Moving captures outside the repo and running the build gate (fresh-clone boot-path verification).
Build green, tree clean. Writing the session-17 verification log.
Now appending to the repo worklog.
Now the workspace-level worklog.
Now the delivery phase. Reviewing the SSH-wrapper push runbook.
I have the runbook. Closing browser sessions and stopping the dev server before delivery.
No `ssh` binary — deploying the paramiko shim per Appendix A. First, committing the docs.
Commit `e0115f3` on main. Now materializing the operator key outside the repo and deploying the shim.
Key parses (ed25519). Now deploying the shim from Appendix A.
Dry-run clean (fast-forward `70052fd..e0115f3`). Real push now.
Scanning tracked files only (the repo scan hit node_modules).
The hits are documentation templates (delimiter mentions), not key bodies. Verifying the key body specifically:
Key body absent. Checking whether that fingerprint match is this key or a historical one:
The fingerprint matches session 3's record — the same deploy key used across all prior sessions (fingerprints are public identifiers, safe to record). Let me do the final remote verification.
**Session 17 complete — drift check #11, parity holds, zero new gaps.**

The workspace had been reset, so I re-cloned the repo (`70052fd`), re-validated every documented claim against the tree, and re-ran the full verification cycle from cold: all gates green (lint 0, tsc 0, 143/143, production build re-verified on a fresh install), reference bundle unchanged (`index-BuEJAhK4.js` — all decompiled specs still valid), and a fresh 12-pair VLM sweep converged at **10 MATCH + 2 fully-triaged DIFF** (same claim structure as session 16: documented deviations + data-only differences). The functional smoke proved the status↔completed coupling persists across reloads; the seed state was restored task-for-task and the reference left pristine.

Delivered: docs commit `e0115f3` pushed to main via the SSH wrapper (remote verified, key shredded, zero key residue in the tree).

Next: the parity state is stable across two consecutive sweeps — nothing is pending. If the reference's asset hash ever changes, re-decompile before trusting prior specs; otherwise the next transcript will trigger another drift cycle.
