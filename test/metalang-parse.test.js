import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { descriptorToMetalang } from "../dist/meta/descriptor-to-metalang.js";
import { parseMetalang, parseMetalangFile } from "../dist/meta/metalang-to-descriptor.js";
import { irToDescriptor } from "../dist/meta/ir-to-descriptor.js";
import { buildSeedMetaIr } from "../dist/introspection/seed-meta.js";
import {
  closeProjectSession,
  openProjectSession,
} from "../dist/session/project-session.js";
import { loadSetupCatalog, resolveSeed } from "../dist/catalog/setup-catalog.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const docsExamples = path.join(here, "..", "docs", "meta", "examples");
const fixture = path.join(here, "fixtures", "sample-project");
const hostLib = path.join(here, "fixtures", "libraries", "HostWithSharedMeta.webgmex");

test("parseMetalang round-trips StateMachine example", () => {
  const source = fs.readFileSync(path.join(docsExamples, "state-machine.metalang"), "utf8");
  const expected = JSON.parse(
    fs.readFileSync(path.join(docsExamples, "state-machine.descriptor.json"), "utf8"),
  );
  const parsed = parseMetalang(source);
  assert.equal(parsed.domain, "StaMS.StateMachine");
  assert.deepEqual(parsed.descriptor.concepts, expected.concepts);
});

test("parseMetalang library block prefixes FQNs", () => {
  const parsed = parseMetalang(`
domain Host

concept Machine {
  contains SharedMeta.State*;
}

library SharedMeta {
  concept State {
    isInitial: bool;
  }
}
`);
  assert.deepEqual(parsed.libraries, ["SharedMeta"]);
  assert.ok(parsed.descriptor.concepts.Machine);
  assert.ok(parsed.descriptor.concepts["SharedMeta.State"]);
  assert.equal(parsed.descriptor.concepts["SharedMeta.State"].attributes.isInitial, "bool");
  assert.deepEqual(parsed.descriptor.concepts.Machine.contains, {
    "SharedMeta.State": "*",
  });
});

test("parseMetalang import loads sibling file as library", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "webdot-ml-import-"));
  try {
    fs.writeFileSync(
      path.join(dir, "SharedMeta.metalang"),
      `domain SharedMeta\n\nconcept State {\n  isInitial: bool;\n}\n`,
    );
    fs.writeFileSync(
      path.join(dir, "Host.metalang"),
      `domain Host\n\nimport SharedMeta from "./SharedMeta.metalang"\n\nconcept Machine {\n  contains SharedMeta.State*;\n}\n`,
    );
    const parsed = parseMetalangFile(path.join(dir, "Host.metalang"));
    assert.deepEqual(parsed.libraries, ["SharedMeta"]);
    assert.ok(parsed.descriptor.concepts["SharedMeta.State"]);
    assert.ok(parsed.descriptor.concepts.Machine);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("descriptorToMetalang emits library blocks (canonical)", () => {
  const metalang = descriptorToMetalang(
    {
      version: 1,
      concepts: {
        Machine: { contains: { "SharedMeta.State": "*" } },
        "SharedMeta.State": { attributes: { isInitial: "bool" } },
      },
    },
    "Host",
  );
  assert.match(metalang, /^domain Host/);
  assert.match(metalang, /concept Machine \{/);
  assert.match(metalang, /library SharedMeta \{/);
  assert.match(metalang, /concept State \{/);
  assert.doesNotMatch(metalang, /concept SharedMeta\.State/);
});

test("library fixture metalang round-trips through parse", async () => {
  const context = await openProjectSession({
    cwd: fixture,
    webgmexPath: hostLib,
    seedName: "HostWithSharedMeta",
  });
  try {
    const ir = buildSeedMetaIr(context);
    const descriptor = irToDescriptor(ir, context);
    const metalang = descriptorToMetalang(descriptor, "HostWithSharedMeta");
    assert.match(metalang, /library SharedMeta \{/);
    const parsed = parseMetalang(metalang);
    // Host + library concept keys should match (order-independent).
    assert.deepEqual(
      Object.keys(parsed.descriptor.concepts).sort(),
      Object.keys(descriptor.concepts).sort(),
    );
  } finally {
    await closeProjectSession();
  }
});

test("StateMachine seed metalang parse matches irToDescriptor", async () => {
  const catalog = loadSetupCatalog(fixture);
  const entry = resolveSeed(catalog, "StateMachine");
  const context = await openProjectSession({ cwd: fixture, seed: entry });
  try {
    const ir = buildSeedMetaIr(context);
    const descriptor = irToDescriptor(ir, context);
    const metalang = descriptorToMetalang(descriptor, "StateMachine");
    const parsed = parseMetalang(metalang);
    assert.deepEqual(parsed.descriptor.concepts, descriptor.concepts);
  } finally {
    await closeProjectSession();
  }
});
