import {
  collectSeedNodes,
  renderSeedTree,
  type SeedTreeFormat,
} from "../introspection/seed-tree.js";
import {
  closeProjectSession,
  openProjectSession,
} from "../session/project-session.js";
import { resolveSessionModelSource } from "../session/workspace-state.js";

export interface TreeCommandOptions {
  cwd: string;
  sessionCwd?: string;
  seed?: string;
  /** Direct .webgmex path (relative to sessionCwd / execution dir); no catalog required. */
  webgmex?: string;
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
  const model = resolveSessionModelSource(options.sessionCwd ?? options.cwd, {
    seed: options.seed,
    webgmex: options.webgmex,
    projectCwd: options.cwd,
  });

  try {
    const context = await openProjectSession({
      cwd: options.cwd,
      webgmexPath: model.webgmexPath,
      seedName: model.name,
    });
    const rows = await collectSeedNodes(context.core, context.rootNode, {
      at: options.at,
      select: options.select,
    });
    return renderSeedTree(model.name, context.webgmexPath, rows, {
      format: options.format,
      at: options.at,
      select: options.select,
    });
  } finally {
    await closeProjectSession();
  }
}

export { parseSelect };
