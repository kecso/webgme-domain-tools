# MetaLang edit rules

Each rule: **statement form** → **descriptor effect** → **JSON Patch** (see [`../descriptor/RULES.md`](../descriptor/RULES.md)).

## add-domain

Declares the studio/seed namespace for documentation; does not appear in MetaDescriptor JSON.

```metalang
domain StaMS.StateMachine
```

## add-concept

Bare concept (extends FCO — **do not** write `extends FCO`):

```metalang
concept Event;
```

```json
{ "op": "add", "path": "/concepts/Event", "value": {} }
```

With inheritance (base ≠ FCO — **required** in MetaLang when rendering):

```metalang
concept Pin extends PortBase;
concept InitialState extends State;
```

```json
[
  { "op": "add", "path": "/concepts/Pin", "value": { "extends": "PortBase" } },
  { "op": "add", "path": "/concepts/InitialState", "value": { "extends": "State" } }
]
```

**Source of truth:** `core.getBase(metaNode)`; compare base concept name to `"FCO"`. Same rule as mcp `buildMetaDescriptorFromCore` (`extends` field omitted for FCO).

## set-base / change-inheritance

```metalang
concept Resistor extends ComponentBase;
```

```json
{ "op": "add", "path": "/concepts/Resistor", "value": { "extends": "ComponentBase" } }
```

Or replace on existing concept:

```json
{ "op": "replace", "path": "/concepts/Resistor/extends", "value": "ComponentBase" }
```

## add-attribute

```metalang
concept State {
  isInitial: bool;
  isFinal: bool;
}
```

```json
[
  { "op": "add", "path": "/concepts/State/attributes/isInitial", "value": "bool" },
  { "op": "add", "path": "/concepts/State/attributes/isFinal", "value": "bool" }
]
```

## add-pointer

```metalang
concept State {
  entry -> Action?;
  run -> Action?;
  exit -> Action?;
}
```

Maps to `concepts.State.pointers.{entry,run,exit} = "Action"`. Cardinality: `?` suffix = `0..1`; `[n]`, `[min..max]`, `[n,m,k]` for other counts — see [`../CARDINALITY.md`](../CARDINALITY.md).

## add-containment

```metalang
concept Machine {
  contains State*, Event*, Guard*, Action*, Constraint*;
  contains Port:2..5;
  description: string;
}
```

```json
{
  "op": "add",
  "path": "/concepts/Machine",
  "value": {
    "contains": {
      "State": "*",
      "Event": "*",
      "Guard": "*",
      "Action": "*",
      "Constraint": "*",
      "Port": "2..5"
    },
    "attributes": { "description": "string" }
  }
}
```

Discrete allowed counts:

```metalang
contains Slot:1,2,4;
```

```json
{ "op": "add", "path": "/concepts/Container/contains/Slot", "value": "1,2,4" }
```

See [`../CARDINALITY.md`](../CARDINALITY.md).

## add-relationship (descriptor projection only)

In **descriptor JSON**, `relationships` is a compact projection of `src`/`dst` pointers — not a separate meta primitive. See [`../CONNECTIONS.md`](../CONNECTIONS.md).

**MetaLang** defines pointers instead:

```metalang
concept Transition {
  src -> State;
  dst -> State;
  event -> Event;
  guard -> Guard?;
  action -> Action?;
}
```

Descriptor equivalent (mcp):

```json
[
  { "op": "add", "path": "/concepts/Transition", "value": {} },
  { "op": "add", "path": "/relationships/Transition", "value": { "from": "State", "to": "State" } },
  { "op": "add", "path": "/concepts/Transition/pointers/event", "value": "Event" },
  { "op": "add", "path": "/concepts/Transition/pointers/guard", "value": "Guard" },
  { "op": "add", "path": "/concepts/Transition/pointers/action", "value": "Action" }
]
```

Multi-target pointer (Modelica `RealValueFlow`):

```metalang
concept RealValueFlow extends ConnectionBase {
  src -> RealOutput;
  dst -> RealInput | RealVectorInput;
}
```

```json
{
  "op": "add",
  "path": "/relationships/RealValueFlow",
  "value": { "from": "RealOutput", "to": ["RealInput", "RealVectorInput"] }
}
```

## remove-* / replace-*

Parser/editor emits the inverse JSON Patch operations (`remove`, `replace`) per [`../descriptor/RULES.md`](../descriptor/RULES.md).

## Future rules (not in v0 grammar)

| Rule | WebGME feature |
|------|----------------|
| `add-set` | Meta sets |
| `add-mixin` | Mixins |
| `add-constraint` | Meta constraints |
| `add-aspect` | Aspects |
| `add-sheet` | Meta aspect sheets |

These will extend grammar + RULES while IR remains the lossless fallback.
