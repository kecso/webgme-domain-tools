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
- Blobs: ephemeral FS per session; `--artifacts-out` saves to disk (relative to `-C cwd`); otherwise stderr warning
- **Write-back:** the seed `.webgmex` is imported into memory; a plugin that calls `self.save()` produces a new commit, and the resulting model is written back to the source file by default. `--out <file>` redirects; `--dry-run` runs without writing. Read-only runs (no `save`) never rewrite the source.

## Generators (planned)

- `generate meta-ts` — TypeScript types from seed MetaAspectSet

See [PROJECT.md](PROJECT.md) for implementation status.
