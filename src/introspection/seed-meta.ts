import type { LoadedSeedContext } from "../session/project-session.js";
import type { GmeNode } from "../session/gme-runtime.js";
import { renderSeedMetaOutput, type SeedMetaFormat } from "./seed-meta-render.js";

export type { SeedMetaFormat };
export { renderSeedMetaOutput };

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

function metaNodeName(core: LoadedSeedContext["core"], node: GmeNode): string {
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

/** @deprecated Use renderSeedMetaOutput */
export function renderSeedMeta(
  ir: SeedMetaIr,
  format: "json" | "tree" = "json",
  context?: LoadedSeedContext,
): string {
  return renderSeedMetaOutput(ir, format, context);
}
