import type { GmeCore, GmeNode } from "../session/gme-runtime.js";
import type { LoadedSeedContext } from "../session/project-session.js";

export interface MetaAspectNodeIr {
  path: string;
  name: string;
  meta: Record<string, unknown>;
}

export interface SeedMetaIr {
  seed: string;
  branch: string;
  webgmex: string;
  metaAspectSet: MetaAspectNodeIr[];
}

function metaNodeName(core: GmeCore, node: GmeNode): string {
  const value = core.getAttribute(node, "name");
  return typeof value === "string" && value.length > 0 ? value : "(unnamed)";
}

export function buildSeedMetaIr(context: LoadedSeedContext): SeedMetaIr {
  const metaByPath = context.core.getAllMetaNodes(context.rootNode);
  const metaAspectSet = Object.entries(metaByPath)
    .map(([path, node]) => ({
      path,
      name: metaNodeName(context.core, node),
      meta: context.core.getJsonMeta(node),
    }))
    .sort((a, b) => a.path.localeCompare(b.path));

  return {
    seed: context.seedName,
    branch: context.branchName,
    webgmex: context.webgmexPath,
    metaAspectSet,
  };
}

export function renderSeedMeta(ir: SeedMetaIr, format: "json" | "tree" = "json"): string {
  if (format === "tree") {
    const lines = [
      "seed:" + ir.seed + "  (" + ir.webgmex + ")",
      "  meta/",
    ];
    if (ir.metaAspectSet.length === 0) {
      lines.push("    (none)");
    } else {
      for (const node of ir.metaAspectSet) {
        lines.push("    " + node.path + "  " + node.name);
      }
    }
    return lines.join("\n");
  }
  return JSON.stringify(ir, null, 2);
}
