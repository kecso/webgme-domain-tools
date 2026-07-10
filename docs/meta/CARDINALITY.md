# Cardinality

How many instances of a contained child, set member, or pointer target are allowed. WebGME core stores **min** and **max** per child/pointer/set slot in `getJsonMeta` (`minItems` / `maxItems` arrays, or `min` / `max` on pointer defs). `max = -1` means unbounded.

MetaLang and descriptor JSON use a **string** form that round-trips through `irToDescriptor` / `descriptorToCore`.

## Forms

| Form | Meaning | Core (typical) |
|------|---------|----------------|
| `*` | Zero or more | min=0, max=-1 |
| `+` | One or more | min=1, max=-1 |
| `?` | Zero or one | min=0, max=1 |
| `n` | Exactly *n* | min=max=n |
| `min..max` | Inclusive range | min, max |
| `n,m,k` | Exactly **one of** these counts (discrete set) | see below |

**Examples:** `*`, `+`, `?`, `1`, `0..1`, `2..5`, `1,2,4`

Shorthand `*`, `+`, `?` may appear as a **suffix** on containment (`State*`) or after pointers (`guard -> Guard?`).

Colon or bracket form is used when the shorthand is not enough:

```metalang
contains State:2..5, Port:1,2,4;
entry -> Action[1];
```

Descriptor JSON uses the same strings as values in `contains`, `sets`, and (future) pointer cardinality metadata.

## Discrete lists (`1,2,4`)

WebGME core meta is **min/max only** — it cannot express “exactly 1 or 2 or 4 instances” in one slot without constraints. The **language** allows discrete lists so:

- Authors can write intent in MetaLang / descriptor.
- Tools may map to core using the spanning range (`1..4`) plus optional **constraints** (IR layer), or reject until constraints are supported.

Document the mapping in F16b when we hit a seed that needs it.

## mcp alignment

[webgme/mcp `meta-descriptor.schema.json`](https://github.com/webgme/mcp/blob/main/docs/schemas/meta-descriptor.schema.json) documents an **enum subset** (`*`, `+`, `?`, `1`, `0..1`) for GMEBot prompts. **webdot** uses the full string grammar above; values in the subset remain valid mcp documents.

## Schema

See [`descriptor/schema.json`](descriptor/schema.json) — `$defs/cardinality` is a string matching the grammar, not a fixed enum.

## MetaLang grammar

See [`metalang/grammar.ebnf`](metalang/grammar.ebnf) — `cardinality_token`, suffix and bracket forms on pointers and containment.
