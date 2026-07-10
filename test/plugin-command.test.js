import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runPluginInfoCommand, runPluginRunCommand } from "../dist/plugin/plugin-runner.js";
import { loadSetupCatalog } from "../dist/catalog/setup-catalog.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixture = path.join(__dirname, "fixtures", "sample-project");
const artifactsDir = path.join(fixture, "_artifacts");

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
  });
  assert.equal(result.success, true);
  const payload = JSON.parse(result.output);
  assert.equal(payload.result.messages[0].message, "test-run");
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
