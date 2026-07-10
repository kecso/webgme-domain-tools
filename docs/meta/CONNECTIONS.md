# Connections are a projection, not a meta primitive

WebGME **meta** has no `connection` type. It has:

- **children** (containment)
- **pointers** (named references, each with its own target type list and cardinality)
- **sets** (named membership, same shape as pointers in `getJsonMeta`)

A **connection** in the UI / domain language is a **projection**: typically a concept whose instances use the reserved pointer names `src` and `dst` together. Domain tools (editors, generators, LLM context) may *call* that a link/edge/transition — but the stored metamodel is still pointers.

mcp’s `MetaDescriptor.relationships` is exactly such a projection: `buildMetaDescriptorFromCore` lifts `src`/`dst` out of `pointers` into `relationships.{Concept}.from|to` for compact JSON ([`metaDescriptor.ts`](https://github.com/webgme/mcp/blob/main/packages/cback/src/metaDescriptor.ts) — `metaPointersToRecord` skips src/dst; relationships block reads them back).

## Evidence from our seeds

### StaMS `Transition` — connection + extra pointers on one concept

```
Transition [src+dst]: src->State, dst->State, event->Event, guard->Guard, action->Action
State:              entry->Action, run->Action, exit->Action
```

One concept carries **both** the connection projection (`src`/`dst`) **and** ordinary pointers. A `connect State -> State` shorthand cannot express `event` / `guard` / `action` without a block anyway.

### Modelica `RealValueFlow` — asymmetric multi-target `dst`

```
RealValueFlow [src+dst]: src->RealOutput, dst->[RealVectorInput|RealInput]
```

`dst` allows **multiple target types**. Descriptor form (mcp-compatible):

```json
"relationships": {
  "RealValueFlow": { "from": "RealOutput", "to": ["RealInput", "RealVectorInput"] }
}
```

A single `connect A -> B` line would be wrong here.

### Modelica `ElectricalConnection` — symmetric single-type

```
ElectricalConnection [src+dst]: src->Pin, dst->Pin
```

This *looks* like `connect Pin -> Pin`, but meta still stores two pointers.

### Sets

None in StateMachine, ModelicaBase, or full Modelica fixture meta — but the schema path exists (`concepts.*.sets`). MetaLang should reserve `set` syntax for when domains use it.

## Recommended handling (webdot)

### 1. IR — lossless

Keep raw `getJsonMeta` pointers (including `src`, `dst`, and all others). No “connection” field.

### 2. Descriptor JSON — optional projection layer

Keep mcp `relationships` as a **derived view** for LLM-friendly JSON:

| Source | Descriptor field |
|--------|------------------|
| `pointers.src` / `pointers.dst` | `relationships.{Name}.from` / `.to` (string or string[]) |
| All other pointers | `concepts.{Name}.pointers.{name}` |
| `sets` | `concepts.{Name}.sets` (future / when present) |

Round-trip: `relationships` + `concepts.*.pointers` must not duplicate src/dst in pointers (mcp rule).

**Projection rule (domain tools):**

> A concept is a **connection concept** when it has both `src` and `dst` pointer definitions in meta. Anything else is a plain pointer.

Tools may add studio-specific rules (e.g. only types extending `ConnectionBase`).

### 3. MetaLang — pointer-first (canonical surface syntax)

**Do not** treat `connect A -> B` as the primary definition. Define pointers explicitly:

```metalang
concept Transition {
  src -> State;
  dst -> State;
  event -> Event;
  guard -> Guard?;
  action -> Action?;
}

concept RealValueFlow extends ConnectionBase {
  src -> RealOutput;
  dst -> RealInput | RealVectorInput;
}

concept ElectricalConnection extends ConnectionBase {
  src -> Pin;
  dst -> Pin;
}
```

Optional **sugar** (F16d+): `connect Pin -> Pin` desugars to `src`/`dst` pointers only when no other members exist — never required, never in examples as canonical.

Multi-target syntax: `dst -> A | B | C` ↔ descriptor `to: ["A","B","C"]`.

### 4. Domain tools own semantics

| Layer | Responsibility |
|-------|----------------|
| webdot / IR | Faithful meta structure |
| Descriptor | Compact JSON + mcp interchange |
| MetaLang | Human authoring of pointers, contains, sets |
| Studio / viz / plugins | Decide what renders as an edge, a port, a flow, etc. |

StaMS treats `Transition` as a state-machine edge; Modelica treats `RealValueFlow` as a signal flow; both are the same meta mechanism.

## Impact on F16

| Item | Change |
|------|--------|
| F16b `irToDescriptor` | Follow mcp: split src/dst → relationships; rest → pointers |
| F16c `descriptorToMetalang` | Render pointers; **do not** emit `connect` as primary |
| Grammar | Drop `connect_clause` from canonical grammar; add `\|` multi-target on pointer targets |
| Examples | Update Transition, RealValueFlow, ElectricalConnection |

## Open questions

1. **Reserved names** — document `src`/`dst` as WebGME connection convention (normalize `source`/`destination` on ingest only in tools, not in metalang).
2. **Relationship without src/dst** — rare; stay in IR only until we see a real seed.
3. **Sets in metalang** — add `set ports -> Pin*` when a seed uses sets (not in current fixtures).
