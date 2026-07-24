"use strict";

const path = require("path");
const fs = require("fs");

global.WebGMEGlobal = global.WebGMEGlobal || {};
require("webgme-engine");

// The webdot package root holds the `config` folder that webgme-engine's bin/import.js
// loads via require(path.join(process.cwd(), 'config')) at module-load time. webdot may be
// run from any directory, so load that module once with the package root as the cwd.
const PACKAGE_ROOT = path.resolve(__dirname, "..");
let cliImportModule = null;
function loadCliImport() {
  if (cliImportModule) return cliImportModule;
  const previousCwd = process.cwd();
  try {
    process.chdir(PACKAGE_ROOT);
    cliImportModule = require("webgme-engine/src/bin/import");
  } finally {
    process.chdir(previousCwd);
  }
  return cliImportModule;
}

function isRepositoryProjectJson(projectJson) {
  return projectJson && projectJson.formatVersion === 2 && projectJson.exportMode === "repository";
}

/**
 * Import a .webgmex seed into memory storage (production path — no test fixture / chai).
 * v2 repository packages use insertProjectWithHistory; v1 snapshots use insertProjectJson.
 */
async function importSeedProject(storage, parameters) {
  const requireJS = global.requireJS;
  const BC = require("webgme-engine/src/server/middleware/blob/BlobClientWithFSBackend");
  const cliImport = loadCliImport();
  const Core = requireJS("common/core/coreQ");

  const projectName = parameters.projectName;
  const gmeConfig = parameters.gmeConfig;
  const logger = parameters.logger;
  const projectSeed = parameters.projectSeed;

  if (typeof projectSeed !== "string" || !projectSeed.toLowerCase().includes(".webgmex")) {
    throw new Error("projectSeed must be a path to a .webgmex file");
  }

  const blobClient = new BC(gmeConfig, logger);
  const projectJson = await cliImport._addProjectPackageToBlob(blobClient, projectSeed);
  const project = await storage.createProject({ projectName });
  const core = new Core(project, { globConf: gmeConfig, logger });
  const storageUtils = requireJS("common/storage/util");
  const Q = require("q");

  const repository = isRepositoryProjectJson(projectJson);
  let branchName = parameters.branchName;
  let commitHash;
  let rootHash;

  if (repository) {
    await storageUtils.insertProjectWithHistory(project, projectJson);
    const branches = projectJson.branches || {};
    if (!branchName) {
      branchName =
        branches.master !== undefined
          ? "master"
          : Object.keys(branches)[0] || projectJson.branchName || "master";
    }
    if (branches[branchName] === undefined) {
      throw new Error(
        'Unknown branch "' +
          branchName +
          '". Available: ' +
          Object.keys(branches).sort().join(", "),
      );
    }
    commitHash = branches[branchName];
    const commitObject = await Q.ninvoke(project, "loadObject", commitHash);
    rootHash = commitObject.root;
  } else {
    branchName = branchName || "master";
    const commitResult = await storageUtils.insertProjectJson(project, projectJson, {
      commitMessage: "file-project load",
    });
    await project.createBranch(branchName, commitResult.hash);
    commitHash = commitResult.hash;
    rootHash = projectJson.rootHash;
  }

  const rootNode = await core.loadRoot(rootHash);

  return {
    project,
    core,
    rootNode,
    commitHash,
    branchName,
    rootHash,
    webgmexPath: projectSeed,
    exchangeFormat: repository ? "repository" : "snapshot",
  };
}

function createMemoryStorage(logger, gmeConfig, gmeAuth) {
  const SafeStorage = require("webgme-engine/src/server/storage/safestorage");
  const Memory = require("webgme-engine/src/server/storage/memory");
  return new SafeStorage(new Memory(logger, gmeConfig), logger, gmeConfig, gmeAuth);
}

function loadGmeConfig() {
  const configPath = path.join(__dirname, "gme-config.cjs");
  return JSON.parse(JSON.stringify(require(configPath)));
}

