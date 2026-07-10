# MetaDescriptor (compact JSON)

**Canonical schema:** aligned with [webgme/mcp `meta-descriptor.schema.json`](https://github.com/webgme/mcp/blob/main/docs/schemas/meta-descriptor.schema.json) (v1).  
**Local copy:** [`schema.json`](schema.json) — keep in sync when mcp schema changes.

**Producer (planned):** `irToDescriptor` — same semantics as mcp `buildMetaDescriptorFromCore`.

## Design choices

- Concept **names** only (no `/G/z` paths).
- **`extends`** when base ≠ FCO (omitted for FCO — default in MetaLang).
- **Connection** types: empty concept body + `relationships.{Name}.from|to` (maps to WebGME `src`/`dst`).
- **Containment** cardinality on the container's `contains` map (`*`, `+`, `?`, `1`, `0..1`).
- **Pointers** for non-connection refs (`event -> Event`).
- **Sets**, **mixins**, **constraints**, meta sheets: not in v1 — add via IR or future rules.

## Edit rules

Structural edits use **JSON Patch** on the descriptor document. See [`RULES.md`](RULES.md) and mcp [`json-patch-meta.schema.json`](https://github.com/webgme/mcp/blob/main/docs/schemas/json-patch-meta.schema.json).
