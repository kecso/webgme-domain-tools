import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import {
  formatPluginList,
  installPlugin,
  parseInstallTarget,
  uninstallPlugin,
  validatePluginDirectory,
} from "../dist/plugin/install.js";
import { listInstalled, WEBDOT_HOME_ENV } from "../dist/plugin/install-registry.js";
import { resolvePluginSource, createCatalogLoader } from "../dist/plugin/sources.js";
import { runPluginInfoCommand, runPluginRunCommand } from "../dist/plugin/plugin-runner.js";
import { runLsCommand } from "../dist/commands/ls.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixture = path.join(__dirname, "fixtures", "sample-project");
const echoPluginDir = path.join(fixture, "src", "plugins", "EchoPlugin");
const generateMetaTsDir = path.join(__dirname, "..", "plugins", "GenerateMetaTs");

function withTempHome(fn) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "webdot-home-"));
  const prev = process.env[WEBDOT_HOME_ENV];
  process.env[WEBDOT_HOME_ENV] = home;
  return Promise.resolve()
    .then(() => fn(home))
    .finally(() => {
      if (prev === undefined) delete process.env[WEBDOT_HOME_ENV];
      else process.env[WEBDOT_HOME_ENV] = prev;
      fs.rmSync(home, { recursive: true, force: true });
    });
}

test("validatePluginDirectory accepts EchoPlugin layout", () => {
  const v = validatePluginDirectory(echoPluginDir);
  assert.equal(v.pluginId, "EchoPlugin");
  assert.ok(v.metadataPath.endsWith("metadata.json"));
});

test("parseInstallTarget distinguishes local vs github", () => {
  assert.deepEqual(parseInstallTarget("owner/repo"), {
    kind: "github",
    repo: "owner/repo",
    ref: undefined,
  });
  assert.deepEqual(parseInstallTarget("owner/repo@v1.2.3"), {
    kind: "github",
    repo: "owner/repo",
    ref: "v1.2.3",
  });
  assert.equal(parseInstallTarget("./plugins/Foo", fixture).kind, "local");
  assert.equal(parseInstallTarget(echoPluginDir).kind, "local");
});

test("installPlugin local + list + uninstall", async () => {
  await withTempHome(async (home) => {
    const result = installPlugin({
      target: echoPluginDir,
      as: "LintEcho",
      home,
    });
    assert.equal(result.entry.name, "LintEcho");
    assert.equal(result.entry.pluginId, "EchoPlugin");
    assert.equal(result.replaced, false);
    assert.ok(result.warning);

    const listed = listInstalled(home);
    assert.equal(listed.length, 1);
    assert.equal(listed[0].name, "LintEcho");

    const text = formatPluginList({ home, catalogNames: ["EchoPlugin"] });
    assert.match(text, /installed:/);
    assert.match(text, /LintEcho/);
    assert.match(text, /catalog:/);
    assert.match(text, /EchoPlugin/);

    uninstallPlugin({ name: "LintEcho", home });
    assert.equal(listInstalled(home).length, 0);
  });
});

test("installPlugin rejects name collision without --force", async () => {
  await withTempHome(async (home) => {
    installPlugin({ target: echoPluginDir, home });
    assert.throws(
      () => installPlugin({ target: echoPluginDir, home }),
      /already installed/,
    );
    const again = installPlugin({ target: echoPluginDir, home, force: true });
    assert.equal(again.replaced, true);
  });
});

test("resolvePluginSource prefers catalog over installed same name", async () => {
  await withTempHome(async (home) => {
    installPlugin({ target: generateMetaTsDir, as: "EchoPlugin", home });
    const source = resolvePluginSource(
      { cwd: fixture, plugin: "EchoPlugin", home },
      createCatalogLoader(fixture),
    );
    assert.equal(source.source, "catalog");
    assert.equal(source.name, "EchoPlugin");
  });
});

test("resolvePluginSource uses installed alias when not in catalog", async () => {
  await withTempHome(async (home) => {
    installPlugin({ target: echoPluginDir, as: "LintEcho", home });
    const emptyCwd = fs.mkdtempSync(path.join(os.tmpdir(), "webdot-nocat-"));
    try {
      const source = resolvePluginSource(
        { cwd: emptyCwd, plugin: "LintEcho", home },
        createCatalogLoader(emptyCwd),
      );
      assert.equal(source.source, "installed");
      assert.equal(source.installName, "LintEcho");
      assert.equal(source.name, "EchoPlugin");
    } finally {
      fs.rmSync(emptyCwd, { recursive: true, force: true });
    }
  });
});