function withProjectPluginPaths(gmeConfig, cwd, extraBasePaths) {
  const bases = [];
  (extraBasePaths || []).forEach((p) => {
    if (p && bases.indexOf(p) === -1 && fs.existsSync(p)) bases.push(p);
  });
  const pluginBase = path.join(cwd, "src", "plugins");
  if (fs.existsSync(pluginBase) && bases.indexOf(pluginBase) === -1) {
    bases.push(pluginBase);
  }
  if (bases.length > 0) {
    gmeConfig.plugin.basePaths = bases.concat(gmeConfig.plugin.basePaths || []);
  }
  return gmeConfig;
}

function registerRequireJsPaths(gmeConfig) {
  const webgme = require("webgme-engine");
  const engineSrc = path.join(path.dirname(require.resolve("webgme-engine/package.json")), "src");
  const textPlugin = path
    .relative(engineSrc, require.resolve("requirejs-text/text.js"))
    .replace(/\.js$/i, "")
    .split(path.sep)
    .join("/");
  global.requireJS.config({
    paths: {
      text: textPlugin,
    },
  });
  webgme.addToRequireJsPaths(gmeConfig);
}

async function executePlugin(parameters) {
  const webgme = require("webgme-engine");
  const gmeConfig = parameters.gmeConfig;
  registerRequireJsPaths(gmeConfig);

  const PluginCliManager = webgme.PluginCliManager;
  const pluginManager = new PluginCliManager(
    parameters.project,
    parameters.logger,
    gmeConfig,
    parameters.blobOpts || {},
  );
  pluginManager.projectAccess = { read: true, write: true, delete: true };

  return new Promise((resolve, reject) => {
    pluginManager.executePlugin(
      parameters.pluginName,
      parameters.pluginConfig || {},
      parameters.context,
      function (err, result) {
        if (err && !result) {
          reject(err instanceof Error ? err : new Error(String(err)));
          return;
        }
        resolve({
          err: err ? String(err) : null,
          result: result && typeof result.serialize === "function" ? result.serialize() : result,
        });
      },
    );
  });
}

/**
 * Serialize project state back into a .webgmex package on disk.
 * withHistory=true writes exchange format v2 (full repository).
 */
async function exportProjectToFile(parameters) {
  const requireJS = global.requireJS;
  const BC = require("webgme-engine/src/server/middleware/blob/BlobClientWithFSBackend");
  const storageUtils = requireJS("common/storage/util");
  const blobUtil = requireJS("blob/util");

  const project = parameters.project;
  const branchName = parameters.branchName || "master";
  const gmeConfig = parameters.gmeConfig;
  const logger = parameters.logger;
  const outFile = parameters.outFile;
  const withHistory = parameters.withHistory === true;

  if (typeof outFile !== "string" || !outFile.toLowerCase().includes(".webgmex")) {
    throw new Error("outFile must be a path to a .webgmex file");
  }

  const blobClient = new BC(gmeConfig, logger);
  const jsonExport = withHistory
    ? await storageUtils.getProjectWithHistory(project, { defaultBranchName: branchName })
    : await storageUtils.getProjectJson(project, { branchName });
  const blobHash = await blobUtil.buildProjectPackage(logger, blobClient, jsonExport, true);
  const buffer = await blobClient.getObject(blobHash);
  fs.writeFileSync(outFile, Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer));
  return outFile;
}

/**
 * Unpack a .webgmex into project JSON (includes rootHash used by addLibrary).
 */
async function loadProjectJsonFromWebgmex(webgmexPath, gmeConfig, logger) {
  if (typeof webgmexPath !== "string" || !webgmexPath.toLowerCase().includes(".webgmex")) {
    throw new Error("webgmexPath must be a path to a .webgmex file");
  }
  const BC = require("webgme-engine/src/server/middleware/blob/BlobClientWithFSBackend");
  const cliImport = loadCliImport();
  const blobClient = new BC(gmeConfig, logger);
  return cliImport._addProjectPackageToBlob(blobClient, webgmexPath);
}

