import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  coerceConfigValue,
  loadConfigFile,
  parseSetPairs,
  resolvePluginConfig,
} from "../dist/plugin/config.js";
import { buildPluginRunContext } from "../dist/plugin/run-context.js";
import { artifactWarnings } from "../dist/plugin/result-format.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const echoConfigStructure = [
  { name: "message", value: "hello", valueType: "string", readOnly: false },
  { name: "shouldFail", value: false, valueType: "boolean", readOnly: false },
  { name: "readonlyFlag", value: "fixed", valueType: "string", readOnly: true },
];

test("coerceConfigValue parses booleans and numbers", () => {
  assert.equal(coerceConfigValue("true", "boolean"), true);
  assert.equal(coerceConfigValue("0", "boolean"), false);
  assert.equal(coerceConfigValue("42", "integer"), 42);
  assert.equal(coerceConfigValue("3.5", "number"), 3.5);
  assert.equal(coerceConfigValue("anything", "string"), "anything");
  assert.throws(() => coerceConfigValue("nope", "boolean"));
  assert.throws(() => coerceConfigValue("x", "number"), /Invalid numeric/);
  assert.throws(() => coerceConfigValue("3.5", "integer"), /Invalid integer/);
});

test("loadConfigFile validates existence and shape", () => {
  assert.deepEqual(loadConfigFile(undefined), {});
  assert.throws(() => loadConfigFile("/no/such/file.json"), /does not exist/);
});

test("resolvePluginConfig rejects wrong-typed value from a config file", () => {
  const badFile = path.join(os.tmpdir(), "webdot-badconfig-" + Date.now() + ".json");
  fs.writeFileSync(badFile, JSON.stringify({ shouldFail: "not-a-boolean" }));
  try {
    assert.throws(
      () =>
        resolvePluginConfig([{ name: "shouldFail", value: false, valueType: "boolean" }], {
          configFile: badFile,
        }),
      /must be a boolean/,
    );
  } finally {
    fs.rmSync(badFile, { force: true });
  }
});

test("parseSetPairs rejects malformed entries", () => {
  assert.deepEqual(parseSetPairs(["message=hi", "flag=true"]), { message: "hi", flag: "true" });
  assert.throws(() => parseSetPairs(["noequals"]));
});

test("resolvePluginConfig merges defaults, file, and --set", () => {
  const configFile = path.join(__dirname, "fixtures", "echo-config.json");
  const resolved = resolvePluginConfig(echoConfigStructure, {
    configFile,
    set: ["message=override"],
  });
  assert.equal(resolved.message, "override");
  assert.equal(resolved.shouldFail, true);
  assert.equal(resolved.readonlyFlag, "fixed");
});

test("resolvePluginConfig rejects read-only overrides", () => {
  assert.throws(() =>
    resolvePluginConfig(echoConfigStructure, { set: ["readonlyFlag=changed"] }),
  );
});

test("buildPluginRunContext uses first selection as active node", () => {
  const ctx = buildPluginRunContext({ select: ["/1", "/2"], branch: "dev" });
  assert.equal(ctx.activeNode, "/1");
  assert.deepEqual(ctx.activeSelection, ["/1", "/2"]);
  assert.equal(ctx.branchName, "dev");
});

test("artifactWarnings when blobs are not persisted", () => {
  const warnings = artifactWarnings({ success: true, artifacts: ["abc"] }, undefined);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /not persisted/);
  assert.equal(artifactWarnings({ success: true, artifacts: ["abc"] }, "out").length, 0);
});
