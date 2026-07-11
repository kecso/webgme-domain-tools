import { displayPath } from "../introspection/seed-tree.js";

export const DEFAULT_PLUGIN_BRANCH = "master";

export interface PluginRunContext {
  activeNode: string;
  activeSelection: string[];
  branchName: string;
}

export interface PluginRunContextOutput {
  project: {
    name: string;
    webgmex: string;
  };
  activeNode: string;
  activeSelection: string[];
  branch: string;
  config: Record<string, unknown>;
}

export function buildPluginRunContext(options: {
  at?: string;
  select?: string[];
  branch?: string;
}): PluginRunContext {
  const activeSelection = [...(options.select ?? [])];
  let activeNode = options.at ?? "";
  if (!options.at && activeSelection.length > 0) {
    activeNode = activeSelection[0];
  }
  return {
    activeNode,
    activeSelection,
    branchName: options.branch ?? DEFAULT_PLUGIN_BRANCH,
  };
}

/** Resolved plugin context for JSON output (defaults made explicit). */
export function formatPluginRunContext(
  project: { name: string; webgmexPath: string },
  runContext: PluginRunContext,
  config: Record<string, unknown>,
): PluginRunContextOutput {
  return {
    project: {
      name: project.name,
      webgmex: project.webgmexPath,
    },
    activeNode: displayPath(runContext.activeNode),
    activeSelection: runContext.activeSelection.map(displayPath),
    branch: runContext.branchName,
    config,
  };
}
