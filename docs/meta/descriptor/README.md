# MetaDescriptor (compact JSON)

**Schema:** [`schema.json`](schema.json) — webdot v1.

**Producer (planned):** `irToDescriptor` in F16b.

## Design

- Concept **names** only (no `/G/z` paths).
- **`extends`** when base ≠ FCO.
- **Pointer-first** — all references including `src`/`dst` live in `concepts.*.pointers`. No `relationships` or connection layer; whether something renders as an edge is **domain semantics**, not descriptor structure.
- **`contains`** and **`sets`** use the same **member rule** shape as MetaLang:
  - flat map — per-type only: `{ "State": "*", "Port": "2..5" }`
  - with global: `{ "global": "0..100", "members": { "State": "*" } }` ↔ `contains[0..100] …` / `set ports[0..8] -> …`
- **Sets**, **mixins**, **constraints**, meta sheets: not in v1 — IR retains them.

[mcp `MetaDescriptor`](https://github.com/webgme/mcp) is a related, deliberately simplified format (e.g. it projects `src`/`dst` into `relationships`). webdot descriptor targets faithful alignment with MetaLang and core meta, not mcp interchange.

## Edit rules

JSON Patch on the descriptor document: [`RULES.md`](RULES.md).
