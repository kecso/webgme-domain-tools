# MetaLang edit rules

Each rule: **statement form** → **descriptor effect** → **JSON Patch** (see [`../descriptor/RULES.md`](../descriptor/RULES.md)).

## add-domain

Declares the studio/seed namespace for documentation; does not appear in MetaDescriptor JSON.

```metalang
domain StaMS.StateMachine
```

## add-concept

```metalang
concept Event;
```

```json
{ "op": "add", "path": "/concepts/Event", "value": {} }
```

With inheritance:

```metalang
concept InitialState extends State;
```

```json
{ "op": "add", "path": "/concepts/InitialState", "value": { "extends": "State" } }
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

Maps to `concepts.State.pointers.{entry,run,exit} = "Action"`. Required vs optional (`?`) is preserved when round-tripping through IR; descriptor stores target type name only.

## add-containment

```metalang
concept Machine {
  contains State*, Event*, Guard*, Action*, Constraint*;
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
      "Constraint": "*"
    },
    "attributes": { "description": "string" }
  }
}
```

## add-relationship

Connection concept with `connect` syntax:

```metalang
concept Transition connect State -> State {
  event -> Event;
  guard -> Guard?;
  action -> Action?;
}
```

```json
[
  { "op": "add", "path": "/concepts/Transition", "value": {} },
  {
    "op": "add",
    "path": "/relationships/Transition",
    "value": { "from": "State", "to": "State" }
  },
  { "op": "add", "path": "/concepts/Transition/pointers/event", "value": "Event" },
  { "op": "add", "path": "/concepts/Transition/pointers/guard", "value": "Guard" },
  { "op": "add", "path": "/concepts/Transition/pointers/action", "value": "Action" }
]
```

`connect` establishes `relationships.{Concept}`; the block body adds non-connection pointers on the same concept.

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
