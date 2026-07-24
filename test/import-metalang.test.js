import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { importMetaLangToWebgmex, materializeMetalangOnContext, defaultMetaTemplatePath } from "../dist/meta/import-metalang.js";
import { buildSeedMetaIr } from "../dist/introspection/seed-meta.js";
import { irToDescriptor } from "../dist/meta/ir-to-descriptor.js";
import { descriptorToMetalang } from "../dist/meta/descriptor-to-metalang.js";
import { parseMetalang } from "../dist/meta/metalang-to-descriptor.js";
import { loadGmeConfigForProject } from "../dist/session/gme-runtime.js";
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
domain SharedMeta

concept State {
  isInitial: bool;
}

domain Host

library SharedMeta

concept Machine {
  contains SharedMeta.State*;
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

test("importMetaLangToWebgmex rejects non-webgmex out path", async () => {
  await assert.rejects(
    () =>
      importMetaLangToWebgmex({
        file: path.join(docsExamples, "state-machine.metalang"),
        out: "not-a-webgmex.json",
        templateWebgmex: path.join(
          fixture,
          "src",
          "seeds",
          "StateModel",
          "StateModel.webgmex",
        ),
      }),
    /\.webgmex/,
  );
});

test("defaultMetaTemplatePath points at bundled StateModel seed", () => {
  assert.match(defaultMetaTemplatePath(), /StateModel\.webgmex$/);
  assert.ok(fs.existsSync(defaultMetaTemplatePath()));
});

test("materializeMetalangOnContext applies host-only metalang onto open session", async () => {
  const template = path.join(fixture, "src", "seeds", "StateModel", "StateModel.webgmex");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "webdot-materialize-"));
  try {
    const work = path.join(dir, "Work.webgmex");
    fs.copyFileSync(template, work);
    const ctx = await openProjectSession({
      cwd: fixture,
      webgmexPath: work,
      seedName: "Work",
    });
    try {
      const parsed = parseMetalang(`
domain Tiny
concept Event;
concept Machine {
  description: string;
  contains Event+;
  set tags[0..10] -> Event*;
}
`);
      const attached = await materializeMetalangOnContext(ctx, parsed, {
        cwd: dir,
        templateWebgmex: template,
        gmeConfig: loadGmeConfigForProject(fixture),
      });
      assert.deepEqual(attached, []);
      const ir = buildSeedMetaIr(ctx);
      const names = ir.metaAspectSet.map((n) => n.name);
      assert.ok(names.includes("Event"));
      assert.ok(names.includes("Machine"));
    } finally {
      await closeProjectSession();
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("materializeMetalangOnContext attaches library onto open host session", async () => {
  const template = path.join(fixture, "src", "seeds", "StateModel", "StateModel.webgmex");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "webdot-materialize-lib-"));
  try {
    const work = path.join(dir, "Work.webgmex");
    fs.copyFileSync(template, work);
    const ctx = await openProjectSession({
      cwd: fixture,
      webgmexPath: work,
      seedName: "Work",
    });
    try {
      const parsed = parseMetalang(`
domain SharedMeta
concept State { isInitial: bool; }

domain Host
library SharedMeta
concept Machine { contains SharedMeta.State*; }
`);
      const attached = await materializeMetalangOnContext(ctx, parsed, {
        cwd: dir,
        templateWebgmex: template,
        gmeConfig: loadGmeConfigForProject(fixture),
      });
      assert.deepEqual(attached, ["SharedMeta"]);
      const ir = buildSeedMetaIr(ctx);
      assert.deepEqual(ir.libraries, ["SharedMeta"]);
    } finally {
      await closeProjectSession();
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("importMetaLangToWebgmex applies set + global cardinality", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "webdot-import-card-"));
  try {
    const mlPath = path.join(dir, "Card.metalang");
    fs.writeFileSync(
      mlPath,
      `
domain CardTest
concept Pin;
concept Port {
  contains[0..5] Pin+;
  set pins[1..10] -> Pin*;
}
`,
    );
    const out = path.join(dir, "Card.webgmex");
    await importMetaLangToWebgmex({
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
    const ctx = await openProjectSession({ cwd: fixture, webgmexPath: out, seedName: "Card" });
    try {
      const descriptor = irToDescriptor(buildSeedMetaIr(ctx), ctx);
      assert.ok(descriptor.concepts.Port.contains);
      assert.ok(descriptor.concepts.Port.sets.pins);
    } finally {
      await closeProjectSession();
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
