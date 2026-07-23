# webgme-domain-tools

**webdot** — command-line tools for WebGME projects (no browser UI, no WebGME server).

Work from `.webgmex` project files and a `webgme-setup.json` catalog. The main use case is **running plugins against any model from anywhere**: studio plugins, a local plugin directory, or tools installed once into a user registry.

Also: inspect domains (repo layout, model trees, meta), stateful sessions (save/discard), and repository history on v2 `.webgmex` packages.

Complements [webgme-cli](https://github.com/webgme/webgme-cli) (scaffold + server); it does not replace it.

## Install

```bash
npm install -g webgme-domain-tools
# or:
npx webgme-domain-tools --help
```

Requires **Node.js 20+**.

## Quick start

```bash
webdot tree repo -C /path/to/my-studio
webdot ls plugins -C /path/to/my-studio

webdot plugin run MyPlugin --seed MySeed -C /path/to/my-studio --dry-run

# No catalog required:
webdot plugin run --plugin-dir ./SomePlugin --webgmex ./model.webgmex --dry-run
```

```bash
webdot --help
webdot plugin run --help
```

## Documentation

| Doc | Contents |
|-----|----------|
| [Tutorials](docs/tutorials/README.md) | Copy-paste scenarios (plugins, install, session, history) |
| [CLI reference](docs/CLI.md) | Commands and flags (mirrors `--help`) |
| [PROJECT.md](docs/PROJECT.md) | Roadmap / feature tracker |
| [PUBLISH.md](docs/PUBLISH.md) | npm publish |

After a global install, the same markdown ships in the package (`…/node_modules/webgme-domain-tools/docs/`).

## Installable plugins from this repo

The npm package ships the **CLI only**. Install toolbox plugins from GitHub:

```bash
webdot plugin install kecso/webgme-domain-tools --subdir plugins/GenerateMetaTs
webdot plugin run GenerateMetaTs --seed StateMachine -C /path/to/studio --artifacts-out ./generated
```

Full walkthrough: [docs/tutorials/install-generate-meta-ts.md](docs/tutorials/install-generate-meta-ts.md).

## Development

```bash
git clone https://github.com/kecso/webgme-domain-tools.git
cd webgme-domain-tools
npm install
npm run build
npm test
```

## License

[MIT](LICENSE)
