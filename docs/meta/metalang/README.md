# MetaLang

Human-readable metamodel surface syntax. **Target semantics:** MetaDescriptor v1 (same as compact JSON). Not a second canonical model.

## Specification

| Artifact | Purpose |
|----------|---------|
| [`grammar.ebnf`](grammar.ebnf) | Concrete syntax (EBNF). Langium/TextMate can derive from this later. |
| [`RULES.md`](RULES.md) | Statement-level edit rules ↔ descriptor patches |

## Design principles

1. **Concise** — omit FCO/META; `name` attribute is implicit on all concepts.
2. **Readable** — `connect A -> B` for relationships; `contains Child*` for containment.
3. **Rules separate from grammar** — grammar defines parsing; RULES define meaning and mapping to JSON Patch / descriptor ops.
4. **Extensible** — new statements (`add-set`, `add-mixin`, …) extend RULES + grammar without changing IR.

## Planned tooling

| Stage | Approach |
|-------|----------|
| Now | EBNF + hand-written examples; `descriptor → metalang` renderer in F16c |
| Later | Langium grammar for validation, formatter, LSP (optional dep) |
| Later | `metalang → descriptor` parser for authoring |

## Examples

- [`../examples/state-machine.metalang`](../examples/state-machine.metalang) — StaMS `StateMachine` (from fixture `.webgmex`)
- [`../examples/modelica-domain.metalang`](../examples/modelica-domain.metalang) — webgme-dss `Modelica` (sketch)
