import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { summarizeWebgmex } from "../dist/session/exchange-format.js";
import {
  runBranchCreate,
  runBranchList,
  runHistoryLog,
} from "../dist/session/repository.js";
import { openProjectSession, closeProjectSession } from "../dist/session/project-session.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtureSeed = path.join(
  here,
  "fixtures/sample-project/src/seeds/StateMachine/StateMachine.webgmex",
);

function copyToTemp(label) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "webdot-hist-"));
  const dest = path.join(dir, label + ".webgmex");
  fs.copyFileSync(fixtureSeed, dest);
  return { dir, dest };
}

test("summarizeWebgmex detects StateMachine fixture as snapshot", () => {
  const summary = summarizeWebgmex(fixtureSeed);
  assert.equal(summary.format, "snapshot");
  assert.ok(summary.rootHash);
});

test("branch create upgrades snapshot to repository and lists both heads", async () => {
  const { dir, dest } = copyToTemp("upgrade");
  try {
    const created = await runBranchCreate({
      cwd: dir,
      webgmexPath: dest,
      name: "feature",
    });
    assert.equal(created.created, "feature");
    assert.equal(created.upgradedToRepository, true);

    const summary = summarizeWebgmex(dest);
    assert.equal(summary.format, "repository");
    assert.ok(summary.branches.master);
    assert.ok(summary.branches.feature);
    assert.equal(summary.branches.master, summary.branches.feature);

    const listed = await runBranchList({ cwd: dir, webgmexPath: dest });
    assert.equal(listed.format, "repository");
    assert.deepEqual(
      listed.branches.map((b) => b.name).sort(),
      ["feature", "master"],
    );

    const log = await runHistoryLog({ cwd: dir, webgmexPath: dest, branch: "master" });
    assert.ok(log.commits.length >= 1);
    assert.match(log.commits[0].hash, /^#/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("openProjectSession loads repository branch by name", async () => {
  const { dir, dest } = copyToTemp("checkout");
  try {
    await runBranchCreate({ cwd: dir, webgmexPath: dest, name: "feature" });
    const ctx = await openProjectSession({
      cwd: dir,
      webgmexPath: dest,
      branchName: "feature",
    });
    try {
      assert.equal(ctx.exchangeFormat, "repository");
      assert.equal(ctx.branchName, "feature");
      assert.ok(ctx.importResult.commitHash);
    } finally {
      await closeProjectSession();
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
