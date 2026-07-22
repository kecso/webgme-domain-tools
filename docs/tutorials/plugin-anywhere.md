# Run a plugin from anywhere

You do **not** need `webgme-setup.json` when you point at a plugin folder and a `.webgmex` file.

```bash
# Dry-run (no model write-back)
webdot plugin run \
  --plugin-dir ./path/to/MyPlugin \
  --webgmex ./path/to/model.webgmex \
  --dry-run

# Persist edits to a new file
webdot plugin run \
  --plugin-dir ./path/to/MyPlugin \
  --webgmex ./path/to/model.webgmex \
  --out ./out.webgmex

# Active node + config
webdot plugin run \
  --plugin-dir ./path/to/MyPlugin \
  --webgmex ./path/to/model.webgmex \
  --at /1 \
  --set someFlag=true \
  --dry-run
```

`--plugin-dir` is relative to your **shell** cwd (not `-C`).  
See `webdot plugin run --help` for context defaults (active node, selection, branch).

**With a studio catalog**, you can use names instead:

```bash
webdot plugin run MyPlugin --seed MySeed -C /path/to/studio --dry-run
```