/**
 * Insert library project objects into an open host project, then core.addLibrary.
 * Caller must persist/commit afterward.
 */
async function attachLibraryFromWebgmex(parameters) {
  const requireJS = global.requireJS;
  const storageUtils = requireJS("common/storage/util");

  const project = parameters.project;
  const core = parameters.core;
  const rootNode = parameters.rootNode;
  const libraryName = parameters.libraryName;
  const libraryWebgmex = parameters.libraryWebgmex;
  const gmeConfig = parameters.gmeConfig;
  const logger = parameters.logger;

  if (typeof libraryName !== "string" || !libraryName.trim()) {
    throw new Error("libraryName is required");
  }
  const existing = typeof core.getLibraryNames === "function" ? core.getLibraryNames(rootNode) : [];
  if (existing.indexOf(libraryName) !== -1) {
    throw new Error('Library name already attached: "' + libraryName + '"');
  }

  const projectJson = await loadProjectJsonFromWebgmex(libraryWebgmex, gmeConfig, logger);
  await storageUtils.insertProjectJson(project, projectJson, {
    commitMessage: "library package for " + libraryName,
  });

  await core.addLibrary(rootNode, libraryName, projectJson.rootHash, {
    projectId: projectJson.projectId,
    branchName: projectJson.branchName,
    commitHash: projectJson.commitHash,
  });

  return {
    libraryName: libraryName,
    libraryRootHash: projectJson.rootHash,
    libraryInfo: {
      projectId: projectJson.projectId,
      branchName: projectJson.branchName,
      commitHash: projectJson.commitHash,
    },
  };
}

/**
 * Replace an attached library from a .webgmex (core.updateLibrary).
 */
async function updateLibraryFromWebgmex(parameters) {
  const requireJS = global.requireJS;
  const storageUtils = requireJS("common/storage/util");

  const project = parameters.project;
  const core = parameters.core;
  const rootNode = parameters.rootNode;
  const libraryName = parameters.libraryName;
  const libraryWebgmex = parameters.libraryWebgmex;
  const gmeConfig = parameters.gmeConfig;
  const logger = parameters.logger;

  const existing = typeof core.getLibraryNames === "function" ? core.getLibraryNames(rootNode) : [];
  if (existing.indexOf(libraryName) === -1) {
    throw new Error('Library not attached: "' + libraryName + '"');
  }

  const projectJson = await loadProjectJsonFromWebgmex(libraryWebgmex, gmeConfig, logger);
  await storageUtils.insertProjectJson(project, projectJson, {
    commitMessage: "library update package for " + libraryName,
  });

  await core.updateLibrary(rootNode, libraryName, projectJson.rootHash, {
    projectId: projectJson.projectId,
    branchName: projectJson.branchName,
    commitHash: projectJson.commitHash,
  });

  return {
    libraryName: libraryName,
    libraryRootHash: projectJson.rootHash,
  };
}

/**
 * Persist in-memory core changes and make a commit on the given branch.
 */
async function persistProjectCommit(parameters) {
  const project = parameters.project;
  const core = parameters.core;
  const rootNode = parameters.rootNode;
  const branchName = parameters.branchName || "master";
  const parentCommitHash = parameters.parentCommitHash;
  const message = parameters.message || "webdot library change";

  const persisted = core.persist(rootNode);
  const result = await project.makeCommit(
    branchName,
    [parentCommitHash],
    persisted.rootHash,
    persisted.objects,
    message,
  );
  return {
    commitHash: result.hash || result,
    rootHash: persisted.rootHash,
    status: result.status,
  };
}

module.exports = {
  importSeedProject,
  createMemoryStorage,
  loadGmeConfig,
  withProjectPluginPaths,
  registerRequireJsPaths,
  executePlugin,
  exportProjectToFile,
  isRepositoryProjectJson,
  loadProjectJsonFromWebgmex,
  attachLibraryFromWebgmex,
  updateLibraryFromWebgmex,
  persistProjectCommit,
};
