# Session workspace

Keep an editable working copy under `.webdot/` in your **execution directory**. The original `.webgmex` is untouched until `session save`.

```bash
# Open (execution dir owns .webdot/; -C selects the studio)
cd ~/work
webdot session open --seed StateMachine -C /path/to/studio
# --branch [default: master / package default]

webdot session status
webdot tree                    # session model tree [default scope when session open]
webdot seed meta --format descriptor   # --format [default: json] if omitted

# Plugins use the session working copy [default: no --seed/--webgmex needed]
webdot plugin run SomePlugin --dry-run
webdot plugin run SomePlugin   # may mark session dirty

webdot session save            # [default: write back to original source]
# or: webdot session save --out ./other.webgmex
# or: webdot session discard
webdot session close
```

Dirty close:

```bash
webdot session close --discard
```

Open a specific branch of a repository package (`--branch` overrides `[default: master / package default]`):

```bash
webdot session open --webgmex ./model.webgmex --branch example
webdot session checkout master
```
