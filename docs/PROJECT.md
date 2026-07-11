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

**Phase 3 — Plugin run** — `review` on branch `feature/phase3-plugin-run`

| ID | Feature | Status | Review |
|----|---------|--------|--------|
| F9 | `plugin info` (configStructure) | `done` | `webdot plugin info EchoPlugin --cwd test/fixtures/sample-project` |
| F10 | `plugin run` context flags | `done` | `webdot plugin run EchoPlugin --seed StateMachine --at /G --dry-run` |
| F11 | Config validation + `--set` | `done` | `npm test` — `plugin-config.test.js` |
| F12 | Message / result routing | `done` | `npm test` — `plugin-command.test.js`, `cli.test.js` |
| F13 | Ephemeral FS blob + `--artifacts-out` | `done` | `webdot plugin run EchoPlugin --seed StateMachine --set emitArtifact=true --artifacts-out _artifacts` |
| F18 | Model write-back + `--dry-run` / `--out` | `done` | `webdot plugin run EchoPlugin --seed StateMachine --set addNode=true --out out.webgmex` |
| F19 | Direct `--plugin-dir` / `--webgmex` (no catalog) | `done` | `webdot plugin run --plugin-dir src/plugins/EchoPlugin --webgmex src/seeds/StateMachine/StateMachine.webgmex -C test/fixtures/sample-project --dry-run` |

**Review gate:** `npm test` (99 tests, ~95% line coverage) · `docs/DESIGN.md` plugin + session sections

### Phase 3 review notes (2026-07-11)

| ID | Feedback | Action |
|----|----------|--------|
| F9–F19 | CLI flag surface growing; long commands hard to compose | **B8** backlog — trim rarely used flags or add tutorial recipes / `webdot examples` (future) |
| F12 | Plugin output should reflect full context, not just seed name | JSON `context` block + `plugin run --help` documents project / active node / selection / branch / config with defaults |

**Next: Phase 3½ — Stateful session shell** — `pending` (planned **before Phase 4**)

| ID | Feature | Status | Review |
|----|---------|--------|--------|
| F20 | Session workspace + state file | `pending` | — |
| F21 | `session open` / `status` / `close` | `pending` | — |
| F22 | Commands default to open session | `pending` | — |
| F23 | `session save` / `session discard` | `pending` | — |
| F24 | Optional REPL / long-lived shell | `pending` | — |

**Phase 2½ — Meta representations** — `done` (merged to `main` 2026-07-10, branch `feature/F16-meta-representations`)

| ID | Feature | Status | Review |
|----|---------|--------|--------|
| F16a | Meta representation specs (IR, descriptor, MetaLang) | `done` | `docs/meta/README.md` + examples |
| F16b | `seed meta --format descriptor` | `done` | `npm test` — `meta-translate.test.js` |
| F16c | `seed meta --format metalang` | `done` | `webdot seed meta --seed StateMachine --format metalang` |
| F16d | MetaLang parser / Langium (optional) | `deferred` | — |

### Phase 2½ review notes (2026-07-10)

| ID | Feedback | Action |
|----|----------|--------|
| F16 | Library/namespace not in v1 representations | **F17** — deferred to **Phase 4** |
| F16b/c | `seed meta --format tree` should match `tree --seed` indentation | Reuses `renderSeedTree` (relid, branches, path tail) |

**Phase 2 — Seed model tree & session** — `done` (merged to `main` 2026-07-10, branch `feature/phase2-seed-model`)

> **Combined branch:** F5–F8 landed together on one branch for review.

| ID | Feature | Status | Review |
|----|---------|--------|--------|
| F5 | ProjectSession (memory storage + import) | `done` | `npm test` — ends with coverage summary (~95% lines) |
| F6 | `tree --seed` model walk | `done` | `webdot tree --seed StateMachine --cwd test/fixtures/sample-project` |
| F7 | Multi-seed resolution rules | `done` | `npm test` — seed-resolution tests; `tree --seed State` → exit 2 |
| F8 | `seed meta` | `done` | `webdot seed meta --seed StateMachine --cwd test/fixtures/sample-project` |

### Phase 2 review notes (2026-07-10)

