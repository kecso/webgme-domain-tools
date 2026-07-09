import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadSetupCatalog, resolveSeed } from "../dist/catalog/setup-catalog.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixture = path.join(__dirname, "fixtures", "sample-project");

test("loadSetupCatalog reads plugins and seeds", () => {
  const catalog = loadSetupCatalog(fixture);
  assert.equal(catalog.plugins.length, 1);
  assert.equal(catalog.plugins[0].ref, "plugin:SamplePlugin");
  assert.equal(catalog.seeds[0].ref, "seed:SampleSeed");
  assert.ok(catalog.plugins[0].metadataPath);
});

test("resolveSeed suggests on typo", () => {
  const catalog = loadSetupCatalog(fixture);
  assert.throws(() => resolveSeed(catalog, "SampleSead"), /Did you mean/);
});