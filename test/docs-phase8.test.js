import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { spawnSync } from "node:child_process";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");
const cli = path.join(root, "dist", "cli.js");

const requiredDocs = [
  "docs/CLI.md",
  "docs/tutorials/README.md",
  "docs/tutorials/plugin-anywhere.md",
  "docs/tutorials/install-generate-meta-ts.md",
  "docs/tutorials/session-workspace.md",
  "docs/tutorials/history-branches.md",
];

test("Phase 8 tutorial and CLI reference files exist", () => {
  for (const rel of requiredDocs) {
    const abs = path.join(root, rel);
    assert.ok(fs.existsSync(abs), "missing " + rel);
    assert.ok(fs.statSync(abs).size > 50, "too short: " + rel);
  }
});

test("README points at tutorials and CLI reference", () => {
  const readme = fs.readFileSync(path.join(root, "README.md"), "utf8");
  assert.match(readme, /docs\/tutorials/);
  assert.match(readme, /docs\/CLI\.md/);
  assert.doesNotMatch(readme, /## Commands\n\n\| Command \| Description \|/);
});

test("package.json ships docs in the npm tarball", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  assert.ok(pkg.files.includes("docs/CLI.md"));
  assert.ok(pkg.files.includes("docs/tutorials"));
});

test("webdot --help shows Examples and docs pointer", () => {
  const result = spawnSync(process.execPath, [cli, "--help"], { encoding: "utf8" });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Examples:/);
  assert.match(result.stdout, /plugin run --plugin-dir/);
  assert.match(result.stdout, /docs\//);
  assert.match(result.stdout.replace(/\s+/g, " "), /\[default: cwd\]/);
});

test("CLI.md documents [default: …] for common optional flags", () => {
  const cliMd = fs.readFileSync(path.join(root, "docs/CLI.md"), "utf8");
  assert.match(cliMd, /\[default: …\]/);
  assert.match(cliMd, /--at <path>.*\[default: \/\]/);
  assert.match(cliMd, /--at <path>.*\[default: \/ \(root\)\]/);
  assert.match(cliMd, /--limit.*\[default: 50\]/);
  assert.match(cliMd, /--format <fmt>.*\[default: tree\]/);
  assert.match(cliMd, /--format <fmt>.*\[default: json\]/);
  assert.match(cliMd, /--from.*\[default: current head\]/);
});

test("subcommand --help strings use [default: …]", () => {
  const cases = [
    [["tree", "--help"], /\[default: tree\]/, /\[default: \/\]/],
    [["seed", "meta", "--help"], /\[default: json\]/],
    [["history", "log", "--help"], /\[default: 50\]/],
    [["branch", "create", "--help"], /\[default: current head\]/],
    [["tag", "create", "--help"], /\[default: current branch head\]/],
    [["session", "open", "--help"], /\[default: master \/ package default\]/],
  ];
  for (const [args, ...patterns] of cases) {
    const result = spawnSync(process.execPath, [cli, ...args], { encoding: "utf8" });
    assert.equal(result.status, 0, args.join(" "));
    const help = result.stdout.replace(/\s+/g, " ");
    for (const pattern of patterns) {
      assert.match(help, pattern, args.join(" ") + " missing " + pattern);
    }
  }
});
