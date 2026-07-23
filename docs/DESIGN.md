# Design overview

Headless CLI for WebGME domain studios. Complements webgme-cli (scaffold + server); does not replace it.

**User-facing how-tos:** [tutorials](tutorials/README.md) · **Command flags:** [CLI.md](CLI.md) · **`--help`** on each command remains authoritative for the live flag surface.

## Positioning

**Primary audience:** academics and small labs building domain toolchains (DSMLs, generators, analysis plugins) who need something workable quickly without adopting a large commercial or Eclipse-scale stack.

**Product bet:** WebGME remains the modeling runtime (browser collab, versioned models, JS plugins). `webdot` + meta IR/descriptor/MetaLang lower the *cost of operating* that stack — headless CI, reviewable meta, installable toolbox plugins, session/history on `.webgmex` — so a domain studio can stand up and evolve in days/weeks, not quarters.

**Stack shift (not “CLI for its own sake”):** We stay **diagram-driven and visual-first**. The textual / structured meta surface (IR → descriptor → MetaLang, plus headless mutation paths) is about **opening the stack to automated agents** and other non-GUI manipulators. Agents will be part of normal academic and engineering workflows; a framework that only exposes a canvas will simply not get used. Text is an access ramp for agents, CI, and review — not a replacement for the WebGME GUI.

**Non-goals:** Drawing users away from EMF, MetaEdit+, SysML v2, etc. Those ecosystems win on depth and industry lock-in. We are a **low-cost alternative for rapid domain toolchain development**, not a MOF/metaCASE competitor. MetaLang is not “compete with MOF syntax”; it is “make WebGME meta agent-reachable and git-reachable.”

## SetupCatalog

Loaded from `{cwd}/webgme-setup.json`. Every command that names a seed, plugin, or component kind resolves through the catalog. Errors cite:

```text
webdot tree repo --kind seeds
```

Stable refs: `seed:StateMachine`, `plugin:TextToModel`, `viz:MonacoEditor`, `router:StudioAssets`.

## tree command

| Scope | Invocation | Data source |
|-------|------------|-------------|
| Repo (default) | `tree` / `tree repo` | SetupCatalog only |
| Seed model | `tree --seed <name>` | File-project load from `.webgmex` |

Seed scope options: `--at <path>` (subtree root, `[default: /]`), `--nodes <paths>` (comma-separated; `[default: all nodes under --at]`). Ambiguous seed names exit 2 with candidates.

**Seed tree formats:** `tree` (`[default]` — DFS, npm-style branches, path tail), `tree-verbose` (+ meta/type), `flat`, `json`.

## seed command

| Subcommand | Invocation | Output |
|------------|------------|--------|
| Meta IR | `seed meta --seed <name>` | MetaAspectSet JSON (`getJsonMeta` per meta node); see [`docs/meta/`](meta/README.md) |

## Plugin execution

- **Info:** `plugin info <name>` — `metadata.json` configStructure + defaults
- **Run:** `plugin run <name> --seed <seed>` — headless `PluginCliManager` on memory file-project
- **Plugin context:** project (`--seed` or `--webgmex`) + active node (`--at`, `[default: / (root)]`) + selection (`--select`, `[default: (none)]`) + config (`metadata.json` + `--set` / `--config-file`). `webdot plugin run --help` lists defaults; JSON output echoes resolved `context`.
- **Branch / history:** v1 `.webgmex` packages are single-snapshot imports (`insertProjectJson` → one branch). Engine also has repository helpers (`getProjectWithHistory` / `insertProjectWithHistory`) for full commit/branch/tag packages (exchange format v2). **Phase 7:** detect v1 vs v2; on save, v1 overwrites a snapshot, v2 exports with history so plugin/`session save` commits accumulate like the GUI; re-expose `--branch` / `session open --branch` and history/branch CLI (`history log`, branch create/checkout, …).
- Blobs: ephemeral FS per session; `--artifacts-out` saves to disk (relative to the shell working directory, same as `--plugin-dir`); otherwise stderr warning
- **Write-back:** the seed `.webgmex` is imported into memory; a plugin that calls `self.save()` produces a new commit, and the resulting model is written back to the source file by default. `--out <file>` redirects; `--dry-run` runs without writing. Read-only runs (no `save`) never rewrite the source. (Phase 7: v2 write-back preserves the full repository graph.)
- **Source resolution:** catalog shorthand OR direct `--plugin-dir` / `--webgmex` (no `webgme-setup.json` required)

## Stateful session (Phase 3½)

Each one-shot `webdot` command still runs in its own process, but an **open session** keeps editable state on disk:

**Session location.** The session always lives in the **execution directory** — `.webdot/` is created under the directory you run `webdot` from (`process.cwd()`), never under `-C`. `-C` only points at the project to open. The session records that project root (`projectCwd`) in `session.json`, so later commands (`status`, `save`, `plugin run`, `tree`, …) resolve seeds/plugins against it **without repeating `-C`**. This lets a single working directory drive multiple projects: `cd` where you want the state, `session open --seed X -C ../projectA`, then run everything from there.

