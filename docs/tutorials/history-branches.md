# History and branches (v2 `.webgmex`)

**v1** snapshot packages overwrite on save. **v2** repository packages (`formatVersion: 2`) keep commits, branches, and tags — like GUI history.

A sample v2 file for tests: `test/fixtures/repository/StateMachine.webgmex` (branches `master` / `example`).

```bash
# Inspect history (commit hashes + messages)
# --limit [default: 50]; --branch [default: session branch or master]
webdot history log --webgmex ./repo.webgmex --branch example --limit 20
webdot history show '#abc123…' --webgmex ./repo.webgmex

webdot branch list --webgmex ./repo.webgmex
webdot tag list --webgmex ./repo.webgmex

# Work on a branch via session
webdot session open --webgmex ./repo.webgmex --branch example
webdot history log --limit 5
webdot session checkout master
webdot session close --discard
```

Create or move a branch (names: `[0-9a-zA-Z_]+` only — no hyphens). **`create` does not overwrite** an existing name — use **`update`** to move a tip. `--from` `[default: current head]`:

```bash
# Copy first if you do not want to mutate a shared fixture
cp ./repo.webgmex ./work.webgmex

webdot branch create scratch --from example --webgmex ./work.webgmex
webdot branch list --webgmex ./work.webgmex

# Move an existing branch tip (create would error if scratch already exists)
webdot branch update scratch --from master --webgmex ./work.webgmex

# Creating a second branch on a v1 file upgrades it to repository format
webdot branch create feature --webgmex ./snapshot.webgmex
```

Plugin / session saves on a v2 file re-export with history so new commits accumulate.
