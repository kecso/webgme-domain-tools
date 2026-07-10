import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadSetupCatalog } from "../dist/catalog/setup-catalog.js";
import { resolveSeedSelection } from "../dist/session/seed-resolution.js";
import {
  closeProjectSession,
  openProjectSession,
} from "../dist/session/project-session.js";
import {
  collectSeedNodes,
  displayPath,
  pathDepth,
  relidFromPath,
  renderSeedTree,
} from "../dist/introspection/seed-tree.js";
import { buildSeedMetaIr, renderSeedMeta } from "../dist/introspection/seed-meta.js";
import { runSeedMetaCommand } from "../dist/commands/seed.js";
import { runSeedTreeCommand } from "../dist/commands/seed-tree.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixture = path.join(__dirname, "fixtures", "sample-project");

async function withStateMachineSession(fn) {
  const catalog = loadSetupCatalog(fixture);
  const seed = resolveSeedSelection(catalog, "StateMachine");
  const context = await openProjectSession({ cwd: fixture, seed });
  try {
    return await fn(context);
  } finally {
    await closeProjectSession();
  }
}

test("path helpers", () => {
  assert.equal(pathDepth(""), 0);
  assert.equal(pathDepth("/G/d"), 2);
  assert.equal(relidFromPath("/G/d"), "d");
  assert.equal(displayPath(""), "/");
  assert.equal(displayPath("/1"), "/1");
});

test("openProjectSession imports StateMachine webgmex", async () => {
  await withStateMachineSession(async (context) => {
    assert.match(context.webgmexPath, /StateMachine\.webgmex$/);
    assert.ok(context.rootNode);
    const nodes = await context.core.loadSubTree(context.rootNode);
    assert.ok(nodes.length > 1);
  });
});

test("collectSeedNodes uses depth-first sibling order (not path sort)", async () => {
  await withStateMachineSession(async (context) => {
    const rows = await collectSeedNodes(context.core, context.rootNode, {});
    const underG = rows.filter((r) => r.path === "/G" || r.path.startsWith("/G/"));
    const wIndex = underG.findIndex((r) => r.path === "/G/W");
    const hIndex = underG.findIndex((r) => r.path === "/G/h");
    assert.ok(wIndex >= 0 && hIndex >= 0);
    assert.ok(wIndex < hIndex, "DFS should list /G/W before /G/h (relid order, not localeCompare)");
  });
});

test("collectSeedNodes supports --at subtree", async () => {
  await withStateMachineSession(async (context) => {
    const all = await collectSeedNodes(context.core, context.rootNode, {});
    const rooted = await collectSeedNodes(context.core, context.rootNode, { at: "" });
    assert.equal(all.length, rooted.length);

    const subtree = await collectSeedNodes(context.core, context.rootNode, { at: all[0].path });
    assert.ok(subtree.length >= 1);
    assert.ok(subtree.every((row) => row.path === all[0].path || row.path.startsWith(all[0].path + "/")));
  });
});

test("collectSeedNodes supports --select paths", async () => {
  await withStateMachineSession(async (context) => {
    const all = await collectSeedNodes(context.core, context.rootNode, {});
    const picked = await collectSeedNodes(context.core, context.rootNode, {
      select: [all[0].path, all[1].path],
    });
    assert.equal(picked.length, 2);
    assert.equal(picked[0].path, all[0].path);
    assert.equal(picked[1].path, all[1].path);
  });
});

test("renderSeedTree tree format is indented with path tail", async () => {
  await withStateMachineSession(async (context) => {
    const rows = await collectSeedNodes(context.core, context.rootNode, {});
    const tree = renderSeedTree("StateMachine", context.webgmexPath, rows, { format: "tree" });
    assert.match(tree, /seed:StateMachine/);
    assert.match(tree, /├─|└─/);
    assert.match(tree, /\/G\/W/);
    assert.doesNotMatch(tree, /\[meta/);
    const wLine = tree.split("\n").find((line) => line.includes("/G/W"));
    assert.ok(wLine);
    assert.match(wLine, /\/G\/W\s*$/);
  });
});

test("renderSeedTree tree-verbose includes meta tags", async () => {
  await withStateMachineSession(async (context) => {
    const rows = await collectSeedNodes(context.core, context.rootNode, {});
    const tree = renderSeedTree("StateMachine", context.webgmexPath, rows, { format: "tree-verbose" });
    assert.match(tree, /\[meta/);
  });
});

test("renderSeedTree json and flat formats", async () => {
  await withStateMachineSession(async (context) => {
    const rows = await collectSeedNodes(context.core, context.rootNode, {});
    const json = JSON.parse(
      renderSeedTree("StateMachine", context.webgmexPath, rows, { format: "json" }),
    );
    assert.equal(json.seed, "StateMachine");
    assert.ok(Array.isArray(json.nodes));

    const flat = renderSeedTree("StateMachine", context.webgmexPath, rows.slice(0, 2), {
      format: "flat",
    });
    assert.match(flat, /\t/);
  });
});

test("buildSeedMetaIr returns MetaAspectSet nodes", async () => {
  await withStateMachineSession(async (context) => {
    const ir = buildSeedMetaIr(context);
    assert.equal(ir.seed, "StateMachine");
    assert.ok(ir.metaAspectSet.length > 0);
    assert.ok(ir.metaAspectSet[0].meta);
    const tree = renderSeedMeta(ir, "tree");
    assert.match(tree, /meta\//);
  });
});

test("runSeedTreeCommand and runSeedMetaCommand", async () => {
  const treeOut = await runSeedTreeCommand({
    cwd: fixture,
    seed: "StateMachine",
    format: "tree",
  });
  assert.match(treeOut, /seed:StateMachine/);
  assert.match(treeOut, /├─|└─/);

  const metaOut = await runSeedMetaCommand({
    cwd: fixture,
    seed: "StateMachine",
    format: "json",
  });
  const meta = JSON.parse(metaOut);
  assert.ok(meta.metaAspectSet.length > 0);
});
