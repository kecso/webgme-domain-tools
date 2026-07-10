import { loadSetupCatalog } from "../catalog/setup-catalog.js";
import {
  collectSeedNodes,
  renderSeedTree,
  type SeedTreeFormat,
} from "../introspection/seed-tree.js";
import {
  closeProjectSession,
  openProjectSession,
} from "../session/project-session.js";
import { resolveSeedSelection } from "../session/seed-resolution.js";

export interface TreeCommandOptions {
  cwd: string;
  seed?: string;
  kind?: string;
  format?: SeedTreeFormat;
  at?: string;
  select?: string[];
}

function parseSelect(raw: string | undefined): string[] | undefined {
  if (!raw) return undefined;
  const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
  return parts.length > 0 ? parts : undefined;
}

export async function runSeedTreeCommand(options: TreeCommandOptions): Promise<string> {
  if (!options.seed) {
    throw new Error("tree --seed <name> is required for seed model tree");
  }

  const catalog = loadSetupCatalog(options.cwd);
  const entry = resolveSeedSelection(catalog, options.seed);

  try {
    const context = await openProjectSession({ cwd: options.cwd, seed: entry });
    const rows = await collectSeedNodes(context.core, context.rootNode, {
      at: options.at,
      select: options.select,
    });
    return renderSeedTree(entry.name, context.webgmexPath, rows, {
      format: options.format,
      at: options.at,
      select: options.select,
    });
  } finally {
    await closeProjectSession();
  }
}

export { parseSelect };
