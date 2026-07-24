# Libraries & namespaces (F17 / Phase 6)

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

The StateMachine fixture has **no libraries** (`libraries: []`, empty namespaces). Descriptor / MetaLang / GenerateMetaTs still key concepts by **simple `name`** (v1 behavior) until Phase 6.

## Phase 6 decisions (2026-07-23)

### F33 — Always FQN (canonical text)

**Decision:** Descriptor and MetaLang use `fullyQualifiedName` as the concept key / type reference.

- **Host concepts** (`namespace === ""`): FQN === simple name (`Machine`) — **no host namespace prefix**.
- **Library concepts**: always `LibraryName.ConceptName`.

**Rationale:** Allowing both `State` and `SharedMeta.State` for the same IR node makes the textual form **non-canonical** (many texts ↔ one IR). Prefer one spelling. Host stays un-namespaced to match WebGME.

**Later (external MetaLang / LSP):** editors may offer shorthand completion that **inserts** the FQN (type short → pick from FQN list). The stored `.metalang` file still contains only FQNs for library types; host names remain bare.

Cross-refs (`extends`, pointers, contains, sets) use the same rule.

### F34 — GenerateMetaTs (example)

Host concept `Machine`, library concept `SharedMeta.State`, host pointer `initial -> SharedMeta.State`.

**Preferred emit (nested namespaces mirroring FQN):**

```ts
export interface Machine {
  attributes?: { name?: string };
  pointers?: { initial?: SharedMeta.State };
  children?: Array<SharedMeta.State>;
}

export namespace SharedMeta {
  export interface State {
    attributes?: { name?: string };
  }
}
```

**Rejected for v1:** flat aliases only (`SharedMeta_State`) as the primary shape — harder to read; can revisit if consumers ask.  
**No-library seeds:** FQN === simple name → emit stays flat (`export interface Machine`), no empty `namespace` wrappers.

### F32 — Tree ordering

Keep the real project containment tree. Change **sibling order under ROOT** (and document it): **library roots first** (as they appear under root in WebGME), then the rest of the host project. Listing libraries is also available via `webdot library list` (attached names / roots) without inventing a fake parallel tree.

### F31 — Both fixtures

| Fixture | Role |
|---------|------|
| **Synthetic** small host + library | Error paths, collisions, empty lib, update/remove; stable in CI |
| **Real** (e.g. DSS/Modelica-scale or a trimmed real seed) | Dogfood realism; optional / heavier tests |

### F35 — CLI management (what it means)

Today, attaching a library in the GUI/engine roughly **imports another project’s content under the host root / FCO chain** and registers it as a named library. Phase 6 CLI exposes that headlessly:

| Command | Meaning |
|---------|---------|
| `library list` | Names + roots already attached (read-only) |
| `library add --from <lib.webgmex> --as <Name>` | Attach from a `.webgmex` (same semantics as GUI add) |
| `library update <Name> --from <lib.webgmex>` | Replace that library’s content from a new package |
| `library remove <Name>` | Detach library |

**Session policy (decided 2026-07-23):** Library mutations are **not** offered through the session workspace. They are **heavy** and must **always persist immediately** to the target `.webgmex` (seed path or `--webgmex` / `-C` project seed). No dirty session / `session save` step — every successful `add` / `update` / `remove` writes the file. Keeps session semantics simple (model edits) vs library ops (project-structure surgery).

### MetaLang ↔ libraries (authoring surface)

Beyond binary `.webgmex` attach, we still need a path for **textual** library definitions (agents / review). Options to support (Phase 6 partial + Phase 9):

| Path | Idea |
|------|------|
| **A. Library as its own `.metalang` + import** | Author `SharedMeta.metalang` (or emit from a library seed); `library add --from …` accepts `.webgmex` **or** a metalang that is compiled to a temp project then attached like GUI add |
| **B. In-place `library` blocks in host metalang** | Host file may contain `library SharedMeta { concept State { … } }` (or equivalent); ingest attaches/updates that library rather than merging concepts into host-owned meta |

**Principle:** whichever spelling we allow, materialization still **mimics `addLibrary`** (append under host root/FCO as a named library) — not a second attachment model. Exact grammar for in-place blocks and ImportMetaLang flags can land with Phase 9 parser work; Phase 6 should at least not paint into a corner (FQN emit already uses `Lib.Concept`).

Exact ImportMetaLang UX stays Phase 9; F35 `.webgmex` CRUD can ship first.

## Remaining implementation

Phase 6 core (F31–F35) is on `feature/phase6-libraries` for review. Synthetic fixture matches the known real pattern: **domain package attached as a library** (host uses domain meta as effectively read-only).

**Future (B14):** gather richer real-life library scenarios (multi-library hosts, collisions, nested libs, large DSS seeds) when they show up — not a Phase 6 blocker.

See [PROJECT.md](../PROJECT.md) Phase 6.

## Future (engine / WebGME — not Phase 6)

Today WebGME attaches a library by wiring it into the **host project’s inheritance / containment chain**. That is convenient for a single shared meta tree, but **brittle** when libraries evolve independently, collide on names, or need isolation from host base changes. A later rethink of library attachment (stronger namespace isolation, explicit import boundaries, less “everything hangs off the same FCO chain”) may open up in **webgme-engine / WebGME** itself. Phase 6 of **webdot** only observes and manages libraries **as the engine works today** — it does not redesign attachment semantics.
