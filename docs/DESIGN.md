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
| Meta IR | `seed meta --seed <name>` | MetaAspectSet JSON (`getJsonMeta` per meta node); concise MetaDescriptor format planned (F16) |

## Plugin execution (planned)

- Context: `--seed`, `--at`, `--select`, `--branch`
- Config: `metadata.json` `configStructure` + `--set` / `--config-file`
- Blobs: ephemeral FS per session; `--artifacts-out` saves to disk; otherwise explicit non-persistence warning

## Generators (planned)

- `generate meta-ts` — TypeScript types from seed MetaAspectSet

See [PROJECT.md](PROJECT.md) for implementation status.
