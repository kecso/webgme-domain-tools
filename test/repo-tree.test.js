import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadSetupCatalog } from "../dist/catalog/setup-catalog.js";
import { renderRepoTree } from "../dist/introspection/repo-tree.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixture = path.join(__dirname, "fixtures", "sample-project");

test("renderRepoTree includes stable refs", () => {
  const catalog = loadSetupCatalog(fixture);
  const out = renderRepoTree(catalog, { kinds: ["seeds", "plugins"] });
  assert.match(out, /seed:SampleSeed/);
  assert.match(out, /plugin:SamplePlugin/);
  assert.match(out, /metadata\.json/);
});