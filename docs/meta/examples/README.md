# Examples

Hand-authored **descriptor** and **metalang** views. **IR** is generated at runtime:

```bash
webdot seed meta --seed StateMachine -C test/fixtures/sample-project --format json > state-machine.ir.json
```

| File | Format | Seed |
|------|--------|------|
| `state-machine.descriptor.json` | Descriptor | StaMS `StateMachine` |
| `state-machine.metalang` | MetaLang | StaMS `StateMachine` |
| `modelica-domain.metalang` | MetaLang (sketch) | webgme-dss `Modelica` |

The mcp project uses a **simplified** FSM descriptor for tutorials (`State`, `StateMachine`, `Transition` only). The StaMS examples here reflect the **full** fixture metamodel (`Machine` container, `Event`/`Guard`/`Action` pointers on `Transition`, etc.).