| ID | Feedback | Action |
|----|----------|--------|
| F5 | Want coverage metric, not just test count | `c8` integrated into `npm test`; prints summary table (statements/branches/functions/lines) |
| F6 | Default tree used path sort (wrong for case-sensitive relids); wanted DFS + npm-style indent | DFS via `getChildrenRelids`; `tree` format uses `├─`/`└─`, relid + name, full path tail; `tree-verbose` adds meta/type |
| F7 | Clarify goal vs per-directory webgmex warnings | Fixture adds `StateModel` (duplicate of `StateMachine`); tests for prefix ambiguity + exit 2 |

### F7 — seed name resolution (catalog)

When a command takes `--seed <name>`, F7 picks **which seed entry** in `webgme-setup.json` to load — not which `.webgmex` file inside a seed folder (that is F1).

| Input | Setup has | Result |
|-------|-----------|--------|
| `StateMachine` | exact match | loads `StateMachine` |
| `StateMach` | only `StateMachine` matches prefix | loads `StateMachine` |
| `State` | `StateMachine` + `StateModel` | **exit 2**, lists both |
| `NoSuch` | no match | exit 1, unknown seed |

Fixture `sample-project` includes `StateMachine` and `StateModel` (duplicate `.webgmex` content) for F7 tests.

**M0 — Foundation** — `done` (merged to `main` 2026-07-10)

