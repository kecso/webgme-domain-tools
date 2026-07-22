import { createRequire } from "node:module";
import path from "node:path";
import {
  createSessionLogger,
  loadGmeConfigForProject,
  loadGmeRuntime,
  type GmeCommitObject,
  type GmeProject,
} from "./gme-runtime.js";
import {
  shouldExportWithHistory,
  type ExchangeFormat,
} from "./exchange-format.js";
import {
  openProjectSession,
  closeProjectSession,
  withProjectSession,
  type LoadedSeedContext,
  type ProjectSessionOptions,
} from "./project-session.js";

const require = createRequire(import.meta.url);

function loadObject(project: GmeProject, hash: string): Promise<GmeCommitObject> {
  const Q = require("q") as { ninvoke: (obj: unknown, method: string, ...args: unknown[]) => Promise<GmeCommitObject> };
  return Q.ninvoke(project, "loadObject", hash);
}
export interface HistoryCommitRow {
  hash: string;
  message: string;
  time: number | null;
  parents: string[];
}

export interface HistoryLogResult {
  webgmex: string;
  branch: string;
  format: ExchangeFormat;
  commits: HistoryCommitRow[];
}

export interface BranchListResult {
  webgmex: string;
  format: ExchangeFormat;
  current?: string;
  branches: Array<{ name: string; hash: string }>;
}

export interface TagListResult {
  webgmex: string;
  format: ExchangeFormat;
  tags: Array<{ name: string; hash: string }>;
}

function toCommitRow(c: GmeCommitObject): HistoryCommitRow {
  return {
    hash: c._id,
    message: c.message ?? "",
    time: typeof c.time === "number" ? c.time : null,
    parents: Array.isArray(c.parents) ? c.parents : [],
  };
}

export async function exportLoadedProject(
  context: LoadedSeedContext,
  outFile: string,
  options?: { withHistory?: boolean; cwd?: string },
): Promise<{ outFile: string; withHistory: boolean }> {
  const { bridge } = loadGmeRuntime();
  const withHistory =
    options?.withHistory ?? shouldExportWithHistory(context.exchangeFormat);
  const gmeConfig = loadGmeConfigForProject(options?.cwd ?? path.dirname(outFile));
  const logger = createSessionLogger(gmeConfig);
  const previousCwd = process.cwd();
  try {
    process.chdir(options?.cwd ?? previousCwd);
    await bridge.exportProjectToFile({
      project: context.project,
      branchName: context.branchName,
      gmeConfig,
      logger,
      outFile,
      withHistory,
    });
  } finally {
    process.chdir(previousCwd);
  }
  return { outFile, withHistory };
}

export async function runHistoryLog(options: {
  cwd: string;
  webgmexPath: string;
  branch?: string;
  limit?: number;
}): Promise<HistoryLogResult> {
  const branch = options.branch;
  const limit = options.limit ?? 50;

  return withProjectSession(
    {
      cwd: options.cwd,
      webgmexPath: options.webgmexPath,
      branchName: branch,
    },
    async (context) => {
      const commits = await context.project.getHistory(context.branchName, limit);
      return {
        webgmex: context.webgmexPath,
        branch: context.branchName,
        format: context.exchangeFormat,
        commits: commits.map(toCommitRow),
      };
    },
  );
}

export async function runHistoryShow(options: {
  cwd: string;
  webgmexPath: string;
  commit: string;
  branch?: string;
}): Promise<{ webgmex: string; format: ExchangeFormat; commit: HistoryCommitRow }> {
  return withProjectSession(
    {
      cwd: options.cwd,
      webgmexPath: options.webgmexPath,
      branchName: options.branch,
    },
    async (context) => {
      const hash = options.commit.startsWith("#") ? options.commit : "#" + options.commit;
      const obj = await loadObject(context.project, hash);
      return {
        webgmex: context.webgmexPath,
        format: context.exchangeFormat,
        commit: toCommitRow(obj),
      };
    },
  );
}

export async function runBranchList(options: {
  cwd: string;
  webgmexPath: string;
  current?: string;
}): Promise<BranchListResult> {
  return withProjectSession(
    {
      cwd: options.cwd,
      webgmexPath: options.webgmexPath,
      branchName: options.current,
    },
    async (context) => {
      const branchesMap = await context.project.getBranches();
      const branches = Object.keys(branchesMap)
        .sort()
        .map((name) => ({ name, hash: branchesMap[name] }));
      return {
        webgmex: context.webgmexPath,
        format: context.exchangeFormat,
        current: context.branchName,
        branches,
      };
    },
  );
}

