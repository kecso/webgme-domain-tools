export interface PluginRunContext {
  activeNode: string;
  activeSelection: string[];
  branchName: string;
}

export function buildPluginRunContext(options: {
  at?: string;
  select?: string[];
  branch?: string;
}): PluginRunContext {
  const activeSelection = [...(options.select ?? [])];
  let activeNode = options.at ?? "";
  if (activeNode === undefined || activeNode === null) activeNode = "";
  if (!options.at && activeSelection.length > 0) {
    activeNode = activeSelection[0];
  }
  return {
    activeNode,
    activeSelection,
    branchName: options.branch ?? "master",
  };
}
