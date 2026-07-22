import path from "node:path";
import {
  closeProjectSession,
  loadNodeAt,
  openProjectSession,
} from "../session/project-session.js";
import { createSessionLogger, loadGmeConfigForProject, loadGmeRuntime, type SessionLogger } from "../session/gme-runtime.js";
import { resolvePluginConfig } from "./config.js";
import { buildPluginInfoFromPath, loadPluginMetadataFromPath, renderPluginInfo } from "./metadata.js";
import { buildPluginRunContext, formatPluginRunContext } from "./run-context.js";
import { artifactWarnings, serializePluginResult } from "./result-format.js";
import {
  markSessionDirty,
  resolveSessionModelSource,
} from "../session/workspace-state.js";
import {
  createCatalogLoader,
  resolvePluginSource,
} from "./sources.js";
import type { PluginRunOutput, SerializedPluginResult } from "./types.js";

export interface PluginInfoCommandOptions {
  cwd: string;
  plugin: string;
  home?: string;
}

export interface PluginRunCommandOptions {
  /** Project root for catalog/plugin resolution and gmeConfig. */
  cwd: string;
  /** Execution directory that owns the session (defaults to cwd). */
  sessionCwd?: string;
  /** Catalog or installed plugin name (or use pluginDir). */
  plugin?: string;
  /** Direct path to a plugin directory ({dir}/{dir}.js), bypassing catalog. */
  pluginDir?: string;
  /** Catalog seed name (or use webgmex). */
  seed?: string;
  /** Direct path to a .webgmex model, bypassing catalog. */
  webgmex?: string;
  at?: string;
  select?: string[];
  configFile?: string;
  set?: string[];
  artifactsOut?: string;
  /** Do not write model changes back to disk. */
  dryRun?: boolean;
  /** Write the resulting model to this .webgmex instead of the source. */
  out?: string;
  /** Branch to open (defaults to session branch or master). */
  branch?: string;
  /** Override WEBDOT_HOME for installed plugin lookup. */
  home?: string;
}

export interface PluginRunCommandResult {
  output: string;
  warnings: string[];
  success: boolean;
  persisted: boolean;
  outFile: string | null;
}

export async function runPluginInfoCommand(options: PluginInfoCommandOptions): Promise<string> {
  const getCatalog = createCatalogLoader(options.cwd);
  const pluginSource = resolvePluginSource(
    { cwd: options.cwd, plugin: options.plugin, home: options.home },
    getCatalog,
  );
  const info = buildPluginInfoFromPath(pluginSource.metadataPath, {
    id: pluginSource.name,
    src: path.join(pluginSource.basePath, pluginSource.name),
    source: pluginSource.source,
    installName: pluginSource.installName,
  });
  return renderPluginInfo(info);
}

