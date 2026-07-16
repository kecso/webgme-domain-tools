import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import os from "node:os";
import { runPluginInfoCommand, runPluginRunCommand } from "../dist/plugin/plugin-runner.js";
import { loadSetupCatalog } from "../dist/catalog/setup-catalog.js";
import {
  closeProjectSession,
  openProjectSession,
} from "../dist/session/project-session.js";
import { collectSeedNodes } from "../dist/introspection/seed-tree.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixture = path.join(__dirname, "fixtures", "sample-project");
const artifactsDir = path.join(fixture, "_artifacts");
const stateMachineWebgmex = path.join(
  fixture,
  "src",
  "seeds",
  "StateMachine",
  "StateMachine.webgmex",
);
const echoPluginDir = path.join(fixture, "src", "plugins", "EchoPlugin");

async function countNodes(webgmexPath) {
  const context = await openProjectSession({
    cwd: fixture,
    webgmexPath,
    seedName: "probe",
  });
  try {
    const rows = await collectSeedNodes(context.core, context.rootNode, {});
    return rows.length;
  } finally {
    await closeProjectSession();
  }
}

test("runPluginInfoCommand returns configStructure defaults", async () => {
  const out = await runPluginInfoCommand({ cwd: fixture, plugin: "EchoPlugin" });
  const info = JSON.parse(out);
  assert.equal(info.id, "EchoPlugin");
  assert.equal(info.defaults.message, "hello");
  assert.ok(info.configStructure.length >= 3);
});

test("runPluginRunCommand executes EchoPlugin successfully", async () => {
  const result = await runPluginRunCommand({
    cwd: fixture,
    plugin: "EchoPlugin",
    seed: "StateMachine",
    set: ["message=test-run"],
    dryRun: true,
  });
  assert.equal(result.success, true);
  const payload = JSON.parse(result.output);
  assert.equal(payload.context.project.name, "StateMachine");
  assert.equal(payload.context.activeNode, "/");
  assert.deepEqual(payload.context.activeSelection, []);
  assert.equal(payload.context.branch, undefined);
  assert.equal(payload.result.messages[0].message, "test-run");
  assert.equal(result.persisted, false);
  assert.equal(result.warnings.length, 0);
});

test("runPluginRunCommand reports failure from shouldFail config", async () => {
  const result = await runPluginRunCommand({
    cwd: fixture,
    plugin: "EchoPlugin",
    seed: "StateMachine",
    set: ["shouldFail=true"],
  });
  assert.equal(result.success, false);
  assert.match(JSON.parse(result.output).result.error ?? "", /Failed on purpose/);
});

test("runPluginRunCommand warns when artifacts are not persisted", async () => {
  const result = await runPluginRunCommand({
    cwd: fixture,
    plugin: "EchoPlugin",
    seed: "StateMachine",
    set: ["emitArtifact=true"],
  });
  assert.equal(result.success, true);
  assert.equal(result.warnings.length, 1);
  assert.match(result.warnings[0], /not persisted/);
});

test("runPluginRunCommand writes artifacts with --artifacts-out", async () => {
  fs.rmSync(artifactsDir, { recursive: true, force: true });
  const result = await runPluginRunCommand({
    cwd: fixture,
    plugin: "EchoPlugin",
    seed: "StateMachine",
    set: ["emitArtifact=true", "message=persist-me"],
    artifactsOut: "_artifacts",
  });
  assert.equal(result.success, true);
  assert.equal(result.warnings.length, 0);
  const artifactFile = path.join(artifactsDir, "echo.txt");
  assert.equal(fs.readFileSync(artifactFile, "utf8"), "persist-me");
  fs.rmSync(artifactsDir, { recursive: true, force: true });
});

test("runPluginRunCommand resolves --artifacts-out relative to sessionCwd not project cwd", async () => {
  const execDir = fs.mkdtempSync(path.join(os.tmpdir(), "webdot-art-cwd-"));
  const outRel = "_artifacts_exec";
  const outAbs = path.join(execDir, outRel);
  try {
    const result = await runPluginRunCommand({
      cwd: fixture,
      sessionCwd: execDir,
      plugin: "EchoPlugin",
      seed: "StateMachine",
      set: ["emitArtifact=true", "message=exec-cwd"],
      artifactsOut: outRel,
    });
    assert.equal(result.success, true);
    assert.equal(fs.readFileSync(path.join(outAbs, "echo.txt"), "utf8"), "exec-cwd");
    assert.equal(fs.existsSync(path.join(fixture, outRel)), false);
  } finally {
    fs.rmSync(execDir, { recursive: true, force: true });
  }
});

