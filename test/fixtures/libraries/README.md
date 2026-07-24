# Library fixtures (Phase 6)

| File | Role |
|------|------|
| `HostWithSharedMeta.webgmex` | Synthetic host (StateMachine) with `SharedMeta` library attached (from StateModel) |
| `SharedMetaSource.webgmex` | Library package copy for `library add` / `update` tests |

**Known real pattern (covered by the synthetic shape):** a domain project is imported as a library into a thin/empty host so domain meta is effectively read-only.

**Future (B14):** richer multi-library / DSS-scale examples when available — not required to close Phase 6.

```bash
webdot library list --webgmex test/fixtures/libraries/HostWithSharedMeta.webgmex
webdot tree --webgmex test/fixtures/libraries/HostWithSharedMeta.webgmex --format tree-verbose
webdot seed meta --webgmex test/fixtures/libraries/HostWithSharedMeta.webgmex --format metalang
```

`--webgmex` works from any cwd (no `webgme-setup.json` / `-C`). `--seed <name>` still needs a project catalog.
