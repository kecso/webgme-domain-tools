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

test("parseMetalang multi-domain + library directive", () => {
  const parsed = parseMetalang(`
domain SharedMeta

concept State {
  isInitial: bool;
}

domain Host

library SharedMeta

concept Machine {
  contains SharedMeta.State*;
}
`);
  assert.equal(parsed.domain, "Host");
  assert.deepEqual(parsed.libraries, ["SharedMeta"]);
  assert.ok(parsed.domains.SharedMeta);
  assert.ok(parsed.domains.Host);
  assert.equal(parsed.domains.SharedMeta.concepts.State.attributes.isInitial, "bool");
  // Inside SharedMeta domain, refs stay bare until flatten.
  assert.ok(parsed.descriptor.concepts["SharedMeta.State"]);
  assert.ok(parsed.descriptor.concepts.Machine);
  assert.deepEqual(parsed.descriptor.concepts.Machine.contains, {
    "SharedMeta.State": "*",
  });
});

test("parseMetalang library as renames namespace", () => {
  const parsed = parseMetalang(`
domain SharedMeta
concept State;

domain Host
library SharedMeta as SM
concept Machine { contains SM.State*; }
`);
  assert.deepEqual(parsed.libraries, ["SM"]);
  assert.ok(parsed.descriptor.concepts["SM.State"]);
  assert.deepEqual(parsed.descriptor.concepts.Machine.contains, { "SM.State": "*" });
});

test("parseMetalang import loads sibling domain file", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "webdot-ml-import-"));
  try {
    fs.writeFileSync(
      path.join(dir, "SharedMeta.metalang"),
      `domain SharedMeta\n\nconcept State {\n  isInitial: bool;\n}\n`,
    );
    fs.writeFileSync(
      path.join(dir, "Host.metalang"),
      `domain Host\n\nimport SharedMeta from "./SharedMeta.metalang"\nlibrary SharedMeta\n\nconcept Machine {\n  contains SharedMeta.State*;\n}\n`,
    );
    const parsed = parseMetalangFile(path.join(dir, "Host.metalang"));
    assert.deepEqual(parsed.libraries, ["SharedMeta"]);
    assert.ok(parsed.descriptor.concepts["SharedMeta.State"]);
    assert.ok(parsed.descriptor.concepts.Machine);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("parseMetalang library from is import+attach sugar", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "webdot-ml-libfrom-"));
  try {
    fs.writeFileSync(
      path.join(dir, "SharedMeta.metalang"),
      `domain SharedMeta\nconcept State;\n`,
    );
    const parsed = parseMetalang(
      `domain Host\nlibrary SharedMeta from "./SharedMeta.metalang"\nconcept M { contains SharedMeta.State*; }\n`,
      { baseDir: dir },
    );
    assert.deepEqual(parsed.libraries, ["SharedMeta"]);
    assert.ok(parsed.descriptor.concepts["SharedMeta.State"]);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("descriptorToMetalang emits multi-domain + library directives (canonical)", () => {
  const metalang = descriptorToMetalang(
    {
      version: 1,
      concepts: {
        Machine: { contains: { "SharedMeta.State": "*" } },
        "SharedMeta.State": {
          attributes: { isInitial: "bool" },
          pointers: { next: "SharedMeta.State" },
        },
      },
    },
    "Host",
  );
  assert.match(metalang, /domain SharedMeta/);
  assert.match(metalang, /domain Host/);
  assert.match(metalang, /^library SharedMeta$/m);
  assert.match(metalang, /concept State \{/);
  assert.match(metalang, /next -> State;/); // bare inside SharedMeta domain
  assert.match(metalang, /contains SharedMeta\.State\*/); // FQN on host
  assert.doesNotMatch(metalang, /library SharedMeta \{/);
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
    assert.match(metalang, /domain SharedMeta/);
    assert.match(metalang, /library SharedMeta/);
    const parsed = parseMetalang(metalang);
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
