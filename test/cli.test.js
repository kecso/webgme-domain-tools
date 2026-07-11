import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
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
  assert.match(help, /open session/i);
  assert.match(help, /session save/i);
  assert.match(help, /--seed/);
  assert.match(help, /--webgmex/);
});

test("cli tree seed without --seed exits 2", () => {
  const execDir = fs.mkdtempSync(path.join(os.tmpdir(), "webdot-cli-"));
  try {
    const result = runWebdot(["tree", "seed", "-C", fixture], { cwd: execDir });
    assert.equal(result.status, 2);
    assert.match(result.stderr, /tree --seed.*required.*open a session/i);
  } finally {
    fs.rmSync(execDir, { recursive: true, force: true });
  }
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

test("cli session state lives in the execution dir, status/close need no -C", () => {
  const execDir = fs.mkdtempSync(path.join(os.tmpdir(), "webdot-cli-"));
  try {
    // Open from execDir, pointing at the project via -C.
    const open = runWebdot(["session", "open", "--seed", "StateMachine", "-C", fixture], {
      cwd: execDir,
    });
    assert.equal(open.status, 0);
    const opened = JSON.parse(open.stdout);
    assert.equal(opened.opened, true);
    assert.equal(opened.project.name, "StateMachine");
    // .webdot is created in the execution dir, not under the project.
    assert.equal(fs.existsSync(path.join(execDir, ".webdot")), true);
    assert.equal(fs.existsSync(path.join(fixture, ".webdot")), false);

    // status without -C, run from the same execution dir.
    const status = runWebdot(["session", "status"], { cwd: execDir });
    assert.equal(status.status, 0);
    const state = JSON.parse(status.stdout);
    assert.equal(state.open, true);
    assert.equal(state.dirty, false);
    assert.equal(state.project.root, fs.realpathSync(fixture));
  } finally {
    fs.rmSync(execDir, { recursive: true, force: true });
  }
});

test("cli catalog commands run in the open session scope without -C", () => {
  const execDir = fs.mkdtempSync(path.join(os.tmpdir(), "webdot-cli-"));
  try {
    runWebdot(["session", "open", "--seed", "StateMachine", "-C", fixture], { cwd: execDir });

    const ls = runWebdot(["ls", "plugins"], { cwd: execDir });
    assert.equal(ls.status, 0);
    assert.match(ls.stdout, /NoOpPlugin/);
    assert.match(ls.stderr, /session open.*running in its scope/i);

    const info = runWebdot(["plugin", "info", "NoOpPlugin"], { cwd: execDir });
    assert.equal(info.status, 0);
    assert.equal(JSON.parse(info.stdout).id, "NoOpPlugin");

    // No scope + open session => session model tree (seed scope).
    const tree = runWebdot(["tree"], { cwd: execDir });
    assert.equal(tree.status, 0);
    assert.match(tree.stdout, /seed:StateMachine/);
    assert.match(tree.stderr, /source:/i);

    // Explicit repo scope still shows the catalog.
    const repo = runWebdot(["tree", "repo"], { cwd: execDir });
    assert.equal(repo.status, 0);
    assert.match(repo.stdout, /repository/);
    assert.match(repo.stdout, /StateMachine/);
  } finally {
    fs.rmSync(execDir, { recursive: true, force: true });
  }
});

test("cli session close requires save or discard when dirty (no -C after open)", () => {
  const execDir = fs.mkdtempSync(path.join(os.tmpdir(), "webdot-cli-"));
  try {
    runWebdot(["session", "open", "--seed", "StateMachine", "-C", fixture], { cwd: execDir });
    // plugin run needs no -C: catalog resolves from the session's recorded project root.
    const run = runWebdot(["plugin", "run", "EchoPlugin", "--set", "addNode=true"], {
      cwd: execDir,
    });
    assert.equal(run.status, 0);

    const close = runWebdot(["session", "close"], { cwd: execDir });
    assert.equal(close.status, 1);
    assert.match(close.stderr, /unsaved changes/i);

    const discardClose = runWebdot(["session", "close", "--discard"], { cwd: execDir });
    assert.equal(discardClose.status, 0);
    assert.equal(fs.existsSync(path.join(execDir, ".webdot")), false);
  } finally {
    fs.rmSync(execDir, { recursive: true, force: true });
  }
});