**Session scope.** When a session is open, **every** catalog command (`ls`, `plugin info`, `plugin run`, `tree`, `seed meta`) runs in that session's project scope and prints a `note: session open …` block on stderr showing the session **source** (the loaded `.webgmex`) and **project** root. An explicit `-C <dir>` always overrides the session scope for that one command; `session close` exits it. With a session open, `webdot tree` (no scope) defaults to the **session model** tree; use `webdot tree repo` for the catalog.

1. **`session open`** — copies the source `.webgmex` into `.webdot/workspace/` and writes `.webdot/session.json` (execution cwd, project root, source path, working copy, dirty flag).
2. **Commands** — `plugin run`, `tree --seed`, and `seed meta` use the working copy when no `--seed` / `--webgmex` is given, and resolve plugins/catalog against the session's recorded project root. Plugin edits update the working copy and set `dirty`; the original file is untouched until save.
3. **`session save`** — writes the working copy to the save target (original source by default, or `--out`).
4. **`session discard`** — resets the working copy from the source.
5. **`session close`** — removes `.webdot/` (blocks when dirty unless `--discard`).

Interactive REPL was removed; use normal one-shot `webdot` commands against an open session. Optional REPL is a Phase 5 extra if demand appears.

**F25 / Phase 7:** repository `.webgmex` packages with full commit/branch/tag history via engine `getProjectWithHistory` / `insertProjectWithHistory`. Save policy: v1 overwrite snapshot; v2 preserve/append commits. See [PROJECT.md](PROJECT.md) Phase 7.

## Generators

- **GenerateMetaTs** — plain plugin at `plugins/GenerateMetaTs/`. Emits domain **instance** interfaces with WebGME scopes kept separate (`attributes` / `pointers` / `sets` / `children`). Containment is a single unnamed `children` union array (not `states`/`actions` slots). Faithful to seed meta: e.g. StateMachine fixture does **not** list `Transition` under `Machine` children. Downstream: create helpers / autocomplete.

See [PROJECT.md](PROJECT.md) for implementation status.

## Installable plugins (Phase 5)

**Scenario:** `webdot` is used as a **global** CLI. Useful plugins are not copied into every domain studio; they are **installed once** for the user and run against whatever project/session is open.

| Piece | Behavior |
|-------|----------|
| Store | User-scoped registry (`$WEBDOT_HOME/plugins/` or `~/.webdot/plugins/`) — local path or GitHub cache |
| Install | `webdot plugin install <path\|owner/repo[@ref]> [--as <name>] [--subdir <path>] [--force]` |
| Dictionary | Each install registers under a **unique name**; that name is what `plugin run` / `info` use |
| Collisions | If the requested name is taken, require `--as <alias>` or `--force`. Never silent overwrite |
| Distinction | `plugin list` and `ls plugins` label **catalog** vs **installed** |
| Execution | Same headless path as F19: registry entry → `PluginSource` `{ name: pluginId, basePath, metadataPath }` |

Resolution order for a bare plugin name: `--plugin-dir` → project catalog → installed registry.

Optional **F30** interactive session REPL is out of scope for the core Phase 5 deliverable.

See [PROJECT.md](PROJECT.md) Phase 5 (F26–F29, optional F30).

## Project libraries (Phase 6 — next)

**Scenario:** Domain studios attach WebGME **libraries** into a host `.webgmex` (shared metamodel packages). Authors need both **introspection that respects namespaces** and optional **CLI management** of those attachments.

| Area | Behavior |
|------|----------|
| List / inspect | `library list`; `tree --seed` keeps real containment, **library roots first under ROOT** |
| Meta emit | Library types always `Lib.Concept`; **host stays bare** (no host namespace) |
| TS emit | Nested `namespace Lib` for library concepts; host interfaces top-level |
| Manage (CLI) | **Outside sessions** — always write target `.webgmex`; mimic GUI `addLibrary` |
| Textual libs | Later: metalang import and/or in-place `library` blocks → same attach semantics |
| Fixtures | Synthetic (coverage) + real/trimmed (dogfood) |

Phase 4 already records IR `libraries[]` and per-node `namespace` / `fullyQualifiedName` / `libraryElement`. Phase 6 finishes consumer-facing listing/emit and management. Decisions: [`meta/LIBRARIES.md`](meta/LIBRARIES.md).

**Sequencing:** Complete Phase 6 (at least F31–F34) **before** extracting MetaLang to a separate package (Phase 9 F44), so the external language surface already handles namespaces.

See [PROJECT.md](PROJECT.md) Phase 6 (F31–F35) and [`meta/LIBRARIES.md`](meta/LIBRARIES.md).
