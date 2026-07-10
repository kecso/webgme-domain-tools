"use strict";

const path = require("path");
const fs = require("fs");

global.WebGMEGlobal = global.WebGMEGlobal || {};
require("webgme-engine");

/**
 * Import a .webgmex seed into memory storage (production path — no test fixture / chai).
 */
async function importSeedProject(storage, parameters) {
  const requireJS = global.requireJS;
  const BC = require("webgme-engine/src/server/middleware/blob/BlobClientWithFSBackend");
  const cliImport = require("webgme-engine/src/bin/import");
  const Core = requireJS("common/core/coreQ");

  const projectName = parameters.projectName;
  const branchName = parameters.branchName || "master";
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
  const commitResult = await storageUtils.insertProjectJson(project, projectJson, {
    commitMessage: "file-project load",
  });
  await project.createBranch(branchName, commitResult.hash);
  const rootNode = await core.loadRoot(projectJson.rootHash);

  return {
    project,
    core,
    rootNode,
    commitHash: commitResult.hash,
    branchName,
    rootHash: projectJson.rootHash,
    webgmexPath: projectSeed,
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

function withProjectPluginPaths(gmeConfig, cwd) {
  const pluginBase = path.join(cwd, "src", "plugins");
  if (fs.existsSync(pluginBase)) {
    gmeConfig.plugin.basePaths = [pluginBase].concat(gmeConfig.plugin.basePaths || []);
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

module.exports = {
  importSeedProject,
  createMemoryStorage,
  loadGmeConfig,
  withProjectPluginPaths,
  registerRequireJsPaths,
  executePlugin,
};
