import path from "node:path";
import { loadSetupCatalog, resolvePlugin } from "../catalog/setup-catalog.js";
import {
  closeProjectSession,
  loadNodeAt,
  openProjectSession,
} from "../session/project-session.js";
import { createSessionLogger, loadGmeConfigForProject, loadGmeRuntime, type SessionLogger } from "../session/gme-runtime.js";
import { resolveSeedSelection } from "../session/seed-resolution.js";
import { resolvePluginConfig } from "./config.js";
import { buildPluginInfo, loadPluginMetadata, renderPluginInfo } from "./metadata.js";
import { buildPluginRunContext } from "./run-context.js";
import { artifactWarnings, serializePluginResult } from "./result-format.js";
import type { PluginRunOutput, SerializedPluginResult } from "./types.js";

export interface PluginInfoCommandOptions {
  cwd: string;
  plugin: string;
}

export interface PluginRunCommandOptions {
  cwd: string;
  plugin: string;
  seed: string;
  at?: string;
  select?: string[];
  branch?: string;
  configFile?: string;
  set?: string[];
  artifactsOut?: string;
}

export interface PluginRunCommandResult {
  output: string;
  warnings: string[];
  success: boolean;
}

export async function runPluginInfoCommand(options: PluginInfoCommandOptions): Promise<string> {
  const catalog = loadSetupCatalog(options.cwd);
  const entry = resolvePlugin(catalog, options.plugin);
  return renderPluginInfo(buildPluginInfo(entry));
}

export async function runPluginRunCommand(
  options: PluginRunCommandOptions,
): Promise<PluginRunCommandResult> {
  const catalog = loadSetupCatalog(options.cwd);
  const pluginEntry = resolvePlugin(catalog, options.plugin);
  const seedEntry = resolveSeedSelection(catalog, options.seed);
  const metadata = loadPluginMetadata(pluginEntry);
  const configStructure = metadata.configStructure ?? [];
  const config = resolvePluginConfig(configStructure, {
    configFile: options.configFile ? path.resolve(options.cwd, options.configFile) : undefined,
    set: options.set,
  });
  const runContext = buildPluginRunContext({
    at: options.at,
    select: options.select,
    branch: options.branch,
  });

  const previousCwd = process.cwd();

  try {
    const context = await openProjectSession({
      cwd: options.cwd,
      seed: seedEntry,
      branchName: runContext.branchName,
      useProjectPlugins: true,
    });

    try {
      if (runContext.activeNode) {
        await loadNodeAt(context, runContext.activeNode);
      }
      for (const nodePath of runContext.activeSelection) {
        await loadNodeAt(context, nodePath);
      }

      const gmeConfig = loadGmeConfigForProject(options.cwd);
      const { bridge } = loadGmeRuntime();
      const blobOpts = options.artifactsOut ? { writeBlobFilesDir: options.artifactsOut } : {};

      process.chdir(options.cwd);
      let execution;
      try {
        execution = await bridge.executePlugin({
          project: context.importResult.project,
          logger: createPluginRunLogger(gmeConfig),
          gmeConfig,
          pluginName: pluginEntry.name,
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
      const warnings = artifactWarnings(serialized, options.artifactsOut);
      const success = serialized.success === true && !execution.err;
      const payload: PluginRunOutput = {
        success,
        plugin: pluginEntry.name,
        seed: seedEntry.name,
        branch: runContext.branchName,
        activeNode: runContext.activeNode,
        activeSelection: runContext.activeSelection,
        config,
        result: serialized,
        warnings,
      };
      if (execution.err) {
        payload.result.error = payload.result.error ?? execution.err;
      }

      return {
        output: JSON.stringify(payload, null, 2),
        warnings,
        success,
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
    else if (level === "debug" && base.debug) base.debug(...args);
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
