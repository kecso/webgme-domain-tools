import path from "node:path";
import {
  runBranchCreate,
  runBranchDelete,
  runBranchList,
  runBranchUpdate,
  runHistoryLog,
  runHistoryShow,
  runTagCreate,
  runTagDelete,
  runTagList,
} from "../session/repository.js";
import {
  markSessionDirty,
  readSessionState,
  resolveSessionModelSource,
} from "../session/workspace-state.js";

function resolveWebgmex(options: {
  sessionCwd: string;
  projectCwd: string;
  seed?: string;
  webgmex?: string;
}): { webgmexPath: string; branch?: string } {
  const model = resolveSessionModelSource(options.sessionCwd, {
    seed: options.seed,
    webgmex: options.webgmex,
    projectCwd: options.projectCwd,
  });
  return { webgmexPath: model.webgmexPath, branch: model.branch };
}

export async function runHistoryLogCommand(options: {
  sessionCwd: string;
  projectCwd: string;
  seed?: string;
  webgmex?: string;
  branch?: string;
  limit?: number;
}): Promise<string> {
  const resolved = resolveWebgmex(options);
  const result = await runHistoryLog({
    cwd: options.projectCwd,
    webgmexPath: resolved.webgmexPath,
    branch: options.branch ?? resolved.branch,
    limit: options.limit,
  });
  return JSON.stringify(result, null, 2);
}

export async function runHistoryShowCommand(options: {
  sessionCwd: string;
  projectCwd: string;
  commit: string;
  seed?: string;
  webgmex?: string;
  branch?: string;
}): Promise<string> {
  const resolved = resolveWebgmex(options);
  const result = await runHistoryShow({
    cwd: options.projectCwd,
    webgmexPath: resolved.webgmexPath,
    commit: options.commit,
    branch: options.branch ?? resolved.branch,
  });
  return JSON.stringify(result, null, 2);
}

export async function runBranchListCommand(options: {
  sessionCwd: string;
  projectCwd: string;
  seed?: string;
  webgmex?: string;
}): Promise<string> {
  const resolved = resolveWebgmex(options);
  const result = await runBranchList({
    cwd: options.projectCwd,
    webgmexPath: resolved.webgmexPath,
    current: resolved.branch,
  });
  return JSON.stringify(result, null, 2);
}

export async function runBranchCreateCommand(options: {
  sessionCwd: string;
  projectCwd: string;
  name: string;
  from?: string;
  seed?: string;
  webgmex?: string;
}): Promise<string> {
  const resolved = resolveWebgmex(options);
  const result = await runBranchCreate({
    cwd: options.projectCwd,
    webgmexPath: resolved.webgmexPath,
    name: options.name,
    from: options.from,
    branch: resolved.branch,
  });
  const session = readSessionState(options.sessionCwd);
  if (session && path.resolve(session.workingWebgmex) === path.resolve(resolved.webgmexPath)) {
    markSessionDirty(options.sessionCwd);
  }
  return JSON.stringify(result, null, 2);
}

export async function runBranchUpdateCommand(options: {
  sessionCwd: string;
  projectCwd: string;
  name: string;
  from?: string;
  seed?: string;
  webgmex?: string;
}): Promise<string> {
  const resolved = resolveWebgmex(options);
  const result = await runBranchUpdate({
    cwd: options.projectCwd,
    webgmexPath: resolved.webgmexPath,
    name: options.name,
    from: options.from,
    branch: resolved.branch,
  });
  const session = readSessionState(options.sessionCwd);
  if (session && path.resolve(session.workingWebgmex) === path.resolve(resolved.webgmexPath)) {
    markSessionDirty(options.sessionCwd);
  }
  return JSON.stringify(result, null, 2);
}

export async function runBranchDeleteCommand(options: {
  sessionCwd: string;
  projectCwd: string;
  name: string;
  seed?: string;
  webgmex?: string;
}): Promise<string> {
  const resolved = resolveWebgmex(options);
  const result = await runBranchDelete({
    cwd: options.projectCwd,
    webgmexPath: resolved.webgmexPath,
    name: options.name,
    branch: resolved.branch,
  });
  return JSON.stringify(result, null, 2);
}

export async function runTagListCommand(options: {
  sessionCwd: string;
  projectCwd: string;
  seed?: string;
  webgmex?: string;
}): Promise<string> {
  const resolved = resolveWebgmex(options);
  const result = await runTagList({
    cwd: options.projectCwd,
    webgmexPath: resolved.webgmexPath,
    branch: resolved.branch,
  });
  return JSON.stringify(result, null, 2);
}

export async function runTagCreateCommand(options: {
  sessionCwd: string;
  projectCwd: string;
  name: string;
  commit?: string;
  seed?: string;
  webgmex?: string;
}): Promise<string> {
  const resolved = resolveWebgmex(options);
  const result = await runTagCreate({
    cwd: options.projectCwd,
    webgmexPath: resolved.webgmexPath,
    name: options.name,
    commit: options.commit,
    branch: resolved.branch,
  });
  return JSON.stringify(result, null, 2);
}

export async function runTagDeleteCommand(options: {
  sessionCwd: string;
  projectCwd: string;
  name: string;
  seed?: string;
  webgmex?: string;
}): Promise<string> {
  const resolved = resolveWebgmex(options);
  const result = await runTagDelete({
    cwd: options.projectCwd,
    webgmexPath: resolved.webgmexPath,
    name: options.name,
    branch: resolved.branch,
  });
  return JSON.stringify(result, null, 2);
}
