import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runTreeCommand } from "../dist/commands/tree.js";
import { COMPONENT_KINDS } from "../dist/catalog/types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixture = path.join(__dirname, "fixtures", "sample-project");

test("runTreeCommand repo scope delegates to renderRepoTree", async () => {
  const out = await runTreeCommand({ cwd: fixture, format: "tree" });
  assert.match(out, /seed:StateMachine/);
  assert.match(out, /plugin:SamplePlugin/);
});

test("runTreeCommand repo scope filters kinds", async () => {
  const out = await runTreeCommand({ cwd: fixture, kind: "seeds", format: "flat" });
  assert.match(out, /seed:StateMachine/);
  assert.doesNotMatch(out, /plugin:/);
});

test("runTreeCommand rejects unknown repo kinds", async () => {
  await assert.rejects(
    () => runTreeCommand({ cwd: fixture, kind: "widgets" }),
    /Unknown component kind\(s\): widgets/,
  );
  assert.match(COMPONENT_KINDS.join(", "), /seeds/);
});

test("runTreeCommand rejects seed-only formats on repo scope", async () => {
  await assert.rejects(
    () => runTreeCommand({ cwd: fixture, format: "tree-verbose" }),
    /Repo tree format must be tree, flat, or json/,
  );
});

test("runTreeCommand seed scope delegates to runSeedTreeCommand", async () => {
  const out = await runTreeCommand({
    cwd: fixture,
    seed: "StateMachine",
    format: "tree",
  });
  assert.match(out, /seed:StateMachine/);
  assert.match(out, /├─|└─/);
});
