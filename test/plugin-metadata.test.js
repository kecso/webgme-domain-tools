import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildPluginInfo,
  buildPluginInfoFromPath,
  configDefaults,
  loadPluginMetadata,
  loadPluginMetadataFromPath,
  renderPluginInfo,
} from "../dist/plugin/metadata.js";
import { loadSetupCatalog } from "../dist/catalog/setup-catalog.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixture = path.join(__dirname, "fixtures", "sample-project");
const echoMeta = path.join(fixture, "src", "plugins", "EchoPlugin", "metadata.json");

test("loadPluginMetadataFromPath reads EchoPlugin metadata", () => {
  const meta = loadPluginMetadataFromPath(echoMeta);
  assert.equal(meta.id, "EchoPlugin");
  assert.ok(Array.isArray(meta.configStructure));
});

test("loadPluginMetadataFromPath throws when file is missing", () => {
  assert.throws(
    () => loadPluginMetadataFromPath(path.join(fixture, "no-such-metadata.json")),
    /metadata\.json not found/,
  );
});

test("loadPluginMetadata loads from catalog entry", () => {
  const catalog = loadSetupCatalog(fixture);
  const echo = catalog.plugins.find((p) => p.name === "EchoPlugin");
  assert.ok(echo);
  const meta = loadPluginMetadata(echo);
  assert.equal(meta.id, "EchoPlugin");
});

test("loadPluginMetadata rejects entry without metadataPath", () => {
  assert.throws(
    () =>
      loadPluginMetadata({
        ref: "plugin:Bare",
        kind: "plugins",
        name: "Bare",
        src: "src/plugins/Bare",
        absPath: path.join(fixture, "src", "plugins", "Bare"),
        exists: true,
        artifacts: [],
        notes: [],
      }),
    /has no metadata\.json/,
  );
});

test("loadPluginMetadata rejects missing plugin src", () => {
  assert.throws(
    () =>
      loadPluginMetadata({
        ref: "plugin:Gone",
        kind: "plugins",
        name: "Gone",
        src: "src/plugins/Gone",
        absPath: path.join(fixture, "src", "plugins", "Gone"),
        exists: false,
        artifacts: [],
        metadataPath: echoMeta,
        notes: [],
      }),
    /src path is missing/,
  );
});

test("configDefaults maps structure and tolerates undefined", () => {
  assert.deepEqual(configDefaults(undefined), {});
  assert.deepEqual(
    configDefaults([
      { name: "a", value: 1, valueType: "integer" },
      { name: "b", value: true, valueType: "boolean" },
    ]),
    { a: 1, b: true },
  );
});

test("buildPluginInfo uses catalog entry and optional source labels", () => {
  const catalog = loadSetupCatalog(fixture);
  const echo = catalog.plugins.find((p) => p.name === "EchoPlugin");
  assert.ok(echo);
  const info = buildPluginInfo(echo, { source: "catalog" });
  assert.equal(info.id, "EchoPlugin");
  assert.equal(info.source, "catalog");
  assert.equal(info.defaults.message, "hello");
  assert.equal(info.installName, undefined);

  const aliased = buildPluginInfo(echo, { source: "installed", installName: "LintEcho" });
  assert.equal(aliased.source, "installed");
  assert.equal(aliased.installName, "LintEcho");
});

test("buildPluginInfo falls back to entry name when metadata omits id/name", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "webdot-meta-"));
  const metaPath = path.join(dir, "metadata.json");
  try {
    fs.writeFileSync(metaPath, JSON.stringify({ version: "9.9.9" }), "utf8");
    const entry = {
      ref: "plugin:Fallback",
      kind: "plugins",
      name: "Fallback",
      src: "src/plugins/Fallback",
      absPath: dir,
      exists: true,
      artifacts: [],
      metadataPath: metaPath,
      notes: [],
    };
    const info = buildPluginInfo(entry);
    assert.equal(info.id, "Fallback");
    assert.equal(info.name, "Fallback");
    assert.equal(info.version, "9.9.9");
    assert.equal(info.source, "catalog");
    assert.deepEqual(info.configStructure, []);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("buildPluginInfoFromPath falls back to opts id when metadata omits id/name", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "webdot-meta-path-"));
  const metaPath = path.join(dir, "metadata.json");
  try {
    fs.writeFileSync(metaPath, JSON.stringify({ description: "minimal" }), "utf8");
    const info = buildPluginInfoFromPath(metaPath, {
      id: "FromOpts",
      src: dir,
      source: "plugin-dir",
    });
    assert.equal(info.id, "FromOpts");
    assert.equal(info.name, "FromOpts");
    assert.equal(info.description, "minimal");
    assert.equal(info.source, "plugin-dir");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("renderPluginInfo serializes JSON", () => {
  const rendered = renderPluginInfo({
    id: "X",
    name: "X",
    src: "/x",
    configStructure: [],
    defaults: {},
  });
  assert.deepEqual(JSON.parse(rendered).id, "X");
});
