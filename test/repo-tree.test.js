import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadSetupCatalog } from "../dist/catalog/setup-catalog.js";
import { renderRepoTree } from "../dist/introspection/repo-tree.js";
import { COMPONENT_KINDS } from "../dist/catalog/types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixture = path.join(__dirname, "fixtures", "sample-project");

function catalog() {
  return loadSetupCatalog(fixture);
}

test("renderRepoTree tree format includes refs and seed file", () => {
  const out = renderRepoTree(catalog(), { format: "tree" });
  assert.match(out, /repository/);
  assert.match(out, /seed:StateMachine/);
  assert.match(out, /StateMachine\.webgmex/);
  assert.match(out, /seed:StateModel/);
  assert.match(out, /StateModel\.webgmex/);
  assert.match(out, /ignored .webgmex: _StateMachine_/);
  assert.match(out, /plugin:SamplePlugin/);
  assert.match(out, /viz:SampleViz/);
  assert.match(out, /router:SampleRouter/);
  assert.match(out, /produces blob artifacts/);
  assert.match(out, /\(missing\)/);
});

for (const kind of COMPONENT_KINDS) {
  test("renderRepoTree tree format for kind " + kind, () => {
    const out = renderRepoTree(catalog(), { kinds: [kind], format: "tree" });
    assert.match(out, new RegExp(kind + "/"));
  });
}

test("renderRepoTree flat format is tab-separated rows", () => {
  const out = renderRepoTree(catalog(), { format: "flat" });
  const lines = out.trim().split("\n");
  assert.ok(lines.length >= 6);
  for (const line of lines) {
    const cols = line.split("\t");
    assert.equal(cols.length, 3);
    assert.match(cols[0], /^(seed|plugin|viz|router):/);
  }
  assert.match(out, /seed:StateMachine/);
  assert.match(out, /router:SampleRouter/);
});

test("renderRepoTree json format includes component entries", () => {
  const out = renderRepoTree(catalog(), { format: "json" });
  const data = JSON.parse(out);
  assert.ok(data.setup.endsWith("webgme-setup.json"));
  assert.ok(Array.isArray(data.components.seeds));
  assert.ok(data.components.seeds.some((e) => e.ref === "seed:StateMachine"));
  assert.ok(data.components.plugins.some((e) => e.ref === "plugin:SamplePlugin"));
  assert.ok(data.components.visualizers.some((e) => e.ref === "viz:SampleViz"));
  assert.ok(data.components.routers.some((e) => e.ref === "router:SampleRouter"));
});

for (const format of ["tree", "flat", "json"]) {
  test("renderRepoTree respects --kind filter with format " + format, () => {
    const out = renderRepoTree(catalog(), {
      kinds: ["seeds", "plugins"],
      format,
    });
    if (format === "json") {
      const data = JSON.parse(out);
      assert.ok(data.components.seeds);
      assert.ok(data.components.plugins);
      assert.equal(data.components.visualizers, undefined);
      assert.equal(data.components.routers, undefined);
    } else {
      assert.match(out, /seed:StateMachine/);
      assert.match(out, /plugin:SamplePlugin/);
      assert.doesNotMatch(out, /viz:SampleViz/);
      assert.doesNotMatch(out, /router:SampleRouter/);
    }
  });
}
