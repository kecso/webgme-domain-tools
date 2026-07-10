# Cardinality

How many instances of a contained child, set member, or pointer target are allowed. WebGME core stores **min** and **max** per slot in `getJsonMeta` (`minItems` / `maxItems`, or pointer `min` / `max`). **`max = -1`** means unbounded (no upper limit).

MetaLang and descriptor JSON use a **string** that maps to those integers. **Any inclusive range of non-negative integers** is valid.

## Primary form: `min..max`

Any pair of non-negative integers with `min ≤ max`:

| String | Core |
|--------|------|
| `0..1` | min=0, max=1 |
| `2..5` | min=2, max=5 |
| `10..100` | min=10, max=100 |
| `0..0` | min=0, max=0 (none allowed) |
| `3..3` | min=3, max=3 (same as exact `3`) |

MetaLang:

```metalang
contains Port:2..5;
guard -> Guard[0..1];
set terminals -> Pin[1..8];
```

Descriptor JSON:

```json
"contains": { "Port": "2..5", "Label": "0..1" }
```

**F16b rule:** parse `min..max` with `parseInt`; pass `min` and `max` to `setChildMeta` / pointer meta as-is. Reject only when `min > max` or values are not finite non-negative integers.

## Exact count: `n`

A lone non-negative integer is shorthand for `n..n`:

| String | Core |
|--------|------|
| `1` | min=1, max=1 |
| `0` | min=0, max=0 |

## Unbounded shorthand

When the upper bound is unlimited, use suffix or bracket forms (maps to `max = -1`):

| String | Core |
|--------|------|
| `*` | min=0, max=-1 |
| `+` | min=1, max=-1 |
| `?` | min=0, max=1 (same as `0..1`) |

```metalang
contains State*, Item:2..*;   ; 2..* optional sugar for min=2, max=-1 (F16d)
guard -> Guard?;
```

`2..*` is optional sugar for `min=2, max=-1` — implement when rendering open lower-bounded ranges from IR.

## Surface syntax (MetaLang)

| Location | Examples |
|----------|----------|
| Containment suffix | `State*`, `Port+` |
| Containment colon | `Port:2..5`, `Slot:1`, `Label:0..1` |
| Pointer suffix | `guard -> Guard?` |
| Pointer bracket | `entry -> Action[1]`, `items -> Node[2..5]` |

## Descriptor schema

[`descriptor/schema.json`](descriptor/schema.json) — `$defs/cardinality` accepts:

- `*`, `+`, `?`
- `n` (exact)
- `min..max` (any non-negative integers)

No fixed enum; no upper limit on numeric magnitude in the string.

## Optional: discrete lists (`1,2,4`)

Not required for core round-trip. Authors may use comma-separated counts for documentation; **F16b** may map to spanning range `min..max` over the listed values or defer to constraints. Prefer **`min..max`** when the intent is a contiguous allowed band.

## mcp alignment

mcp documents a small enum subset (`*`, `+`, `?`, `1`, `0..1`) for prompts. **webdot** accepts the full range grammar; subset values remain valid mcp documents.

## Parser (F16b reference)

```text
cardinality :=
    "*" | "+" | "?"
  | NONNEG_INT                    → min=max=N
  | NONNEG_INT ".." NONNEG_INT    → min, max (require min ≤ max)
```

`NONNEG_INT` = one or more ASCII digits, value ≥ 0.

IR → string: use mcp `cardinalityFromParsed` logic (`min`/`max` → `*`, `+`, `n`, or `min..max`).
