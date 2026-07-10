import { loadSetupCatalog } from "../catalog/setup-catalog.js";
import { buildSeedMetaIr, renderSeedMeta } from "../introspection/seed-meta.js";
import { closeProjectSession, openProjectSession } from "../session/project-session.js";
import { resolveSeedSelection } from "../session/seed-resolution.js";

export interface SeedMetaCommandOptions {
  cwd: string;
  seed: string;
  format?: "json" | "tree";
}

export async function runSeedMetaCommand(options: SeedMetaCommandOptions): Promise<string> {
  const catalog = loadSetupCatalog(options.cwd);
  const entry = resolveSeedSelection(catalog, options.seed);

  try {
    const context = await openProjectSession({ cwd: options.cwd, seed: entry });
    const ir = buildSeedMetaIr(context);
    return renderSeedMeta(ir, options.format ?? "json");
  } finally {
    await closeProjectSession();
  }
}
