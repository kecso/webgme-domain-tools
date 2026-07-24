import path from "node:path";
import {
  createSessionLogger,
  loadGmeConfigForProject,
  loadGmeRuntime,
} from "./gme-runtime.js";
import {
  closeProjectSession,
  openProjectSession,
  type LoadedSeedContext,
} from "./project-session.js";
import { shouldExportWithHistory } from "./exchange-format.js";

export interface LibraryListEntry {
  name: string;
  path: string | null;
  info: Record<string, unknown> | null;
}

export interface LibraryListResult {
  webgmex: string;
  libraries: LibraryListEntry[];
}

export interface LibraryMutateOptions {
  /** Absolute or cwd-relative path to the host .webgmex (always written). */
  webgmex: string;
  cwd?: string;
  branchName?: string;
}

export interface LibraryAddOptions extends LibraryMutateOptions {
  from: string;
  as: string;
}

export interface LibraryUpdateOptions extends LibraryMutateOptions {
  name: string;
  from: string;
}

export interface LibraryRemoveOptions extends LibraryMutateOptions {
  name: string;
}

export interface LibraryMutateResult {
  webgmex: string;
  library: string;
  action: "add" | "update" | "remove";
  commitHash: string;
}

function resolveWebgmex(cwd: string, webgmex: string): string {
  return path.resolve(cwd, webgmex);
}

async function withHostProject<T>(
  options: LibraryMutateOptions,
  fn: (ctx: LoadedSeedContext, gmeConfig: Record<string, unknown>) => Promise<T>,
): Promise<T> {
  const cwd = options.cwd ?? process.cwd();
  const webgmexPath = resolveWebgmex(cwd, options.webgmex);
  const gmeConfig = loadGmeConfigForProject(cwd);
  const ctx = await openProjectSession({
    cwd,
    webgmexPath,
    seedName: path.basename(webgmexPath).replace(/\.webgmex$/i, ""),
    branchName: options.branchName,
  });
  try {
    return await fn(ctx, gmeConfig);
  } finally {
    await closeProjectSession();
  }
}

async function persistAndExport(
  ctx: LoadedSeedContext,
  gmeConfig: Record<string, unknown>,
  message: string,
): Promise<string> {
  const { bridge } = loadGmeRuntime();
  const logger = createSessionLogger(gmeConfig);
  if (!bridge.persistProjectCommit) {
    throw new Error("persistProjectCommit is not available on the GME bridge");
  }
  const committed = await bridge.persistProjectCommit({
    project: ctx.project,
    core: ctx.core,
    rootNode: ctx.rootNode,
    branchName: ctx.branchName,
    parentCommitHash: ctx.importResult.commitHash,
    message,
  });
  await bridge.exportProjectToFile({
    project: ctx.project,
    branchName: ctx.branchName,
    gmeConfig,
    logger,
    outFile: ctx.webgmexPath,
    withHistory: shouldExportWithHistory(ctx.exchangeFormat),
  });
  return typeof committed.commitHash === "string"
    ? committed.commitHash
    : String(committed.commitHash);
}

export function listLibrariesFromContext(ctx: LoadedSeedContext): LibraryListResult {
  const names =
    typeof ctx.core.getLibraryNames === "function"
      ? ctx.core.getLibraryNames(ctx.rootNode)
      : [];
  const libraries: LibraryListEntry[] = names
    .slice()
    .sort((a, b) => a.localeCompare(b))
    .map((name) => {
      const info =
        typeof ctx.core.getLibraryInfo === "function"
          ? ctx.core.getLibraryInfo(ctx.rootNode, name)
          : null;
      // Library root path is not always exposed; leave null unless we find a library root child.
      let libPath: string | null = null;
      for (const relid of ctx.core.getChildrenRelids(ctx.rootNode)) {
        const child = ctx.core.getChild(ctx.rootNode, relid);
        if (!child) continue;
        if (typeof ctx.core.isLibraryRoot === "function" && ctx.core.isLibraryRoot(child)) {
          const n = ctx.core.getAttribute(child, "name");
          if (n === name) {
            libPath = ctx.core.getPath(child);
            break;
          }
        }
      }
      return { name, path: libPath, info };
    });
  return { webgmex: ctx.webgmexPath, libraries };
}

