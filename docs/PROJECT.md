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

**Phase 6 — Project libraries** — `pending` (**next up** — do this before Phase 9 MetaLang extract)

| ID | Feature | Status | Review |
|----|---------|--------|--------|
| F31 | Library-bearing fixtures | `pending` | Synthetic + real under `test/fixtures/` |
| F32 | List / inspect libraries | `pending` | `webdot library list`; `tree --seed` — library roots first under ROOT |
| F33 | Descriptor / MetaLang always FQN | `pending` | Host bare names; library `Lib.Concept`; see `docs/meta/LIBRARIES.md` |
| F34 | GenerateMetaTs FQN / namespaces | `pending` | Nested `namespace Lib { … }` for library concepts; host top-level |
| F35 | Library CLI management | `pending` | No session; always persist `.webgmex`; GUI `addLibrary` semantics |

**Hard gate:** Phase 9 may start parser/plugin work in-repo, but **`webgme-metalang` package extract (F44) waits until Phase 6 F31–F34 are done** so namespaces/libraries are part of the language surface we ship externally.

**Phase 9 — MetaLang authoring** — `pending` (after Phase 6 library emit; package extract last)

**Phase 8 — Documentation (tutorials & CLI reference)** — `done` (merged to `main` 2026-07-22, PR [#8](https://github.com/kecso/webgme-domain-tools/pull/8))

**Phase 7 — Repository exchange & history** — `done` (merged to `main` 2026-07-22, PR [#7](https://github.com/kecso/webgme-domain-tools/pull/7))

**Phase 5 — Installable plugins (global toolbox)** — `done` (merged to `main` 2026-07-17, branch `feature/phase5-installable-plugins`)

| ID | Feature | Status | Review |
|----|---------|--------|--------|
| F26 | Plugin install registry (local) | `done` | `WEBDOT_HOME=<tmp> webdot plugin install plugins/GenerateMetaTs` · `plugin list` · `plugin uninstall` |
| F27 | Install from GitHub | `done` | `webdot plugin install owner/repo[@ref] [--subdir <path>] [--as <name>]` (clone into cache) |
| F28 | Collision → alternate install name | `done` | Re-install same name without `--force` fails; `--as` registers alias; no silent overwrite |
| F29 | Resolve installed names on `plugin run` / `info` / `ls` | `done` | Bare name: `--plugin-dir` → catalog → installed; `plugin list` / `ls plugins` label **catalog** vs **installed** |
| F30 | Optional interactive session REPL | `optional` | Not shipped; one-shot CLI + session workspace is enough |

### Phase 5 review notes (2026-07-17)

| ID | Feedback | Action |
|----|----------|--------|
| F27 | `path.sep` made `owner/repo` OS-dependent (broken on Unix) | Portable rule: exactly `owner/repo[@ref]` → GitHub; `./…` / absolute / deeper paths → local |
| F24/F30 | REPL | Remains dropped/optional; not part of Phase 5 deliverable |

**Phase 4 — Generator & consumer** — `done` (merged to `main` 2026-07-16, branch `feature/phase4-generator`)

| ID | Feature | Status | Review |
|----|---------|--------|--------|
| F14 | GenerateMetaTs plugin | `done` | `webdot plugin run --plugin-dir plugins/GenerateMetaTs --seed StateMachine -C test/fixtures/sample-project --artifacts-out _meta` · `npm test` — `generate-meta-ts.test.js` |
| F15 | StaMS devDependency + scripts | `pending` | Dogfood in StaMS after package publish / link — see Phase 4 notes |
| F17 | Library & namespace meta (IR) | `done` | IR fields landed; listing/emit fine-tuning + fixture deferred to **Phase 6** |

### Phase 4 review notes (2026-07-15 / 2026-07-16)

| ID | Feedback | Action |
|----|----------|--------|
| F14 | Generator as separate CLI is architectural noise; should be a plain plugin | Dropped `webdot generate`; `plugins/GenerateMetaTs` via `--plugin-dir` / `--artifacts-out` (shell cwd) |
| F14 | Emit should support authoring domain objects in TS, with WebGME scopes | Scoped instance types: `attributes` / `pointers` / `sets` / `children` (unnamed containment union) |
| F14 | Fixture META: Variable→Machine children looks wrong | Fixed in updated `StateMachine.webgmex` — Machine contains Variable*; Variable no longer contains Machine |
| F17 | Partial | IR library/FQN fields landed; richer listing/emit + library CLI → **Phase 6** |

**Phase 3½ — Stateful session shell** — `done` (merged to `main` 2026-07-11, branch `feature/phase3.5-session-shell`)
| ID | Feature | Status | Review |
|----|---------|--------|--------|
| F20 | Session workspace + state file | `done` | `webdot session open --seed StateMachine -C test/fixtures/sample-project` |
| F21 | `session open` / `status` / `close` | `done` | `webdot session status` (execution dir; no repeated `-C`) |
| F22 | Commands default to open session | `done` | `plugin run`, `tree`, `seed meta`, `ls` in session scope |
| F23 | `session save` / `session discard` | `done` | `npm test` — `session-workspace.test.js` |
| F24 | Optional REPL / long-lived shell | `dropped` | Removed 2026-07-17; optional Phase 5 extra (**F30**) if demand appears |
| F25 | `.webgmex` repository import/export | `deferred` → **Phase 7** | Engine helpers exist; promoted to next milestone |

**Phase 3 — Plugin run** — `done` (merged to `main` 2026-07-11, branch `feature/phase3-plugin-run`)

| ID | Feature | Status | Review |
|----|---------|--------|--------|
| F9 | `plugin info` (configStructure) | `done` | `webdot plugin info EchoPlugin --cwd test/fixtures/sample-project` |
| F10 | `plugin run` context flags | `done` | `webdot plugin run EchoPlugin --seed StateMachine --at /G --dry-run` |
| F11 | Config validation + `--set` | `done` | `npm test` — `plugin-config.test.js` |
| F12 | Message / result routing | `done` | `npm test` — `plugin-command.test.js`, `cli.test.js` |
| F13 | Ephemeral FS blob + `--artifacts-out` | `done` | `webdot plugin run EchoPlugin --seed StateMachine --set emitArtifact=true --artifacts-out _artifacts` |
| F18 | Model write-back + `--dry-run` / `--out` | `done` | `webdot plugin run EchoPlugin --seed StateMachine --set addNode=true --out out.webgmex` |
| F19 | Direct `--plugin-dir` / `--webgmex` (no catalog) | `done` | `webdot plugin run --plugin-dir test/fixtures/sample-project/src/plugins/EchoPlugin --seed StateMachine -C test/fixtures/sample-project --dry-run` (`--plugin-dir` is relative to shell cwd, not `-C`) |

### Phase 3 review notes (2026-07-11)

| ID | Feedback | Action |
|----|----------|--------|
| F9–F19 | CLI flag surface growing; long commands hard to compose | **B8** backlog — trim rarely used flags or add tutorial recipes / `webdot examples` (future) |
| F12 | Plugin output should reflect full context, not just seed name | JSON `context` block + `plugin run --help` documents project / active node / selection / config with defaults |
| F10 | `--branch` is meaningless: `.webgmex` import is single-snapshot (one commit, one branch) | Dropped `--branch` flag; branch fixed to `master` internally. Re-expose via **Phase 7** (F37) |

**Phase 2½ — Meta representations** — `done` (merged to `main` 2026-07-10, branch `feature/F16-meta-representations`)

| ID | Feature | Status | Review |
|----|---------|--------|--------|
| F16a | Meta representation specs (IR, descriptor, MetaLang) | `done` | `docs/meta/README.md` + examples |
| F16b | `seed meta --format descriptor` | `done` | `npm test` — `meta-translate.test.js` |
| F16c | `seed meta --format metalang` | `done` | `webdot seed meta --seed StateMachine --format metalang` |
| F16d | MetaLang parser / Langium (optional) | `deferred` → **Phase 9** | Authoring path + eventual package extract |

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

**Status legend:** `pending` · `in progress` · `review` · `done` · `deferred` · `dropped` · `optional`

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
| F16d | MetaLang parser (Langium optional) | `deferred` → **Phase 9** | Authoring path metalang → descriptor |

### Phase 3 — Plugin run
| ID | Feature | Status | Notes |
|----|---------|--------|-------|
| F9 | `plugin info` (configStructure) | `done` | JSON: metadata + defaults from `metadata.json` |
| F10 | `plugin run` context flags | `done` | `--seed`, `--at`, `--select` (no `--branch` until Phase 7 / F37) |
| F11 | Config validation + `--set` | `done` | `--config-file`, read-only enforcement |
| F12 | Message / result routing | `done` | Plugin logger → stderr; messages in JSON + stderr |
| F13 | Ephemeral FS blob + `--artifacts-out` | `done` | Warn when artifacts produced but not saved |
| F18 | Model write-back + `--dry-run` / `--out` | `done` | Writes back to source `.webgmex` when the plugin edits the model; `--dry-run` skips; `--out` redirects |
| F19 | Direct `--plugin-dir` / `--webgmex` | `done` | Run any plugin dir on any `.webgmex`; catalog is optional shorthand |

### Phase 3½ — Stateful session shell
| ID | Feature | Status | Notes |
|----|---------|--------|-------|
| F20 | Session workspace + state file | `done` | `.webdot/session.json` + `.webdot/workspace/*.webgmex` |
| F21 | `session open` / `session status` / `session close` | `done` | Bind cwd, model path, dirty flag |
| F22 | Commands default to open session | `done` | `plugin run`, `tree --seed`, `seed meta` when session active |
| F23 | `session save` / `session discard` | `done` | Explicit write-back to source (or `--out`) |
| F24 | Optional REPL / long-lived shell | `dropped` | Removed 2026-07-17; optional Phase 5 extra (**F30**) if demand appears |
| F25 | `.webgmex` repository import/export | `deferred` → **Phase 7** | Full commit/branch/tag packages (engine helpers exist) |

**Phase 3½ — Stateful session**  
Follow-up commands reuse an **opened** project workspace; the user explicitly **saves** (or discards) instead of one-shot import/run/export per invocation.

**Implementation (2026-07-11):** Workspace file model (Approach A). `.webdot/session.json` tracks execution cwd, project root, source path, working `.webgmex`, and dirty flag. Commands re-import the working copy; `session save` writes to the save target. **F25 → Phase 7** (history-aware I/O + branch/history CLI). **F24 REPL dropped** (2026-07-17); use one-shot CLI against an open session.

**Session location fix (2026-07-11):** `.webdot/` now lives in the **execution directory** (`process.cwd()`), not under `-C`. `-C` only selects the project to open; `session.json` records that project root (`projectCwd`) so `status`, `save`, `plugin run`, `tree`, `seed meta` work from the same directory without repeating `-C`. This supports driving multiple projects from one working directory. Also fixed a latent bug where running `webdot` outside its own repo root failed because `webgme-engine/src/bin/import.js` loads `require(process.cwd()/config)` at import time — the bridge now loads that module with the package root as cwd.

**Session scope (2026-07-11):** All catalog commands (`ls`, `plugin info`, `plugin run`, `tree`, `seed meta`) now default to the open session's project scope instead of looking for `webgme-setup.json` in the current dir. Each emits a `note: session open …` block on stderr (session source `.webgmex` + project root); explicit `-C` overrides per-command. `webdot tree` with no scope defaults to the session **model** tree when a session is open (`tree repo` for the catalog).

### Phase 4 — Generator & consumer
| ID | Feature | Status | Notes |
|----|---------|--------|-------|
| F14 | GenerateMetaTs (plain plugin) | `done` | Scoped instance interfaces (`attributes` / `pointers` / `sets` / `children`) via `--plugin-dir` + `--artifacts-out` |
| F15 | StaMS devDependency + scripts | `pending` | Companion change in StaMS after this package is linkable/published |
| F17 | Library & namespace meta | `done` | IR fields + `docs/meta/LIBRARIES.md`; descriptor/tree/FQN emit still need library fixture |

**F15 — StaMS dogfood (outside this repo)**  
After Phase 4 merges:

```bash
# In StaMS
npm install --save-dev github:kecso/webgme-domain-tools#main
# package.json scripts example (after Phase 5 install):
#   webdot plugin install <path-to>/plugins/GenerateMetaTs
#   "gen:meta": "webdot plugin run GenerateMetaTs --seed StateMachine --artifacts-out src/generated --set seedName=StateMachine"
```

Accept when StaMS builds against generated types and CI runs `gen:meta`.

**F17 — Library & namespace (Phase 4)**  
IR records `libraries[]` and per-node `namespace` / `fullyQualifiedName` / `libraryElement` (StateMachine fixture: empty). Listing/emit fine-tuning and library CLI management are **Phase 6**.

### Phase 5 — Installable plugins (global toolbox)
| ID | Feature | Status | Notes |
|----|---------|--------|-------|
| F26 | Plugin install registry (local) | `done` | `WEBDOT_HOME` / `~/.webdot/plugins/registry.json`; `plugin install <path>` |
| F27 | Install from GitHub | `done` | `owner/repo[@ref]`; cache under `plugins/github/`; optional `--subdir` |
| F28 | Collision → alternate install name | `done` | `--as <alias>`; `--force` to replace; no silent overwrite |
| F29 | Resolve installed names on `plugin run` / `info` / `ls` | `done` | Precedence + **catalog** / **installed** labels |
| F30 | Optional interactive session REPL | `optional` | Extra only — not shipped |

**Phase 5 — Scenario (boiled down)**  
`webdot` is installed **system-wide**. Domain-agnostic plugins live in a **user registry**, not inside each studio repo. Any project/session can run them against its own `.webgmex`.

```bash
# Global CLI already on PATH
webdot plugin install ./path/to/ModelLint          # local
webdot plugin install owner/webdot-ModelLint       # GitHub (F27)
webdot plugin install ./EchoPlugin --as LintEcho   # rename when name collides

webdot plugin list                                 # shows install name + source
webdot plugin run LintEcho --seed StateMachine -C ~/StaMS
```

**Name dictionary & collisions**  
Each install gets a **dictionary key** (the name used later in `plugin run` / `info`). If that key already exists in the registry, install **requires `--as <alias>` or `--force`**. No silent overwrite. Catalog and installed plugins may share a display name; resolution prefers catalog, so use `--as` when you need a distinct installed tool. The requirejs **plugin id** stays the folder basename (alias is lookup-only).

**Layout:** Reuses F19 (`--plugin-dir` semantics). Registry stores absolute paths (local origin path or GitHub cache) + metadata. Precedence for a bare name: explicit `--plugin-dir` → open project catalog → installed registry. Override home with `WEBDOT_HOME` (tests / portable installs).

**F30 (optional extra):** Interactive `session repl` is **not** part of the installable-plugins core. Keep using one-shot `webdot` against an open session. Only reintroduce a REPL if multi-step interactive use becomes common.

Priority: **high product direction** — own milestone after Phase 4 generators.

### Phase 7 — Repository exchange & history

**Status:** `done` (merged to `main` 2026-07-22, PR [#7](https://github.com/kecso/webgme-domain-tools/pull/7))

**Engine:** `webgme-engine` ≥ 2.32 already ships v2 (`formatVersion: 2`, `exportMode: "repository"`) via `getProjectWithHistory` / `insertProjectWithHistory`. See `node_modules/webgme-engine/docs/exchange-format-v2.md`.

**Save / write-back policy (decided 2026-07-22)**

| Input / session mode | On plugin/`session save` |
|----------------------|--------------------------|
| **v1** snapshot `.webgmex` | **Overwrite** with a new v1 snapshot (today’s behaviour) |
| **v2** repository `.webgmex` | **Preserve history** — export with `getProjectWithHistory` so new commits from `self.save()` (and session commits) accumulate like a GUI workload |

Opening a v2 file must never silently flatten to v1 on save. Optional later: explicit `session open --upgrade-history` (or similar) to convert a v1 seed into a v2 repo on first save — not required for v1 of this phase.

| ID | Feature | Status | Notes |
|----|---------|--------|-------|
| F36 | Detect v1 vs v2; history-aware import/export | `done` | Import: `insertProjectWithHistory` for v2, snapshot path for v1. Export: v2 round-trip by default when working copy is v2 |
| F37 | Branch on open / run | `done` | `session open --branch <name>`; re-expose `--branch` on `plugin run`; default `master` (or file’s default branch) |
| F38 | Switch branch in session | `done` | `session checkout <branch>` updates session state + working head |
| F39 | History introspection | `done` | `history log [--branch]` / `history show <commit>` — list commits for a branch with **hashes**, messages, times |
| F40 | Branch & tag management | `done` | `branch list\|create\|update\|delete`; `tag list\|create\|delete`; create fails if name exists (use update to move tip); create/update from branch / commit id |
| F41 | Multi-branch v2 fixture + tests | `done` | `test/fixtures/repository/StateMachine.webgmex` (branches `master`/`example`, tags, multi-commit) |

**Phase 7 — Scenario (boiled down)**

```bash
webdot session open --webgmex ./model.webgmex --branch feature/edit
webdot history log --branch feature/edit          # commit ids + messages
webdot plugin run SomeEditor                     # self.save() → new commit on feature/edit
webdot history log --branch feature/edit         # one more commit
webdot branch create experiment --from <commitId>
webdot branch update experiment --from <commitId>   # move existing tip; create does not overwrite
webdot session checkout experiment
webdot session save                              # v2 file keeps full graph
```

**Notes:** Promotes deferred **F25** / **B9**. Merge/conflict UX is **out of scope** for this phase (engine merge helpers exist; defer). Session still re-imports per process — history survives because the **file** is the store (v2 round-trip each mutating command).

**Priority:** Ahead of Phase 6 libraries — cleaner product goal and unblocks file-as-repo workflows.

---

### Phase 6 — Project libraries

**Status:** `pending` (**next product milestone** — Phase 7/8 are done)  
**Goal:** Treat attached WebGME libraries as first-class in listing/meta emit, and optionally manage them from the CLI.

| ID | Feature | Status | Notes |
|----|---------|--------|-------|
| F31 | Library-bearing fixtures | `pending` | **Both:** synthetic (error/coverage) + real/trimmed seed (dogfood) |
| F32 | List / inspect libraries | `pending` | `library list`; `tree --seed` keeps real structure, **library roots first under ROOT** |
| F33 | Descriptor / MetaLang always FQN | `pending` | Library: `Lib.Concept`; **host: bare name** (no host namespace). Canonical — no short/FQN dual spelling |
| F34 | GenerateMetaTs FQN / namespaces | `pending` | Nested `namespace Lib { … }` for library concepts; host interfaces stay top-level |
| F35 | Library CLI management | `pending` | **No session** — `add`/`update`/`remove` always write the target `.webgmex` immediately; same as GUI `addLibrary` |

**Phase 6 — Scenario (boiled down)**  
A domain studio imports a shared metamodel library into its seed. Authors want `webdot` to **show** what is host vs library, emit **canonical FQN** types, and (when ready) **attach/update/remove** library packages the same way the GUI does — without opening the WebGME GUI.

```bash
# Introspection (F32–F34)
webdot library list --seed HostDomain
webdot tree --seed HostDomain          # library roots first under ROOT
webdot seed meta --seed HostDomain --format descriptor   # always FQN keys

# Management (F35) — always persists; not part of session workspace
webdot library add --seed HostDomain --from ./SharedMeta.webgmex --as SharedMeta
webdot library update SharedMeta --seed HostDomain --from ./SharedMeta.webgmex
webdot library remove SharedMeta --seed HostDomain
```

**Decisions (2026-07-23):** Always-FQN for library types; **no host namespace**; both fixtures; tree = real structure with libraries ordered first; F35 **outside sessions**, always save; textual library authoring via separate metalang import and/or in-place `library` blocks (mimic `addLibrary`) — see [`docs/meta/LIBRARIES.md`](meta/LIBRARIES.md).

**Notes:** F17 IR fields are already in place. Prefer session write-back + Phase 7 history-aware save when library mutations write `.webgmex`.

**Before Phase 9 extract:** F31–F34 should land so MetaLang/descriptor/GenerateMetaTs already speak FQNs. Do **not** publish a separate `webgme-metalang` package that still keys only by simple names.

---

### Phase 8 — Documentation (tutorials & CLI reference)

**Status:** `done` (merged to `main` 2026-07-22, PR [#8](https://github.com/kecso/webgme-domain-tools/pull/8))  
**Goal:** Make real usage easy to follow — short scenario tutorials with exact commands, and a full command reference that mirrors CLI help (not a thin README table).

**Motivation (2026-07-22):** README “Commands” / quick-start was too shallow for the surface we ship (plugins, session, history/branches). Prefer extracting the reference out of the README and linking from a slim landing page.

**CLI norms (decided 2026-07-22):** Follow the usual CLI split ([clig.dev](https://clig.dev/)–style): **`--help`** for flags + a few examples; **README** for install/quick start; **markdown docs** for tutorials and full reference. A separate `webdot examples` command is **not** required — anyone who installs the package should read the README, which points at the same tutorials. Root `webdot --help` lists a few common invocations and points at `docs/`. Optional flags with fallbacks use a consistent **`[default: …]`** marker in `--help` and [`docs/CLI.md`](CLI.md).

| ID | Feature | Status | Notes |
|----|---------|--------|-------|
| F45 | Full CLI reference doc | `done` | [`docs/CLI.md`](CLI.md) — every top-level command + important flags (aligned with `--help`, including `[default: …]`) |
| F46 | Scenario tutorials | `done` | [`docs/tutorials/`](tutorials/README.md) — plugin-anywhere, GenerateMetaTs, session, history/branches |
| F47 | Slim README | `done` | Install + quick start + doc links; no incomplete command table |
| F48 | `webdot examples` command | `dropped` | Redundant with README → tutorials and `--help` Examples; revisit only if discoverability still hurts |

**Phase 8 — Scenario sketches (in tutorials)**

```bash
# A. Plugin from anywhere — docs/tutorials/plugin-anywhere.md
webdot plugin run --plugin-dir ./MyPlugin --webgmex ./model.webgmex --dry-run

# B. Install toolbox plugin — docs/tutorials/install-generate-meta-ts.md
webdot plugin install kecso/webgme-domain-tools --subdir plugins/GenerateMetaTs

# C. Session — docs/tutorials/session-workspace.md
webdot session open --seed StateMachine -C /path/to/studio

# D. History — docs/tutorials/history-branches.md
webdot history log --webgmex ./repo.webgmex --branch example
```

**Notes:** Tutorials + `CLI.md` (+ selected `docs/meta`) ship in the npm tarball so global installs can open them under `node_modules/webgme-domain-tools/docs/`. Does **not** block Phase 6 libraries; should land **before Phase 9 MetaLang**.

---

### Phase 9 — MetaLang authoring (draft)

**Status:** `pending` (after Phase 6 library emit for F31–F34; package extract **last**)  
**Goal:** Close the authoring loop (metalang → descriptor → WebGME meta), optionally add LSP, then extract MetaLang into its own package last.

| ID | Feature | Status | Notes |
|----|---------|--------|-------|
| F16d | MetaLang → descriptor parser | `pending` | In-repo first (grammar + RULES already in `docs/meta/metalang/`); round-trip tests |
| F42 | ImportMetaLang plugin | `pending` | Installable plugin: ingest `.metalang` → build/update meta in a project / `--out` `.webgmex` |
| F43 | Langium language server | `pending` | Diagnostics / completion against grammar; thin editor extension optional |
| F44 | Extract `webgme-metalang` package | `pending` | **Last** — blocked on Phase 6 F31–F34; then move grammar, translate, LSP; webdot depends on the package |

**Phase 9 — Scenario (boiled down)**

```bash
webdot seed meta --seed StateMachine --format metalang > domain.metalang
# edit domain.metalang (editor LSP once F43 lands)
webdot plugin run ImportMetaLang --set file=./domain.metalang --out ./NewDomain.webgmex
```

**Notes:** Descriptor/MetaLang remain lossy vs IR (no sheets/mixins/constraints) — ingest creates a **useful** meta project, not a bit-perfect GUI round-trip. Separation (F44) waits until Phase 6 F31–F34 + authoring/plugin are proven in-repo.

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
| B6 | optimize | Cache SetupCatalog per process (only if a long-lived REPL returns — **F30**) | low |
| B7 | meta | See **Phase 6** (F31–F34) — library listing / namespace emit | medium |
| B8 | streamline | CLI examples discovery — Phase 8 uses README + `--help` Examples; `webdot examples` **dropped** (F48) | — |
| B9 | compatibility | Repository `.webgmex` / history — see **Phase 7** (F36–F41) | — |
| B10 | product | Phase 5 installable plugins (F26–F29) — done on `main` | — |
| B11 | product | Phase 6 library CLI management (F35) | medium |
| B12 | product | Phase 9 MetaLang authoring + package extract (F16d, F42–F44) | low |
| B13 | docs | Phase 8 tutorials + CLI reference (F45–F47) — done on `main` | — |

*Add rows via [Task issue template](.github/ISSUE_TEMPLATE/task.md).*

---

## Review log

Record of completed reviews (newest first).

| Date | Feature | Reviewer | Outcome | Notes |
|------|---------|----------|---------|-------|
| 2026-07-22 | Phase 8 (F45–F47) | maintainer | Approved | Tutorials + CLI reference + slim README; `[default: …]` on help/docs; `branch update`; merged PR #8 → `main` |
| 2026-07-22 | Phase 7 (F36–F41) | maintainer | Approved | Repository exchange v2 / history / branch CLI; fixture + coverage; merged PR #7 → `main`; Phase 8 docs scheduled before MetaLang |
| 2026-07-17 | Phase 5 (F26–F29) | maintainer | Approved | Installable plugins registry; portable `owner/repo` parse; merged `feature/phase5-installable-plugins` → `main` |
| 2026-07-17 | Drop F24 session REPL | maintainer | Approved | Removed `session repl`; F30 optional Phase 5 extra; merged `feature/drop-session-repl` → `main` |
| 2026-07-16 | Phase 4 (F14, F17) | maintainer | Approved | GenerateMetaTs plain plugin (scoped instance TS); F17 IR partial; F15 remains outside repo; merged `feature/phase4-generator` → `main` |
| 2026-07-11 | Phase 3½ (F20–F23) | maintainer | Approved | Stateful session workspace; execution-dir `.webdot`; session scope for all commands; merged `feature/phase3.5-session-shell` → `main` (F24 REPL later dropped) |
| 2026-07-11 | Phase 3 (F9–F13, F18–F19) | maintainer | Approved | Plugin run, write-back, direct paths; dropped `--branch` (snapshot import); F25/B9 for repository `.webgmex`; merged `feature/phase3-plugin-run` → `main` |
| 2026-07-10 | Phase 2½ (F16a–c) | maintainer | Approved | Meta specs + `seed meta` descriptor/metalang; F17 deferred to Phase 4; merged `feature/F16-meta-representations` → `main` |
| 2026-07-10 | Phase 2 (F5–F8) | maintainer | Approved | `webdot` CLI, F7 fixture, tree-command tests; merged `feature/phase2-seed-model` → `main` |
| 2026-07-10 | M0 (F0–F4) | maintainer | Approved | Retroactive review on branch `M0`; merged to `main` |
| 2026-07-09 | M0 (F0–F4) | maintainer | Change requests | Fixtures, catalog tests, seed webgmex selection, test-coverage rule |

---

### Changelog

### Unreleased — Phase 7–8 on `main` (2026-07-22)
- Phase 8: tutorials (`docs/tutorials/`), full CLI reference (`docs/CLI.md`), slim README; docs shipped in npm tarball; consistent `[default: …]` in `--help` / CLI.md
- `branch update` to move an existing tip; `branch create` refuses to overwrite
- Phase 7: v1/v2 `.webgmex` detect; history-preserving save for repository packages; `--branch` on session/plugin; `history` / `branch` / `tag` / `session checkout`
- Fixture: `test/fixtures/repository/StateMachine.webgmex`; catalog StateMachine seed meta fix (Machine contains Variable*)
- Next product work: **Phase 6** libraries (F31–F35); then **Phase 9** MetaLang (extract gated on F31–F34)
- Package version still **0.7.0** until the next npm release cut

### 0.7.0 (2026-07-17) — merged to `main`
- Phase 5: installable plugins — `plugin install` / `list` / `uninstall`, user registry under `WEBDOT_HOME` / `~/.webdot`
- Resolve bare names: `--plugin-dir` → catalog → installed; `ls plugins` labels catalog vs installed
- GitHub install: `owner/repo[@ref]` (always GitHub shorthand) with optional `--subdir`; collision requires `--as` or `--force`
- Draft **Phase 6** (project libraries): F17 emit fine-tuning + library CLI management (F31–F35)
- F30 REPL remains optional / not shipped

### Planning (2026-07-22) — not yet released
- **Phase 6** libraries (F31–F35) — **next** product milestone
- **Phase 9** MetaLang authoring (F16d, F42–F43); package extract **F44** last and **after** Phase 6 F31–F34

### 0.6.1 (2026-07-17) — merged to `main`
- Dropped `webdot session repl` / `session shell` (F24); stateful session workspace (F20–F23) unchanged
- Optional interactive REPL noted as Phase 5 extra **F30** (not required)

### 0.6.0 (2026-07-16) — merged to `main`
- Phase 4: GenerateMetaTs plain plugin — scoped domain instance TypeScript interfaces from seed meta
- Removed `webdot generate` / `generate meta-ts` CLI
- `--plugin-dir` and `--artifacts-out` resolve relative to shell cwd (not `-C`)
- F17 (partial): IR `libraries` + namespace / FQN / `libraryElement` on meta nodes; `docs/meta/LIBRARIES.md`
- F15 (StaMS dogfood) still pending outside this repo
- Ignore `_meta/` artifact directories

### 0.5.0 (2026-07-11) — merged to `main`
- Phase 3½: `session open` / `status` / `save` / `discard` / `close`
- Workspace file: `.webdot/session.json` + working `.webgmex` copy
- Session state lives in the execution dir and records the project root, so follow-up commands need no repeated `-C`
- All catalog commands (`ls`, `plugin info`, `plugin run`, `tree`, `seed meta`) run in the open session's scope (note on stderr; `-C` overrides)
- `tree` defaults to session model when a session is open; `tree repo` for catalog; seed filter flag renamed to `--nodes`
- Fixed running `webdot` from outside its repo root (engine `bin/import.js` config load)
- F25 repository `.webgmex` deferred

### 0.4.0 (2026-07-11) — merged to `main`
- Phase 3: `plugin info`, `plugin run` (headless PluginCliManager)
- Config: `--set`, `--config-file`, read-only validation
- Model write-back (default), `--dry-run`, `--out`; direct `--plugin-dir` / `--webgmex`
- Blob artifacts: `--artifacts-out` + non-persistence warning
- CLI refactor (`cli-program.ts`); plugin context in `--help` and JSON output
- No `--branch` flag (v1 snapshot import); F25 tracks repository `.webgmex` support
- 101 tests, ~95% line coverage

### 0.3.0 (2026-07-10)
- Phase 2½: meta specs (`docs/meta/`), `seed meta --format descriptor|metalang|tree|tree-verbose`
- IR → descriptor → MetaLang translators; StateMachine golden test
- F17 library/namespace scoped to Phase 4

### 0.2.0 (2026-07-10)
- Phase 2: ProjectSession, `tree --seed`, seed resolution, `seed meta`
- CLI command **`webdot`** (`npx webgme-domain-tools` or global install)
- F7: `StateModel` fixture for catalog prefix ambiguity; exit 2 on ambiguous `--seed`
- `webgme-engine` v2.32.0; install with `npm install --ignore-scripts` if postinstall fails

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
npx webgme-domain-tools tree repo
webdot tree --seed StateMachine --cwd c:/Work/StaMS
webdot tree --seed StateMachine --at /1 --cwd c:/Work/StaMS
webdot seed meta --seed StateMachine --cwd c:/Work/StaMS
webdot plugin install ./plugins/GenerateMetaTs
webdot plugin list
webdot plugin run GenerateMetaTs --seed StateMachine --cwd c:/Work/StaMS --artifacts-out src/generated
webdot plugin info EchoPlugin --cwd test/fixtures/sample-project
webdot plugin run EchoPlugin --seed StateMachine --cwd test/fixtures/sample-project --set message=hi
```

---

## Design reference

Full architecture: see StaMS planning doc or [DESIGN.md](DESIGN.md) in this repo. Core ideas:

- **SetupCatalog** — canonical `webgme-setup.json` view; all commands validate against it
- **tree repo** — discover plugins/seeds; **tree --seed** — pick plugin context
- **Headless plugins** — in-memory seed + optional FS blob; artifacts via `--artifacts-out`
