import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadSetupCatalog } from "../dist/catalog/setup-catalog.js";
import {
  AmbiguousSeedError,
  resolveSeedSelection,
} from "../dist/session/seed-resolution.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixture = path.join(__dirname, "fixtures", "sample-project");

function catalogWithExtraSeeds() {
  const catalog = loadSetupCatalog(fixture);
  catalog.seeds = [
    ...catalog.seeds,
    {
      ref: "seed:StateModel",
      kind: "seeds",
      name: "StateModel",
      src: "src/seeds/StateModel",
      absPath: path.join(fixture, "src/seeds/StateModel"),
      exists: true,
      artifacts: [path.join(fixture, "src/seeds/StateModel/StateModel.webgmex")],
      notes: [],
    },
  ];
  return catalog;
}

test("resolveSeedSelection exact match", () => {
  const catalog = loadSetupCatalog(fixture);
  assert.equal(resolveSeedSelection(catalog, "StateMachine").name, "StateMachine");
  assert.equal(resolveSeedSelection(catalog, "seed:StateMachine").name, "StateMachine");
});

test("resolveSeedSelection throws on unknown seed", () => {
  const catalog = loadSetupCatalog(fixture);
  assert.throws(() => resolveSeedSelection(catalog, "NoSuch"), /Unknown seed/);
});

test("resolveSeedSelection ambiguous on shared prefix", () => {
  const catalog = catalogWithExtraSeeds();
  assert.throws(
    () => resolveSeedSelection(catalog, "State"),
    (err) => err instanceof AmbiguousSeedError && err.candidates.includes("StateMachine"),
  );
});
