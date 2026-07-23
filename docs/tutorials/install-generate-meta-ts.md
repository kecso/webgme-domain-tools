# Install GenerateMetaTs

The npm package ships the **CLI only**. Toolbox plugins live under [`plugins/`](https://github.com/kecso/webgme-domain-tools/tree/main/plugins) on GitHub.

```bash
# Install from GitHub into ~/.webdot (or $WEBDOT_HOME)
webdot plugin install kecso/webgme-domain-tools --subdir plugins/GenerateMetaTs

webdot plugin list
webdot plugin info GenerateMetaTs

# Generate TypeScript instance types from a seed
webdot plugin run GenerateMetaTs \
  --seed StateMachine \
  -C /path/to/studio \
  --artifacts-out ./generated \
  --set seedName=StateMachine
```

Pin a tag or commit:

```bash
webdot plugin install kecso/webgme-domain-tools@v0.7.0 --subdir plugins/GenerateMetaTs
```

From a local clone:

```bash
webdot plugin install ./plugins/GenerateMetaTs
```

If the install name collides, use `--as OtherName` or `--force`.
