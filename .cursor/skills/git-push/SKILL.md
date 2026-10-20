---
name: git-push
description: >
  Automated git workflow that updates docs, bumps version, commits, and pushes.
  Use when user types "git", "push", "deploy changes", "commit and push", or
  wants to finalize and push their current work to the remote branch.
---

# Git Push Workflow

When triggered, execute these steps in order. Do NOT skip steps.

## Step 1: Assess Changes

1. Run `git status` and `git diff --stat` to understand what changed.
2. Identify which apps/packages were modified (api, web, dashboard, mobile, merchant-mobile, shared, ui, widget).
3. Note independently whether **diner mobile** (`apps/mobile`) and/or **merchant mobile** (`apps/merchant-mobile`) have source changes. Do not treat a change in one Expo app as a change in the other.
4. Determine the change type:
   - **feat** — new feature or capability
   - **fix** — bug fix
   - **refactor** — code restructuring without behavior change
   - **docs** — documentation only
   - **chore** — maintenance, deps, config
   - **perf** — performance improvement

## Step 2: Update CHANGELOG.md

1. Read the current `CHANGELOG.md` to get the latest version number.
2. Determine the new version:
   - **Minor bump** (0.X.0) — for new features, breaking changes, or significant additions
   - **Patch bump** (0.0.X) — for fixes, refactors, docs, chores
3. Add a new entry at the top (below the header) using this format:

```markdown
## [NEW_VERSION] — YYYY-MM-DD

### Added
- Item (only if something new was added)

### Changed
- Item (only if existing behavior was modified)

### Fixed
- Item (only if bugs were fixed)

### Docs
- Item (only if documentation was updated)
```

Only include sections that apply. Each bullet should be concise and describe the user-facing change.

## Step 3: Update README.md

Review if the changes require README updates:
- New environment variables → add to Environment section
- New app/package/script → update the relevant table or list
- New features → add to Features list
- Changed ports/URLs/commands → update Quick Start or scripts

If nothing in README needs updating, skip this step.

## Step 4: Bump package.json Version (monorepo root)

1. Read root `package.json`.
2. If it has a `version` field, bump it to match the CHANGELOG version.
3. If it does NOT have a `version` field, add one matching the CHANGELOG version.

Root version tracks the monorepo / CHANGELOG release. It is **not** the store version for either Expo app.

## Step 4b: Bump Expo app versions (independent)

Bump **only** the Expo apps that have changes in this push. Never bump diner because merchant changed, or vice versa. Skip an app if its tree has no relevant changes (ignore pure root/docs-only work that does not touch that app).

For each changed app, use the **same bump magnitude** as Step 2 (minor for feat/significant; patch for fix/refactor/docs/chore), applied to **that app’s current version**, not the root version.

### Diner (`apps/mobile`)

When `apps/mobile` changed:

1. Read `version` from `apps/mobile/app.config.js` (e.g. `version: "1.0.1"`).
2. Bump it (minor or patch per Step 2).
3. Set `apps/mobile/package.json` `"version"` to the same new value.
4. If `android.versionCode` exists in `app.config.js`, increment it by 1 (integer build number for local/prebuild; EAS production also uses `autoIncrement` + remote).

### Merchant (`apps/merchant-mobile`)

When `apps/merchant-mobile` changed:

1. Read `version` from `apps/merchant-mobile/app.config.js`.
2. Bump it (minor or patch per Step 2).
3. Set `apps/merchant-mobile/package.json` `"version"` to the same new value.
4. If `android.versionCode` exists, increment it by 1.

### Rules

- Keep diner and merchant versions **independent** (they may diverge freely).
- Do not sync Expo versions to the root `0.x.y` CHANGELOG version.
- EAS `appVersionSource: "remote"` + production `autoIncrement` still owns remote store build numbers; this step keeps the marketing `version` in repo in sync with shipped app work.
- If only one Expo app changed, bump only that one. If neither changed, skip Step 4b entirely.

## Step 5: Commit

1. Stage all changes: `git add -A`
2. Write a commit message following Conventional Commits:
   - Subject: `<type>(<scope>): <imperative summary>` (≤72 chars)
   - Body (if needed): explain WHY, not what. Wrap at 72.
   - Reference the version: include `v{VERSION}` in the body or subject if it's a release bump.
3. Commit using a HEREDOC for proper formatting:

```bash
git commit -m "$(cat <<'EOF'
type(scope): subject line

Optional body explaining the why.
EOF
)"
```

## Step 6: Push

1. Get the current branch: `git branch --show-current`
2. Push: `git push origin HEAD`
3. If push fails due to upstream divergence, run `git pull --rebase origin <branch>` then push again.
4. Report success with the branch name and commit hash.

## Step 7: QA changelog summary (required)

After a successful push, **always** paste a changelog-style summary in the chat for the QA team to copy. Do not skip this step. Do not only link to `CHANGELOG.md`.

Use this format (omit empty sections):

```markdown
## [VERSION] — YYYY-MM-DD

### Added
- …

### Changed
- …

### Fixed
- …
```

Rules for the QA summary:

- Base it on the version entry just released (the one written in Step 2).
- Prefer clear, testable, user-facing wording (what to try / what should happen).
- Keep bullets concise; drop internal-only notes (file paths, helper names, Docs section) unless QA needs them.
- Lead the reply with branch + commit hash + version, then the full changelog block.
- If the push only included a tiny fix, still show Added/Changed/Fixed as applicable — even a short Fixed list is required.

## Rules

- NEVER force push
- NEVER push to `main` or `master` without explicit user confirmation
- If there are no changes to commit (`git status` is clean), inform the user and stop
- If there are merge conflicts, stop and ask the user for guidance
- Keep commit messages meaningful — summarize the overall intent, not individual file changes
- Date format in CHANGELOG: `YYYY-MM-DD`
- After every successful push, always show the Step 7 QA changelog summary in chat
