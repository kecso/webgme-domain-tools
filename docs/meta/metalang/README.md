# MetaLang

Human-readable metamodel surface syntax. **Target semantics:** MetaDescriptor v1 (same as compact JSON). Not a second canonical model.

## Specification

| Artifact | Purpose |
|----------|---------|
| [`grammar.ebnf`](grammar.ebnf) | Concrete syntax (EBNF). Langium/TextMate can derive from this later. |
| [`RULES.md`](RULES.md) | Statement-level edit rules ↔ descriptor patches |

## Design principles

1. **Concise** — omit FCO/META system nodes; `name` attribute is implicit on all concepts.
2. **Inheritance explicit** — when a concept’s base is **not FCO**, MetaLang **must** show `extends Base` (see below).
3. **Readable** — `connect A -> B` for relationships; `contains Child*` for containment.
4. **Rules separate from grammar** — grammar defines parsing; RULES define meaning and mapping to JSON Patch / descriptor ops.
5. **Extensible** — new statements (`add-set`, `add-mixin`, …) extend RULES + grammar without changing IR.

## Inheritance (`extends`)

WebGME meta uses single inheritance (`core.getBase`). MetaLang maps it as:

| Base (from core) | MetaLang | Descriptor `extends` |
|------------------|----------|----------------------|
| FCO | `concept Foo;` or `concept Foo { … }` | omitted |
| Any other concept | `concept Pin extends PortBase;` | `"extends": "PortBase"` |

**Renderer rule (F16c):** `irToDescriptor` / `descriptorToMetalang` use `core.getBase`; emit `extends` only when base name ≠ `FCO`. Never print `extends FCO`.

**Parser rule:** `concept X;` with no `extends` ⇒ base FCO. `concept X extends Y` ⇒ descriptor `concepts.X.extends = "Y"`.

Connection concepts often extend a shared base (e.g. `ConnectionBase`) **and** declare `connect`:

```metalang
concept ElectricalConnection extends ConnectionBase connect Pin -> Pin;
```

## Planned tooling

| Stage | Approach |
|-------|----------|
| Now | EBNF + hand-written examples; `descriptor → metalang` renderer in F16c |
| Later | Langium grammar for validation, formatter, LSP (optional dep) |
| Later | `metalang → descriptor` parser for authoring |

## Examples

- [`../examples/state-machine.metalang`](../examples/state-machine.metalang) — StaMS (all concepts extend FCO — no `extends` lines)
- [`../examples/modelica-base.metalang`](../examples/modelica-base.metalang) — DSS core with `extends PortBase` / `extends ConnectionBase`
- [`../examples/modelica-domain.metalang`](../examples/modelica-domain.metalang) — full library pattern (`extends ComponentBase`)
