# Examples

Hand-authored **descriptor** and **metalang** views. **IR** is generated at runtime:

```bash
# StaMS (fixture)
webdot seed meta --seed StateMachine -C test/fixtures/sample-project --format json

# webgme-dss — catalog seed uses Modelica.webgmex (full library)
webdot seed meta --seed Modelica -C ../webgme-dss --format json
webdot tree repo --kind seeds -C ../webgme-dss   # shows both .webgmex files
```

## StaMS StateMachine

| File | Format |
|------|--------|
| `state-machine.descriptor.json` | Descriptor |
| `state-machine.metalang` | MetaLang |

Source: `test/fixtures/sample-project` (`StateMachine.webgmex`).

## webgme-dss Modelica (two `.webgmex` files in one seed folder)

| File on disk | Role | Concepts (approx.) |
|--------------|------|-------------------|
| `ModelicaBaseSeed.webgmex` | DSS core metamodel | 36 |
| `Modelica.webgmex` | Base + MSL library | 200+ |

`webgme-setup.json` has one seed entry **`Modelica`**. F1 picks `Modelica.webgmex`; `ModelicaBaseSeed.webgmex` is listed as **ignored extra** (see `webdot tree repo --kind seeds`).

| Example file | Reflects |
|--------------|----------|
| `modelica-base.metalang` / `modelica-base.descriptor.json` | **ModelicaBaseSeed** — Model, Domain, ports, connections |
| `modelica-domain.metalang` | **Modelica** full seed — base + sample library concepts (pattern only) |

The mcp project uses a **simplified** FSM descriptor for tutorials. StaMS examples reflect the full `StateMachine` fixture metamodel.
