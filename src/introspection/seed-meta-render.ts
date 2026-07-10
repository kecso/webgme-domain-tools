import type { LoadedSeedContext } from "../session/project-session.js";
import { descriptorToMetalang } from "../meta/descriptor-to-metalang.js";
import { irToDescriptor } from "../meta/ir-to-descriptor.js";
import type { SeedMetaIr } from "./seed-meta.js";

export type SeedMetaFormat = "json" | "tree" | "descriptor" | "metalang";

export function renderSeedMetaOutput(
  ir: SeedMetaIr,
  format: SeedMetaFormat,
  context?: LoadedSeedContext,
): string {
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