test("runPluginInfoCommand and runPluginRunCommand use installed name", async () => {
  await withTempHome(async (home) => {
    installPlugin({ target: echoPluginDir, as: "LintEcho", home });
    const info = JSON.parse(
      await runPluginInfoCommand({ cwd: fixture, plugin: "LintEcho", home }),
    );
    assert.equal(info.source, "installed");
    assert.equal(info.installName, "LintEcho");
    assert.equal(info.id, "EchoPlugin");

    const result = await runPluginRunCommand({
      cwd: fixture,
      plugin: "LintEcho",
      seed: "StateMachine",
      set: ["message=from-install"],
      dryRun: true,
      home,
    });
    assert.equal(result.success, true);
    const payload = JSON.parse(result.output);
    assert.equal(payload.source, "installed");
    assert.equal(payload.installName, "LintEcho");
    assert.equal(payload.plugin, "EchoPlugin");
    assert.equal(payload.result.messages[0].message, "from-install");
  });
});

test("runLsCommand labels catalog vs installed plugins", async () => {
  await withTempHome(async (home) => {
    installPlugin({ target: echoPluginDir, as: "LintEcho", home });
    const out = runLsCommand(fixture, "plugins", { home });
    assert.match(out, /catalog: .*EchoPlugin/);
    assert.match(out, /installed: LintEcho/);
  });
});

test("installPlugin from GitHub-style target via local git clone base", async () => {
  await withTempHome(async (home) => {
    const ghRoot = fs.mkdtempSync(path.join(os.tmpdir(), "webdot-gh-"));
    const repoDir = path.join(ghRoot, "acme", "widget-plugin");
    fs.mkdirSync(repoDir, { recursive: true });
    // Plugin at repo root
    fs.copyFileSync(path.join(echoPluginDir, "EchoPlugin.js"), path.join(repoDir, "EchoPlugin.js"));
    fs.copyFileSync(path.join(echoPluginDir, "metadata.json"), path.join(repoDir, "metadata.json"));
    // Rename to match folder? Repo folder is widget-plugin — need plugin layout.
    // Put plugin in a subdirectory named EchoPlugin.
    const pluginInRepo = path.join(repoDir, "EchoPlugin");
    fs.mkdirSync(pluginInRepo, { recursive: true });
    fs.copyFileSync(path.join(echoPluginDir, "EchoPlugin.js"), path.join(pluginInRepo, "EchoPlugin.js"));
    fs.copyFileSync(path.join(echoPluginDir, "metadata.json"), path.join(pluginInRepo, "metadata.json"));
    fs.rmSync(path.join(repoDir, "EchoPlugin.js"), { force: true });
    fs.rmSync(path.join(repoDir, "metadata.json"), { force: true });

    execFileSync("git", ["init"], { cwd: repoDir, stdio: "ignore" });
    execFileSync("git", ["config", "user.email", "test@example.com"], { cwd: repoDir, stdio: "ignore" });
    execFileSync("git", ["config", "user.name", "test"], { cwd: repoDir, stdio: "ignore" });
    execFileSync("git", ["add", "."], { cwd: repoDir, stdio: "ignore" });
    execFileSync("git", ["commit", "-m", "init"], { cwd: repoDir, stdio: "ignore" });

    const bare = path.join(ghRoot, "acme", "widget-plugin.git");
    execFileSync("git", ["clone", "--bare", repoDir, bare], { stdio: "ignore" });

    const prevBase = process.env.WEBDOT_GITHUB_CLONE_BASE;
    // file URL for Windows: file:///C:/...
    const fileBase = "file:///" + ghRoot.replace(/\\/g, "/");
    process.env.WEBDOT_GITHUB_CLONE_BASE = fileBase;
    try {
      const result = installPlugin({
        target: "acme/widget-plugin",
        subdir: "EchoPlugin",
        as: "GhEcho",
        home,
      });
      assert.equal(result.entry.name, "GhEcho");
      assert.equal(result.entry.pluginId, "EchoPlugin");
      assert.equal(result.entry.source.type, "github");
      assert.equal(listInstalled(home).length, 1);
      uninstallPlugin({ name: "GhEcho", home });
    } finally {
      if (prevBase === undefined) delete process.env.WEBDOT_GITHUB_CLONE_BASE;
      else process.env.WEBDOT_GITHUB_CLONE_BASE = prevBase;
      fs.rmSync(ghRoot, { recursive: true, force: true });
    }
  });
});
