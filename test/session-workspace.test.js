import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  clearSessionWorkspace,
  closeSessionWorkspace,
  discardSessionWorkspace,
  markSessionDirty,
  openSessionWorkspace,
  readSessionState,
  resolveSessionModelSource,
  saveSessionWorkspace,
  sessionFilePath,
  SessionError,
} from "../dist/session/workspace-state.js";
import { runPluginRunCommand } from "../dist/plugin/plugin-runner.js";
import {
  runSessionCloseCommand,
  runSessionDiscardCommand,
  runSessionOpenCommand,
  runSessionSaveCommand,
  runSessionStatusCommand,
} from "../dist/commands/session.js";
import { runTreeCommand } from "../dist/commands/tree.js";
import {
  closeProjectSession,
  openProjectSession,
} from "../dist/session/project-session.js";
import { collectSeedNodes } from "../dist/introspection/seed-tree.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixture = path.join(__dirname, "fixtures", "sample-project");

function createWorkCopy() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "webdot-session-"));
  fs.cpSync(fixture, dir, { recursive: true });
  fs.rmSync(path.join(dir, ".webdot"), { recursive: true, force: true });
  return dir;
}

function stateMachinePath(cwd) {
  return path.join(cwd, "src", "seeds", "StateMachine", "StateMachine.webgmex");
}

function cleanupWorkCopy(cwd) {
  clearSessionWorkspace(cwd);
  fs.rmSync(cwd, { recursive: true, force: true });
}

async function countNodes(webgmexPath, cwd) {
  const context = await openProjectSession({
    cwd,
    webgmexPath,
    seedName: "probe",
  });
  try {
    const rows = await collectSeedNodes(context.core, context.rootNode, {});
    return rows.length;
  } finally {
    await closeProjectSession();
  }
}

test("openSessionWorkspace creates session.json and working copy", () => {
  const cwd = createWorkCopy();
  try {
    const state = openSessionWorkspace({ sessionCwd: cwd, seed: "StateMachine" });
    assert.equal(state.source.name, "StateMachine");
    assert.equal(state.dirty, false);
    assert.ok(fs.existsSync(sessionFilePath(cwd)));
    assert.ok(fs.existsSync(state.workingWebgmex));
    assert.equal(
      fs.readFileSync(state.workingWebgmex).compare(fs.readFileSync(stateMachinePath(cwd))),
      0,
    );
    const reread = readSessionState(cwd);
    assert.equal(reread?.source.name, "StateMachine");
  } finally {
    cleanupWorkCopy(cwd);
  }
});

test("openSessionWorkspace rejects duplicate session without --force", () => {
  const cwd = createWorkCopy();
  try {
    openSessionWorkspace({ sessionCwd: cwd, seed: "StateMachine" });
    assert.throws(
      () => openSessionWorkspace({ sessionCwd: cwd, seed: "StateMachine" }),
      SessionError,
    );
  } finally {
    cleanupWorkCopy(cwd);
  }
});

test("saveSessionWorkspace writes working copy to source and clears dirty", async () => {
  const cwd = createWorkCopy();
  const sourceWebgmex = stateMachinePath(cwd);
  try {
    const before = await countNodes(sourceWebgmex, cwd);
    openSessionWorkspace({ sessionCwd: cwd, seed: "StateMachine" });
    const state = readSessionState(cwd);
    await runPluginRunCommand({
      cwd,
      plugin: "EchoPlugin",
      set: ["addNode=true", "message=session-node"],
    });
    const dirty = readSessionState(cwd);
    assert.equal(dirty?.dirty, true);
    const workingCount = await countNodes(state.workingWebgmex, cwd);
    assert.ok(workingCount > before);

    saveSessionWorkspace({ cwd });
    const saved = readSessionState(cwd);
    assert.equal(saved?.dirty, false);
    const after = await countNodes(sourceWebgmex, cwd);
    assert.equal(after, workingCount);
  } finally {
    cleanupWorkCopy(cwd);
  }
});

test("discardSessionWorkspace resets working copy from source", async () => {
  const cwd = createWorkCopy();
  const sourceWebgmex = stateMachinePath(cwd);
  try {
    const before = await countNodes(sourceWebgmex, cwd);
    openSessionWorkspace({ sessionCwd: cwd, seed: "StateMachine" });
    await runPluginRunCommand({
      cwd,
      plugin: "EchoPlugin",
      set: ["addNode=true"],
    });
    assert.equal(readSessionState(cwd)?.dirty, true);

    runSessionDiscardCommand(cwd);
    const state = readSessionState(cwd);
    assert.equal(state?.dirty, false);
    const workingCount = await countNodes(state.workingWebgmex, cwd);
    assert.equal(workingCount, before);
  } finally {
    cleanupWorkCopy(cwd);
  }
});

test("closeSessionWorkspace blocks when dirty unless discard", async () => {
  const cwd = createWorkCopy();
  try {
    openSessionWorkspace({ sessionCwd: cwd, seed: "StateMachine" });
    markSessionDirty(cwd);
    assert.throws(() => closeSessionWorkspace(cwd), SessionError);
    closeSessionWorkspace(cwd, true);
    assert.equal(readSessionState(cwd), null);
    assert.equal(fs.existsSync(path.join(cwd, ".webdot")), false);
  } finally {
    cleanupWorkCopy(cwd);
  }
});

