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
2. Identify which apps/packages were modified (api, web, dashboard, mobile, shared, ui, widget).
3. Determine the change type:
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

## Step 4: Bump package.json Version

1. Read root `package.json`.
2. If it has a `version` field, bump it to match the CHANGELOG version.
3. If it does NOT have a `version` field, add one matching the CHANGELOG version.

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

## Rules

- NEVER force push
- NEVER push to `main` or `master` without explicit user confirmation
- If there are no changes to commit (`git status` is clean), inform the user and stop
- If there are merge conflicts, stop and ask the user for guidance
- Keep commit messages meaningful — summarize the overall intent, not individual file changes
- Date format in CHANGELOG: `YYYY-MM-DD`
