import type { LoadedSeedContext } from "../session/project-session.js";
import { descriptorToMetalang } from "../meta/descriptor-to-metalang.js";
import { irToDescriptor } from "../meta/ir-to-descriptor.js";
import type { SeedMetaIr } from "./seed-meta.js";
import { renderSeedTree, type SeedNodeRow, type SeedTreeFormat } from "./seed-tree.js";

export type SeedMetaFormat = "json" | "tree" | "tree-verbose" | "descriptor" | "metalang";

function metaAspectToRows(metaAspectSet: SeedMetaIr["metaAspectSet"]): SeedNodeRow[] {
  return metaAspectSet.map((node) => ({
    path: node.path,
    name: node.name,
    metaType: null,
    isMeta: true,
  }));
}

export function renderSeedMetaOutput(
  ir: SeedMetaIr,
  format: SeedMetaFormat,
  context?: LoadedSeedContext,
): string {
  if (format === "tree" || format === "tree-verbose") {
    const rows = metaAspectToRows(ir.metaAspectSet);
    return renderSeedTree(ir.seed, ir.webgmex, rows, { format: format as SeedTreeFormat });
  }

  if (format === "descriptor" || format === "metalang") {
    if (!context) {
      throw new Error("Seed meta format " + format + " requires loaded project context");
    }
    const descriptor = irToDescriptor(ir, context);
    if (format === "descriptor") {
      return JSON.stringify(descriptor, null, 2);
    }
    return descriptorToMetalang(descriptor, ir.seed);
  }

  return JSON.stringify(ir, null, 2);
}
