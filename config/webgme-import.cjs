"use strict";

const path = require("path");

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

module.exports = {
  importSeedProject,
  createMemoryStorage,
  loadGmeConfig,
};
