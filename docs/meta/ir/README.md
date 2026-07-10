# Meta IR (lossless)

**Producer:** `buildSeedMetaIr` in `src/introspection/seed-meta.ts`  
**Schema:** [`schema.json`](schema.json)

Each entry in `metaAspectSet` is one meta node:

- `path` — storage path inside the imported file-project
- `name` — concept name (`FCO`, `META`, domain concepts)
- `meta` — full `core.getJsonMeta(node)` object

## Properties

- **Lossless** relative to WebGME core meta on MetaAspectSet (for the imported seed).
- **Verbose** — includes path-indexed children/pointers (`/G/z`), FCO/META system nodes, empty aspect maps, etc.
- **LLM-friendly as JSON** — safe to parse; not ideal as primary human context due to size and path noise.

## Translation

| To | Function (planned) | Notes |
|----|-------------------|-------|
| Descriptor | `irToDescriptor(ir)` | Resolves paths → concept names; drops FCO/META; `extends` when `getBase` ≠ FCO; maps `src`/`dst` to `relationships` |
| MetaLang | `ir → descriptor → metalang` | Emit `extends Base` for non-FCO bases only |
