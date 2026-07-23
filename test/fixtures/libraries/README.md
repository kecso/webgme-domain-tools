# Library fixtures (Phase 6)

| File | Role |
|------|------|
| `HostWithSharedMeta.webgmex` | Synthetic host (StateMachine) with `SharedMeta` library attached (from StateModel) |
| `SharedMetaSource.webgmex` | Library package copy for `library add` / `update` tests |

**Real / DSS-scale fixture:** still wanted for dogfood (F31) — drop a trimmed Modelica-or-similar `.webgmex` here when available.

```bash
webdot library list --webgmex test/fixtures/libraries/HostWithSharedMeta.webgmex
webdot seed meta --webgmex test/fixtures/libraries/HostWithSharedMeta.webgmex --format metalang
```