export async function runLibraryList(options: {
  webgmex: string;
  cwd?: string;
  branchName?: string;
}): Promise<LibraryListResult> {
  return withHostProject(options, async (ctx) => listLibrariesFromContext(ctx));
}

export async function runLibraryAdd(options: LibraryAddOptions): Promise<LibraryMutateResult> {
  const cwd = options.cwd ?? process.cwd();
  const from = path.resolve(cwd, options.from);
  return withHostProject(options, async (ctx, gmeConfig) => {
    const { bridge } = loadGmeRuntime();
    const logger = createSessionLogger(gmeConfig);
    if (!bridge.attachLibraryFromWebgmex) {
      throw new Error("attachLibraryFromWebgmex is not available on the GME bridge");
    }
    await bridge.attachLibraryFromWebgmex({
      project: ctx.project,
      core: ctx.core,
      rootNode: ctx.rootNode,
      libraryName: options.as,
      libraryWebgmex: from,
      gmeConfig,
      logger,
    });
    const commitHash = await persistAndExport(
      ctx,
      gmeConfig,
      "adds library [" + options.as + "]",
    );
    return {
      webgmex: ctx.webgmexPath,
      library: options.as,
      action: "add",
      commitHash,
    };
  });
}

export async function runLibraryUpdate(
  options: LibraryUpdateOptions,
): Promise<LibraryMutateResult> {
  const cwd = options.cwd ?? process.cwd();
  const from = path.resolve(cwd, options.from);
  return withHostProject(options, async (ctx, gmeConfig) => {
    const { bridge } = loadGmeRuntime();
    const logger = createSessionLogger(gmeConfig);
    if (!bridge.updateLibraryFromWebgmex) {
      throw new Error("updateLibraryFromWebgmex is not available on the GME bridge");
    }
    await bridge.updateLibraryFromWebgmex({
      project: ctx.project,
      core: ctx.core,
      rootNode: ctx.rootNode,
      libraryName: options.name,
      libraryWebgmex: from,
      gmeConfig,
      logger,
    });
    const commitHash = await persistAndExport(
      ctx,
      gmeConfig,
      "updates library [" + options.name + "]",
    );
    return {
      webgmex: ctx.webgmexPath,
      library: options.name,
      action: "update",
      commitHash,
    };
  });
}

export async function runLibraryRemove(
  options: LibraryRemoveOptions,
): Promise<LibraryMutateResult> {
  return withHostProject(options, async (ctx, gmeConfig) => {
    const names =
      typeof ctx.core.getLibraryNames === "function"
        ? ctx.core.getLibraryNames(ctx.rootNode)
        : [];
    if (names.indexOf(options.name) === -1) {
      throw new Error('Library not attached: "' + options.name + '"');
    }
    if (typeof ctx.core.removeLibrary !== "function") {
      throw new Error("core.removeLibrary is not available");
    }
    ctx.core.removeLibrary(ctx.rootNode, options.name);
    const commitHash = await persistAndExport(
      ctx,
      gmeConfig,
      "removes library [" + options.name + "]",
    );
    return {
      webgmex: ctx.webgmexPath,
      library: options.name,
      action: "remove",
      commitHash,
    };
  });
}

/** Preferred keys from core.getLibraryInfo (origin / identity of the attached package). */
const LIBRARY_INFO_KEYS = ["projectId", "branchName", "commitHash", "hash"] as const;

function formatLibraryInfoLines(info: Record<string, unknown> | null): string[] {
  if (!info || typeof info !== "object") return [];
  const lines: string[] = [];
  const seen = new Set<string>();
  for (const key of LIBRARY_INFO_KEYS) {
    if (info[key] === undefined || info[key] === null) continue;
    seen.add(key);
    lines.push("    " + key + ": " + String(info[key]));
  }
  for (const key of Object.keys(info).sort()) {
    if (seen.has(key)) continue;
    if (info[key] === undefined || info[key] === null) continue;
    lines.push("    " + key + ": " + String(info[key]));
  }
  return lines;
}

export function formatLibraryList(result: LibraryListResult): string {
  const lines = ["libraries (" + result.webgmex + "):"];
  if (result.libraries.length === 0) {
    lines.push("  <none>");
  } else {
    for (const entry of result.libraries) {
      const pathPart = entry.path ? "  " + entry.path : "";
      lines.push("  " + entry.name + pathPart);
      lines.push(...formatLibraryInfoLines(entry.info));
    }
  }
  return lines.join("\n");
}
