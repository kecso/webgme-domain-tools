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

Also remove from any `contains` maps and `relationships` referencing the name.

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

Non-connection pointer on a concept:

```json
{
  "op": "add",
  "path": "/concepts/State/pointers/entry",
  "value": "Action"
}
```

Optional pointer (MetaLang `?`) is represented in WebGME meta min/max — descriptor uses target name; optionality round-trips via IR.

## add-containment

On container concept:

```json
{
  "op": "add",
  "path": "/concepts/Machine/contains/State",
  "value": "*"
}
```

If `contains` is missing, add the map first:

```json
{ "op": "add", "path": "/concepts/Machine/contains", "value": { "State": "*" } }
```

## add-relationship

Connection concept + endpoints (typical pattern):

```json
[
  { "op": "add", "path": "/concepts/Transition", "value": {} },
  {
    "op": "add",
    "path": "/relationships/Transition",
    "value": { "from": "State", "to": "State" }
  }
]
```

Include connection type in container `contains` when instances must be created on the canvas.

## add-set

(v1 schema supports; StaMS StateMachine seed does not use sets in descriptor view yet.)

```json
{
  "op": "add",
  "path": "/concepts/Component/sets/ports",
  "value": { "Pin": "*" }
}
```

## Validation

After any patch batch: validate against [`schema.json`](schema.json). mcp `normalizeMetaDescriptor` applies naming and FCO attribute stripping rules.
