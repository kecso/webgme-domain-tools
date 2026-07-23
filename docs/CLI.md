# webdot CLI reference

Flag-level detail matches `webdot <command> --help`. Prefer that for the live surface; this page is the durable overview.

Optional flags and arguments that have a fallback are marked with **`[default: …]`** (same wording as `--help`).

Global option (all commands):

| Flag | Meaning |
|------|---------|
| `-C, --cwd <dir>` | WebGME project root (`webgme-setup.json`) `[default: cwd]`. An open **session** supplies project scope when `-C` is omitted. |
| `-V, --version` | Package version |
| `-h, --help` | Help for this command |

**Session note:** `.webdot/` lives in the **execution directory** (where you run `webdot`), not under `-C`. `-C` only selects which studio/catalog to use.

---

## `tree`

Repository catalog tree or seed model tree.

```text
webdot tree [options] [scope]
```

| Argument / option | Description |
|-------------------|-------------|
| `[scope]` | `repo` or `seed` `[default: session model when a session is open, else repo]` |
| `--seed [name]` | Seed model tree `[default: open session project]` |
| `--kind <kinds>` | Repo: `seeds,plugins,visualizers,routers` (comma-separated) `[default: all kinds]` |
| `--format <fmt>` | Repo: `tree` \| `flat` \| `json`. Seed: `tree` \| `tree-verbose` \| `flat` \| `json` `[default: tree]` |
| `--at <path>` | Seed: subtree root (e.g. `/1`) `[default: /]` |
| `--nodes <paths>` | Seed: only these comma-separated node paths `[default: all nodes under --at]` |

```bash
webdot tree repo -C /path/to/studio
webdot tree --seed StateMachine -C /path/to/studio
webdot tree --seed StateMachine --format tree-verbose --at /1
```

---

## `seed meta`

MetaAspectSet views from a file-project seed.

```text
webdot seed meta [options]
```

| Option | Description |
|--------|-------------|
| `--seed [name]` | Seed name `[default: open session project]` |
| `--format <fmt>` | `json` (IR) \| `tree` \| `tree-verbose` \| `descriptor` \| `metalang` `[default: json]` |

Specs: [docs/meta/](meta/README.md).

```bash
webdot seed meta --seed StateMachine -C /path/to/studio --format metalang
```

---

## `ls`

Compact catalog listing.

```text
webdot ls [kind]
```

`kind`: `seeds` \| `plugins` \| `visualizers` \| `routers` \| `all` `[default: all]`.

---

## `plugin`

### `plugin list`

List installed plugins; when a catalog is available, also label catalog plugins.

### `plugin install <target>`

Install into the user registry (`~/.webdot` or `$WEBDOT_HOME`).

| Option | Description |
|--------|-------------|
| `--as <name>` | Dictionary name for `run` / `info` `[default: plugin folder basename]` |
| `--subdir <path>` | Plugin folder inside a GitHub clone |
| `--force` | Replace same name |

`target`: local plugin directory, or `owner/repo[@ref]` (GitHub ref `[default: HEAD]`).

### `plugin uninstall <name>`

Remove by install dictionary name.

### `plugin info <name>`

`metadata.json` + `configStructure` defaults.

### `plugin run [name]`

Headless plugin execution.

| Option | Description |
|--------|-------------|
| `--plugin-dir <path>` | Plugin directory (`{dir}/{dir}.js`), relative to shell cwd |
| `--seed [name]` / `--webgmex <path>` | Project `[default: open session]` |
| `--branch <name>` | Branch to open `[default: session branch or master]` |
| `--at <path>` | Active node `[default: / (root)]` |
| `--select <paths>` | Selection (comma-separated) `[default: (none)]` |
| `--config-file <path>` | JSON config overrides |
| `--set <pair...>` | `name=value` overrides (repeatable; merges over metadata defaults) |
| `--artifacts-out <dir>` | Write blob artifacts (relative to shell cwd) |
| `--out <file>` | Write model to this `.webgmex` `[default: overwrite source / session working copy]` |
| `--dry-run` | Do not write model back |

**Name resolution:** `--plugin-dir` → project catalog → installed registry.

**Write-back:** v1 snapshot packages overwrite; v2 repository packages preserve history on save. See [tutorials/history-branches.md](tutorials/history-branches.md).

```bash
webdot plugin run --help   # includes plugin-context notes
```

---

## `session`

Stateful workspace: `.webdot/session.json` + working `.webgmex` copy.

| Command | Description |
|---------|-------------|
| `session open` | `--seed` or `--webgmex`; optional `--branch` `[default: master / package default]`, `--force` |
| `session status` | Show open session (execution dir) |
| `session checkout <branch>` | Switch session branch |
| `session save` | Write working copy `[default: session save target]`; `--out` redirects |
| `session discard` | Reset working copy from source |
| `session close` | Remove workspace (`--discard` if dirty) |

```bash
webdot session open --seed StateMachine -C /path/to/studio
webdot plugin run SomePlugin
webdot session save
```

---

## `history`

| Command | Description |
|---------|-------------|
| `history log` | Commits for a branch (`--seed` / `--webgmex` `[default: open session]`, `--branch` `[default: session branch or master]`, `--limit` `[default: 50]`) |
| `history show <commit>` | One commit by hash (`#` optional); `--branch` `[default: session branch or master]` |

---

## `branch`

Branch names must match `[0-9a-zA-Z_]+`.

| Command | Description |
|---------|-------------|
| `branch list` | Names + head hashes |
| `branch create <name>` | New name only (errors if it already exists); `--from` `[default: current head]`; upgrades v1 → v2 when needed |
| `branch update <name>` | Move an existing tip to `--from` `[default: current head]`; use this to overwrite a branch pointer |
| `branch delete <name>` | Drop branch pointer (not the current branch) |

Project source for these commands: `--seed` / `--webgmex` `[default: open session]`.

---

## `tag`

Tag names must match `[0-9a-zA-Z_]+`.

| Command | Description |
|---------|-------------|
| `tag list` | Tag → commit |
| `tag create <name>` | `--commit` `[default: current branch head]` |
| `tag delete <name>` | Remove tag |

Project source: `--seed` / `--webgmex` `[default: open session]`.

---

## See also

- [Tutorials](tutorials/README.md) — copy-paste scenarios
- [DESIGN.md](DESIGN.md) — architecture notes
- [PROJECT.md](PROJECT.md) — roadmap
