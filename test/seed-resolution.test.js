import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { loadSetupCatalog } from "../dist/catalog/setup-catalog.js";
import {
  AmbiguousSeedError,
  resolveSeedSelection,
} from "../dist/session/seed-resolution.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixture = path.join(__dirname, "fixtures", "sample-project");
const cli = path.join(__dirname, "..", "dist", "cli.js");

test("resolveSeedSelection exact match", () => {
  const catalog = loadSetupCatalog(fixture);
  assert.equal(resolveSeedSelection(catalog, "StateMachine").name, "StateMachine");
  assert.equal(resolveSeedSelection(catalog, "seed:StateMachine").name, "StateMachine");
  assert.equal(resolveSeedSelection(catalog, "StateModel").name, "StateModel");
});

test("resolveSeedSelection unique prefix resolves single seed", () => {
  const catalog = loadSetupCatalog(fixture);
  assert.equal(resolveSeedSelection(catalog, "StateMach").name, "StateMachine");
  assert.equal(resolveSeedSelection(catalog, "Empty").name, "EmptySeed");
});

test("resolveSeedSelection throws on unknown seed", () => {
  const catalog = loadSetupCatalog(fixture);
  assert.throws(() => resolveSeedSelection(catalog, "NoSuch"), /Unknown seed/);
});

test("resolveSeedSelection ambiguous on shared prefix lists catalog seeds", () => {
  const catalog = loadSetupCatalog(fixture);
  assert.throws(
    () => resolveSeedSelection(catalog, "State"),
    (err) =>
      err instanceof AmbiguousSeedError &&
      err.candidates.includes("StateMachine") &&
      err.candidates.includes("StateModel"),
  );
});

test("fixture StateModel uses matching webgmex and ignores extra file", () => {
  const catalog = loadSetupCatalog(fixture);
  const seed = catalog.seeds.find((s) => s.name === "StateModel");
  assert.ok(seed);
  assert.equal(seed.artifacts.length, 1);
  assert.match(seed.artifacts[0], /StateModel\.webgmex$/);
  assert.ok(seed.notes.some((n) => n.startsWith("ignored .webgmex: _StateModel_")));
});

test("tree --seed with ambiguous prefix exits 2", () => {
  const result = spawnSync(
    process.execPath,
    [cli, "tree", "--seed", "State", "-C", fixture],
    { encoding: "utf8" },
  );
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Ambiguous seed name/);
  assert.match(result.stderr, /seed:StateMachine/);
  assert.match(result.stderr, /seed:StateModel/);
});

test("tree --seed StateModel loads duplicate seed project", () => {
  const result = spawnSync(
    process.execPath,
    [cli, "tree", "--seed", "StateModel", "-C", fixture],
    { encoding: "utf8" },
  );
  assert.equal(result.status, 0);
  assert.match(result.stdout, /seed:StateModel/);
  assert.match(result.stdout, /StateModel\.webgmex/);
});
