import { loadSetupCatalog } from "../catalog/setup-catalog.js";
import { buildSeedMetaIr, renderSeedMetaOutput, type SeedMetaFormat } from "../introspection/seed-meta.js";
import { closeProjectSession, openProjectSession } from "../session/project-session.js";
import { resolveSeedSelection } from "../session/seed-resolution.js";

export type { SeedMetaFormat };

export interface SeedMetaCommandOptions {
  cwd: string;
  seed: string;
  format?: SeedMetaFormat;
}

const VALID_FORMATS: SeedMetaFormat[] = ["json", "tree", "tree-verbose", "descriptor", "metalang"];

export function parseSeedMetaFormat(raw: string | undefined): SeedMetaFormat {
  const format = (raw ?? "json") as SeedMetaFormat;
  if (!VALID_FORMATS.includes(format)) {
    throw new Error("Seed meta format must be json, tree, tree-verbose, descriptor, or metalang");
  }
  return format;
}

export async function runSeedMetaCommand(options: SeedMetaCommandOptions): Promise<string> {
  const catalog = loadSetupCatalog(options.cwd);
  const entry = resolveSeedSelection(catalog, options.seed);
  const format = parseSeedMetaFormat(options.format);

  try {
    const context = await openProjectSession({ cwd: options.cwd, seed: entry });
    const ir = buildSeedMetaIr(context);
    return renderSeedMetaOutput(ir, format, context);
  } finally {
    await closeProjectSession();
  }
}
