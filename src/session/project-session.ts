import path from "node:path";
import type { CatalogEntry } from "../catalog/types.js";
import {
  createMemoryGmeAuth,
  createSessionLogger,
  loadGmeRuntime,
  type GmeCore,
  type GmeImportResult,
  type GmeNode,
} from "./gme-runtime.js";
import { primaryWebgmexPath } from "./seed-resolution.js";

export interface ProjectSessionOptions {
  cwd: string;
  seed: CatalogEntry;
  branchName?: string;
  projectNamePrefix?: string;
}

export interface LoadedSeedContext {
  seedName: string;
  branchName: string;
  webgmexPath: string;
  core: GmeCore;
  rootNode: GmeNode;
  importResult: GmeImportResult;
}

let activeClose: (() => Promise<void>) | null = null;

export async function closeProjectSession(): Promise<void> {
  if (activeClose) {
    const close = activeClose;
    activeClose = null;
    await close();
  }
}

export async function openProjectSession(
  options: ProjectSessionOptions,
): Promise<LoadedSeedContext> {
  await closeProjectSession();

  const { bridge } = loadGmeRuntime();
  const webgmexPath = primaryWebgmexPath(options.seed);
  const projectName =
    (options.projectNamePrefix ?? "domain_tools") +
    "_" +
    options.seed.name +
    "_" +
    Date.now();
  const branchName = options.branchName ?? "master";

  const { gmeConfig, gmeAuth } = await createMemoryGmeAuth(projectName);
  const logger = createSessionLogger(gmeConfig);
  const storage = bridge.createMemoryStorage(logger, gmeConfig, gmeAuth);
  await storage.openDatabase();

  try {
    const importResult = await bridge.importSeedProject(storage, {
      projectSeed: webgmexPath,
      projectName,
      branchName,
      logger,
      gmeConfig,
    });

    activeClose = async () => {
      await storage.closeDatabase();
    };

    return {
      seedName: options.seed.name,
      branchName,
      webgmexPath: path.resolve(webgmexPath),
      core: importResult.core,
      rootNode: importResult.rootNode,
      importResult,
    };
  } catch (err) {
    await storage.closeDatabase();
    throw err;
  }
}

export async function loadNodeAt(
  context: LoadedSeedContext,
  nodePath: string,
): Promise<GmeNode> {
  const pathArg = nodePath || "";
  const node = await context.core.loadByPath(context.rootNode, pathArg);
  if (!node) {
    throw new Error('Node path does not exist: "' + pathArg + '"');
  }
  return node;
}

export async function loadSelection(
  context: LoadedSeedContext,
  paths: string[],
): Promise<GmeNode[]> {
  const nodes: GmeNode[] = [];
  for (const p of paths) {
    nodes.push(await loadNodeAt(context, p));
  }
  return nodes;
}
