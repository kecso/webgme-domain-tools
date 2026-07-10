#!/usr/bin/env node
import path from "node:path";
import { Command } from "commander";
import { runLsCommand } from "./commands/ls.js";
import { runSeedMetaCommand, type SeedMetaFormat } from "./commands/seed.js";
import { runTreeCommand } from "./commands/tree.js";
import { runPluginInfoCommand, runPluginRunCommand } from "./commands/plugin.js";
import { parseSelect } from "./commands/seed-tree.js";
import { AmbiguousSeedError } from "./session/seed-resolution.js";
import type { RepoTreeFormat } from "./introspection/repo-tree.js";
import type { SeedTreeFormat } from "./introspection/seed-tree.js";
import { CLI_NAME } from "./cli-brand.js";
import { formatPluginMessages } from "./plugin/result-format.js";

const program = new Command();

program
  .name(CLI_NAME)
  .description("WebGME domain tools")
  .version("0.3.0")
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
  .description("MetaAspectSet IR from a file-project seed")
  .requiredOption("--seed <name>", "Seed name from webgme-setup.json")
  .option("--format <fmt>", "json | tree | tree-verbose | descriptor | metalang", "json")
  .action((opts: { seed: string; format?: string }, cmd) => {
    const globals = cmd.optsWithGlobals();
    const cwd = path.resolve(globals.cwd ?? process.cwd());
    void runCli(() =>
      runSeedMetaCommand({
        cwd,
        seed: opts.seed,
        format: opts.format as SeedMetaFormat | undefined,
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

const pluginCmd = program.command("plugin").description("Plugin introspection and execution");

pluginCmd
  .command("info")
  .description("Show plugin metadata and configStructure defaults")
  .argument("<name>", "Plugin name from webgme-setup.json")
  .action((name: string, _opts, cmd) => {
    const cwd = path.resolve(cmd.optsWithGlobals().cwd ?? process.cwd());
    void runCli(() => runPluginInfoCommand({ cwd, plugin: name }));
  });

pluginCmd
  .command("run")
  .description("Run a plugin headlessly against a file-project seed")
  .argument("<name>", "Plugin name from webgme-setup.json")
  .requiredOption("--seed <name>", "Seed to load as plugin context")
  .option("--at <path>", "Active node path (e.g. /1)")
  .option("--select <paths>", "Comma-separated selected node paths")
  .option("--branch <name>", "Branch name", "master")
  .option("--config-file <path>", "JSON file with plugin config overrides")
  .option("--set <pair...>", "Config override name=value (repeatable)")
  .option("--artifacts-out <dir>", "Directory (relative to -C cwd) for blob artifacts")
  .action(async (name: string, opts: {
    seed: string;
    at?: string;
    select?: string;
    branch?: string;
    configFile?: string;
    set?: string[];
    artifactsOut?: string;
  }, cmd) => {
    const cwd = path.resolve(cmd.optsWithGlobals().cwd ?? process.cwd());
    try {
      const result = await runPluginRunCommand({
        cwd,
        plugin: name,
        seed: opts.seed,
        at: opts.at,
        select: parseSelect(opts.select),
        branch: opts.branch,
        configFile: opts.configFile,
        set: opts.set,
        artifactsOut: opts.artifactsOut,
      });
      for (const line of formatPluginMessages(JSON.parse(result.output).result)) {
        console.error(line);
      }
      for (const warning of result.warnings) {
        console.error("warning:", warning);
      }
      console.log(result.output);
      if (!result.success) process.exit(1);
    } catch (err) {
      if (err instanceof AmbiguousSeedError) {
        console.error(err.message);
        process.exit(2);
      }
      console.error(err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

program.parse();