test("runPluginRunCommand validates --at node path", async () => {
  await assert.rejects(
    () =>
      runPluginRunCommand({
        cwd: fixture,
        plugin: "EchoPlugin",
        seed: "StateMachine",
        at: "/no/such/path",
      }),
    /Node path does not exist/,
  );
});

test("catalog lists EchoPlugin fixture", () => {
  const catalog = loadSetupCatalog(fixture);
  const echo = catalog.plugins.find((p) => p.name === "EchoPlugin");
  assert.ok(echo?.metadataPath);
  assert.ok(echo.exists);
});

test("runPluginRunCommand writes modified model to --out", async () => {
  const outFile = path.join(os.tmpdir(), "webdot-echo-out-" + Date.now() + ".webgmex");
  fs.rmSync(outFile, { force: true });
  const baseline = await countNodes(stateMachineWebgmex);
  try {
    const result = await runPluginRunCommand({
      cwd: fixture,
      plugin: "EchoPlugin",
      seed: "StateMachine",
      set: ["addNode=true", "message=WrittenNode"],
      out: outFile,
    });
    assert.equal(result.success, true);
    assert.equal(result.persisted, true);
    assert.equal(result.outFile, outFile);
    assert.ok(fs.existsSync(outFile));
    const after = await countNodes(outFile);
    assert.equal(after, baseline + 1, "written model should contain the added node");
  } finally {
    fs.rmSync(outFile, { force: true });
  }
});

test("runPluginRunCommand --dry-run does not write model changes", async () => {
  const result = await runPluginRunCommand({
    cwd: fixture,
    plugin: "EchoPlugin",
    seed: "StateMachine",
    set: ["addNode=true"],
    dryRun: true,
  });
  assert.equal(result.success, true);
  assert.equal(result.persisted, false);
  assert.ok(result.warnings.some((w) => /dry-run/.test(w)));
});

test("runPluginRunCommand overwrites source .webgmex by default", async () => {
  const tempModel = path.join(os.tmpdir(), "webdot-inplace-" + Date.now() + ".webgmex");
  fs.copyFileSync(stateMachineWebgmex, tempModel);
  const baseline = await countNodes(tempModel);
  try {
    const result = await runPluginRunCommand({
      cwd: fixture,
      plugin: "EchoPlugin",
      webgmex: tempModel,
      set: ["addNode=true", "message=InPlace"],
    });
    assert.equal(result.success, true);
    assert.equal(result.persisted, true);
    assert.equal(result.outFile, tempModel);
    const after = await countNodes(tempModel);
    assert.equal(after, baseline + 1);
  } finally {
    fs.rmSync(tempModel, { force: true });
  }
});

test("runPluginRunCommand runs via --plugin-dir and --webgmex without a catalog", async () => {
  const emptyCwd = fs.mkdtempSync(path.join(os.tmpdir(), "webdot-nocatalog-"));
  try {
    const result = await runPluginRunCommand({
      cwd: emptyCwd,
      pluginDir: echoPluginDir,
      webgmex: stateMachineWebgmex,
      set: ["message=direct"],
      dryRun: true,
    });
    assert.equal(result.success, true);
    const payload = JSON.parse(result.output);
    assert.equal(payload.plugin, "EchoPlugin");
    assert.equal(payload.context.project.name, "StateMachine");
    assert.equal(payload.result.messages[0].message, "direct");
  } finally {
    fs.rmSync(emptyCwd, { recursive: true, force: true });
  }
});

test("resolvePluginSource rejects missing plugin directory", async () => {
  await assert.rejects(
    () =>
      runPluginRunCommand({
        cwd: fixture,
        pluginDir: path.join(fixture, "src", "plugins", "DoesNotExist"),
        seed: "StateMachine",
        dryRun: true,
      }),
    /Plugin directory does not exist/,
  );
});

test("runPluginRunCommand resolves --plugin-dir relative to sessionCwd not project cwd", async () => {
  const emptyCwd = fs.mkdtempSync(path.join(os.tmpdir(), "webdot-plugin-cwd-"));
  try {
    const result = await runPluginRunCommand({
      cwd: emptyCwd,
      sessionCwd: fixture,
      pluginDir: path.join("src", "plugins", "EchoPlugin"),
      webgmex: stateMachineWebgmex,
      set: ["message=cwd-rel"],
      dryRun: true,
    });
    assert.equal(result.success, true);
    assert.equal(JSON.parse(result.output).result.messages[0].message, "cwd-rel");
  } finally {
    fs.rmSync(emptyCwd, { recursive: true, force: true });
  }
});
