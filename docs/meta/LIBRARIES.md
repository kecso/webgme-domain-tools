# Libraries & namespaces (F17)

WebGME projects may attach **libraries** (`core.addLibrary`). Meta nodes that come from a library live under a **namespace**; `core.getFullyQualifiedName` is typically `LibraryName.ConceptName`.

## Engine APIs

| Method | Role |
|--------|------|
| `getLibraryNames(root)` | Attached library root names |
| `getLibraryRoot(root, name)` | Library root node |
| `getLibraryMetaNodes(root, name)` | Meta nodes belonging to a library |
| `getNamespace(node)` | Namespace string (empty when owned by the host project) |
| `getFullyQualifiedName(node)` | Qualified concept id |
| `isLibraryElement(node)` | Node originated from a library |
| `isLibraryRoot(node)` | Node is a library root |

## IR (done in Phase 4)

`buildSeedMetaIr` exposes:

```json
{
  "seed": "StateMachine",
  "libraries": [],
  "metaAspectSet": [
    {
      "path": "/G/z",
      "name": "State",
      "namespace": "",
      "fullyQualifiedName": "State",
      "libraryElement": false,
      "meta": { }
    }
  ]
}
```

The StateMachine fixture has **no libraries** (`libraries: []`, empty namespaces). Descriptor / MetaLang / GenerateMetaTs still key concepts by **simple `name`** (v1 behavior).

## Remaining (needs a library-bearing `.webgmex` fixture)

1. Descriptor / MetaLang: qualified names or `library` blocks when simple names would collide
2. `tree --seed`: mark library-sourced nodes vs host-owned meta
3. GenerateMetaTs: optional FQN-based exports when namespaces are present

Until then, studio authors should avoid relying on generated types for library-imported concepts that share simple names with host meta.
