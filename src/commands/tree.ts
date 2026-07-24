import type { ComponentKind } from "../catalog/types.js";
import { COMPONENT_KINDS } from "../catalog/types.js";
import { loadSetupCatalog } from "../catalog/setup-catalog.js";
import { runSeedTreeCommand, parseSelect } from "./seed-tree.js";
import {
  renderRepoTree,
  type RepoTreeFormat,
} from "../introspection/repo-tree.js";
import type { SeedTreeFormat } from "../introspection/seed-tree.js";

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
  sessionCwd?: string;
  seed?: string;
  /** Direct .webgmex path; implies seed-model tree without a catalog. */
  webgmex?: string;
  /** When true, load a seed model tree (seed name from --seed or open session). */
  seedModel?: boolean;
  kind?: string;
  format?: RepoTreeFormat | SeedTreeFormat;
  at?: string;
  select?: string[];
}

export async function runTreeCommand(options: TreeCommandOptions): Promise<string> {
  if (options.seedModel || options.seed !== undefined || options.webgmex) {
    return runSeedTreeCommand({
      ...options,
      format: options.format as SeedTreeFormat | undefined,
    });
  }
  const catalog = loadSetupCatalog(options.cwd);
  const format = options.format as RepoTreeFormat | undefined;
  if (format && format !== "tree" && format !== "flat" && format !== "json") {
    throw new Error("Repo tree format must be tree, flat, or json (tree-verbose is for --seed only)");
  }
  return renderRepoTree(catalog, {
    kinds: parseKinds(options.kind),
    format,
  });
}
