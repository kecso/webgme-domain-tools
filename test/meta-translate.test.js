import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { buildSeedMetaIr, renderSeedMetaOutput } from "../dist/introspection/seed-meta.js";
import { irToDescriptor } from "../dist/meta/ir-to-descriptor.js";
import { descriptorToMetalang } from "../dist/meta/descriptor-to-metalang.js";
import {
  cardinalityFromMinMax,
  cardinalityToMinMax,
  formatGlobalCardinality,
  formatMemberCardinality,
  parseCardinalityToken,
} from "../dist/meta/cardinality.js";
import { parseSeedMetaFormat, runSeedMetaCommand } from "../dist/commands/seed.js";
import {
  closeProjectSession,
  openProjectSession,
} from "../dist/session/project-session.js";
import { loadSetupCatalog, resolveSeed } from "../dist/catalog/setup-catalog.js";

const fixture = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures", "sample-project");
const docsExamples = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "docs", "meta", "examples");

async function withStateMachineSession(fn) {
  const catalog = loadSetupCatalog(fixture);
  const entry = resolveSeed(catalog, "StateMachine");
  const context = await openProjectSession({ cwd: fixture, seed: entry });
  try {
    await fn(context);
  } finally {
    await closeProjectSession();
  }
}

test("cardinalityFromMinMax maps core limits", () => {
  assert.equal(cardinalityFromMinMax(-1, -1), undefined);
  assert.equal(cardinalityFromMinMax(null, undefined), undefined);
  assert.equal(cardinalityFromMinMax(0, -1), "*");
  assert.equal(cardinalityFromMinMax(1, -1), "+");
  assert.equal(cardinalityFromMinMax(-1, 1), "0..1");
  assert.equal(cardinalityFromMinMax(0, 1), "0..1");
  assert.equal(cardinalityFromMinMax(2, 5), "2..5");
  assert.equal(cardinalityFromMinMax(3, 3), "3");
  assert.equal(cardinalityFromMinMax(10, 100), "10..100");
  assert.equal(cardinalityFromMinMax(-1, 8), "0..8");
  assert.equal(cardinalityFromMinMax(2, -1), undefined);
});

test("formatMemberCardinality for MetaLang suffixes", () => {
  assert.equal(formatMemberCardinality(undefined), "*");
  assert.equal(formatMemberCardinality("*"), "*");
  assert.equal(formatMemberCardinality("+"), "+");
  assert.equal(formatMemberCardinality("0..1"), "?");
  assert.equal(formatMemberCardinality("?"), "?");
  assert.equal(formatMemberCardinality("3"), ":3");
  assert.equal(formatMemberCardinality("2..5"), ":2..5");
});

test("formatGlobalCardinality for bracket syntax", () => {
  assert.equal(formatGlobalCardinality("*"), "0..*");
  assert.equal(formatGlobalCardinality("+"), "1..*");
  assert.equal(formatGlobalCardinality("0..1"), "0..1");
  assert.equal(formatGlobalCardinality("?"), "0..1");
  assert.equal(formatGlobalCardinality("0..100"), "0..100");
});

test("parseCardinalityToken accepts MetaLang suffixes and tokens", () => {
  assert.equal(parseCardinalityToken("*"), "*");
  assert.equal(parseCardinalityToken("+"), "+");
  assert.equal(parseCardinalityToken("?"), "0..1");
  assert.equal(parseCardinalityToken("3"), "3");
  assert.equal(parseCardinalityToken("2..5"), "2..5");
  assert.equal(parseCardinalityToken("0..*"), "*");
  assert.equal(parseCardinalityToken("1..*"), "+");
  assert.equal(parseCardinalityToken("2..*"), "2..*");
  assert.throws(() => parseCardinalityToken("nope"), /Invalid cardinality/);
});

