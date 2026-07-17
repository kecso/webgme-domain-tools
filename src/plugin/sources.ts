import fs from "node:fs";
import path from "node:path";
import { loadSetupCatalog } from "../catalog/setup-catalog.js";
import { formatUnknownPluginError } from "../catalog/catalog-errors.js";
import { resolveSeedSelection } from "../session/seed-resolution.js";
import type { SetupCatalog } from "../catalog/types.js";
import { getInstalled, listInstalled } from "./install-registry.js";
import { validatePluginDirectory } from "./install.js";

export type PluginSourceKind = "plugin-dir" | "catalog" | "installed";

export interface PluginSource {
  /** Plugin id/name (folder name; used for requirejs plugin path). */
  name: string;
  /** Parent directory registered as a gmeConfig.plugin.basePath. */
  basePath: string;
  /** Absolute path to the plugin's metadata.json. */
  metadataPath: string;
  /** How this plugin was resolved. */
  source: PluginSourceKind;
  /** Dictionary key when resolved from the install registry (may differ from `name`). */
  installName?: string;
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
  /** Override `WEBDOT_HOME` for installed-plugin lookup. */
  home?: string;
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

function tryLoadCatalog(getCatalog: () => SetupCatalog): SetupCatalog | null {
  try {
    return getCatalog();
  } catch {
    return null;
  }
}

function formatUnknownWithInstalled(
  name: string,
  catalog: SetupCatalog | null,
  home?: string,
): string {
  const installed = listInstalled(home);
  const installedBlock =
    installed.length > 0
      ? "\n\nInstalled plugins (run: webdot plugin list):\n" +
        installed.map((e) => "  " + e.name + (e.name !== e.pluginId ? " → " + e.pluginId : "")).join("\n")
      : "\n\nNo plugins installed. Try: webdot plugin install <path|owner/repo>";

  if (catalog) {
    return formatUnknownPluginError(catalog, name) + installedBlock;
  }
  return 'Unknown plugin "' + name + '".' + installedBlock;
}

export function resolvePluginSource(
  options: SourceOptions,
  getCatalog: () => SetupCatalog,
): PluginSource {
  if (options.pluginDir) {
    const dir = path.resolve(options.pluginDirCwd ?? options.cwd, options.pluginDir);
    const validated = validatePluginDirectory(dir);
    return {
      name: validated.pluginId,
      basePath: path.dirname(validated.absPath),
      metadataPath: validated.metadataPath,
      source: "plugin-dir",
    };
  }

  if (!options.plugin) {
    throw new Error("Provide a plugin name or --plugin-dir <path>");
  }

  const bare = options.plugin.startsWith("plugin:")
    ? options.plugin.slice("plugin:".length)
    : options.plugin;

  const catalog = tryLoadCatalog(getCatalog);
  if (catalog) {
    const entry = catalog.plugins.find((p) => p.name === bare || p.ref === "plugin:" + bare);
    if (entry) {
      if (!entry.exists) {
        throw new Error('Plugin "' + entry.name + '" src path is missing: ' + entry.src);
      }
      return {
        name: entry.name,
        basePath: path.dirname(entry.absPath),
        metadataPath: entry.metadataPath ?? path.join(entry.absPath, "metadata.json"),
        source: "catalog",
      };
    }
  }

  const installed = getInstalled(bare, options.home);
  if (installed) {
    if (!fs.existsSync(installed.path)) {
      throw new Error(
        'Installed plugin "' +
          installed.name +
          '" path is missing: ' +
          installed.path +
          ". Re-run: webdot plugin install …",
      );
    }
    const validated = validatePluginDirectory(installed.path);
    return {
      name: validated.pluginId,
      basePath: path.dirname(validated.absPath),
      metadataPath: validated.metadataPath,
      source: "installed",
      installName: installed.name,
    };
  }

  throw new Error(formatUnknownWithInstalled(bare, catalog, options.home));
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
