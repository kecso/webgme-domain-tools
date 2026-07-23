import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);

export interface GmeCommitObject {
  _id: string;
  root: string;
  parents?: string[];
  time?: number;
  message?: string;
  updater?: string[];
  type?: string;
}

export interface GmeProject {
  projectId: string;
  createBranch: (name: string, hash: string) => Promise<{ status?: string; hash?: string }>;
  deleteBranch: (name: string, oldHash: string) => Promise<unknown>;
  /** Move branch head. Argument order is (branchName, newHash, oldHash). */
  setBranchHash: (
    name: string,
    newHash: string,
    oldHash: string,
  ) => Promise<{ status?: string; hash?: string }>;
  getBranchHash: (name: string) => Promise<string>;
  getBranches: () => Promise<Record<string, string>>;
  createTag: (name: string, commitHash: string) => Promise<unknown>;
  deleteTag: (name: string) => Promise<unknown>;
  getTags: () => Promise<Record<string, string>>;
  getHistory: (start: string | string[], number: number) => Promise<GmeCommitObject[]>;
  loadObject: (hash: string) => Promise<GmeCommitObject>;
  makeCommit: (
    branchName: string,
    parents: string[],
    rootHash: string,
    objects: unknown,
    msg: string,
  ) => Promise<{ hash?: string; status?: string }>;
}

export interface GmeImportResult {
  project: GmeProject;
  core: GmeCore;
  rootNode: GmeNode;
  commitHash: string;
  branchName: string;
  rootHash: string;
  webgmexPath: string;
  exchangeFormat?: "snapshot" | "repository";
}

export interface GmeNode {
  // opaque webgme core node
}

export interface GmeCore {
  loadRoot: (rootHash: string) => Promise<GmeNode>;
  loadSubTree: (node: GmeNode) => Promise<GmeNode[]>;
  loadByPath: (root: GmeNode, nodePath: string) => Promise<GmeNode | null>;
  getPath: (node: GmeNode) => string;
  getAttribute: (node: GmeNode, name: string) => unknown;
  getMetaType: (node: GmeNode) => GmeNode | null;
  isMetaNode: (node: GmeNode) => boolean;
  getAllMetaNodes: (root: GmeNode) => Record<string, GmeNode>;
  getJsonMeta: (node: GmeNode) => Record<string, unknown>;
  getBase: (node: GmeNode) => GmeNode | null;
  getChildrenRelids: (node: GmeNode) => string[];
  getChild: (node: GmeNode, relid: string) => GmeNode | null;
  persist: (node: GmeNode) => { rootHash: string; objects: unknown };
  /** Library / namespace APIs (present on webgme-engine core). */
  getLibraryNames?: (root: GmeNode) => string[];
  getNamespace?: (node: GmeNode) => string;
  getFullyQualifiedName?: (node: GmeNode) => string;
  isLibraryElement?: (node: GmeNode) => boolean;
  isLibraryRoot?: (node: GmeNode) => boolean;
  addLibrary?: (
    node: GmeNode,
    name: string,
    libraryRootHash: string,
    libraryInfo: Record<string, unknown>,
  ) => Promise<unknown>;
  updateLibrary?: (
    node: GmeNode,
    name: string,
    libraryRootHash: string,
    libraryInfo: Record<string, unknown>,
  ) => Promise<unknown>;
  removeLibrary?: (node: GmeNode, name: string) => void;
  getLibraryInfo?: (node: GmeNode, name: string) => Record<string, unknown> | null;
}

interface WebgmeImportBridge {
  importSeedProject: (
    storage: unknown,
    parameters: Record<string, unknown>,
  ) => Promise<GmeImportResult>;
  createMemoryStorage: (
    logger: SessionLogger,
    gmeConfig: Record<string, unknown>,
    gmeAuth: unknown,
  ) => {
    openDatabase: () => Promise<void>;
    closeDatabase: () => Promise<void>;
    createProject: (data: Record<string, unknown>) => Promise<unknown>;
  };
  loadGmeConfig: () => Record<string, unknown>;
  withProjectPluginPaths: (
    gmeConfig: Record<string, unknown>,
    cwd: string,
    extraBasePaths?: string[],
  ) => Record<string, unknown>;
  registerRequireJsPaths: (gmeConfig: Record<string, unknown>) => void;
  executePlugin: (parameters: Record<string, unknown>) => Promise<{
    err: string | null;
    result: Record<string, unknown>;
  }>;
  exportProjectToFile: (parameters: Record<string, unknown>) => Promise<string>;
  isRepositoryProjectJson?: (projectJson: Record<string, unknown>) => boolean;
  attachLibraryFromWebgmex?: (parameters: Record<string, unknown>) => Promise<Record<string, unknown>>;
  updateLibraryFromWebgmex?: (parameters: Record<string, unknown>) => Promise<Record<string, unknown>>;
  persistProjectCommit?: (parameters: Record<string, unknown>) => Promise<{
    commitHash: string;
    rootHash: string;
    status?: string;
  }>;
}

