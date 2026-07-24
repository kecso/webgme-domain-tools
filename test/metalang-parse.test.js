import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { descriptorToMetalang, parseMetalang } from "webgme-metalang";
import { irToDescriptor } from "../dist/meta/ir-to-descriptor.js";
import { buildSeedMetaIr } from "../dist/introspection/seed-meta.js";
import {
  closeProjectSession,
  openProjectSession,
} from "../dist/session/project-session.js";
import { loadSetupCatalog, resolveSeed } from "../dist/catalog/setup-catalog.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixture = path.join(here, "fixtures", "sample-project");
const hostLib = path.join(here, "fixtures", "libraries", "HostWithSharedMeta.webgmex");

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
