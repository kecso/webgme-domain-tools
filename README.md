# webgme-domain-tools

Minimal-footprint CLI for WebGME domain studios. Complements [webgme-cli](https://github.com/webgme/webgme-cli) with headless tooling that works from `webgme-setup.json` and in-memory seeds — no server required.

## Status

**Early development.** See [docs/PROJECT.md](docs/PROJECT.md) for feature progress, review checkpoints, and backlog.

## Install

```bash
npm install @kecso/webgme-domain-tools
# or from a checkout:
npm install && npm run build
npm link
```

## Quick start

Run from a WebGME project root (directory containing `webgme-setup.json`):

```bash
domain-tools tree repo
domain-tools tree repo --kind seeds,plugins
domain-tools ls plugins
```

## Commands (v0.1)

| Command | Description |
|---------|-------------|
| `tree [repo]` | Repository component tree from `webgme-setup.json` (default) |
| `tree --seed <name>` | Model tree from an in-memory seed *(planned)* |
| `ls [kind]` | Compact component listing |

More commands (`plugin run`, `generate meta-ts`, …) are tracked in [docs/PROJECT.md](docs/PROJECT.md).

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
