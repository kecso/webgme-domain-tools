import fs from "node:fs";
import path from "node:path";
import { createCatalogLoader, resolveModelSource } from "../plugin/sources.js";

export const SESSION_DIR = ".webdot";
export const SESSION_FILE = "session.json";
export const WORKSPACE_DIR = "workspace";
export const SESSION_VERSION = 1;

export interface SessionSource {
  kind: "seed" | "webgmex";
  name: string;
  /** Absolute path to the original .webgmex (save target by default). */
  path: string;
}

export interface SessionState {
  version: number;
  /** Absolute path of the execution directory that owns this session (where .webdot lives). */
  cwd: string;
  openedAt: string;
  source: SessionSource;
  /**
   * Absolute project root (webgme-setup.json) used to resolve seed/plugin names.
   * Recorded at open time so later commands don't need to repeat -C.
   */
  projectCwd: string;
  /** Absolute path where session save writes unless --out is given. */
  saveTarget: string;
  /** Absolute path to the editable working .webgmex copy. */
  workingWebgmex: string;
  dirty: boolean;
  branch: string;
}

export class SessionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SessionError";
  }
}

export function sessionRoot(cwd: string): string {
  return path.resolve(cwd, SESSION_DIR);
}

export function sessionFilePath(cwd: string): string {
  return path.join(sessionRoot(cwd), SESSION_FILE);
}

export function workspaceRoot(cwd: string): string {
  return path.join(sessionRoot(cwd), WORKSPACE_DIR);
}

export function readSessionState(cwd: string): SessionState | null {
  const file = sessionFilePath(cwd);
  if (!fs.existsSync(file)) return null;
  const raw = JSON.parse(fs.readFileSync(file, "utf8")) as SessionState;
  if (raw.version !== SESSION_VERSION) {
    throw new SessionError("Unsupported session version: " + raw.version);
  }
  if (path.resolve(raw.cwd) !== path.resolve(cwd)) {
    throw new SessionError(
      "Session was opened in a different cwd (" + raw.cwd + "); use -C " + raw.cwd + " or session close",
    );
  }
  return raw;
}

export function requireSessionState(cwd: string): SessionState {
  const state = readSessionState(cwd);
  if (!state) {
    throw new SessionError("No open session. Run: webdot session open --seed <name>");
  }
  return state;
}

export function writeSessionState(cwd: string, state: SessionState): void {
  const root = sessionRoot(cwd);
  fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(sessionFilePath(cwd), JSON.stringify(state, null, 2) + "\n", "utf8");
}

export function markSessionDirty(cwd: string, dirty = true): void {
  const state = requireSessionState(cwd);
  if (state.dirty === dirty) return;
  writeSessionState(cwd, { ...state, dirty });
}

export function clearSessionWorkspace(cwd: string): void {
  const root = sessionRoot(cwd);
  if (fs.existsSync(root)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function copyWebgmex(from: string, to: string): void {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

export interface OpenSessionOptions {
  /** Execution directory that will own the session (where .webdot is written). */
  sessionCwd: string;
  /** Project root for resolving --seed / plugin names (defaults to sessionCwd). */
  projectCwd?: string;
  seed?: string;
  webgmex?: string;
  force?: boolean;
}

export function openSessionWorkspace(options: OpenSessionOptions): SessionState {
  const sessionCwd = path.resolve(options.sessionCwd);
  const projectCwd = path.resolve(options.projectCwd ?? options.sessionCwd);
  const existing = readSessionState(sessionCwd);
  if (existing && !options.force) {
    throw new SessionError(
      'Session already open for "' + existing.source.name + '". Use session close or session open --force',
    );
  }
  if (existing && options.force) {
    clearSessionWorkspace(sessionCwd);
  }

  const getCatalog = createCatalogLoader(projectCwd);
  // --seed resolves against the project catalog; --webgmex is relative to the execution dir.
  const model = resolveModelSource(
    { cwd: options.webgmex ? sessionCwd : projectCwd, seed: options.seed, webgmex: options.webgmex },
    getCatalog,
  );
  const sourcePath = path.resolve(model.webgmexPath);
  const kind = options.webgmex ? "webgmex" : "seed";
  const workingWebgmex = path.join(workspaceRoot(sessionCwd), model.name + ".webgmex");

  copyWebgmex(sourcePath, workingWebgmex);

  const state: SessionState = {
    version: SESSION_VERSION,
    cwd: sessionCwd,
    openedAt: new Date().toISOString(),
    source: { kind, name: model.name, path: sourcePath },
    projectCwd,
    saveTarget: sourcePath,
    workingWebgmex,
    dirty: false,
    branch: "master",
  };
  writeSessionState(sessionCwd, state);
  return state;
}

export function discardSessionWorkspace(cwd: string): SessionState {
  const state = requireSessionState(cwd);
  copyWebgmex(state.source.path, state.workingWebgmex);
  const next = { ...state, dirty: false };
  writeSessionState(cwd, next);
  return next;
}

export interface SaveSessionOptions {
  cwd: string;
  out?: string;
}

export function saveSessionWorkspace(options: SaveSessionOptions): SessionState {
  const state = requireSessionState(options.cwd);
  const target = options.out ? path.resolve(options.cwd, options.out) : state.saveTarget;
  if (!target.toLowerCase().endsWith(".webgmex")) {
    throw new SessionError("Save target must be a .webgmex file: " + target);
  }
  copyWebgmex(state.workingWebgmex, target);
  const next: SessionState = {
    ...state,
    dirty: false,
    saveTarget: options.out ? state.saveTarget : target,
  };
  writeSessionState(options.cwd, next);
  return { ...next, saveTarget: target };
}

export function closeSessionWorkspace(cwd: string, discard = false): void {
  const state = readSessionState(cwd);
  if (!state) return;
  if (state.dirty && !discard) {
    throw new SessionError("Session has unsaved changes. Run session save, session discard, or session close --discard");
  }
  clearSessionWorkspace(cwd);
}

export interface ResolvedSessionModel {
  name: string;
  webgmexPath: string;
  fromSession: boolean;
  /** Project root to use for plugin/catalog resolution alongside this model. */
  projectCwd: string;
}

/**
 * Resolve the model for a command: explicit --seed/--webgmex wins; otherwise use the open
 * session working copy. When the session provides the model, its recorded projectCwd is
 * returned so callers resolve plugins against the original project without repeating -C.
 */
export function resolveSessionModelSource(
  sessionCwd: string,
  options: { seed?: string; webgmex?: string; projectCwd?: string },
): ResolvedSessionModel {
  const projectCwd = path.resolve(options.projectCwd ?? sessionCwd);
  if (options.seed || options.webgmex) {
    const getCatalog = createCatalogLoader(projectCwd);
    const model = resolveModelSource(
      { cwd: options.webgmex ? sessionCwd : projectCwd, seed: options.seed, webgmex: options.webgmex },
      getCatalog,
    );
    return { ...model, fromSession: false, projectCwd };
  }
  const state = requireSessionState(sessionCwd);
  return {
    name: state.source.name,
    webgmexPath: state.workingWebgmex,
    fromSession: true,
    projectCwd: state.projectCwd,
  };
}

export function formatSessionStatus(state: SessionState): string {
  return JSON.stringify(
    {
      open: true,
      cwd: state.cwd,
      openedAt: state.openedAt,
      project: {
        name: state.source.name,
        kind: state.source.kind,
        root: state.projectCwd,
        source: state.source.path,
        working: state.workingWebgmex,
        saveTarget: state.saveTarget,
      },
      dirty: state.dirty,
      branch: state.branch,
    },
    null,
    2,
  );
}
