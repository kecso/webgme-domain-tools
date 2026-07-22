# Session workspace

Keep an editable working copy under `.webdot/` in your **execution directory**. The original `.webgmex` is untouched until `session save`.

```bash
# Open (execution dir owns .webdot/; -C selects the studio)
cd ~/work
webdot session open --seed StateMachine -C /path/to/studio

webdot session status
webdot tree                    # session model tree by default
webdot seed meta --format descriptor

# Plugins default to the session working copy
webdot plugin run SomePlugin --dry-run
webdot plugin run SomePlugin   # may mark session dirty

webdot session save            # write back to the original source
# or: webdot session save --out ./other.webgmex
# or: webdot session discard
webdot session close
```

Dirty close:

```bash
webdot session close --discard
```

Open a specific branch of a repository package:

```bash
webdot session open --webgmex ./model.webgmex --branch example
webdot session checkout master
```
