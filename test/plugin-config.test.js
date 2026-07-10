import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  coerceConfigValue,
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
  assert.throws(() => coerceConfigValue("nope", "boolean"));
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
