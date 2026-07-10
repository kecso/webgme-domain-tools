# Descriptor edit rules (JSON Patch)

Operations mutate a `MetaDescriptor` document. Each rule lists the **intent**, **patch shape**, and **MetaLang** equivalent (see [`../metalang/RULES.md`](../metalang/RULES.md)).

Patch paths use RFC 6902 JSON Pointer on the descriptor root.

## add-concept

```json
{ "op": "add", "path": "/concepts/State", "value": {} }
```

With base type (omit when base is FCO):

```json
{ "op": "add", "path": "/concepts/Pin", "value": { "extends": "PortBase" } }
```

## remove-concept

```json
{ "op": "remove", "path": "/concepts/OldType" }
```

Also remove from any `contains` / `sets` member maps referencing the name.

## add-attribute

```json
{
  "op": "add",
  "path": "/concepts/State/attributes/isInitial",
  "value": "bool"
}
```

Rich attribute:

```json
{
  "op": "add",
  "path": "/concepts/Variable/attributes/type",
  "value": { "type": "enum", "values": ["float", "string"] }
}
```

## add-pointer

All pointers (including `src` / `dst`):

```json
{
  "op": "add",
  "path": "/concepts/Transition/pointers/src",
  "value": "State"
}
```

Multi-target:

```json
{
  "op": "add",
  "path": "/concepts/RealValueFlow/pointers/dst",
  "value": ["RealInput", "RealVectorInput"]
}
```

Pointer IR uses structural global **`1..1`** and per-target **`-1`/`1`**. Descriptor stores target type name(s) only.

## add-containment

Per child type (flat map):

```json
{
  "op": "add",
  "path": "/concepts/Machine/contains/State",
  "value": "*"
}
```

With global total-child limit:

```json
{
  "op": "add",
  "path": "/concepts/Machine/contains",
  "value": {
    "global": "0..100",
    "members": { "State": "*", "Event": "*" }
  }
}
```

If `contains` is missing, add the map first:

```json
{ "op": "add", "path": "/concepts/Machine/contains", "value": { "State": "*" } }
```

## add-set

Flat member map (no global limit):

```json
{
  "op": "add",
  "path": "/concepts/Component/sets/ports",
  "value": { "Pin": "*", "HeatPort": "1", "FlowPort": "0..2" }
}
```

With global limit (`set_pointer_meta_limits` on the set):

```json
{
  "op": "add",
  "path": "/concepts/Component/sets/ports",
  "value": {
    "global": "0..8",
    "members": { "Pin": "*", "HeatPort": "1", "FlowPort": "0..2" }
  }
}
```

Each key in `members` (or in a flat map) is a member type; each value is that member's cardinality string.

## Validation

After any patch batch: validate against [`schema.json`](schema.json).