test("resolveSessionModelSource uses session working copy", () => {
  const cwd = createWorkCopy();
  try {
    openSessionWorkspace({ sessionCwd: cwd, seed: "StateMachine" });
    const state = readSessionState(cwd);
    const model = resolveSessionModelSource(cwd, {});
    assert.equal(model.fromSession, true);
    assert.equal(model.webgmexPath, state?.workingWebgmex);
  } finally {
    cleanupWorkCopy(cwd);
  }
});

test("explicit --seed overrides open session model", () => {
  const cwd = createWorkCopy();
  try {
    openSessionWorkspace({ sessionCwd: cwd, seed: "StateMachine" });
    const model = resolveSessionModelSource(cwd, { seed: "StateModel" });
    assert.equal(model.fromSession, false);
    assert.equal(model.name, "StateModel");
  } finally {
    cleanupWorkCopy(cwd);
  }
});

test("runSessionOpenCommand and status JSON", () => {
  const cwd = createWorkCopy();
  try {
    const opened = JSON.parse(runSessionOpenCommand({ sessionCwd: cwd, seed: "StateMachine" }));
    assert.equal(opened.opened, true);
    const status = JSON.parse(runSessionStatusCommand(cwd));
    assert.equal(status.open, true);
    assert.equal(status.project.name, "StateMachine");
    assert.equal(status.dirty, false);
  } finally {
    cleanupWorkCopy(cwd);
  }
});

test("runTreeCommand uses open session when seed omitted", async () => {
  const cwd = createWorkCopy();
  try {
    openSessionWorkspace({ sessionCwd: cwd, seed: "StateMachine" });
    const out = await runTreeCommand({ cwd, seedModel: true, format: "tree" });
    assert.match(out, /seed:StateMachine/);
  } finally {
    cleanupWorkCopy(cwd);
  }
});

test("plugin run in session does not modify source until save", async () => {
  const cwd = createWorkCopy();
  const sourceWebgmex = stateMachinePath(cwd);
  try {
    const before = await countNodes(sourceWebgmex, cwd);
    openSessionWorkspace({ sessionCwd: cwd, seed: "StateMachine" });
    const result = await runPluginRunCommand({
      cwd,
      plugin: "EchoPlugin",
      set: ["addNode=true", "message=held"],
    });
    assert.equal(result.success, true);
    assert.equal(result.persisted, true);
    assert.equal(readSessionState(cwd)?.dirty, true);
    const after = await countNodes(sourceWebgmex, cwd);
    assert.equal(after, before);
  } finally {
    cleanupWorkCopy(cwd);
  }
});

test("session lives in the execution dir, not the project dir", () => {
  const project = createWorkCopy();
  const execDir = fs.mkdtempSync(path.join(os.tmpdir(), "webdot-exec-"));
  try {
    const state = openSessionWorkspace({
      sessionCwd: execDir,
      projectCwd: project,
      seed: "StateMachine",
    });
    assert.equal(state.cwd, path.resolve(execDir));
    assert.equal(state.projectCwd, path.resolve(project));
    assert.ok(fs.existsSync(sessionFilePath(execDir)));
    assert.equal(fs.existsSync(path.join(project, ".webdot")), false);

    const status = JSON.parse(runSessionStatusCommand(execDir));
    assert.equal(status.open, true);
    assert.equal(status.project.name, "StateMachine");
    assert.equal(status.project.root, path.resolve(project));

    const model = resolveSessionModelSource(execDir, {});
    assert.equal(model.fromSession, true);
    assert.equal(model.projectCwd, path.resolve(project));
  } finally {
    clearSessionWorkspace(execDir);
    fs.rmSync(execDir, { recursive: true, force: true });
    cleanupWorkCopy(project);
  }
});

test("plugin run resolves catalog from session projectCwd without repeating -C", async () => {
  const project = createWorkCopy();
  const execDir = fs.mkdtempSync(path.join(os.tmpdir(), "webdot-exec-"));
  try {
    openSessionWorkspace({ sessionCwd: execDir, projectCwd: project, seed: "StateMachine" });
    const model = resolveSessionModelSource(execDir, {});
    const result = await runPluginRunCommand({
      cwd: model.projectCwd,
      sessionCwd: execDir,
      plugin: "EchoPlugin",
      set: ["addNode=true", "message=cross-dir"],
    });
    assert.equal(result.success, true);
    assert.equal(readSessionState(execDir)?.dirty, true);
  } finally {
    clearSessionWorkspace(execDir);
    fs.rmSync(execDir, { recursive: true, force: true });
    cleanupWorkCopy(project);
  }
});

test("runSessionCloseCommand after save removes workspace", async () => {
  const cwd = createWorkCopy();
  try {
    openSessionWorkspace({ sessionCwd: cwd, seed: "StateMachine" });
    await runPluginRunCommand({
      cwd,
      plugin: "EchoPlugin",
      set: ["addNode=true"],
    });
    runSessionSaveCommand({ cwd });
    const closed = JSON.parse(runSessionCloseCommand(cwd));
    assert.equal(closed.closed, true);
    assert.equal(readSessionState(cwd), null);
  } finally {
    cleanupWorkCopy(cwd);
  }
});

