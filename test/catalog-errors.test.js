import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  formatUnknownPluginError,
  formatUnknownSeedError,
} from "../dist/catalog/catalog-errors.js";
import { loadSetupCatalog } from "../dist/catalog/setup-catalog.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixture = path.join(__dirname, "fixtures", "sample-project");

function catalog() {
  return loadSetupCatalog(fixture);
}

test("formatUnknownSeedError lists available seeds", () => {
  const msg = formatUnknownSeedError(catalog(), "NoSuchSeed");
  assert.match(msg, /Unknown seed "NoSuchSeed"/);
  assert.match(msg, /Available seeds/);
  assert.match(msg, /seed:StateMachine/);
  assert.match(msg, /webdot tree repo --kind seeds/);
  assert.doesNotMatch(msg, /Did you mean/);
});

test("formatUnknownSeedError suggests close typo", () => {
  const msg = formatUnknownSeedError(catalog(), "StateMachin");
  assert.match(msg, /Did you mean: seed:StateMachine/);
});

test("formatUnknownSeedError skips suggestion when no close match", () => {
  const msg = formatUnknownSeedError(catalog(), "ZZZZZZZZ");
  assert.doesNotMatch(msg, /Did you mean/);
});

test("formatUnknownPluginError lists available plugins", () => {
  const msg = formatUnknownPluginError(catalog(), "NoSuchPlugin");
  assert.match(msg, /Unknown plugin "NoSuchPlugin"/);
  assert.match(msg, /Available plugins/);
  assert.match(msg, /plugin:SamplePlugin/);
  assert.match(msg, /webdot tree repo --kind plugins/);
});

test("formatUnknownPluginError suggests close typo", () => {
  const msg = formatUnknownPluginError(catalog(), "SamplePlugn");
  assert.match(msg, /Did you mean: plugin:SamplePlugin/);
});

test("formatUnknownPluginError skips suggestion when no close match", () => {
  const msg = formatUnknownPluginError(catalog(), "ZZZZZZZZ");
  assert.doesNotMatch(msg, /Did you mean/);
});
