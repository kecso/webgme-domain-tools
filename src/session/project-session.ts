import path from "node:path";
import type { CatalogEntry } from "../catalog/types.js";
import {
  createMemoryGmeAuth,
  createSessionLogger,
  loadGmeConfigForProject,
  loadGmeRuntime,
  type GmeCore,
  type GmeImportResult,
  type GmeNode,
} from "./gme-runtime.js";
import { primaryWebgmexPath } from "./seed-resolution.js";

export interface ProjectSessionOptions {
  cwd: string;
  /** Catalog seed entry. Provide this OR webgmexPath. */
  seed?: CatalogEntry;
  /** Direct path to a .webgmex file, bypassing the catalog. */
  webgmexPath?: string;
  /** Display/project name when opening via webgmexPath. */
  seedName?: string;
  branchName?: string;
  projectNamePrefix?: string;
  /** When true, adds {cwd}/src/plugins (and pluginBasePaths) to gmeConfig.plugin.basePaths */
  useProjectPlugins?: boolean;
  /** Extra plugin base directories to register (parent dirs of plugin folders). */
  pluginBasePaths?: string[];
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
  const webgmexPath = options.webgmexPath ?? primaryWebgmexPath(options.seed!);
  const seedName =
    options.seedName ??
    options.seed?.name ??
    path.basename(webgmexPath).replace(/\.webgmex$/i, "");
  const sessionConfig = options.useProjectPlugins
    ? loadGmeConfigForProject(options.cwd, options.pluginBasePaths)
    : bridge.loadGmeConfig();
  const safeName = seedName.replace(/[^a-zA-Z0-9_]/g, "_");
  const projectName =
    (options.projectNamePrefix ?? "file_project") + "_" + safeName + "_" + Date.now();
  const branchName = options.branchName ?? "master";

  const { gmeConfig, gmeAuth } = await createMemoryGmeAuth(projectName, sessionConfig);
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
      seedName,
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
