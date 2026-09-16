# How-To: Git Push Using the SSH Wrapper (`ssh_git_wrapper_v3.py`)

**Purpose.** Push commits from this checkout to the canonical SSH remote
`git@github.com:nordeim/task-management.git` using a deploy key that is
**never stored inside the repository** (`.gitignore` rejects `*.key` and
`ssh-key.txt`). The wrapper materializes the key into a 0600 temp file
outside the repo, points `GIT_SSH_COMMAND` at it, authenticates, pushes
`main`, then shreds the temp key.

**Rules (operator contract).**

1. **main only** — no feature branches; the wrapper defaults to `main` and
   pushes `HEAD:refs/heads/main`.
2. **Run the verification gate first** — `bun run lint && bun run typecheck
   && bun run test && bun run build` must be green before pushing. There is
   no hosted CI on this repo (no `.github/workflows`), so the local gate is
   the only gate.
3. **Commit before push** — the wrapper pushes commits, not the working tree.
4. **Never commit the key** — keys live outside the repo (`~/.ssh/`, a
   secret store, or a pipe). If a key ever lands in the tree, rotate it.

## Quick start (key piped on stdin — no key file on disk)

```bash
cd task-management
# … make commits on main …
cat /secure/path/to/id_ed25519 | python3 docs/ssh_git_wrapper_v3.py --key-stdin \
  --remote git@github.com:nordeim/task-management.git
```

## Variants

```bash
# Key from a file (the file must live OUTSIDE this repo):
python3 docs/ssh_git_wrapper_v3.py --key-file ~/.ssh/id_ed25519 \
  --remote git@github.com:nordeim/task-management.git

# Key from an environment variable:
SSH_KEY="$(cat /secure/id_ed25519)" python3 docs/ssh_git_wrapper_v3.py \
  --remote git@github.com:nordeim/task-management.git

# Dry run (authenticates + exercises the key, does not update the remote):
cat /secure/id_ed25519 | python3 docs/ssh_git_wrapper_v3.py --key-stdin --dry-run

# Persist the SSH URL as origin's push URL for future plain `git push`:
python3 docs/ssh_git_wrapper_v3.py --key-file ~/.ssh/id_ed25519 --set-url
```

## Key formats the wrapper accepts

The wrapper accepts a standard OpenSSH private key block (proper BEGIN/END
delimiter lines). It also tolerates keys that traveled through a chat
transcript and arrived with the BEGIN line replaced by the placeholder
`[REDACTED:ssh_private_key]` — the wrapper restores a real OpenSSH BEGIN
line before use, so the key still authenticates. A key missing either
delimiter is rejected with exit code 2.

## What the wrapper does, step by step

| Step | Action | Safety property |
|---|---|---|
| 1 | Reads the key from `--key-file` / `--key-stdin` / `$SSH_KEY` | Rejects keys without proper OpenSSH delimiters (after redaction normalization) |
| 2 | Writes it to `/tmp/dbs-push-XXXX.key` with `0600` | Outside the repo; ssh refuses group/world-readable keys |
| 3 | Exports `GIT_SSH_COMMAND="ssh -i <key> -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new …"` | Only the supplied key is offered; new host keys are recorded per-session |
| 4 | `git ls-remote --heads <remote> main` | Authentication pre-flight — fails fast with exit 4 on bad keys |
| 5 | `git push <remote> HEAD:refs/heads/main` | Explicit refspec; no implicit branch creation |
| 6 | Overwrites the temp key with random bytes, deletes it + the sidecar known_hosts | No key residue |

## Exit codes

| Code | Meaning |
|---|---|
| 0 | Push succeeded |
| 1 | Usage error (no key source, stdin is a TTY, …) |
| 2 | Key materialization/cleanup error (also: key failed delimiter validation) |
| 3 | Local git error (not a repo, remote set-url failed, …) |
| 4 | Authentication pre-flight failed or the push was rejected |

## Troubleshooting

- **`authentication pre-flight failed`** — the key is wrong, expired, or lacks
  push rights on `nordeim/task-management`. Verify with
  `ssh -i /secure/key -T git@github.com` (expect a greeting naming the repo).
- **`key does not look like an OpenSSH private key`** — the source lost its
  BEGIN or END delimiter line in transit (trailing-space mangling, partial
  copy). Re-supply the complete key block, delimiters included.
- **Push rejected (non-fast-forward)** — the remote moved ahead:
  `git fetch origin && git rebase origin/main`, re-run the gate, then push.
- **`Permission denied (publickey)`** — GitHub needs the corresponding public
  key added as a deploy key (repo → Settings → Deploy keys, write access).
- **No `ssh` binary on PATH** — the wrapper needs an OpenSSH-compatible
  `ssh` in `GIT_SSH_COMMAND`. In sandboxes without one, install a shim that
  speaks real SSH (e.g. paramiko-backed) on PATH before running the wrapper.

## Relationship to the repo's git contract

- AGENTS.md: clone remote is `https://github.com/nordeim/task-management.git`;
  the SSH URL is the push target — this wrapper exists so an agent or CI
  runner can push without a resident `~/.ssh` identity.
- CLAUDE.md commit standards apply: Conventional Commits, atomic commits,
  never commit secrets.
- The verification gate (AGENTS.md "clean check" order) is a precondition —
  and, until hosted CI exists, the only one.
