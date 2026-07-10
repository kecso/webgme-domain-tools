#!/usr/bin/env node
import path from "node:path";
import { Command } from "commander";
import { runLsCommand } from "./commands/ls.js";
import { runSeedMetaCommand } from "./commands/seed.js";
import { runTreeCommand } from "./commands/tree.js";
import { parseSelect } from "./commands/seed-tree.js";
import { AmbiguousSeedError } from "./session/seed-resolution.js";
import type { RepoTreeFormat } from "./introspection/repo-tree.js";
import type { SeedTreeFormat } from "./introspection/seed-tree.js";

const program = new Command();

program
  .name("domain-tools")
  .description("Minimal-footprint CLI for WebGME domain studios")
  .version("0.1.0")
  .option("-C, --cwd <dir>", "WebGME project root (webgme-setup.json)", process.cwd());

async function runCli(action: () => Promise<string>): Promise<void> {
  try {
    const out = await action();
    console.log(out);
  } catch (err) {
    if (err instanceof AmbiguousSeedError) {
      console.error(err.message);
      process.exit(2);
    }
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

program
  .command("tree")
  .description("Repository or seed model tree")
  .argument("[scope]", "repo (default) or seed", "repo")
  .option("--seed <name>", "Load seed and show model tree")
  .option("--kind <kinds>", "Repo scope: seeds,plugins,visualizers,routers (comma-separated)")
  .option("--format <fmt>", "repo: tree|flat|json — seed: tree|tree-verbose|flat|json", "tree")
  .option("--at <path>", "Seed scope: subtree root path (e.g. /1)")
  .option("--select <paths>", "Seed scope: comma-separated node paths to list")
  .action((scope: string, opts: {
    seed?: string;
    kind?: string;
    format?: string;
    at?: string;
    select?: string;
  }, cmd) => {
    const cwd = path.resolve(cmd.parent?.opts().cwd ?? process.cwd());
    if (scope === "seed" && !opts.seed) {
      console.error("tree seed requires --seed <name>");
      process.exit(2);
    }
    void runCli(() =>
      runTreeCommand({
        cwd,
        seed: scope === "seed" ? opts.seed : opts.seed,
        kind: opts.kind,
        format: (opts.format ?? "tree") as RepoTreeFormat | SeedTreeFormat,
        at: opts.at,
        select: parseSelect(opts.select),
      }),
    );
  });

program
  .command("seed")
  .description("Seed model introspection")
  .command("meta")
  .description("MetaAspectSet IR from an imported seed")
  .requiredOption("--seed <name>", "Seed name from webgme-setup.json")
  .option("--format <fmt>", "json | tree", "json")
  .action((opts: { seed: string; format?: string }, cmd) => {
    const globals = cmd.optsWithGlobals();
    const cwd = path.resolve(globals.cwd ?? process.cwd());
    void runCli(() =>
      runSeedMetaCommand({
        cwd,
        seed: opts.seed,
        format: opts.format === "tree" ? "tree" : "json",
      }),
    );
  });

program
  .command("ls")
  .description("List components from webgme-setup.json")
  .argument("[kind]", "seeds | plugins | visualizers | routers | all", "all")
  .action((kind: string, _opts, cmd) => {
    const cwd = path.resolve(cmd.parent?.opts().cwd ?? process.cwd());
    try {
      console.log(runLsCommand(cwd, kind));
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

program.parse();