export async function runBranchCreate(options: {
  cwd: string;
  webgmexPath: string;
  name: string;
  from?: string;
  /** Branch used when resolving --from as a branch name; also default export compat. */
  branch?: string;
}): Promise<{
  webgmex: string;
  created: string;
  hash: string;
  upgradedToRepository: boolean;
}> {
  const context = await openProjectSession({
    cwd: options.cwd,
    webgmexPath: options.webgmexPath,
    branchName: options.branch,
  });
  try {
    let hash: string;
    if (options.from) {
      const from = options.from;
      if (from.startsWith("#") || /^[0-9a-f]{40}$/i.test(from.replace(/^#/, ""))) {
        hash = from.startsWith("#") ? from : "#" + from;
        await loadObject(context.project, hash);
      } else {
        hash = await context.project.getBranchHash(from);
        if (!hash) {
          throw new Error('Unknown branch or commit for --from: "' + from + '"');
        }
      }
    } else {
      hash = context.importResult.commitHash;
    }

    await context.project.createBranch(options.name, hash);
    // Branch pointers require repository export (v2).
    const upgradedToRepository = context.exchangeFormat !== "repository";
    await exportLoadedProject(
      { ...context, exchangeFormat: "repository" },
      options.webgmexPath,
      { withHistory: true, cwd: options.cwd },
    );
    return {
      webgmex: options.webgmexPath,
      created: options.name,
      hash,
      upgradedToRepository,
    };
  } finally {
    await closeProjectSession();
  }
}

export async function runBranchDelete(options: {
  cwd: string;
  webgmexPath: string;
  name: string;
  branch?: string;
}): Promise<{ webgmex: string; deleted: string }> {
  const context = await openProjectSession({
    cwd: options.cwd,
    webgmexPath: options.webgmexPath,
    branchName: options.branch,
  });
  try {
    if (options.name === context.branchName) {
      throw new Error('Cannot delete the currently selected branch "' + options.name + '"');
    }
    const hash = await context.project.getBranchHash(options.name);
    if (!hash) {
      throw new Error('Unknown branch "' + options.name + '"');
    }
    await context.project.deleteBranch(options.name, hash);
    await exportLoadedProject(
      { ...context, exchangeFormat: "repository" },
      options.webgmexPath,
      { withHistory: true, cwd: options.cwd },
    );
    return { webgmex: options.webgmexPath, deleted: options.name };
  } finally {
    await closeProjectSession();
  }
}

export async function runTagList(options: {
  cwd: string;
  webgmexPath: string;
  branch?: string;
}): Promise<TagListResult> {
  return withProjectSession(
    {
      cwd: options.cwd,
      webgmexPath: options.webgmexPath,
      branchName: options.branch,
    },
    async (context) => {
      const tagsMap = await context.project.getTags();
      const tags = Object.keys(tagsMap)
        .sort()
        .map((name) => ({ name, hash: tagsMap[name] }));
      return {
        webgmex: context.webgmexPath,
        format: context.exchangeFormat,
        tags,
      };
    },
  );
}

export async function runTagCreate(options: {
  cwd: string;
  webgmexPath: string;
  name: string;
  commit?: string;
  branch?: string;
}): Promise<{ webgmex: string; created: string; hash: string; upgradedToRepository: boolean }> {
  const context = await openProjectSession({
    cwd: options.cwd,
    webgmexPath: options.webgmexPath,
    branchName: options.branch,
  });
  try {
    let hash = options.commit ?? context.importResult.commitHash;
    if (!hash.startsWith("#")) hash = "#" + hash;
    await context.project.createTag(options.name, hash);
    const upgradedToRepository = context.exchangeFormat !== "repository";
    await exportLoadedProject(
      { ...context, exchangeFormat: "repository" },
      options.webgmexPath,
      { withHistory: true, cwd: options.cwd },
    );
    return {
      webgmex: options.webgmexPath,
      created: options.name,
      hash,
      upgradedToRepository,
    };
  } finally {
    await closeProjectSession();
  }
}

export async function runTagDelete(options: {
  cwd: string;
  webgmexPath: string;
  name: string;
  branch?: string;
}): Promise<{ webgmex: string; deleted: string }> {
  const context = await openProjectSession({
    cwd: options.cwd,
    webgmexPath: options.webgmexPath,
    branchName: options.branch,
  });
  try {
    await context.project.deleteTag(options.name);
    await exportLoadedProject(
      { ...context, exchangeFormat: "repository" },
      options.webgmexPath,
      { withHistory: true, cwd: options.cwd },
    );
    return { webgmex: options.webgmexPath, deleted: options.name };
  } finally {
    await closeProjectSession();
  }
}

export type { ProjectSessionOptions, LoadedSeedContext };
