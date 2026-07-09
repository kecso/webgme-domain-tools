#!/usr/bin/env node
import path from "node:path";
import { Command } from "commander";
import { runLsCommand } from "./commands/ls.js";
import { runTreeCommand } from "./commands/tree.js";
import type { RepoTreeFormat } from "./introspection/repo-tree.js";

const program = new Command();

program
  .name("domain-tools")
  .description("Minimal-footprint CLI for WebGME domain studios")
  .version("0.1.0")
  .option("-C, --cwd <dir>", "WebGME project root (webgme-setup.json)", process.cwd());

program
  .command("tree")
  .description("Repository or seed model tree")
  .argument("[scope]", "repo (default) or seed", "repo")
  .option("--seed <name>", "Load seed and show model tree (planned)")
  .option("--kind <kinds>", "Repo scope: seeds,plugins,visualizers,routers (comma-separated)")
  .option("--format <fmt>", "tree | flat | json", "tree")
  .action((scope: string, opts: { seed?: string; kind?: string; format?: string }, cmd) => {
    const cwd = path.resolve(cmd.parent?.opts().cwd ?? process.cwd());
    if (scope === "seed" && !opts.seed) {
      console.error("tree seed requires --seed <name>");
      process.exit(2);
    }
    try {
      const out = runTreeCommand({
        cwd,
        seed: scope === "seed" ? opts.seed : opts.seed,
        kind: opts.kind,
        format: (opts.format ?? "tree") as RepoTreeFormat,
      });
      console.log(out);
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      process.exit(1);
    }
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