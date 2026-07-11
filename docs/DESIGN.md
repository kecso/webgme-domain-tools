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
- **Source resolution:** catalog shorthand (`<name>` / `--seed`) OR direct paths (`--plugin-dir <dir>`, `--webgmex <file>`). Direct paths need no `webgme-setup.json`, so any plugin can run on any model.
- Context: `--seed` / `--webgmex`, `--at`, `--select`, `--branch`
- Config: `metadata.json` `configStructure` + `--set` / `--config-file`; read-only params rejected
- **Run output:** JSON includes a `context` block — `project` (name + `.webgmex` path), `activeNode` (default `/` = root), `activeSelection` (default `[]`), `branch` (default `master`), and resolved `config`
- Blobs: ephemeral FS per session; `--artifacts-out` saves to disk (relative to `-C cwd`); otherwise stderr warning
- **Write-back:** the seed `.webgmex` is imported into memory; a plugin that calls `self.save()` produces a new commit, and the resulting model is written back to the source file by default. `--out <file>` redirects; `--dry-run` runs without writing. Read-only runs (no `save`) never rewrite the source.

## Stateful session (proposed — Phase 3½)

Today each `webdot` command is a **one-shot** process: open memory project → run → close. A **stateful** workflow (open project, run several plugins, then save) is feasible in two ways:

1. **Workspace file** — `.webdot/session.json` points at a working `.webgmex`; commands re-import it; `session save` writes to the user's target. Works across separate shell invocations.
2. **Session shell** — `webdot session` keeps one Node process and in-memory `ProjectSession` until `close`/`save`. Best for tight edit-run loops.

See [PROJECT.md](PROJECT.md) F20–F24 for the roadmap sketch. **Planned before Phase 4** (generators).

## Generators (planned)

- `generate meta-ts` — TypeScript types from seed MetaAspectSet

See [PROJECT.md](PROJECT.md) for implementation status.
