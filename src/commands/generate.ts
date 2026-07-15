import fs from "node:fs";
import path from "node:path";
import { buildSeedMetaIr } from "../introspection/seed-meta.js";
import { irToDescriptor } from "../meta/ir-to-descriptor.js";
import { descriptorToMetaTs } from "../meta/descriptor-to-meta-ts.js";
import { closeProjectSession, openProjectSession } from "../session/project-session.js";
import { resolveSessionModelSource } from "../session/workspace-state.js";

export interface GenerateMetaTsCommandOptions {
  cwd: string;
  sessionCwd?: string;
  seed?: string;
  webgmex?: string;
  /** Write generated TypeScript to this path (relative to cwd). Default: stdout via returned string. */
  out?: string;
  namespace?: string;
}

export interface GenerateMetaTsCommandResult {
  /** Generated TypeScript source. */
  source: string;
  /** Absolute path written when --out was set; otherwise null. */
  outFile: string | null;
  seedName: string;
}

export async function runGenerateMetaTsCommand(
  options: GenerateMetaTsCommandOptions,
): Promise<GenerateMetaTsCommandResult> {
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
    const ir = buildSeedMetaIr(context);
    const descriptor = irToDescriptor(ir, context);
    const source = descriptorToMetaTs(descriptor, {
      seedName: model.name,
      namespace: options.namespace,
    });

    let outFile: string | null = null;
    if (options.out) {
      outFile = path.resolve(options.cwd, options.out);
      fs.mkdirSync(path.dirname(outFile), { recursive: true });
      fs.writeFileSync(outFile, source, "utf8");
    }

    return { source, outFile, seedName: model.name };
  } finally {
    await closeProjectSession();
  }
}
