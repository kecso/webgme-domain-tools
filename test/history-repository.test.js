import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  defaultBranchName,
  detectExchangeFormat,
  isRepositoryProjectJson,
  shouldExportWithHistory,
  summarizeProjectJson,
  summarizeWebgmex,
} from "../dist/session/exchange-format.js";
import {
  runBranchCreate,
  runBranchDelete,
  runBranchList,
  runHistoryLog,
  runHistoryShow,
  runTagCreate,
  runTagDelete,
  runTagList,
  exportLoadedProject,
} from "../dist/session/repository.js";
import {
  openProjectSession,
  closeProjectSession,
} from "../dist/session/project-session.js";
import {
  checkoutSessionBranch,
  clearSessionWorkspace,
  openSessionWorkspace,
  readSessionState,
} from "../dist/session/workspace-state.js";
import {
  runBranchCreateCommand,
  runBranchDeleteCommand,
  runBranchListCommand,
  runHistoryLogCommand,
  runHistoryShowCommand,
  runTagCreateCommand,
  runTagDeleteCommand,
  runTagListCommand,
} from "../dist/commands/history.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const snapshotSeed = path.join(
  here,
  "fixtures/sample-project/src/seeds/StateMachine/StateMachine.webgmex",
);
const repositoryFixture = path.join(here, "fixtures/repository/StateMachine.webgmex");

function copyToTemp(src, label) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "webdot-hist-"));
  const dest = path.join(dir, label + ".webgmex");
  fs.copyFileSync(src, dest);
  return { dir, dest };
}

test("exchange-format helpers for snapshot vs repository JSON", () => {
  assert.equal(detectExchangeFormat({}), "snapshot");
  assert.equal(
    detectExchangeFormat({ formatVersion: 2, exportMode: "repository" }),
    "repository",
  );
  assert.equal(isRepositoryProjectJson({ formatVersion: 2, exportMode: "snapshot" }), false);
  assert.equal(shouldExportWithHistory("snapshot"), false);
  assert.equal(shouldExportWithHistory("repository"), true);

  const snap = summarizeProjectJson({
    branchName: "master",
    commitHash: "#abc",
    rootHash: "#root",
  });
  assert.equal(snap.format, "snapshot");
  assert.equal(snap.branches.master, "#abc");
  assert.equal(defaultBranchName(snap), "master");

  const repo = summarizeProjectJson({
    formatVersion: 2,
    exportMode: "repository",
    branchName: "example",
    branches: { example: "#1", feature: "#2" },
    tags: { t: "#1" },
    commits: [{ _id: "#1", message: "hi", time: 1, parents: [] }],
  });
  assert.equal(repo.format, "repository");
  assert.equal(repo.tags.t, "#1");
  assert.equal(repo.commits.length, 1);
  // Prefer master when present; otherwise first key / branchName.
  assert.equal(defaultBranchName(repo), "example");
  assert.equal(
    defaultBranchName({
      format: "repository",
      branches: { master: "#m", example: "#e" },
      tags: {},
      commits: [],
    }),
    "master",
  );
});

test("summarizeWebgmex detects catalog StateMachine as snapshot", () => {
  const summary = summarizeWebgmex(snapshotSeed);
  assert.equal(summary.format, "snapshot");
  assert.ok(summary.rootHash || summary.commitHash);
});

test("summarizeWebgmex detects repository fixture with branches and tags", () => {
  const summary = summarizeWebgmex(repositoryFixture);
  assert.equal(summary.format, "repository");
  assert.equal(summary.formatVersion, 2);
  assert.equal(summary.exportMode, "repository");
  assert.ok(summary.branches.master);
  assert.ok(summary.branches.example);
  assert.ok(summary.tags.metafixed);
  assert.ok(summary.tags.metafixed2);
  assert.ok(summary.commits.length > 1);
  assert.equal(defaultBranchName(summary), "master");
});

