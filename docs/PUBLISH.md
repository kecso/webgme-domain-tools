# Publishing to npm

Package name on the registry is **`webgme-domain-tools`** (unscoped). The GitHub repo may later move under the `webgme` org; that does **not** require renaming the npm package.

## Recommended path (avoid fighting the token UI)

npm has made long-lived **write** tokens awkward on purpose (package must exist, IP allowlists, “bypass 2FA” warnings). For a **new** package, the least painful flow is:

### A. First publish from your laptop (interactive 2FA is fine)

```bash
npm login          # browser / one-time 2FA prompt is OK here
npm run build
npm publish --access public
```

That creates `webgme-domain-tools` on npmjs.com under your account.

### B. Then enable Trusted Publishing (CI without a write token)

1. Open https://www.npmjs.com/package/webgme-domain-tools → **Settings** → **Trusted Publisher**
2. Choose **GitHub Actions** and set:
   - **Organization or user:** `kecso` (or `webgme` after a repo move)
   - **Repository:** `webgme-domain-tools`
   - **Workflow filename:** `publish.yml` (filename only, with `.yml`)
   - **Environment:** leave empty unless you add a GitHub Environment
   - **Allowed actions:** `npm publish`
3. Save. No `NPM_TOKEN` secret is required for later releases.
4. Later releases: create a GitHub **Release** (tag `v0.7.1`, etc.) → workflow publishes via OIDC.

The [Publish npm](../.github/workflows/publish.yml) workflow already has `permissions.id-token: write` and uses Node 22 (required for Trusted Publishing).

---

## If you still want a granular token (optional / fallback)

Use this only if you cannot do the laptop first publish, or as a temporary fallback (`NPM_TOKEN` secret).

| Form field | What to do |
|------------|------------|
| **Package name / scope** | Package must often **already exist**. After step A, select `webgme-domain-tools`. For a brand-new name, prefer laptop publish first — don’t try to invent IP ranges to unblock CI. |
| **IP ranges** | **Leave empty / unrestricted.** GitHub Actions egress IPs change constantly; pinning ranges will break publishes. |
| **Bypass 2FA** | **Enable for CI write tokens.** The warning is expected: CI cannot tap your phone. This is why Trusted Publishing is better long-term. |
| **Expiration** | Keep short (e.g. 7–90 days); rotate if you use this path. |

Then: GitHub repo → **Settings** → **Secrets** → Actions → `NPM_TOKEN` = that token. The workflow passes it as `NODE_AUTH_TOKEN` when the secret exists.

---

## How to cut a release (after Trusted Publishing is set)

1. Bump `"version"` in `package.json` on `main` if needed.
2. Create a GitHub **Release** whose tag matches, e.g. `v0.7.0`.
3. Publishing the release runs **Publish npm**.

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
