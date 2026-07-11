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
- Blobs: ephemeral FS per session; `--artifacts-out` saves to disk (relative to `-C cwd`); otherwise stderr warning
- **Write-back:** the seed `.webgmex` is imported into memory; a plugin that calls `self.save()` produces a new commit, and the resulting model is written back to the source file by default. `--out <file>` redirects; `--dry-run` runs without writing. Read-only runs (no `save`) never rewrite the source.
- **Source resolution:** catalog shorthand OR direct `--plugin-dir` / `--webgmex` (no `webgme-setup.json` required)

## Stateful session (proposed — Phase 3½)

Today each `webdot` command is a **one-shot** process: open memory project → run → close. A **stateful** workflow (open project, run several plugins, then save) is feasible in two ways:

1. **Workspace file** — `.webdot/session.json` points at a working `.webgmex`; commands re-import it; `session save` writes to the user's target. Works across separate shell invocations.
2. **Session shell** — `webdot session` keeps one Node process and in-memory `ProjectSession` until `close`/`save`. Best for tight edit-run loops.

See [PROJECT.md](PROJECT.md) F20–F24 for the roadmap sketch. **Planned before Phase 4** (generators).

## Generators (planned)

- `generate meta-ts` — TypeScript types from seed MetaAspectSet

See [PROJECT.md](PROJECT.md) for implementation status.
