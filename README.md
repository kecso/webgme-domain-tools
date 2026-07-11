# webgme-domain-tools

**webdot** — minimal CLI for WebGME domain studios. Complements [webgme-cli](https://github.com/webgme/webgme-cli) with headless tooling that works from `webgme-setup.json` and file-project seeds — no server required.

## Status

**Early development.** See [docs/PROJECT.md](docs/PROJECT.md) for feature progress, review checkpoints, and backlog.

## Install

```bash
npm install -g @kecso/webgme-domain-tools
# or one-off:
npx @kecso/webgme-domain-tools tree repo
# from a checkout:
npm install --ignore-scripts && npm run build
npm link
```

> `webgme-engine` is installed from GitHub (MemoryGMEAuth). Use `--ignore-scripts` if the engine postinstall fails on your platform.

## Quick start

Run from a WebGME project root (directory containing `webgme-setup.json`):

```bash
webdot tree repo
webdot tree repo --kind seeds,plugins
webdot ls plugins
```

## Commands

| Command | Description |
|---------|-------------|
| `tree [repo]` | Repository component tree from `webgme-setup.json` (default) |
| `tree --seed <name>` | Model tree from a file-project seed |
| `tree --seed <name> --at <path>` | Subtree from a node path |
| `tree --seed <name> --select <paths>` | Comma-separated node paths |
| `seed meta --seed <name>` | MetaAspectSet IR (`--format json`, descriptor, metalang, tree) |
| `plugin info <name>` | Plugin `metadata.json` + config defaults |
| `plugin run <name> --seed <seed>` | Headless plugin execution; `--dry-run`, `--out`, `--plugin-dir`, `--webgmex` |
| `ls [kind]` | Compact component listing |

More commands (`session`, `generate meta-ts`, …) are tracked in [docs/PROJECT.md](docs/PROJECT.md).

## Development

```bash
npm install
npm run build
npm test
node dist/cli.js tree repo --cwd ../StaMS
```

## Related

- [StaMS](https://github.com/kecso/StaMS) — first consumer studio
- [webgme-cli](https://github.com/webgme/webgme-cli) — project scaffolding and server workflows