export type SessionLogger = {
  info: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  debug?: (...args: unknown[]) => void;
  warn?: (...args: unknown[]) => void;
  fork: (name: string) => SessionLogger;
};

interface GmeAuthLike {
  connect: () => Promise<void>;
  addUser: (
    id: string,
    email: string,
    password: string,
    canCreate: boolean,
    opts: Record<string, unknown>,
  ) => Promise<unknown>;
  authorizer: {
    ENTITY_TYPES: { PROJECT: string };
    setAccessRights: (
      userId: string,
      projectId: string,
      rights: Record<string, boolean>,
      params: Record<string, unknown>,
    ) => Promise<unknown>;
  };
}

let cached: {
  bridge: WebgmeImportBridge;
  gmeConfig: Record<string, unknown>;
  projectIdSep: string;
} | null = null;

function usesMemoryGmeAuth(gmeConfig: Record<string, unknown>): boolean {
  const auth = gmeConfig.authentication as { gmeAuth?: { path?: string } } | undefined;
  return (auth?.gmeAuth?.path ?? "").includes("memorygmeauth");
}

async function authorizeProject(
  gmeAuth: GmeAuthLike,
  gmeConfig: Record<string, unknown>,
  projectIdSep: string,
  projectName: string,
): Promise<void> {
  const guestAccount = (gmeConfig.authentication as { guestAccount: string }).guestAccount;
  const projectId = guestAccount + projectIdSep + projectName;
  await gmeAuth.authorizer.setAccessRights(
    guestAccount,
    projectId,
    { read: true, write: true, delete: true },
    { entityType: gmeAuth.authorizer.ENTITY_TYPES.PROJECT },
  );
}

export function loadGmeRuntime(): {
  bridge: WebgmeImportBridge;
  gmeConfig: Record<string, unknown>;
  projectIdSep: string;
} {
  if (cached) return cached;

  const bridgePath = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../config/webgme-import.cjs",
  );
  const bridge = require(bridgePath) as WebgmeImportBridge;
  const gmeConfig = bridge.loadGmeConfig();
  const constants = require("webgme-engine/src/common/storage/constants") as {
    PROJECT_ID_SEP: string;
  };

  cached = { bridge, gmeConfig, projectIdSep: constants.PROJECT_ID_SEP };
  return cached;
}

export function createSessionLogger(gmeConfig: Record<string, unknown>): SessionLogger {
  const Logger = require("webgme-engine/src/server/logger") as {
    create: (name: string, config: unknown, useStdout: boolean) => SessionLogger;
  };
  const server = gmeConfig.server as { log: unknown };
  return Logger.create("webdot", server.log, false);
}

export function loadGmeConfigForProject(
  cwd: string,
  extraBasePaths?: string[],
): Record<string, unknown> {
  const { bridge } = loadGmeRuntime();
  const gmeConfig = bridge.loadGmeConfig();
  return bridge.withProjectPluginPaths(gmeConfig, cwd, extraBasePaths);
}

export function registerProjectRequireJsPaths(
  cwd: string,
  extraBasePaths?: string[],
): Record<string, unknown> {
  const { bridge } = loadGmeRuntime();
  const gmeConfig = loadGmeConfigForProject(cwd, extraBasePaths);
  bridge.registerRequireJsPaths(gmeConfig);
  return gmeConfig;
}

export async function createMemoryGmeAuth(
  projectName: string,
  gmeConfigOverride?: Record<string, unknown>,
): Promise<{
  gmeConfig: Record<string, unknown>;
  gmeAuth: GmeAuthLike;
  projectIdSep: string;
}> {
  const { gmeConfig: baseConfig, projectIdSep } = loadGmeRuntime();
  const gmeConfig = gmeConfigOverride ?? baseConfig;
  if (!usesMemoryGmeAuth(gmeConfig)) {
    throw new Error("Expected memory GME auth in config/gme-config.cjs");
  }

  const authPath = (gmeConfig.authentication as { gmeAuth: { path: string } }).gmeAuth.path;
  const GmeAuthClass = require(authPath) as new (
    session: null,
    gmeConfig: Record<string, unknown>,
  ) => GmeAuthLike;

  const gmeAuth = new GmeAuthClass(null, gmeConfig);
  await gmeAuth.connect();
  const guestAccount = (gmeConfig.authentication as { guestAccount: string }).guestAccount;
  await Promise.all([
    gmeAuth.addUser(guestAccount, guestAccount + "@example.com", guestAccount, true, { overwrite: true }),
    gmeAuth.addUser("admin", "admin@example.com", "admin", true, { overwrite: true, siteAdmin: true }),
  ]);
  await authorizeProject(gmeAuth, gmeConfig, projectIdSep, projectName);
  return { gmeConfig, gmeAuth, projectIdSep };
}
