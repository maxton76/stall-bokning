# Git Branching Strategy

## Branch Model

```
feature/* ──→ develop ──→ main ──→ tag (v0.x.y)
                  ↑                    ├── deploy to staging
hotfix/*  ──→ main ──┘                 └── deploy to prod
              ↓
           develop (back-merge)
```

Branches organize code. Tags pin releases. Environments are deployment targets (not branches).

## Branches

### `develop` (default branch)

- Daily integration branch. All feature work merges here.
- Deploys to **dev** environment.
- Set as the default branch on GitHub.

### `main`

- Release-ready code only. Receives merges from `develop`.
- Tags are created on `main` to mark releases.
- Protected: no force-push, no deletion.

### `feature/*`

- For larger features, branched off `develop`.
- Small changes can go directly on `develop`.
- Naming: `feature/add-shift-booking`, `feature/stripe-webhooks`

### `hotfix/*`

- Urgent fixes branched off `main`.
- Merge to `main` (tag, deploy), then back-merge to `develop`.
- Naming: `hotfix/fix-payment-bug`, `hotfix/auth-token-expiry`

## Tag Conventions

- Semantic versioning: `v0.13.0`, `v0.13.1`, `v1.0.0`
- Tags are created on `main` only.
- Annotated tags with message: `git tag -a v0.13.0 -m "Release: feature description"`
- Tags are immutable release markers. Never delete or move tags.
- Protected on GitHub: `v*` tags cannot be deleted.

## Deployment Rules

| Environment | Allowed from | TAG required? | Confirmation? | Dirty tree? |
|-------------|-------------|:---:|:---:|:---:|
| **dev** | Any ref | No | No | Allowed |
| **staging** | `main` (synced) or TAG | No (recommended) | Yes | Blocked |
| **prod** | TAG only | **Yes** | Yes | Blocked |

### How it works

- **dev**: `task deploy:api` — works from any branch, no checks.
- **staging without TAG**: Must be on `main`, and `main` must be exactly at `origin/main` (no unpushed or missing commits).
- **staging with TAG**: `task deploy:api ENV=staging TAG=v0.13.0` — deploys from the tag regardless of current branch.
- **prod**: `task deploy:api ENV=prod TAG=v0.13.0` — TAG is mandatory. Deploys from the tag.
- **dirty working tree**: Blocked for staging and prod. Uncommitted changes could affect the build.

When `TAG` is provided for staging/prod, the Taskfile automatically checks out the tag (detached HEAD), runs the deploy, and restores your previous branch afterward (even if the deploy fails).

## Workflow Examples

### Feature Development

```bash
# Start a feature
git checkout develop
git pull origin develop
git checkout -b feature/add-notifications

# Work on the feature...
git add -A && git commit -m "feat: add notification service"
git push -u origin feature/add-notifications

# When done, merge to develop
git checkout develop
git merge feature/add-notifications
git push origin develop
git branch -d feature/add-notifications

# Deploy to dev happens from develop
task deploy:api
```

### Creating a Release

```bash
# Merge develop into main
git checkout main
git pull origin main
git merge develop
git push origin main

# Tag the release
git tag -a v0.13.0 -m "Release: notifications and scheduling improvements"
git push origin v0.13.0

# Deploy to staging
task deploy:api ENV=staging TAG=v0.13.0

# After validation, deploy to prod
task deploy:api ENV=prod TAG=v0.13.0
```

### Hotfix

```bash
# Branch off main
git checkout main && git pull origin main
git checkout -b hotfix/fix-payment-bug

# Fix the issue
git add -A && git commit -m "fix: resolve payment double-charge"

# Merge to main and tag
git checkout main && git merge hotfix/fix-payment-bug
git tag -a v0.13.1 -m "Hotfix: payment double-charge"
git push origin main --tags

# Deploy
task deploy:api ENV=staging TAG=v0.13.1
task deploy:api ENV=prod TAG=v0.13.1

# Back-merge to develop
git checkout develop && git merge main && git push origin develop

# Clean up
git branch -d hotfix/fix-payment-bug
```

## Deploy Command Reference

```bash
# Dev (default, no restrictions)
task deploy:api                              # Deploy API to dev
task deploy:frontend                         # Deploy frontend to dev
task deploy:functions                        # Deploy functions to dev

# Staging (branch or tag)
task deploy:api ENV=staging                  # From main (must be synced)
task deploy:api ENV=staging TAG=v0.13.0      # From specific tag

# Production (tag required)
task deploy:api ENV=prod TAG=v0.13.0         # From specific tag
task deploy:frontend ENV=prod TAG=v0.13.0    # From specific tag

# Deploy everything
task deploy:all ENV=staging TAG=v0.13.0
task deploy:all ENV=prod TAG=v0.13.0
```

## Branch Protection (GitHub)

| Setting | `develop` | `main` | `v*` tags |
|---------|:---------:|:------:|:---------:|
| Default branch | Yes | No | — |
| Force push | Allowed | Blocked | — |
| Deletion | Blocked | Blocked | Blocked |
