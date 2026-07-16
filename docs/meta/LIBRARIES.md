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

## Remaining — Phase 6 (Libraries)

Needs a **library-bearing `.webgmex` fixture**, then:

1. **Listing / introspection** — `tree --seed` (and related list views) mark library-sourced nodes; library roots named clearly
2. **Descriptor / MetaLang** — qualified names or `library` blocks when simple names would collide
3. **GenerateMetaTs** — optional FQN-based exports when namespaces are present
4. **CLI management** (optional product surface) — attach / update / remove library packages on a session or seed via engine library APIs

Until Phase 6, studio authors should avoid relying on generated types for library-imported concepts that share simple names with host meta. See [PROJECT.md](../PROJECT.md) Phase 6.