| ID | Feature | Status | Review |
|----|---------|--------|--------|
| F0 | Repo scaffold (package, TS, CI, README) | `done` | `npm run build && npm test` |
| F1 | SetupCatalog + catalog errors | `done` | `npm test` — catalog-errors + setup-catalog tests |
| F2 | `tree repo` (plugins, seeds, viz, routers) | `done` | `npm test` — repo-tree tests (all kinds × formats) |
| F3 | `ls` compact listing | `done` | `npm test` — ls tests; see [ls vs tree](#ls-vs-tree) |
| F4 | Test fixtures + CI on push | `done` | GitHub Actions tab after push |

### M0 review notes (2026-07-09)

| ID | Feedback | Action |
|----|----------|--------|
| F0 | Fixture should include a real `.webgmex` | StaMS `StateMachine.webgmex` (+ extra `_StateMachine_.webgmex` for ignore test) in fixture |
| F1 | Tests for all catalog error paths; warn on extra `.webgmex` | `catalog-errors.test.js`, expanded setup-catalog tests; seed uses `{name}.webgmex` only, notes ignored files |
| F2 | Fixture + tests for all kinds and formats; TDD / coverage rule | Expanded fixture (viz, router, edge cases); `repo-tree.test.js`; `.cursor/rules/test-coverage.mdc` |
| F3 | Why does `ls` format differ from `tree`? | By design — see [ls vs tree](#ls-vs-tree) |
| F4 | Approved as-is | — |

### ls vs tree

`ls` is a **compact index** for quick scanning: one block per kind, names only (`seeds:\n  local: StateMachine StateModel EmptySeed`).  
`tree` is **introspection**: stable refs, `src`, artifacts, metadata paths, warnings/notes. Different commands, different output — not a shared formatter. Unifying UX is optional backlog (B4).

**Status legend:** `pending` · `in progress` · `review` · `done` · `deferred`

---

## Features (full roadmap)

### Phase 1 — Catalog & repo tree
| ID | Feature | Status | Notes |
|----|---------|--------|-------|
| F1 | SetupCatalog from webgme-setup.json | `done` | Stable refs `seed:`, `plugin:`, etc. |
| F2 | Malformed-input errors → cite `tree repo` | `done` | Fuzzy name suggestions |
| F3 | `tree repo` tree / flat / json | `done` | `--kind` filter |
| F4 | `ls` compact listing | `done` | Delegates to catalog |

### Phase 2 — Seed model tree & session
| ID | Feature | Status | Notes |
|----|---------|--------|-------|
| F5 | ProjectSession (memory storage + import) | `done` | File-project load from `.webgmex`; MemoryGMEAuth; no HTTP server |
| F6 | `tree --seed` model walk | `done` | DFS `tree` + `tree-verbose`; `--at`, `--select` |
| F7 | Multi-seed resolution rules | `done` | Catalog shorthand: unique prefix OK; shared prefix → exit 2 |
| F8 | `seed meta` | `done` | MetaAspectSet IR (`seed meta --seed`); JSON IR for now — concise MetaDescriptor in F16 |

### Phase 2½ — Meta presentation
| ID | Feature | Status | Notes |
|----|---------|--------|-------|
| F16a | Meta specs + examples | `done` | `docs/meta/` — pointer-first descriptor, MetaLang EBNF + RULES |
| F16b | `seed meta --format descriptor` | `done` | `irToDescriptor` + tests |
| F16c | `seed meta --format metalang` | `done` | `descriptorToMetalang` + tests |
| F16d | MetaLang parser (Langium optional) | `deferred` | Authoring path metalang → descriptor |

### Phase 3 — Plugin run
| ID | Feature | Status | Notes |
|----|---------|--------|-------|
| F9 | `plugin info` (configStructure) | `done` | JSON: metadata + defaults from `metadata.json` |
| F10 | `plugin run` context flags | `done` | `--seed`, `--at`, `--select`, `--branch` |
| F11 | Config validation + `--set` | `done` | `--config-file`, read-only enforcement |
| F12 | Message / result routing | `done` | Plugin logger → stderr; messages in JSON + stderr |
| F13 | Ephemeral FS blob + `--artifacts-out` | `done` | Warn when artifacts produced but not saved |
| F18 | Model write-back + `--dry-run` / `--out` | `done` | Writes back to source `.webgmex` when the plugin edits the model; `--dry-run` skips; `--out` redirects |
| F19 | Direct `--plugin-dir` / `--webgmex` | `done` | Run any plugin dir on any `.webgmex`; catalog is optional shorthand |

### Phase 3½ — Stateful session shell
| ID | Feature | Status | Notes |
|----|---------|--------|-------|
| F20 | Session workspace + state file | `pending` | `.webdot/session.json` + working `.webgmex` copy |
| F21 | `session open` / `session status` / `session close` | `pending` | Bind cwd, model path, branch, dirty flag |
| F22 | Commands default to open session | `pending` | `plugin run`, `tree --seed`, etc. when session active |
| F23 | `session save` / `session discard` | `pending` | Explicit write-back to user-chosen target |
| F24 | Optional REPL / long-lived shell | `pending` | Single Node process; avoids re-import per command |

**Phase 3½ — Stateful session (planned before Phase 4)**  
Follow-up commands reuse an **opened** project; the user explicitly **saves** (or discards) instead of one-shot import/run/export per invocation.

**Feasibility (2026-07-11):** **Yes, with the right model.**

- **Constraint:** `webgme-engine` memory storage is **in-process**. A normal one-shot `webdot` CLI cannot keep a live `ProjectSession` across separate shell invocations.
- **Approach A — workspace file:** On `session open`, import seed/webgmex, export a **working copy** under `.webdot/workspace/`, record paths + dirty flag in `session.json`. Later commands re-import the working copy. `session save` writes to user target. Works with existing subprocess CLI.
- **Approach B — session REPL:** `webdot session` keeps one Node process and in-memory `ProjectSession` until exit. Best UX for iterative plugin runs.
- **Synergy with F18:** `exportProjectToFile` and direct `--webgmex` already exist; session layer composes on top.

Priority: **medium** — after Phase 3 merge; **before Phase 4** generators.

### Phase 4 — Generator & consumer
| ID | Feature | Status | Notes |
|----|---------|--------|-------|
| F14 | `generate meta-ts` | `pending` | From seed meta |
| F15 | StaMS devDependency + scripts | `pending` | Dogfood in StaMS |
| F17 | Library & namespace meta | `pending` | See below — with generator work, not before |

**F17 — Library & namespace (Phase 4)**  
WebGME seeds may embed or reference **libraries** (`addLibrary`, library roots, `getFullyQualifiedName` / namespace). v1 IR/descriptor/MetaLang and `tree --seed` use concept **names** and storage **paths** only. F17 should:

- Document how libraries appear in IR (`getJsonMeta`, library GUIDs, cross-project refs)
- Extend descriptor + MetaLang if needed (e.g. qualified names, `library` blocks, namespace in `domain`)
- Adjust **seed traversal** (`tree --seed`) to mark library-sourced nodes vs owned meta
- Align **F16 translators** once representation rules are settled

Priority: **medium** — part of Phase 4 alongside F14–F15; not blocking Phase 3½.

---

## Backlog (refactor · optimize · streamline)

Tasks not tied to a single milestone — pick up anytime.

| ID | Type | Task | Priority |
|----|------|------|----------|
| B1 | streamline | Deduplicate webgme-setup parsing with webgme-cli conventions doc | low |
| B2 | optimize | Lazy-load webgme-engine only for session commands | medium |
| B3 | refactor | Extract shared test helpers from webgme-engine fixtures | medium |
| B4 | streamline | Single `webdot tree` UX doc + shell completions | low |
| B5 | refactor | Metadata convention `domainTools.producesArtifacts` | low |
| B6 | optimize | Cache SetupCatalog per process for multi-subcommand REPL (future) | low |
| B7 | meta | See **F17** (Phase 4) — library/namespace in IR, descriptor, MetaLang, traversal | medium |
| B8 | streamline | CLI complexity: trim rare flags or `webdot examples` tutorial recipes / scenario printouts | medium |

*Add rows via [Task issue template](.github/ISSUE_TEMPLATE/task.md).*

---

## Review log

Record of completed reviews (newest first).

| Date | Feature | Reviewer | Outcome | Notes |
|------|---------|----------|---------|-------|
| 2026-07-10 | Phase 2½ (F16a–c) | maintainer | Approved | Meta specs + `seed meta` descriptor/metalang; F17 deferred to Phase 4; merged `feature/F16-meta-representations` → `main` |
| 2026-07-10 | Phase 2 (F5–F8) | maintainer | Approved | `webdot` CLI, F7 fixture, tree-command tests; merged `feature/phase2-seed-model` → `main` |
| 2026-07-10 | M0 (F0–F4) | maintainer | Approved | Retroactive review on branch `M0`; merged to `main` |
| 2026-07-09 | M0 (F0–F4) | maintainer | Change requests | Fixtures, catalog tests, seed webgmex selection, test-coverage rule |

---

## Changelog

### 0.4.0 (2026-07-11) — review on `feature/phase3-plugin-run`
- Phase 3: `plugin info`, `plugin run` (headless PluginCliManager)
- Config: `--set`, `--config-file`, read-only validation
- Model write-back (default), `--dry-run`, `--out`; direct `--plugin-dir` / `--webgmex`
- Blob artifacts: `--artifacts-out` + non-persistence warning
- CLI refactor (`cli-program.ts`); fixture plugins EchoPlugin, NoOpPlugin, ThrowPlugin
- 99 tests, ~95% line coverage

### 0.3.0 (2026-07-10)
- Phase 2½: meta specs (`docs/meta/`), `seed meta --format descriptor|metalang|tree|tree-verbose`
- IR → descriptor → MetaLang translators; StateMachine golden test
- F17 library/namespace scoped to Phase 4

### 0.2.0 (2026-07-10)
- Phase 2: ProjectSession, `tree --seed`, seed resolution, `seed meta`
- CLI command **`webdot`** (`npx @kecso/webgme-domain-tools` or global install)
- F7: `StateModel` fixture for catalog prefix ambiguity; exit 2 on ambiguous `--seed`
- `webgme-engine` git dep (MemoryGMEAuth); install with `npm install --ignore-scripts` if postinstall fails

### 0.1.0 (2026-07-10)
- M0 foundation: SetupCatalog, `tree repo`, `ls`, tests, CI
- StaMS smoke-tested: `tree repo --kind seeds,plugins`
- Process: review-feedback template, main protected for agents, test-coverage rule
- M0 review: StateMachine fixture, catalog error tests, seed webgmex selection

---

## Quick commands (once built)

```bash
# From webgme-domain-tools checkout
npm install && npm run build

# Repo tree against StaMS
webdot tree repo --cwd c:/Work/StaMS
webdot tree repo --cwd c:/Work/StaMS --kind seeds,plugins --format json

# Global / npx
npx @kecso/webgme-domain-tools tree repo
webdot tree --seed StateMachine --cwd c:/Work/StaMS
webdot tree --seed StateMachine --at /1 --cwd c:/Work/StaMS
webdot seed meta --seed StateMachine --cwd c:/Work/StaMS
webdot plugin info EchoPlugin --cwd test/fixtures/sample-project
webdot plugin run EchoPlugin --seed StateMachine --cwd test/fixtures/sample-project --set message=hi
```

---

## Design reference

Full architecture: see StaMS planning doc or [DESIGN.md](DESIGN.md) in this repo. Core ideas:

- **SetupCatalog** — canonical `webgme-setup.json` view; all commands validate against it
- **tree repo** — discover plugins/seeds; **tree --seed** — pick plugin context
- **Headless plugins** — in-memory seed + optional FS blob; artifacts via `--artifacts-out`
