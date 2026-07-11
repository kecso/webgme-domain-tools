import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadSetupCatalog,
  resolvePlugin,
  resolveSeed,
} from "../dist/catalog/setup-catalog.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixture = path.join(__dirname, "fixtures", "sample-project");
const noSetup = path.join(__dirname, "fixtures", "no-setup");

test("loadSetupCatalog throws when webgme-setup.json is missing", () => {
  assert.throws(() => loadSetupCatalog(noSetup), /Missing webgme-setup\.json/);
});

test("loadSetupCatalog reads all component kinds", () => {
  const catalog = loadSetupCatalog(fixture);
  assert.equal(catalog.seeds.length, 3);
  assert.equal(catalog.plugins.length, 7);
  assert.equal(catalog.visualizers.length, 1);
  assert.equal(catalog.routers.length, 1);
});

test("StateMachine seed uses matching webgmex only", () => {
  const catalog = loadSetupCatalog(fixture);
  const seed = catalog.seeds.find((s) => s.name === "StateMachine");
  assert.ok(seed);
  assert.equal(seed.artifacts.length, 1);
  assert.match(seed.artifacts[0], /StateMachine\.webgmex$/);
  assert.ok(seed.notes.some((n) => n.startsWith("ignored .webgmex: _StateMachine_")));
});

test("StateModel seed uses matching webgmex only", () => {
  const catalog = loadSetupCatalog(fixture);
  const seed = catalog.seeds.find((s) => s.name === "StateModel");
  assert.ok(seed);
  assert.equal(seed.artifacts.length, 1);
  assert.match(seed.artifacts[0], /StateModel\.webgmex$/);
  assert.ok(seed.notes.some((n) => n.startsWith("ignored .webgmex: _StateModel_")));
});

test("EmptySeed notes missing webgmex", () => {
  const catalog = loadSetupCatalog(fixture);
  const seed = catalog.seeds.find((s) => s.name === "EmptySeed");
  assert.ok(seed);
  assert.equal(seed.artifacts.length, 0);
  assert.match(seed.notes[0], /missing .webgmex/);
});

test("MissingPlugin marks src as missing", () => {
  const catalog = loadSetupCatalog(fixture);
  const plugin = catalog.plugins.find((p) => p.name === "MissingPlugin");
  assert.ok(plugin);
  assert.equal(plugin.exists, false);
});

test("ModelToVerification notes blob artifacts", () => {
  const catalog = loadSetupCatalog(fixture);
  const plugin = catalog.plugins.find((p) => p.name === "ModelToVerification");
  assert.ok(plugin);
  assert.ok(plugin.notes.some((n) => n === "produces blob artifacts"));
});

test("SamplePlugin resolves metadata path", () => {
  const catalog = loadSetupCatalog(fixture);
  const plugin = catalog.plugins.find((p) => p.name === "SamplePlugin");
  assert.ok(plugin?.metadataPath);
});

test("plugin without metadata notes missing metadata.json", () => {
  const catalog = loadSetupCatalog(fixture);
  const plugin = catalog.plugins.find((p) => p.name === "NoMetaPlugin");
  assert.ok(plugin);
  assert.equal(plugin.metadataPath, undefined);
  assert.ok(plugin.notes.some((n) => n === "missing metadata.json"));
});

test("resolveSeed throws formatted unknown seed error", () => {
  const catalog = loadSetupCatalog(fixture);
  assert.throws(() => resolveSeed(catalog, "NoSuchSeed"), /Unknown seed/);
  assert.throws(() => resolveSeed(catalog, "NoSuchSeed"), /seed:StateMachine/);
});

test("resolveSeed suggests on typo", () => {
  const catalog = loadSetupCatalog(fixture);
  assert.throws(() => resolveSeed(catalog, "StateMachin"), /Did you mean/);
});

test("resolvePlugin throws formatted unknown plugin error", () => {
  const catalog = loadSetupCatalog(fixture);
  assert.throws(() => resolvePlugin(catalog, "NoSuchPlugin"), /Unknown plugin/);
  assert.throws(() => resolvePlugin(catalog, "NoSuchPlugin"), /plugin:SamplePlugin/);
});

test("resolvePlugin suggests on typo", () => {
  const catalog = loadSetupCatalog(fixture);
  assert.throws(() => resolvePlugin(catalog, "SamplePlugn"), /Did you mean/);
});

test("resolveSeed returns entry by name or ref", () => {
  const catalog = loadSetupCatalog(fixture);
  assert.equal(resolveSeed(catalog, "StateMachine").ref, "seed:StateMachine");
  assert.equal(resolveSeed(catalog, "seed:StateMachine").ref, "seed:StateMachine");
});

test("resolvePlugin returns entry by name or ref", () => {
  const catalog = loadSetupCatalog(fixture);
  assert.equal(resolvePlugin(catalog, "SamplePlugin").ref, "plugin:SamplePlugin");
  assert.equal(resolvePlugin(catalog, "plugin:SamplePlugin").ref, "plugin:SamplePlugin");
});