export async function runPluginRunCommand(
  options: PluginRunCommandOptions,
): Promise<PluginRunCommandResult> {
  const sessionCwd = options.sessionCwd ?? options.cwd;
  const getCatalog = createCatalogLoader(options.cwd);
  const pluginSource = resolvePluginSource(
    { ...options, pluginDirCwd: sessionCwd },
    getCatalog,
  );
  const modelSource = resolveSessionModelSource(sessionCwd, {
    seed: options.seed,
    webgmex: options.webgmex,
    projectCwd: options.cwd,
    branch: options.branch,
  });
  const metadata = loadPluginMetadataFromPath(pluginSource.metadataPath);
  const configStructure = metadata.configStructure ?? [];
  const config = resolvePluginConfig(configStructure, {
    configFile: options.configFile ? path.resolve(options.cwd, options.configFile) : undefined,
    set: options.set,
  });
  const runContext = buildPluginRunContext({
    at: options.at,
    select: options.select,
    branch: modelSource.branch,
  });

  const previousCwd = process.cwd();

  try {
    const context = await openProjectSession({
      cwd: options.cwd,
      webgmexPath: modelSource.webgmexPath,
      seedName: modelSource.name,
      branchName: runContext.branchName,
      useProjectPlugins: true,
      pluginBasePaths: [pluginSource.basePath],
    });

    try {
      if (runContext.activeNode) {
        await loadNodeAt(context, runContext.activeNode);
      }
      for (const nodePath of runContext.activeSelection) {
        await loadNodeAt(context, nodePath);
      }

      const gmeConfig = loadGmeConfigForProject(options.cwd, [pluginSource.basePath]);
      const { bridge } = loadGmeRuntime();
      // Resolve against the execution directory (sessionCwd), not project -C —
      // same rule as --plugin-dir. BlobRunPluginClient always does
      // path.join(process.cwd(), writeBlobFilesDir), and we chdir to the project
      // for plugin execution, so pass a path relative to the project cwd.
      const artifactsOutAbs = options.artifactsOut
        ? path.resolve(sessionCwd, options.artifactsOut)
        : undefined;
      const writeBlobFilesDir = artifactsOutAbs
        ? path.relative(options.cwd, artifactsOutAbs) || "."
        : undefined;
      const blobOpts = writeBlobFilesDir ? { writeBlobFilesDir } : {};

      process.chdir(options.cwd);
      let execution;
      try {
        execution = await bridge.executePlugin({
          project: context.importResult.project,
          logger: createPluginRunLogger(gmeConfig),
          gmeConfig,
          pluginName: pluginSource.name,
          pluginConfig: config,
          blobOpts,
          context: {
            branchName: runContext.branchName,
            commitHash: context.importResult.commitHash,
            activeNode: runContext.activeNode,
            activeSelection: runContext.activeSelection,
          },
        });
      } finally {
        process.chdir(previousCwd);
      }

      const serialized = serializePluginResult(execution.result as unknown as SerializedPluginResult);
      const warnings = artifactWarnings(serialized, artifactsOutAbs);
      const success = serialized.success === true && !execution.err;
      // PluginBase.configure always records one baseline (SYNCED) commit; a real
      // model edit via self.save() adds at least one more.
      const changedModel = (serialized.commits ?? []).length > 1;
      const producedArtifacts = (serialized.artifacts ?? []).length > 0;

      let persisted = false;
      let outFile: string | null = null;
      if (success && !options.dryRun) {
        const target = options.out
          ? path.resolve(options.cwd, options.out)
          : modelSource.webgmexPath;
        if (changedModel || options.out) {
          const withHistory = context.exchangeFormat === "repository";
          process.chdir(options.cwd);
          try {
            outFile = await bridge.exportProjectToFile({
              project: context.importResult.project,
              branchName: runContext.branchName,
              gmeConfig,
              logger: createPluginRunLogger(gmeConfig),
              outFile: target,
              withHistory,
            });
          } finally {
            process.chdir(previousCwd);
          }
          persisted = true;
          if (modelSource.fromSession && changedModel) {
            markSessionDirty(sessionCwd);
          }
        }
      }

      if (options.dryRun && changedModel) {
        warnings.push("dry-run: model changes were not written to disk");
      } else if (
        success &&
        !options.dryRun &&
        !changedModel &&
        !options.out &&
        !producedArtifacts &&
        !modelSource.fromSession
      ) {
        warnings.push("plugin did not modify the model; nothing written back");
      }

      const payload: PluginRunOutput = {
        success,
        plugin: pluginSource.name,
        source: pluginSource.source,
        installName: pluginSource.installName,
        context: formatPluginRunContext(modelSource, runContext, config),
        result: serialized,
        warnings,
        persisted,
        outFile,
        dryRun: options.dryRun === true,
      };
      if (execution.err) {
        payload.result.error = payload.result.error ?? execution.err;
      }

      return {
        output: JSON.stringify(payload, null, 2),
        warnings,
        success,
        persisted,
        outFile,
      };
    } finally {
      await closeProjectSession();
    }
  } catch (err) {
    if (process.cwd() !== previousCwd) process.chdir(previousCwd);
    throw err;
  }
}

function createPluginRunLogger(gmeConfig: Record<string, unknown>): SessionLogger {
  const base = createSessionLogger(gmeConfig);
  const write = (level: string) => (...args: unknown[]) => {
    console.error("[" + level + "]", ...args);
    if (level === "error" && base.error) base.error(...args);
    else if (level === "warn" && base.warn) base.warn(...args);
    else if (base.info) base.info(...args);
  };
  return {
    info: write("info"),
    warn: write("warn"),
    error: write("error"),
    debug: (...args: unknown[]) => {
      if (base.debug) base.debug(...args);
    },
    fork: () => createPluginRunLogger(gmeConfig),
  };
}
