# webgme-domain-tools

**webdot** — headless CLI for WebGME projects.

Work from `.webgmex` project files and a `webgme-setup.json` catalog — **no WebGME server required**. The main use case today is running plugins against any model from anywhere: project plugins, a local plugin directory, or tools you install once into a user registry.

It also helps you inspect domains (repo layout, model trees, meta) and keep an editable session workspace when you want multi-step changes with explicit save/discard.

Complements [webgme-cli](https://github.com/webgme/webgme-cli) (scaffold + server); it does not replace it.

## Install

```bash
npm install -g webgme-domain-tools
# or without a global install:
npx webgme-domain-tools --help
```

Requires **Node.js 20+**.

## Quick start

```bash
# Inspect a studio (directory with webgme-setup.json)
webdot tree repo -C /path/to/my-studio
webdot ls plugins -C /path/to/my-studio

# Run a plugin against a seed .webgmex (catalog name)
webdot plugin run MyPlugin --seed MySeed -C /path/to/my-studio --dry-run

# Or point at any plugin folder and any .webgmex (no catalog required)
webdot plugin run --plugin-dir ./SomePlugin --webgmex ./model.webgmex --dry-run
```

## Installable plugins from this repo

The npm package ships the **CLI only**. Domain-agnostic plugins maintained here live under [`plugins/`](https://github.com/kecso/webgme-domain-tools/tree/main/plugins) on GitHub and are installed into your user registry (`~/.webdot` or `$WEBDOT_HOME`).

| Plugin | What it does | Install |
|--------|----------------|---------|
| **GenerateMetaTs** | Emits TypeScript domain instance types from seed meta (`--artifacts-out`) | see below |

```bash
# Install GenerateMetaTs from this repository
webdot plugin install kecso/webgme-domain-tools --subdir plugins/GenerateMetaTs

webdot plugin list
webdot plugin info GenerateMetaTs

# Run it against a studio seed (writes under --artifacts-out)
webdot plugin run GenerateMetaTs --seed StateMachine -C /path/to/studio --artifacts-out ./generated
```

Pin a release or branch when you want a fixed revision:

```bash
webdot plugin install kecso/webgme-domain-tools@v0.7.0 --subdir plugins/GenerateMetaTs
```

From a local clone of this repo you can also install by path:

```bash
webdot plugin install ./plugins/GenerateMetaTs
```

> Later we may add a shorthand to install all bundled toolbox plugins in one step. Until then, use `--subdir` (or a local path) per plugin.

## Commands

| Command | Description |
|---------|-------------|
| `plugin run` | Headless plugin execution (`--seed` / `--webgmex`, `--plugin-dir`, `--dry-run`, `--out`, `--artifacts-out`, …) |
| `plugin info` | Show `metadata.json` + config defaults |
| `plugin install` | Install a plugin into the user registry (local path or `owner/repo[@ref]`, `--subdir`, `--as`, `--force`) |
| `plugin list` / `plugin uninstall` | List or remove installed plugins |
| `tree` / `tree repo` | Repository component tree from `webgme-setup.json` |
| `tree --seed` | Model tree from a file-project seed |
| `seed meta` | MetaAspectSet views (`json`, `descriptor`, `metalang`, `tree`, …) |
| `ls` | Compact catalog listing |
| `session open\|status\|save\|discard\|close` | Stateful workspace (`.webdot/` working copy) |

Name resolution for `plugin run` / `info`: `--plugin-dir` → project catalog → installed registry.

## Session (optional)

For multi-step edits without touching the original `.webgmex` until you save:

```bash
webdot session open --seed MySeed -C /path/to/studio
webdot plugin run SomePlugin --dry-run   # uses the open session by default
webdot session save                      # or: session discard / session close
```

## Development

```bash
git clone https://github.com/kecso/webgme-domain-tools.git
cd webgme-domain-tools
npm install
npm run build
npm test
```

Project tracking and roadmap: [docs/PROJECT.md](docs/PROJECT.md).

## License

[MIT](LICENSE)
