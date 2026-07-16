import fs from "node:fs";
import path from "node:path";
import { loadSetupCatalog, resolvePlugin } from "../catalog/setup-catalog.js";
import { resolveSeedSelection } from "../session/seed-resolution.js";
import type { SetupCatalog } from "../catalog/types.js";

export interface PluginSource {
  /** Plugin id/name (folder name; used for requirejs plugin path). */
  name: string;
  /** Parent directory registered as a gmeConfig.plugin.basePath. */
  basePath: string;
  /** Absolute path to the plugin's metadata.json. */
  metadataPath: string;
}

export interface ModelSource {
  /** Display/project name. */
  name: string;
  /** Absolute path to the .webgmex file. */
  webgmexPath: string;
}

export interface SourceOptions {
  cwd: string;
  /**
   * Base directory for relative `--plugin-dir` paths.
   * Defaults to `cwd`. CLI passes the execution working directory so `-C` does not relocate the plugin.
   */
  pluginDirCwd?: string;
  plugin?: string;
  pluginDir?: string;
  seed?: string;
  webgmex?: string;
}

/**
 * Lazily loads the SetupCatalog only when a catalog lookup is actually needed,
 * so direct --plugin-dir/--webgmex runs work without a webgme-setup.json.
 */
export function createCatalogLoader(cwd: string): () => SetupCatalog {
  let catalog: SetupCatalog | null = null;
  return () => {
    if (!catalog) catalog = loadSetupCatalog(cwd);
    return catalog;
  };
}

export function resolvePluginSource(
  options: SourceOptions,
  getCatalog: () => SetupCatalog,
): PluginSource {
  if (options.pluginDir) {
    const dir = path.resolve(options.pluginDirCwd ?? options.cwd, options.pluginDir);
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
      throw new Error("Plugin directory does not exist: " + dir);
    }
    const name = path.basename(dir);
    const mainFile = path.join(dir, name + ".js");
    if (!fs.existsSync(mainFile)) {
      throw new Error(
        "Plugin directory must contain " + name + ".js (webgme layout <dir>/" + name + ".js): " + dir,
      );
    }
    return {
      name,
      basePath: path.dirname(dir),
      metadataPath: path.join(dir, "metadata.json"),
    };
  }

  if (!options.plugin) {
    throw new Error("Provide a plugin name or --plugin-dir <path>");
  }
  const entry = resolvePlugin(getCatalog(), options.plugin);
  if (!entry.exists) {
    throw new Error('Plugin "' + entry.name + '" src path is missing: ' + entry.src);
  }
  return {
    name: entry.name,
    basePath: path.dirname(entry.absPath),
    metadataPath: entry.metadataPath ?? path.join(entry.absPath, "metadata.json"),
  };
}

export function resolveModelSource(
  options: SourceOptions,
  getCatalog: () => SetupCatalog,
): ModelSource {
  if (options.webgmex) {
    const abs = path.resolve(options.cwd, options.webgmex);
    if (!fs.existsSync(abs)) {
      throw new Error(".webgmex file does not exist: " + abs);
    }
    if (!abs.toLowerCase().endsWith(".webgmex")) {
      throw new Error("Model file must be a .webgmex: " + abs);
    }
    return { name: path.basename(abs).replace(/\.webgmex$/i, ""), webgmexPath: abs };
  }

  if (!options.seed) {
    throw new Error("Provide --seed <name> or --webgmex <path>");
  }
  const entry = resolveSeedSelection(getCatalog(), options.seed);
  if (entry.artifacts.length === 0) {
    throw new Error(
      'Seed "' + entry.name + '" has no ' + entry.name + ".webgmex. Run: webdot tree repo --kind seeds",
    );
  }
  return { name: entry.name, webgmexPath: entry.artifacts[0] };
}
