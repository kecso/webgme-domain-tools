# webdot CLI reference

Flag-level detail matches `webdot <command> --help`. Prefer that for the live surface; this page is the durable overview.

Global option (all commands):

| Flag | Meaning |
|------|---------|
| `-C, --cwd <dir>` | WebGME project root (`webgme-setup.json`). Default: process cwd. An open **session** supplies project scope when `-C` is omitted. |
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
| `[scope]` | `repo` or `seed`. Default: session model when a session is open, else `repo`. |
| `--seed [name]` | Seed model tree (defaults to open session project) |
| `--kind <kinds>` | Repo: `seeds,plugins,visualizers,routers` (comma-separated) |
| `--format <fmt>` | Repo: `tree` \| `flat` \| `json`. Seed: `tree` \| `tree-verbose` \| `flat` \| `json` |
| `--at <path>` | Seed: subtree root (e.g. `/1`) |
| `--nodes <paths>` | Seed: only these comma-separated node paths |

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
| `--seed [name]` | Seed name (or open session) |
| `--format <fmt>` | `json` (IR) \| `tree` \| `tree-verbose` \| `descriptor` \| `metalang` (default `json`) |

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

`kind`: `seeds` \| `plugins` \| `visualizers` \| `routers` \| `all` (default).

---

## `plugin`

### `plugin list`

List installed plugins; when a catalog is available, also label catalog plugins.

### `plugin install <target>`

Install into the user registry (`~/.webdot` or `$WEBDOT_HOME`).

| Option | Description |
|--------|-------------|
| `--as <name>` | Dictionary name for `run` / `info` |
| `--subdir <path>` | Plugin folder inside a GitHub clone |
| `--force` | Replace same name |

`target`: local plugin directory, or `owner/repo[@ref]`.

### `plugin uninstall <name>`

Remove by install dictionary name.

### `plugin info <name>`

`metadata.json` + `configStructure` defaults.

### `plugin run [name]`

Headless plugin execution.

| Option | Description |
|--------|-------------|
| `--plugin-dir <path>` | Plugin directory (`{dir}/{dir}.js`), relative to shell cwd |
| `--seed [name]` / `--webgmex <path>` | Project (or open session) |
| `--branch <name>` | Branch to open (session branch or `master`) |
| `--at <path>` | Active node (default `/`) |
| `--select <paths>` | Selection (comma-separated) |
| `--config-file <path>` | JSON config overrides |
| `--set <pair...>` | `name=value` overrides (repeatable) |
| `--artifacts-out <dir>` | Write blob artifacts (relative to shell cwd) |
| `--out <file>` | Write model to this `.webgmex` instead of source |
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
| `session open` | `--seed` or `--webgmex`; optional `--branch`, `--force` |
| `session status` | Show open session (execution dir) |
| `session checkout <branch>` | Switch session branch |
| `session save` | Write working copy to save target (`--out` optional) |
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
| `history log` | Commits for a branch (`--seed` / `--webgmex`, `--branch`, `--limit`) |
| `history show <commit>` | One commit by hash (`#` optional) |

---

## `branch`

Branch names must match `[0-9a-zA-Z_]+`.

| Command | Description |
|---------|-------------|
| `branch list` | Names + head hashes |
| `branch create <name>` | New name only (errors if it already exists); `--from` branch or commit; upgrades v1 → v2 when needed |
| `branch update <name>` | Move an existing tip to `--from` (or current head); use this to overwrite a branch pointer |
| `branch delete <name>` | Drop branch pointer (not the current branch) |

---

## `tag`

Tag names must match `[0-9a-zA-Z_]+`.

| Command | Description |
|---------|-------------|
| `tag list` | Tag → commit |
| `tag create <name>` | Optional `--commit`; default current head |
| `tag delete <name>` | Remove tag |

---

## See also

- [Tutorials](tutorials/README.md) — copy-paste scenarios
- [DESIGN.md](DESIGN.md) — architecture notes
- [PROJECT.md](PROJECT.md) — roadmap
