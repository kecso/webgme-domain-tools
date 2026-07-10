# Connections are a projection, not a meta primitive

WebGME **meta** has no `connection` type. It has:

- **children** (containment)
- **pointers** (named references with target type list — no cardinality in MetaLang/descriptor)
- **sets** (named membership; per-member + optional global cardinality)

A **connection** in the UI / domain language is a **projection**: typically a concept whose instances use pointer names `src` and `dst`. Domain tools may call that a link, edge, or transition — but the stored metamodel is still pointers.

**webdot descriptor** does not add a connection layer. `src` and `dst` stay in `concepts.*.pointers` like any other pointer. Whether a concept is “a connection” is up to the domain implementation (editor, generator, viz).

## Evidence from our seeds

### StaMS `Transition` — `src`/`dst` plus other pointers

```
Transition: src->State, dst->State, event->Event, guard->Guard, action->Action
State:      entry->Action, run->Action, exit->Action
```

### Modelica `RealValueFlow` — multi-target `dst`

```
RealValueFlow extends ConnectionBase:
  src -> RealOutput
  dst -> RealInput | RealVectorInput
```

Descriptor (pointer-first):

```json
"RealValueFlow": {
  "extends": "ConnectionBase",
  "pointers": {
    "src": "RealOutput",
    "dst": ["RealInput", "RealVectorInput"]
  }
}
```

### Modelica `ElectricalConnection`

```
ElectricalConnection extends ConnectionBase:
  src -> Pin
  dst -> Pin
```

Same mechanism as above — two pointers, not a separate connection type.

## Recommended handling (webdot)

| Layer | Responsibility |
|-------|----------------|
| **IR** | Lossless `getJsonMeta` — all pointers including `src`/`dst` |
| **Descriptor** | `concepts.*.pointers` only — no `relationships` block |
| **MetaLang** | Explicit pointer declarations |
| **Domain studio** | Decide edge/port/flow rendering |

### MetaLang (canonical)

```metalang
concept Transition {
  src -> State;
  dst -> State;
  event -> Event;
  guard -> Guard;
  action -> Action;
}

concept RealValueFlow extends ConnectionBase {
  src -> RealOutput;
  dst -> RealInput | RealVectorInput;
}
```

Optional **sugar** (F16d+): `connect Pin -> Pin` desugars to `src`/`dst` only when no other members exist — never required.

## F16 translators

| Step | Rule |
|------|------|
| F16b `irToDescriptor` | All pointers → `concepts.*.pointers`; do **not** emit `relationships` |
| F16c `descriptorToMetalang` | Render all pointers by name; domain may treat `src`/`dst` as edges in UI only |

## Notes

- **`src`/`dst`** are WebGME conventions for connection-like concepts, not reserved descriptor keywords.
- Concepts with unusual link semantics and no `src`/`dst` stay in IR only until we need them in examples.
