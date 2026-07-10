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

## Cardinality in IR (pointers, sets, children)

`meta` is the raw `getJsonMeta(node)` blob ([`metacore.js`](https://github.com/webgme/webgme-engine/blob/6227890/src/common/core/metacore.js)). Every relational rule has **global** and **per-type** limits:

| `meta` key | Global | Per-type |
|------------|--------|----------|
| `children` | `min`, `max` (omitted when unset) | `items[]` + `minItems[]` + `maxItems[]` |
| `pointers.{name}` | `min`, `max` | `items[]` + `minItems[]` + `maxItems[]` |

**`-1`** in IR = no bound. Sets in IR live under `pointers` with **`max !== 1`**; core classifies `max === 1` as pointer ([`metarules.js`](https://github.com/webgme/webgme-engine/blob/6227890/src/common/core/users/metarules.js)).

### Pointers (structural global `1..1`)

StaMS `Transition.src`:

```json
"src": {
  "min": 1,
  "max": 1,
  "items": ["/G/z"],
  "minItems": [-1],
  "maxItems": [1]
}
```

Matches core `getPointerMeta` documentation: global **`1..1`**, per-target **`min: -1`, `max: 1`**. Not emitted in descriptor/MetaLang; restore on IR write via `setPointerMetaLimits(…, 1, 1)` + `setPointerMetaTarget(…, -1, 1)`.

### Containment

StaMS `Machine` (no global cap — `min`/`max` keys absent):

```json
"children": {
  "items": ["/G/g", "/G/z", "/G/v", "/G/p", "/G/W"],
  "minItems": [-1, -1, -1, -1, -1],
  "maxItems": [-1, -1, -1, -1, -1]
}
```

When `set_children_meta_limits` is used, `children.min` / `children.max` appear in IR and map to descriptor `contains.global`.

Path keys index valid meta nodes; translators resolve paths → concept **names**.

See [`../CARDINALITY.md`](../CARDINALITY.md) for descriptor/MetaLang mapping.

## Translation

| To | Function (planned) | Notes |
|----|-------------------|-------|
| Descriptor | `irToDescriptor(ir)` | `contains.global` + members; sets from IR pointers with `max≠1`; all pointers including `src`/`dst` |
| MetaLang | `ir → descriptor → metalang` | `contains[…]` / `set name[…] -> …`; all pointers by name |
| IR (round-trip) | `descriptor → ir` (future) | `contains.global` → `set_children_meta_limits`; set global → `set_pointer_meta_limits`; pointers → global `1..1` |
