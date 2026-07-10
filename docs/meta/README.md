# Meta representations (Phase 2½)

Foundation for describing WebGME **MetaAspectSet** metamodels in three complementary forms. All formats are views over the same core; conversions are explicit and lossy where noted.

## Why three formats

| Format | Role | Loss | Best for |
|--------|------|------|----------|
| **IR** (`ir`) | Canonical dump from `core.getJsonMeta` per meta node | None | Round-trip fidelity, tooling, diffing raw WebGME meta |
| **Descriptor** (`descriptor`) | Compact JSON aligned with [webgme/mcp](https://github.com/webgme/mcp) `MetaDescriptor` v1 | Paths, sheets, mixins, some constraints | LLM context, patch APIs, cross-tool interchange |
| **MetaLang** (`metalang`) | Human-readable surface syntax — **pointers, contains, sets** | Same as descriptor (target surface) | Reading, authoring; see [CONNECTIONS.md](CONNECTIONS.md) |

> **Connections** are not a meta primitive. `src`/`dst` are pointer names; `relationships` in descriptor JSON is a derived projection (mcp-compatible).

```
.webgmex  →  ProjectSession  →  core.getAllMetaNodes / getJsonMeta
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                 ▼
              buildSeedMetaIr   ir → descriptor    descriptor → metalang
              (F8, today)       (F16b)             (F16c)
                    │                 │                 │
                    ▼                 ▼                 ▼
               meta/ir          meta/descriptor    meta/metalang
```

**CLI (planned):**

```bash
webdot seed meta --seed StateMachine --format ir          # default today (json)
webdot seed meta --seed StateMachine --format descriptor
webdot seed meta --seed StateMachine --format metalang
```

## Specifications

| Layer | Spec | Rules / ops |
|-------|------|-------------|
| IR | [`ir/schema.json`](ir/schema.json) | Implicit: one node per meta concept, full `getJsonMeta` blob |
| Descriptor | [`descriptor/schema.json`](descriptor/schema.json) | [`descriptor/RULES.md`](descriptor/RULES.md) — JSON Patch on descriptor (RFC 6902) |
| Cardinality | [`CARDINALITY.md`](CARDINALITY.md) | String forms: `*`, `2..5`, `1,2,4`, … (not limited to mcp enum subset) |
| MetaLang | [`metalang/grammar.ebnf`](metalang/grammar.ebnf) | [`metalang/RULES.md`](metalang/RULES.md) — statement-level edit rules |

Descriptor schema is **aligned with webgme/mcp** for interchange; **cardinality** is a superset string (mcp’s five shorthand values remain valid).

MetaLang uses **EBNF + RULES** for now (zero runtime deps). **Langium** (or similar) is an optional later step when we need an LSP, validator, or formatter — the EBNF is the contract Langium would implement.

## Examples (from real seeds)

| Studio | Seed folder | `.webgmex` files | Example docs |
|--------|-------------|------------------|--------------|
| StaMS | `StateMachine/` | `StateMachine.webgmex` | [`examples/state-machine.*`](examples/) |
| webgme-dss | `Modelica/` | `ModelicaBaseSeed.webgmex` (core), `Modelica.webgmex` (full library) | [`examples/modelica-base.*`](examples/), [`modelica-domain.metalang`](examples/modelica-domain.metalang) |

Catalog entry `Modelica` loads `Modelica.webgmex` per F1; base seed is sibling file (see `tree repo` ignore note).

Generate fresh IR from the fixture:

```bash
webdot seed meta --seed StateMachine -C test/fixtures/sample-project --format json
```

## Implementation phases (F16)

| Step | Deliverable |
|------|-------------|
| **F16a** (this branch) | Specs, schemas, examples, RULES — no CLI change required for review |
| **F16b** | `ir → descriptor` translator + `--format descriptor` |
| **F16c** | `descriptor → metalang` renderer + `--format metalang` |
| **F16d** | Optional: Langium grammar, metalang → descriptor parser |

## Extension path (full WebGME meta)

Descriptor v1 deliberately omits paths, meta sheets, mixins, and constraint objects. IR retains them. New MetaLang/DESCRIPTOR rules are added per feature (e.g. `add-set`, `add-mixin`, `add-constraint`) without breaking the core three-layer model.
