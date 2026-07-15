# Design overview

Headless CLI for WebGME domain studios. Complements webgme-cli (scaffold + server); does not replace it.

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

Seed scope options: `--at <path>` (subtree root), `--select <paths>` (comma-separated). Ambiguous seed names exit 2 with candidates.

**Seed tree formats:** `tree` (default — DFS, npm-style branches, path tail), `tree-verbose` (+ meta/type), `flat`, `json`.

## seed command

| Subcommand | Invocation | Output |
|------------|------------|--------|
| Meta IR | `seed meta --seed <name>` | MetaAspectSet JSON (`getJsonMeta` per meta node); see [`docs/meta/`](meta/README.md) |

## Plugin execution

- **Info:** `plugin info <name>` — `metadata.json` configStructure + defaults
- **Run:** `plugin run <name> --seed <seed>` — headless `PluginCliManager` on memory file-project
- **Plugin context:** project (`--seed` or `--webgmex`) + active node (`--at`, default `/`) + selection (`--select`, default none) + config (`metadata.json` + `--set` / `--config-file`). `webdot plugin run --help` lists defaults; JSON output echoes resolved `context`.
- **Branch:** not exposed for the current import path. v1 `.webgmex` packages are single-snapshot imports: `importSeedProject` inserts one commit and creates one branch (`master`). Current `webgme-engine` also has repository-package helpers (`getProjectWithHistory` / `insertProjectWithHistory`) for full project collections (commits, branch pointers, tags); future support should detect/import that format and then reintroduce branch/tag-aware context options.
- Blobs: ephemeral FS per session; `--artifacts-out` saves to disk (relative to the shell working directory, same as `--plugin-dir`); otherwise stderr warning
- **Write-back:** the seed `.webgmex` is imported into memory; a plugin that calls `self.save()` produces a new commit, and the resulting model is written back to the source file by default. `--out <file>` redirects; `--dry-run` runs without writing. Read-only runs (no `save`) never rewrite the source.
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
6. **`session repl`** — interactive shell for open / plugin run / save / close (same workspace file model).

**F25 (deferred):** repository `.webgmex` packages with full commit/branch/tag history via engine `getProjectWithHistory` / `insertProjectWithHistory`.

## Generators

- **GenerateMetaTs** — plain WebGME plugin at `plugins/GenerateMetaTs/`. From the repo root: `webdot plugin run --plugin-dir plugins/GenerateMetaTs --seed <name> -C <project> --artifacts-out <dir>` (`--plugin-dir` / `--artifacts-out` relative to shell cwd; `-C` selects the project/seed). Emits a **concept-centric** `Meta` table (`Meta.State.attributes`, …) plus thin `AttrsOf` / `PointersOf` helpers — not aggregate `*ByConcept` maps. Config: `--set namespace=…`, `fileName=…`, `seedName=…`. Install/toolbox is Phase 5; autocomplete packages / create helpers are downstream.

See [PROJECT.md](PROJECT.md) for implementation status.

## Installable plugins (Phase 5 — planned)

**Scenario:** `webdot` is used as a **global** CLI. Useful plugins are not copied into every domain studio; they are **installed once** for the user and run against whatever project/session is open.

| Piece | Behavior |
|-------|----------|
| Store | User-scoped registry (e.g. `~/.webdot/plugins/`) — local path or GitHub cache |
| Install | `webdot plugin install <path\|owner/repo> [--as <name>]` |
| Dictionary | Each install registers under a **unique name**; that name is what `plugin run` / `info` use |
| Collisions | If the requested name is taken, require `--as <alias>` (or prompt). Never silent overwrite |
| Distinction | `plugin list` and resolution notes label **catalog** vs **installed** so two similarly named tools stay distinguishable |
| Execution | Same headless path as F19: registry entry → `PluginSource` `{ name, basePath, metadataPath }` |

Resolution order for a bare plugin name (planned): `--plugin-dir` → project catalog → installed registry.

See [PROJECT.md](PROJECT.md) Phase 5 (F26–F29).
