import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runLsCommand } from "../dist/commands/ls.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixture = path.join(__dirname, "fixtures", "sample-project");

test("runLsCommand lists all kinds by default", () => {
  const out = runLsCommand(fixture);
  assert.match(out, /seeds:\n  local: .*StateMachine.*StateModel/);
  assert.match(out, /plugins:\n  local: .*SamplePlugin/);
  assert.match(out, /visualizers:\n  local: SampleViz/);
  assert.match(out, /routers:\n  local: SampleRouter/);
});

test("runLsCommand filters by kind", () => {
  const out = runLsCommand(fixture, "plugins");
  assert.match(out, /^plugins:\n  local: /);
  assert.match(out, /SamplePlugin/);
  assert.doesNotMatch(out, /^seeds:/m);
});

test("runLsCommand throws on unknown kind", () => {
  assert.throws(() => runLsCommand(fixture, "widgets"), /Unknown kind/);
});
