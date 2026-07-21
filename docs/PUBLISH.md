# Publishing to npm

Package name on the registry is **`webgme-domain-tools`** (unscoped). The GitHub repo may later move under the `webgme` org; that does **not** require renaming the npm package.

## One-time setup

### 1. npm account

Use an npmjs.com account that will own `webgme-domain-tools` (or a org you control).

### 2. GitHub Actions secret `NPM_TOKEN`

1. On [npmjs.com](https://www.npmjs.com/) → **Access Tokens** → generate a **Granular Access Token**
   - Permission: **Read and write** (or publish) for package `webgme-domain-tools`
   - Or an Automation token if you prefer classic tokens
2. In this GitHub repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**
   - Name: `NPM_TOKEN`
   - Value: the token from npm

The [Publish npm](../.github/workflows/publish.yml) workflow uses `NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}`.

### 3. Optional — Trusted Publishing (OIDC)

After the first successful publish (or when npm allows configuring a pending publisher):

1. Package page on npm → **Settings** → **Trusted Publisher** → **GitHub Actions**
2. Repository: `kecso/webgme-domain-tools` (update if the repo moves to `webgme/…`)
3. Workflow filename: `publish.yml`
4. You can then drop `NPM_TOKEN` once OIDC-only publish is verified

The workflow already requests `id-token: write` and passes `--provenance`.

## How to cut a release

1. Ensure `package.json` `"version"` is what you want (e.g. `0.7.0`).
2. Merge to `main`.
3. Create a GitHub **Release** whose tag matches that version, e.g. tag `v0.7.0`.
4. Publishing the release triggers **Publish npm** → `npm publish`.

## Local smoke (optional)

```bash
npm run build
node dist/cli.js --help
WEBDOT_HOME=/tmp/webdot-smoke node dist/cli.js plugin install ./plugins/GenerateMetaTs
WEBDOT_HOME=/tmp/webdot-smoke node dist/cli.js plugin run GenerateMetaTs \
  --seed StateMachine -C test/fixtures/sample-project \
  --artifacts-out /tmp/meta-out --dry-run
```

CI runs a similar smoke job on every push/PR to `main`.
