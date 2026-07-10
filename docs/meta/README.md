# Meta representations (Phase 2½)

Foundation for describing WebGME **MetaAspectSet** metamodels in three complementary forms.

## Why three formats

| Format | Role | Loss | Best for |
|--------|------|------|----------|
| **IR** (`ir`) | Canonical `core.getJsonMeta` per meta node | None | Round-trip, diffing raw WebGME meta |
| **Descriptor** (`descriptor`) | Compact JSON aligned with MetaLang | Paths, sheets, mixins, constraints | LLM context, patch APIs, tooling |
| **MetaLang** (`metalang`) | Human-readable surface syntax | Same as descriptor | Reading, authoring |

> **Connections** are not in the descriptor. `src`/`dst` are ordinary pointers; edge semantics are domain-specific ([CONNECTIONS.md](CONNECTIONS.md)).

```
.webgmex  →  ProjectSession  →  getJsonMeta
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
   buildSeedMetaIr  ir→descriptor  descriptor→metalang
   (F8)             (F16b)         (F16c)
```

**CLI (planned):**

```bash
webdot seed meta --seed StateMachine --format ir          # default today
webdot seed meta --seed StateMachine --format descriptor
webdot seed meta --seed StateMachine --format metalang
```

## Specifications

| Layer | Spec | Rules |
|-------|------|-------|
| IR | [`ir/schema.json`](ir/schema.json) | [`ir/README.md`](ir/README.md) |
| Descriptor | [`descriptor/schema.json`](descriptor/schema.json) | [`descriptor/RULES.md`](descriptor/RULES.md) |
| Cardinality | [`CARDINALITY.md`](CARDINALITY.md) | Global + per-type on `contains` / `sets` |
| MetaLang | [`metalang/grammar.ebnf`](metalang/grammar.ebnf) | [`metalang/RULES.md`](metalang/RULES.md) |

## Examples

| Studio | Examples |
|--------|----------|
| StaMS | [`examples/state-machine.*`](examples/) |
| webgme-dss Modelica base | [`examples/modelica-base.*`](examples/), [`modelica-domain.metalang`](examples/modelica-domain.metalang) |

```bash
webdot seed meta --seed StateMachine -C test/fixtures/sample-project --format json
```

## F16 phases

| Step | Deliverable | Status |
|------|-------------|--------|
| **F16a** | Specs, schemas, examples | `review` |
| **F16b** | `irToDescriptor` + `--format descriptor` | `pending` |
| **F16c** | `descriptorToMetalang` + `--format metalang` | `pending` |
| **F16d** | Langium / metalang → descriptor | `deferred` |