test("cardinalityToMinMax maps descriptor cards to core limits", () => {
  assert.deepEqual(cardinalityToMinMax(undefined), { min: 0, max: -1 });
  assert.deepEqual(cardinalityToMinMax("*"), { min: 0, max: -1 });
  assert.deepEqual(cardinalityToMinMax("+"), { min: 1, max: -1 });
  assert.deepEqual(cardinalityToMinMax("?"), { min: 0, max: 1 });
  assert.deepEqual(cardinalityToMinMax("0..1"), { min: 0, max: 1 });
  assert.deepEqual(cardinalityToMinMax("3"), { min: 3, max: 3 });
  assert.deepEqual(cardinalityToMinMax("2..5"), { min: 2, max: 5 });
  assert.deepEqual(cardinalityToMinMax("2..*"), { min: 2, max: -1 });
  assert.throws(() => cardinalityToMinMax("nope"), /Unsupported cardinality/);
});

test("parseSeedMetaFormat accepts all meta output formats", () => {
  assert.equal(parseSeedMetaFormat("descriptor"), "descriptor");
  assert.equal(parseSeedMetaFormat("metalang"), "metalang");
  assert.equal(parseSeedMetaFormat("tree"), "tree");
  assert.equal(parseSeedMetaFormat("tree-verbose"), "tree-verbose");
  assert.throws(
    () => parseSeedMetaFormat("yaml"),
    /json, tree, tree-verbose, descriptor, or metalang/,
  );
});

test("irToDescriptor matches StateMachine example", async () => {
  await withStateMachineSession(async (context) => {
    const ir = buildSeedMetaIr(context);
    const descriptor = irToDescriptor(ir, context);
    const expected = JSON.parse(
      readFileSync(path.join(docsExamples, "state-machine.descriptor.json"), "utf8"),
    );

    assert.deepEqual(descriptor.concepts, expected.concepts);
  });
});

test("descriptorToMetalang renders pointers including src/dst", async () => {
  await withStateMachineSession(async (context) => {
    const ir = buildSeedMetaIr(context);
    const descriptor = irToDescriptor(ir, context);
    const metalang = descriptorToMetalang(descriptor, "StateMachine");

    assert.match(metalang, /^domain StateMachine/);
    assert.match(metalang, /concept Transition \{/);
    assert.match(metalang, /src -> State;/);
    assert.match(metalang, /dst -> State;/);
    assert.match(metalang, /contains Action\*, Constraint\*, Event\*, Guard\*, State\*, Variable\*;/);
    assert.doesNotMatch(metalang, /relationship/);
  });
});

test("runSeedMetaCommand descriptor and metalang formats", async () => {
  const descriptorOut = await runSeedMetaCommand({
    cwd: fixture,
    seed: "StateMachine",
    format: "descriptor",
  });
  const descriptor = JSON.parse(descriptorOut);
  assert.equal(descriptor.version, 1);
  assert.deepEqual(descriptor.concepts.Transition.pointers, {
    src: "State",
    dst: "State",
    event: "Event",
    guard: "Guard",
    action: "Action",
  });

  const metalangOut = await runSeedMetaCommand({
    cwd: fixture,
    seed: "StateMachine",
    format: "metalang",
  });
  assert.match(metalangOut, /entry -> Action;/);
});

test("renderSeedMetaOutput tree matches seed tree indentation", async () => {
  await withStateMachineSession(async (context) => {
    const ir = buildSeedMetaIr(context);
    const tree = renderSeedMetaOutput(ir, "tree");
    assert.match(tree, /^seed:StateMachine/);
    assert.match(tree, /├─|└─/);
    const stateLine = tree.split("\n").find((line) => line.includes("/G/z"));
    assert.ok(stateLine);
    assert.match(stateLine, /\/G\/z\s*$/);
    assert.match(stateLine, /State/);
  });
});

test("renderSeedMetaOutput tree-verbose includes meta tag", async () => {
  await withStateMachineSession(async (context) => {
    const ir = buildSeedMetaIr(context);
    const tree = renderSeedMetaOutput(ir, "tree-verbose");
    assert.match(tree, /\[meta\]/);
  });
});
