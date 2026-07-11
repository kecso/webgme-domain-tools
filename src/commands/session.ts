import {
  closeSessionWorkspace,
  discardSessionWorkspace,
  formatSessionStatus,
  openSessionWorkspace,
  readSessionState,
  requireSessionState,
  saveSessionWorkspace,
  type SessionState,
} from "../session/workspace-state.js";

export interface SessionOpenOptions {
  /** Execution directory owning the session. */
  sessionCwd: string;
  /** Project root for --seed resolution (defaults to sessionCwd). */
  projectCwd?: string;
  seed?: string;
  webgmex?: string;
  force?: boolean;
}

export interface SessionSaveOptions {
  cwd: string;
  out?: string;
}

export function runSessionOpenCommand(options: SessionOpenOptions): string {
  const state = openSessionWorkspace(options);
  return formatSessionOpenResult(state, "opened");
}

export function runSessionStatusCommand(cwd: string): string {
  const state = readSessionState(cwd);
  if (!state) {
    return JSON.stringify({ open: false }, null, 2);
  }
  return formatSessionStatus(state);
}

export function runSessionCloseCommand(cwd: string, discard = false): string {
  closeSessionWorkspace(cwd, discard);
  return JSON.stringify({ closed: true, discarded: discard }, null, 2);
}

export function runSessionSaveCommand(options: SessionSaveOptions): string {
  const state = saveSessionWorkspace(options);
  return JSON.stringify(
    {
      saved: true,
      target: options.out ?? state.saveTarget,
      dirty: state.dirty,
    },
    null,
    2,
  );
}

export function runSessionDiscardCommand(cwd: string): string {
  const state = discardSessionWorkspace(cwd);
  return JSON.stringify(
    {
      discarded: true,
      working: state.workingWebgmex,
      dirty: state.dirty,
    },
    null,
    2,
  );
}

function formatSessionOpenResult(state: SessionState, action: string): string {
  return JSON.stringify(
    {
      [action]: true,
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

export { requireSessionState };
