import { displayPath } from "../introspection/seed-tree.js";

// A .webgmex is a single-snapshot package: importSeedProject inserts one commit
// and creates one branch. Branch selection is meaningless until a multi-branch
// import lands, so the branch is fixed internally and not exposed on the CLI.
export const DEFAULT_PLUGIN_BRANCH = "master";
/** WebGME root path passed to PluginCliManager when --at is omitted. */
export const DEFAULT_PLUGIN_ACTIVE_NODE = "";
/** Human-readable labels for CLI help and JSON output. */
export const DEFAULT_PLUGIN_ACTIVE_NODE_LABEL = "/ (root)";
export const DEFAULT_PLUGIN_SELECTION_LABEL = "(none)";

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
  config: Record<string, unknown>;
}

export function buildPluginRunContext(options: {
  at?: string;
  select?: string[];
}): PluginRunContext {
  const activeSelection = [...(options.select ?? [])];
  let activeNode = options.at ?? "";
  if (!options.at && activeSelection.length > 0) {
    activeNode = activeSelection[0];
  }
  return {
    activeNode,
    activeSelection,
    branchName: DEFAULT_PLUGIN_BRANCH,
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
    config,
  };
}
