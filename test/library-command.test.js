import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  runLibraryAdd,
  runLibraryList,
  runLibraryRemove,
  formatLibraryList,
} from "../dist/session/libraries.js";
import { openProjectSession, closeProjectSession } from "../dist/session/project-session.js";
import { buildSeedMetaIr } from "../dist/introspection/seed-meta.js";
import { irToDescriptor } from "../dist/meta/ir-to-descriptor.js";
import { descriptorToMetalang } from "../dist/meta/descriptor-to-metalang.js";
import { collectSeedNodes, renderSeedTree } from "../dist/introspection/seed-tree.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const stateMachine = path.join(
  __dirname,
  "fixtures/sample-project/src/seeds/StateMachine/StateMachine.webgmex",
);
const stateModel = path.join(
  __dirname,
  "fixtures/sample-project/src/seeds/StateModel/StateModel.webgmex",
);
const fixtureCwd = path.join(__dirname, "fixtures/sample-project");

function copyHost() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "webdot-lib-"));
  const dest = path.join(dir, "Host.webgmex");
  fs.copyFileSync(stateMachine, dest);
  return { dir, dest };
}

test("descriptorToMetaTs nests library FQNs (unit)", async () => {
  const { createRequire } = await import("node:module");
  const require = createRequire(import.meta.url);
  const { descriptorToMetaTs } = require("../plugins/GenerateMetaTs/lib/descriptor-to-meta-ts.js");
  const out = descriptorToMetaTs(
    {
      version: 1,
      concepts: {
        Machine: {
          pointers: { initial: "SharedMeta.State" },
          contains: { "SharedMeta.State": "*" },
        },
        "SharedMeta.State": {
          attributes: { isInitial: "bool" },
        },
      },
    },
    { seedName: "unit" },
  );
  assert.match(out, /export namespace SharedMeta \{/);
  assert.match(out, /export interface State \{/);
  assert.match(out, /export interface Machine \{/);
  assert.match(out, /initial\?: SharedMeta\.State/);
  assert.match(out, /"SharedMeta\.State"/);
});

test("library add / list / remove on a copied host (always persists)", async () => {
  const { dir, dest } = copyHost();
  try {
    const added = await runLibraryAdd({
      webgmex: dest,
      cwd: fixtureCwd,
      from: stateModel,
      as: "SharedMeta",
    });
    assert.equal(added.action, "add");
    assert.equal(added.library, "SharedMeta");
    assert.ok(fs.existsSync(dest));

    const listed = await runLibraryList({ webgmex: dest, cwd: fixtureCwd });
    assert.equal(listed.libraries.length, 1);
    assert.equal(listed.libraries[0].name, "SharedMeta");
    assert.match(formatLibraryList(listed), /SharedMeta/);

    const ctx = await openProjectSession({
      cwd: fixtureCwd,
      webgmexPath: dest,
      seedName: "Host",
    });
    try {
      const ir = buildSeedMetaIr(ctx);
      assert.deepEqual(ir.libraries, ["SharedMeta"]);
      assert.ok(ir.metaAspectSet.some((n) => n.namespace === "SharedMeta"));

      const descriptor = irToDescriptor(ir, ctx);
      const libKeys = Object.keys(descriptor.concepts).filter((k) => k.startsWith("SharedMeta."));
      assert.ok(libKeys.length > 0, "descriptor should key library concepts by FQN");
      assert.ok(
        Object.keys(descriptor.concepts).some((k) => !k.includes(".")),
        "host concepts stay bare",
      );

      const metalang = descriptorToMetalang(descriptor, "Host");
      assert.match(metalang, /concept SharedMeta\./);

      const rows = await collectSeedNodes(ctx.core, ctx.rootNode, {});
      const tree = renderSeedTree("Host", dest, rows, { format: "tree-verbose" });
      assert.match(tree, /library-root/);
      // First child under root should be a library root when libraries exist.
      const rootChildren = rows.filter((r) => {
        const parts = r.path.split("/").filter(Boolean);
        return parts.length === 1;
      });
      // rows[0] is ROOT itself; first depth-1 after root in DFS should prefer library.
      const firstDepth1 = rows.find((r) => r.path.split("/").filter(Boolean).length === 1);
      assert.ok(firstDepth1);
      assert.equal(firstDepth1.isLibraryRoot, true);
      assert.ok(rootChildren[0].isLibraryRoot);
    } finally {
      await closeProjectSession();
    }

    const removed = await runLibraryRemove({
      webgmex: dest,
      cwd: fixtureCwd,
      name: "SharedMeta",
    });
    assert.equal(removed.action, "remove");
    const after = await runLibraryList({ webgmex: dest, cwd: fixtureCwd });
    assert.equal(after.libraries.length, 0);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("library add rejects duplicate name", async () => {
  const { dir, dest } = copyHost();
  try {
    await runLibraryAdd({
      webgmex: dest,
      cwd: fixtureCwd,
      from: stateModel,
      as: "SharedMeta",
    });
    await assert.rejects(
      () =>
        runLibraryAdd({
          webgmex: dest,
          cwd: fixtureCwd,
          from: stateModel,
          as: "SharedMeta",
        }),
      /already attached/,
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("library remove rejects missing name", async () => {
  const { dir, dest } = copyHost();
  try {
    await assert.rejects(
      () =>
        runLibraryRemove({
          webgmex: dest,
          cwd: fixtureCwd,
          name: "NoSuchLib",
        }),
      /not attached/,
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
