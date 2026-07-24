import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { importMetaLangToWebgmex } from "../dist/meta/import-metalang.js";
import { buildSeedMetaIr } from "../dist/introspection/seed-meta.js";
import { irToDescriptor } from "../dist/meta/ir-to-descriptor.js";
import { descriptorToMetalang } from "../dist/meta/descriptor-to-metalang.js";
import { parseMetalang } from "../dist/meta/metalang-to-descriptor.js";
import {
  closeProjectSession,
  openProjectSession,
} from "../dist/session/project-session.js";
import { runLibraryList } from "../dist/session/libraries.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const docsExamples = path.join(here, "..", "docs", "meta", "examples");
const fixture = path.join(here, "fixtures", "sample-project");

test("importMetaLangToWebgmex creates StateMachine from example metalang", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "webdot-import-ml-"));
  try {
    const out = path.join(dir, "Out.webgmex");
    const result = await importMetaLangToWebgmex({
      cwd: dir,
      file: path.join(docsExamples, "state-machine.metalang"),
      out,
      templateWebgmex: path.join(
        fixture,
        "src",
        "seeds",
        "StateModel",
        "StateModel.webgmex",
      ),
    });
    assert.equal(result.domain, "StaMS.StateMachine");
    assert.ok(fs.existsSync(out));

    const ctx = await openProjectSession({
      cwd: fixture,
      webgmexPath: out,
      seedName: "Out",
    });
    try {
      const ir = buildSeedMetaIr(ctx);
      const descriptor = irToDescriptor(ir, ctx);
      assert.ok(descriptor.concepts.State);
      assert.ok(descriptor.concepts.Machine);
      assert.equal(descriptor.concepts.State.attributes.isInitial, "bool");
    } finally {
      await closeProjectSession();
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("importMetaLangToWebgmex attaches library blocks like GUI addLibrary", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "webdot-import-lib-"));
  try {
    const metalang = `
domain Host

concept Machine {
  contains SharedMeta.State*;
}

library SharedMeta {
  concept State {
    isInitial: bool;
  }
}
`;
    const mlPath = path.join(dir, "Host.metalang");
    fs.writeFileSync(mlPath, metalang);
    const out = path.join(dir, "Host.webgmex");
    const result = await importMetaLangToWebgmex({
      cwd: dir,
      file: mlPath,
      out,
      templateWebgmex: path.join(
        fixture,
        "src",
        "seeds",
        "StateModel",
        "StateModel.webgmex",
      ),
    });
    assert.deepEqual(result.libraries, ["SharedMeta"]);

    const listed = await runLibraryList({ webgmex: out, cwd: dir });
    assert.equal(listed.libraries.length, 1);
    assert.equal(listed.libraries[0].name, "SharedMeta");

    const ctx = await openProjectSession({
      cwd: fixture,
      webgmexPath: out,
      seedName: "Host",
    });
    try {
      const ir = buildSeedMetaIr(ctx);
      assert.deepEqual(ir.libraries, ["SharedMeta"]);
      const descriptor = irToDescriptor(ir, ctx);
      assert.ok(descriptor.concepts.Machine);
      assert.ok(descriptor.concepts["SharedMeta.State"]);
      const roundTrip = parseMetalang(descriptorToMetalang(descriptor, "Host"));
      assert.ok(roundTrip.descriptor.concepts["SharedMeta.State"]);
    } finally {
      await closeProjectSession();
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
