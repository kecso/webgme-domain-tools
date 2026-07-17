import type { ComponentKind } from "../catalog/types.js";
import { COMPONENT_KINDS } from "../catalog/types.js";
import { loadSetupCatalog } from "../catalog/setup-catalog.js";
import { entriesForKind } from "../catalog/types.js";
import { listInstalled } from "../plugin/install-registry.js";

export function runLsCommand(
  cwd: string,
  kindArg?: string,
  options?: { home?: string },
): string {
  const catalog = loadSetupCatalog(cwd);
  const installed = listInstalled(options?.home);

  if (!kindArg || kindArg === "all") {
    const lines: string[] = [];
    for (const kind of COMPONENT_KINDS) {
      const names = entriesForKind(catalog, kind).map((e) => e.name);
      lines.push(kind + ":");
      lines.push("  catalog: " + (names.join(" ") || "<none>"));
      if (kind === "plugins") {
        lines.push(
          "  installed: " +
            (installed.map((e) => e.name).join(" ") || "<none>"),
        );
      }
    }
    return lines.join("\n");
  }
  if (!COMPONENT_KINDS.includes(kindArg as ComponentKind)) {
    throw new Error("Unknown kind: " + kindArg + ". Valid: " + COMPONENT_KINDS.join(", "));
  }
  const names = entriesForKind(catalog, kindArg as ComponentKind).map((e) => e.name);
  const lines = [
    kindArg + ":",
    "  catalog: " + (names.join(" ") || "<none>"),
  ];
  if (kindArg === "plugins") {
    lines.push(
      "  installed: " + (installed.map((e) => e.name).join(" ") || "<none>"),
    );
  }
  return lines.join("\n");
}
