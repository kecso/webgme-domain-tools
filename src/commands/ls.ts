import type { ComponentKind } from "../catalog/types.js";
import { COMPONENT_KINDS } from "../catalog/types.js";
import { loadSetupCatalog } from "../catalog/setup-catalog.js";
import { entriesForKind } from "../catalog/types.js";

export function runLsCommand(cwd: string, kindArg?: string): string {
  const catalog = loadSetupCatalog(cwd);
  if (!kindArg || kindArg === "all") {
    const lines: string[] = [];
    for (const kind of COMPONENT_KINDS) {
      const names = entriesForKind(catalog, kind).map((e) => e.name);
      lines.push(kind + ":\n  local: " + (names.join(" ") || "<none>"));
    }
    return lines.join("\n");
  }
  if (!COMPONENT_KINDS.includes(kindArg as ComponentKind)) {
    throw new Error("Unknown kind: " + kindArg + ". Valid: " + COMPONENT_KINDS.join(", "));
  }
  const names = entriesForKind(catalog, kindArg as ComponentKind).map((e) => e.name);
  return kindArg + ":\n  local: " + (names.join(" ") || "<none>");
}