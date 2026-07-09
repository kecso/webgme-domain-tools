# Project management — webgme-domain-tools

Living tracker for milestones, feature review, and backlog. Update this file as work lands; use GitHub Issues for threaded discussion on specific items.

**Repository:** [github.com/kecso/webgme-domain-tools](https://github.com/kecso/webgme-domain-tools)  
**First consumer:** [StaMS](https://github.com/kecso/StaMS)

---

## How we work

| Step | What happens |
|------|----------------|
| 1. Feature branch | `feature/<id>-short-name` (e.g. `feature/F6-tree-seed`) — work **only** on the branch |
| 2. Implement + tests | Commits on that branch; PR optional but recommended |
| 3. **Ready for review** | Status → `review`; reviewer runs **Review** column commands / reads diff |
| 4. **Review outcome** | Approve, or file [change requests](#review-cycle-change-requests) — see below |
| 5. **Done** | **After approval**, merge to `main`; status → `done`; note in [Changelog](#changelog) |

**Hard rule:** Nothing merges to `main` until the reviewer approves. Agents must not commit to or merge `main` unless explicitly instructed (see `.cursor/rules/protect-main.mdc`).

**Review checkpoints:** Each feature row has a **Review** column — commands or files to look at.

**Adding work:** [Feature request](.github/ISSUE_TEMPLATE/feature.md) or [Task](.github/ISSUE_TEMPLATE/task.md) for new scope; [Review feedback](.github/ISSUE_TEMPLATE/review-feedback.md) for fixes during review.

### Review cycle (change requests)

When review finds problems **in the feature itself** (bugs, wrong behavior, missing acceptance criteria — not a separate new feature):

1. **Report** — Open a [Review feedback](.github/ISSUE_TEMPLATE/review-feedback.md) issue, or reply in chat with feature ID (e.g. `F2`) and what is wrong.
2. **Fix on branch** — Agent implements fixes on the **same milestone/feature branch** (e.g. `M0`, `feature/F6-tree-seed`). Status → `in progress`.
3. **Re-review** — When fixes are ready, status → `review` again; reviewer re-runs the **Review** column.
4. **Approve** — Reviewer marks approved (issue checkbox or explicit “approve” in chat).
5. **Merge** — Only then: merge branch → `main`, status → `done`, row in [Review log](#review-log).

Non-blocking notes can be logged as backlog tasks ([Task template](.github/ISSUE_TEMPLATE/task.md)) and picked up after merge.

---

## Current milestone

**M0 — Foundation** (target: first usable `tree repo` against StaMS)

**Active branch:** `M0` — all M0 review and fixes happen here until you approve a merge to `main`.

> **M0 is a special retroactive review.** The initial foundation was committed to `main` before review gates existed. Branch `M0` restores the intended process: you review and request changes on `M0`; `main` is updated only after you approve F0–F4. From the next milestone onward, use feature branches and review **before** the first merge to `main`.

| ID | Feature | Status | Review |
|----|---------|--------|--------|
| F0 | Repo scaffold (package, TS, CI, README) | `review` | `npm run build && npm test` |
| F1 | SetupCatalog + catalog errors | `review` | `node dist/cli.js tree repo --cwd ../StaMS` |
| F2 | `tree repo` (plugins, seeds, viz, routers) | `review` | Check refs like `seed:StateMachine`, blob notes |
| F3 | `ls` alias | `review` | `node dist/cli.js ls plugins --cwd ../StaMS` |
| F4 | Test fixtures + CI on push | `review` | GitHub Actions tab after push |

**Status legend:** `pending` · `in progress` · `review` · `done` · `deferred`

---

## Features (full roadmap)

### Phase 1 — Catalog & repo tree
| ID | Feature | Status | Notes |
|----|---------|--------|-------|
| F1 | SetupCatalog from webgme-setup.json | `review` | Stable refs `seed:`, `plugin:`, etc. |
| F2 | Malformed-input errors → cite `tree repo` | `review` | Fuzzy name suggestions |
| F3 | `tree repo` tree / flat / json | `review` | `--kind` filter |
| F4 | `ls` compact listing | `review` | Delegates to catalog |

### Phase 2 — Seed model tree & session
| ID | Feature | Status | Notes |
|----|---------|--------|-------|
| F5 | ProjectSession (memory storage + import) | `pending` | No HTTP server |
| F6 | `tree --seed` model walk | `pending` | Paths for `--at` / `--select` |
| F7 | Multi-seed resolution rules | `pending` | Exit 2 + list when ambiguous |
| F8 | `seed meta` | `pending` | MetaAspectSet IR |

### Phase 3 — Plugin run
| ID | Feature | Status | Notes |
|----|---------|--------|-------|
| F9 | `plugin info` (configStructure) | `pending` | |
| F10 | `plugin run` context flags | `pending` | `--seed`, `--at`, `--select` |
| F11 | Config validation + `--set` | `pending` | metadata.json driven |
| F12 | Message / result routing | `pending` | Logger + pluginResult.messages |
| F13 | Ephemeral FS blob + `--artifacts-out` | `pending` | Warn when not persisted |

### Phase 4 — Generator & consumer
| ID | Feature | Status | Notes |
|----|---------|--------|-------|
| F14 | `generate meta-ts` | `pending` | From seed meta |
| F15 | StaMS devDependency + scripts | `pending` | Dogfood in StaMS |

---

## Backlog (refactor · optimize · streamline)

Tasks not tied to a single milestone — pick up anytime.

| ID | Type | Task | Priority |
|----|------|------|----------|
| B1 | streamline | Deduplicate webgme-setup parsing with webgme-cli conventions doc | low |
| B2 | optimize | Lazy-load webgme-engine only for session commands | medium |
| B3 | refactor | Extract shared test helpers from webgme-engine fixtures | medium |
| B4 | streamline | Single `domain-tools tree` UX doc + shell completions | low |
| B5 | refactor | Metadata convention `domainTools.producesArtifacts` | low |
| B6 | optimize | Cache SetupCatalog per process for multi-subcommand REPL (future) | low |

*Add rows via [Task issue template](.github/ISSUE_TEMPLATE/task.md).*

---

## Review log

Record of completed reviews (newest first).

| Date | Feature | Reviewer | Outcome | Notes |
|------|---------|----------|---------|-------|
| — | — | — | — | *M0 retroactive review in progress on branch `M0`* |

---

## Changelog

### Unreleased
- Initial repository, PROJECT.md, issue templates
- F0–F4: SetupCatalog, `tree repo`, `ls`, tests, CI workflow
- StaMS smoke-tested: `tree repo --kind seeds,plugins`
- Process: `M0` branch for retroactive review; review-feedback template; main protected for agents

---

## Quick commands (once built)

```bash
# From webgme-domain-tools checkout (use branch M0 during milestone review)
git checkout M0
npm install && npm run build

# Repo tree against StaMS
node dist/cli.js tree repo --cwd c:/Work/StaMS
node dist/cli.js tree repo --cwd c:/Work/StaMS --kind seeds,plugins --format json

# After link / global install
domain-tools tree repo
```

---

## Design reference

Full architecture: see StaMS planning doc or [DESIGN.md](DESIGN.md) in this repo. Core ideas:

- **SetupCatalog** — canonical `webgme-setup.json` view; all commands validate against it
- **tree repo** — discover plugins/seeds; **tree --seed** — pick plugin context
- **Headless plugins** — in-memory seed + optional FS blob; artifacts via `--artifacts-out`
