import type { ComponentKind } from "../catalog/types.js";
import { COMPONENT_KINDS } from "../catalog/types.js";
import { loadSetupCatalog } from "../catalog/setup-catalog.js";
import {
  renderRepoTree,
  type RepoTreeFormat,
} from "../introspection/repo-tree.js";

function parseKinds(raw: string | undefined): ComponentKind[] | undefined {
  if (!raw) return undefined;
  const parts = raw.split(",").map((s) => s.trim());
  const invalid = parts.filter((p) => !COMPONENT_KINDS.includes(p as ComponentKind));
  if (invalid.length > 0) {
    throw new Error(
      "Unknown component kind(s): " + invalid.join(", ") +
        ". Valid: " + COMPONENT_KINDS.join(", "),
    );
  }
  return parts as ComponentKind[];
}

export interface TreeCommandOptions {
  cwd: string;
  seed?: string;
  kind?: string;
  format?: RepoTreeFormat;
}

export function runTreeCommand(options: TreeCommandOptions): string {
  if (options.seed) {
    throw new Error(
      "Seed model tree is not implemented yet (feature F6). " +
        "Use: domain-tools tree repo --kind seeds",
    );
  }
  const catalog = loadSetupCatalog(options.cwd);
  return renderRepoTree(catalog, {
    kinds: parseKinds(options.kind),
    format: options.format,
  });
}