test("branch create upgrades snapshot to repository and lists both heads", async () => {
  const { dir, dest } = copyToTemp(snapshotSeed, "upgrade");
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

test("repository fixture: history log and show by commit hash", async () => {
  const { dir, dest } = copyToTemp(repositoryFixture, "repo-log");
  try {
    const logExample = await runHistoryLog({
      cwd: dir,
      webgmexPath: dest,
      branch: "example",
      limit: 5,
    });
    assert.equal(logExample.format, "repository");
    assert.equal(logExample.branch, "example");
    assert.ok(logExample.commits.length >= 1);
    assert.ok(logExample.commits.length <= 5);
    assert.match(logExample.commits[0].hash, /^#/);
    assert.equal(typeof logExample.commits[0].message, "string");

    const head = logExample.commits[0].hash;
    const shown = await runHistoryShow({
      cwd: dir,
      webgmexPath: dest,
      commit: head,
      branch: "example",
    });
    assert.equal(shown.commit.hash, head);
    assert.equal(shown.commit.message, logExample.commits[0].message);

    const withoutHashPrefix = await runHistoryShow({
      cwd: dir,
      webgmexPath: dest,
      commit: head.slice(1),
      branch: "example",
    });
    assert.equal(withoutHashPrefix.commit.hash, head);

    const logMaster = await runHistoryLog({
      cwd: dir,
      webgmexPath: dest,
      branch: "master",
      limit: 3,
    });
    assert.equal(logMaster.branch, "master");
    assert.ok(logMaster.commits.length >= 1);
    // example tip is ahead of master in this fixture
    assert.notEqual(logExample.commits[0].hash, logMaster.commits[0].hash);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("repository fixture: open branch example and list tags", async () => {
  const { dir, dest } = copyToTemp(repositoryFixture, "repo-open");
  try {
    const ctx = await openProjectSession({
      cwd: dir,
      webgmexPath: dest,
      branchName: "example",
    });
    try {
      assert.equal(ctx.exchangeFormat, "repository");
      assert.equal(ctx.branchName, "example");
      assert.ok(ctx.importResult.commitHash);
      const exported = path.join(dir, "roundtrip.webgmex");
      const result = await exportLoadedProject(ctx, exported, {
        withHistory: true,
        cwd: dir,
      });
      assert.equal(result.withHistory, true);
      const again = summarizeWebgmex(exported);
      assert.equal(again.format, "repository");
      assert.ok(again.branches.example);
    } finally {
      await closeProjectSession();
    }

    const tags = await runTagList({ cwd: dir, webgmexPath: dest, branch: "master" });
    assert.deepEqual(
      tags.tags.map((t) => t.name).sort(),
      ["metafixed", "metafixed2"],
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("repository fixture: create/delete branch and tag round-trip", async () => {
  const { dir, dest } = copyToTemp(repositoryFixture, "repo-mutate");
  try {
    const created = await runBranchCreate({
      cwd: dir,
      webgmexPath: dest,
      name: "scratch",
      from: "example",
      branch: "example",
    });
    assert.equal(created.created, "scratch");
    assert.equal(created.upgradedToRepository, false);
    assert.ok(created.hash.startsWith("#"));

    let listed = await runBranchList({ cwd: dir, webgmexPath: dest, current: "example" });
    assert.ok(listed.branches.some((b) => b.name === "scratch"));

    const fromCommit = await runBranchCreate({
      cwd: dir,
      webgmexPath: dest,
      name: "fromhash",
      from: created.hash,
      branch: "example",
    });
    assert.equal(fromCommit.hash, created.hash);

    await runBranchDelete({
      cwd: dir,
      webgmexPath: dest,
      name: "fromhash",
      branch: "example",
    });
    await runBranchDelete({
      cwd: dir,
      webgmexPath: dest,
      name: "scratch",
      branch: "example",
    });
    listed = await runBranchList({ cwd: dir, webgmexPath: dest });
    assert.equal(
      listed.branches.some((b) => b.name === "scratch" || b.name === "fromhash"),
      false,
    );

    const tag = await runTagCreate({
      cwd: dir,
      webgmexPath: dest,
      name: "tmptag",
      commit: created.hash,
      branch: "example",
    });
    assert.equal(tag.created, "tmptag");
    let tags = await runTagList({ cwd: dir, webgmexPath: dest });
    assert.ok(tags.tags.some((t) => t.name === "tmptag"));

    await runTagDelete({
      cwd: dir,
      webgmexPath: dest,
      name: "tmptag",
      branch: "example",
    });
    tags = await runTagList({ cwd: dir, webgmexPath: dest });
    assert.equal(
      tags.tags.some((t) => t.name === "tmptag"),
      false,
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("session open/checkout against repository fixture", () => {
  const { dir, dest } = copyToTemp(repositoryFixture, "session-repo");
  try {
    const state = openSessionWorkspace({
      sessionCwd: dir,
      webgmex: dest,
      branch: "example",
    });
    assert.equal(state.branch, "example");
    assert.equal(state.exchangeFormat, "repository");

    const checked = checkoutSessionBranch(dir, "master");
    assert.equal(checked.branch, "master");

    assert.throws(
      () => checkoutSessionBranch(dir, "no-such-branch"),
      /Unknown branch/,
    );

    clearSessionWorkspace(dir);
    assert.equal(readSessionState(dir), null);

    assert.throws(
      () =>
        openSessionWorkspace({
          sessionCwd: dir,
          webgmex: dest,
          branch: "missing",
        }),
      /Unknown branch/,
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("history/branch/tag command wrappers use --webgmex", async () => {
  const { dir, dest } = copyToTemp(repositoryFixture, "cmd-repo");
  try {
    const logJson = JSON.parse(
      await runHistoryLogCommand({
        sessionCwd: dir,
        projectCwd: dir,
        webgmex: dest,
        branch: "example",
        limit: 2,
      }),
    );
    assert.equal(logJson.branch, "example");
    assert.ok(logJson.commits.length <= 2);

    const showJson = JSON.parse(
      await runHistoryShowCommand({
        sessionCwd: dir,
        projectCwd: dir,
        webgmex: dest,
        commit: logJson.commits[0].hash,
        branch: "example",
      }),
    );
    assert.equal(showJson.commit.hash, logJson.commits[0].hash);

    const branches = JSON.parse(
      await runBranchListCommand({
        sessionCwd: dir,
        projectCwd: dir,
        webgmex: dest,
      }),
    );
    assert.ok(branches.branches.some((b) => b.name === "master"));

    const created = JSON.parse(
      await runBranchCreateCommand({
        sessionCwd: dir,
        projectCwd: dir,
        webgmex: dest,
        name: "cmdbranch",
        from: "master",
      }),
    );
    assert.equal(created.created, "cmdbranch");

    const deleted = JSON.parse(
      await runBranchDeleteCommand({
        sessionCwd: dir,
        projectCwd: dir,
        webgmex: dest,
        name: "cmdbranch",
      }),
    );
    assert.equal(deleted.deleted, "cmdbranch");

    const tags = JSON.parse(
      await runTagListCommand({
        sessionCwd: dir,
        projectCwd: dir,
        webgmex: dest,
      }),
    );
    assert.ok(tags.tags.some((t) => t.name === "metafixed"));

    const tagCreated = JSON.parse(
      await runTagCreateCommand({
        sessionCwd: dir,
        projectCwd: dir,
        webgmex: dest,
        name: "cmdtag",
        commit: logJson.commits[0].hash,
      }),
    );
    assert.equal(tagCreated.created, "cmdtag");

    const tagDeleted = JSON.parse(
      await runTagDeleteCommand({
        sessionCwd: dir,
        projectCwd: dir,
        webgmex: dest,
        name: "cmdtag",
      }),
    );
    assert.equal(tagDeleted.deleted, "cmdtag");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("branch create on session working copy marks dirty", async () => {
  const { dir, dest } = copyToTemp(repositoryFixture, "session-dirty");
  try {
    openSessionWorkspace({
      sessionCwd: dir,
      webgmex: dest,
      branch: "master",
    });
    const state = readSessionState(dir);
    assert.ok(state);
    assert.equal(state.dirty, false);

    const out = JSON.parse(
      await runBranchCreateCommand({
        sessionCwd: dir,
        projectCwd: dir,
        webgmex: state.workingWebgmex,
        name: "sessionbranch",
        from: "master",
      }),
    );
    assert.equal(out.created, "sessionbranch");
    assert.equal(readSessionState(dir)?.dirty, true);
  } finally {
    clearSessionWorkspace(dir);
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("unknown branch on repository import fails", async () => {
  const { dir, dest } = copyToTemp(repositoryFixture, "bad-branch");
  try {
    await assert.rejects(
      () =>
        openProjectSession({
          cwd: dir,
          webgmexPath: dest,
          branchName: "does-not-exist",
        }),
      /Unknown branch/,
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("cannot delete the currently selected branch", async () => {
  const { dir, dest } = copyToTemp(repositoryFixture, "del-current");
  try {
    await assert.rejects(
      () =>
        runBranchDelete({
          cwd: dir,
          webgmexPath: dest,
          name: "example",
          branch: "example",
        }),
      /Cannot delete the currently selected branch/,
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
