import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { runCli } from "../dist/cli-program.js";
import { AmbiguousSeedError } from "../dist/session/seed-resolution.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixture = path.join(__dirname, "fixtures", "sample-project");
const noSetup = path.join(__dirname, "fixtures", "no-setup");
const cli = path.join(__dirname, "..", "dist", "cli.js");

function runWebdot(args, options = {}) {
  return spawnSync(process.execPath, [cli, ...args], {
    encoding: "utf8",
    ...options,
  });
}

async function expectExit(fn, code) {
  const original = process.exit;
  let seen = null;
  process.exit = (c) => {
    seen = c;
    throw new Error("process.exit:" + c);
  };
  try {
    await fn();
    assert.fail("expected process.exit(" + code + ")");
  } catch (err) {
    if (!(err instanceof Error) || !String(err.message).startsWith("process.exit:")) {
      throw err;
    }
    assert.equal(seen, code);
  } finally {
    process.exit = original;
  }
}

test("runCli prints action output on success", async () => {
  const lines = [];
  const log = console.log;
  console.log = (...args) => {
    lines.push(args.map(String).join(" "));
  };
  try {
    await runCli(async () => "hello-cli");
    assert.deepEqual(lines, ["hello-cli"]);
  } finally {
    console.log = log;
  }
});

test("runCli exits 1 on generic errors", async () => {
  const errors = [];
  const error = console.error;
  console.error = (...args) => {
    errors.push(args.map(String).join(" "));
  };
  try {
    await expectExit(() => runCli(async () => {
      throw new Error("boom");
    }), 1);
    assert.match(errors.join("\n"), /boom/);
  } finally {
    console.error = error;
  }
});

test("runCli exits 2 on AmbiguousSeedError", async () => {
  const errors = [];
  const error = console.error;
  console.error = (...args) => {
    errors.push(args.map(String).join(" "));
  };
  try {
    await expectExit(
      () => runCli(async () => {
        throw new AmbiguousSeedError(["StateMachine", "StateModel"]);
      }),
      2,
    );
    assert.match(errors.join("\n"), /Ambiguous seed name/);
  } finally {
    console.error = error;
  }
});

test("cli plugin run --help documents plugin context defaults", () => {
  const result = runWebdot(["plugin", "run", "--help"]);
  assert.equal(result.status, 0);
  const help = result.stdout;
  assert.match(help, /Plugin context/);
  assert.match(help, /active node.*default:.*\/ \(root\)/i);
  assert.match(help, /selection.*default:.*\(none\)/i);
  assert.match(help, /branch.*default:.*master/i);
  assert.match(help, /--seed/);
  assert.match(help, /--webgmex/);
});

test("cli tree seed without --seed exits 2", () => {
  const result = runWebdot(["tree", "seed", "-C", fixture]);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /tree seed requires --seed/);
});

test("cli seed meta prints JSON IR", () => {
  const result = runWebdot(["seed", "meta", "--seed", "StateMachine", "-C", fixture]);
  assert.equal(result.status, 0);
  const payload = JSON.parse(result.stdout);
  assert.ok(Array.isArray(payload.metaAspectSet));
  assert.equal(payload.seed, "StateMachine");
});

test("cli ls lists components", () => {
  const result = runWebdot(["ls", "plugins", "-C", fixture]);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /NoOpPlugin/);
  assert.match(result.stdout, /ThrowPlugin/);
});

test("cli ls exits 1 when webgme-setup.json is missing", () => {
  const result = runWebdot(["ls", "-C", noSetup]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Missing webgme-setup\.json/);
});

test("cli plugin info prints metadata JSON", () => {
  const result = runWebdot(["plugin", "info", "NoOpPlugin", "-C", fixture]);
  assert.equal(result.status, 0);
  const info = JSON.parse(result.stdout);
  assert.equal(info.id, "NoOpPlugin");
});

test("cli plugin run NoOpPlugin succeeds with dry-run", () => {
  const result = runWebdot([
    "plugin",
    "run",
    "NoOpPlugin",
    "--seed",
    "StateMachine",
    "--dry-run",
    "-C",
    fixture,
  ]);
  assert.equal(result.status, 0);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.success, true);
  assert.equal(payload.plugin, "NoOpPlugin");
  assert.equal(payload.context.project.name, "StateMachine");
  assert.equal(payload.context.activeNode, "/");
});

test("cli plugin run ThrowPlugin exits 1", () => {
  const result = runWebdot([
    "plugin",
    "run",
    "ThrowPlugin",
    "--seed",
    "StateMachine",
    "--dry-run",
    "-C",
    fixture,
  ]);
  assert.equal(result.status, 1);
  assert.match(result.stdout + result.stderr, /failed on purpose/i);
});

test("cli plugin run reports artifact warning on stderr", () => {
  const result = runWebdot([
    "plugin",
    "run",
    "EchoPlugin",
    "--seed",
    "StateMachine",
    "--set",
    "emitArtifact=true",
    "--dry-run",
    "-C",
    fixture,
  ]);
  assert.equal(result.status, 0);
  assert.match(result.stderr, /warning:.*not persisted/);
});

test("cli plugin run ambiguous seed exits 2", () => {
  const result = runWebdot([
    "plugin",
    "run",
    "NoOpPlugin",
    "--seed",
    "State",
    "--dry-run",
    "-C",
    fixture,
  ]);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Ambiguous seed name/);
});

test("cli plugin run unknown plugin exits 1", () => {
  const result = runWebdot([
    "plugin",
    "run",
    "NoSuchPlugin",
    "--seed",
    "StateMachine",
    "-C",
    fixture,
  ]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Unknown plugin/);
});

test("cli plugin run writes model message when persisted", () => {
  const outFile = path.join(fixture, "_cli-out.webgmex");
  const result = runWebdot([
    "plugin",
    "run",
    "EchoPlugin",
    "--seed",
    "StateMachine",
    "--set",
    "addNode=true",
    "--out",
    "_cli-out.webgmex",
    "-C",
    fixture,
  ]);
  try {
    assert.equal(result.status, 0);
    assert.match(result.stderr, /wrote model:/);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.persisted, true);
  } finally {
    fs.rmSync(outFile, { force: true });
  }
});
