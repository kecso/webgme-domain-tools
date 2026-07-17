import path from "node:path";
import { Command } from "commander";
import { runLsCommand } from "./commands/ls.js";
import { runSeedMetaCommand, type SeedMetaFormat } from "./commands/seed.js";
import { runTreeCommand } from "./commands/tree.js";
import { runPluginInfoCommand, runPluginRunCommand } from "./commands/plugin.js";
import {
  formatPluginList,
  installPlugin,
  uninstallPlugin,
} from "./plugin/install.js";
import { loadSetupCatalog } from "./catalog/setup-catalog.js";import {
  runSessionCloseCommand,
  runSessionDiscardCommand,
  runSessionOpenCommand,
  runSessionSaveCommand,
  runSessionStatusCommand,
} from "./commands/session.js";
import { parseSelect } from "./commands/seed-tree.js";
import { AmbiguousSeedError } from "./session/seed-resolution.js";
import { SessionError } from "./session/workspace-state.js";
import { readSessionState } from "./session/workspace-state.js";
import type { RepoTreeFormat } from "./introspection/repo-tree.js";
import type { SeedTreeFormat } from "./introspection/seed-tree.js";
import { CLI_NAME } from "./cli-brand.js";
import { formatPluginMessages } from "./plugin/result-format.js";
import {
  DEFAULT_PLUGIN_ACTIVE_NODE_LABEL,
  DEFAULT_PLUGIN_SELECTION_LABEL,
} from "./plugin/run-context.js";

function optionalArg(value: string | boolean | undefined): string | undefined {
  if (typeof value !== "string") return undefined;
  return value;
}

/** The real execution directory: where a session lives (independent of -C). */
function executionCwd(): string {
  return path.resolve(process.cwd());
}

/** The -C project root if the user passed it, otherwise undefined. */
function explicitProjectCwd(cmd: Command): string | undefined {
  const raw = cmd.optsWithGlobals().cwd as string | undefined;
  return raw ? path.resolve(raw) : undefined;
}

/**
 * Project root for catalog/plugin resolution. An explicit -C always wins. Otherwise, when a
 * session is open, every command runs in that session's scope (its recorded project root) and
 * a note is emitted so the active session is visible. Falls back to the execution dir.
 */
function projectCwdFor(cmd: Command, sessionCwd: string): string {
  const explicit = explicitProjectCwd(cmd);
  if (explicit) return explicit;
  const session = readSessionState(sessionCwd);
  if (session) {
    console.error(
      'note: session open ("' +
        session.source.name +
        '") — running in its scope\n' +
        "      source:  " +
        session.source.path +
        " (" +
        session.source.kind +
        ")\n" +
        "      project: " +
        session.projectCwd +
        "\n" +
        "      use 'webdot session close' to exit, or -C <dir> to override for one command",
    );
    return session.projectCwd;
  }
  return sessionCwd;
}

export async function runCli(action: () => Promise<string>): Promise<void> {
  try {
    const out = await action();
    console.log(out);
  } catch (err) {
    if (err instanceof AmbiguousSeedError) {
      console.error(err.message);
      process.exit(2);
    }
    if (err instanceof SessionError) {
      console.error(err.message);
      process.exit(1);
    }
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

export function createProgram(): Command {
  const program = new Command();

  program
    .name(CLI_NAME)
    .description("WebGME domain tools")
    .version("0.7.0")
    .option("-C, --cwd <dir>", "WebGME project root (webgme-setup.json) [default: cwd]");

  program
    .command("tree")
    .description("Repository or seed model tree")
    .argument("[scope]", "repo or seed (defaults to the session model when a session is open, else repo)")
    .option("--seed [name]", "Load seed model tree (defaults to open session project)")
    .option("--kind <kinds>", "Repo scope: seeds,plugins,visualizers,routers (comma-separated)")
    .option("--format <fmt>", "repo: tree|flat|json — seed: tree|tree-verbose|flat|json", "tree")
    .option("--at <path>", "Seed scope: subtree root path (e.g. /1)")
    .option("--nodes <paths>", "Seed scope: list only these comma-separated node paths")
    .action((scope: string | undefined, opts: {
      seed?: string;
      kind?: string;
      format?: string;
      at?: string;
      nodes?: string;
    }, cmd) => {
      const sessionCwd = executionCwd();
      const hasSession = readSessionState(sessionCwd) !== null;
      // With no explicit scope, a session means "show the session model" (seed scope).
      const seedScope =
        opts.seed !== undefined || scope === "seed" || (scope === undefined && hasSession);
      if (seedScope) {
        const seedName = optionalArg(opts.seed);
        if (!seedName && !hasSession) {
          console.error("tree --seed <name> is required (or open a session first)");
          process.exit(2);
        }
        void runCli(() =>
          runTreeCommand({
            cwd: projectCwdFor(cmd, sessionCwd),
            sessionCwd,
            seed: seedName,
            seedModel: true,
            kind: opts.kind,
            format: (opts.format ?? "tree") as RepoTreeFormat | SeedTreeFormat,
            at: opts.at,
            select: parseSelect(opts.nodes),
          }),
        );
        return;
      }
      void runCli(() =>
        runTreeCommand({
          cwd: projectCwdFor(cmd, sessionCwd),
          kind: opts.kind,
          format: (opts.format ?? "tree") as RepoTreeFormat | SeedTreeFormat,
          at: opts.at,
          select: parseSelect(opts.nodes),
        }),
      );
    });

  program
    .command("seed")
    .description("Seed model introspection")
    .command("meta")
    .description("MetaAspectSet IR from a file-project seed")
    .option("--seed [name]", "Seed name (defaults to open session project)")
    .option("--format <fmt>", "json | tree | tree-verbose | descriptor | metalang", "json")
    .action((opts: { seed?: string | boolean; format?: string }, cmd) => {
      const sessionCwd = executionCwd();
      if (opts.seed === undefined && !readSessionState(sessionCwd)) {
        console.error("seed meta requires --seed <name> (or open a session first)");
        process.exit(2);
      }
      void runCli(() =>
        runSeedMetaCommand({
          cwd: projectCwdFor(cmd, sessionCwd),
          sessionCwd,
          seed: optionalArg(opts.seed),
          format: opts.format as SeedMetaFormat | undefined,
        }),
      );
    });

  program
    .command("ls")
    .description("List components from webgme-setup.json")
    .argument("[kind]", "seeds | plugins | visualizers | routers | all", "all")
    .action((kind: string, _opts, cmd) => {
      try {
        const cwd = projectCwdFor(cmd, executionCwd());
        console.log(runLsCommand(cwd, kind));
      } catch (err) {
        console.error(err instanceof Error ? err.message : err);
        process.exit(1);
      }
    });

  const pluginCmd = program.command("plugin").description("Plugin introspection and execution");

  pluginCmd
    .command("list")
    .description("List installed plugins (and project catalog plugins when available)")
    .action((_opts, cmd) => {
      try {
        const cwd = projectCwdFor(cmd, executionCwd());
        let catalogNames: string[] | undefined;
        try {
          catalogNames = loadSetupCatalog(cwd).plugins.map((p) => p.name);
        } catch {
          catalogNames = undefined;
        }
        console.log(formatPluginList({ catalogNames }));
      } catch (err) {
        console.error(err instanceof Error ? err.message : err);
        process.exit(1);
      }
    });

  pluginCmd
    .command("install")
    .description("Install a plugin into the user registry (local path or GitHub owner/repo)")
    .argument("<target>", "Plugin directory, or owner/repo[@ref]")
    .option("--as <name>", "Dictionary name for plugin run / info (default: folder basename)")
    .option("--subdir <path>", "Subdirectory inside a GitHub clone that contains the plugin")
    .option("--force", "Replace an existing install with the same name")
    .action((target: string, opts: { as?: string; subdir?: string; force?: boolean }) => {
      try {
        const result = installPlugin({
          target,
          as: opts.as,
          subdir: opts.subdir,
          force: opts.force,
          cwd: executionCwd(),
        });
        const label = result.replaced ? "Replaced" : "Installed";
        console.log(
          label +
            " " +
            result.entry.name +
            " → " +
            result.entry.pluginId +
            " (" +
            result.entry.path +
            ")",
        );
        if (result.warning) console.error("warning:", result.warning);
      } catch (err) {
        console.error(err instanceof Error ? err.message : err);
        process.exit(1);
      }
    });

  pluginCmd
    .command("uninstall")
    .description("Remove a plugin from the user registry")
    .argument("<name>", "Install dictionary name")
    .action((name: string) => {
      try {
        const entry = uninstallPlugin({ name });
        console.log("Uninstalled " + entry.name);
      } catch (err) {
        console.error(err instanceof Error ? err.message : err);
        process.exit(1);
      }
    });

  pluginCmd
    .command("info")
    .description("Show plugin metadata and configStructure defaults")
    .argument("<name>", "Catalog or installed plugin name")
    .action((name: string, _opts, cmd) => {
      void runCli(() => runPluginInfoCommand({ cwd: projectCwdFor(cmd, executionCwd()), plugin: name }));
    });

  pluginCmd
    .command("run")
    .description(
      "Run a plugin headlessly. Plugin context = project + active node + selection + config.",
    )
    .argument("[name]", "Catalog or installed plugin name (or use --plugin-dir)")
    .option("--plugin-dir <path>", "Plugin directory ({dir}/{dir}.js) relative to cwd; bypasses catalog")
    .option("--seed [name]", "Project: seed name (defaults to open session)")
    .option("--webgmex <path>", "Project: direct .webgmex path (or use --seed)")
    .option(
      "--at <path>",
      "Active (main) node path [default: " + DEFAULT_PLUGIN_ACTIVE_NODE_LABEL + "]",
    )
    .option(
      "--select <paths>",
      "Selected node paths, comma-separated [default: " + DEFAULT_PLUGIN_SELECTION_LABEL + "]",
    )
    .option("--config-file <path>", "Plugin config overrides (JSON object)")
    .option("--set <pair...>", "Plugin config override name=value (repeatable; merges over defaults)")
    .option("--artifacts-out <dir>", "Directory (relative to shell cwd) for blob artifacts")
    .option("--out <file>", "Write resulting model to this .webgmex instead of the source")
    .option("--dry-run", "Run without writing model changes back to disk")
    .addHelpText(
      "after",
      `
Plugin context (what the plugin receives):
  project     --seed <name>  or  --webgmex <path>  (or open session)
  active node --at <path>     [default: ${DEFAULT_PLUGIN_ACTIVE_NODE_LABEL}]
  selection   --select <paths> [default: ${DEFAULT_PLUGIN_SELECTION_LABEL}]
  config      metadata.json defaults, overridden by --config-file and --set

Name resolution: --plugin-dir → project catalog → installed registry (WEBDOT_HOME/~/.webdot).

With an open session, plugin run edits the session working copy (not the source file)
until you run session save. Use session open / session status to manage state.
`,
    )
    .action(async (name: string | undefined, opts: {
      pluginDir?: string;
      seed?: string | boolean;
      webgmex?: string;
      at?: string;
      select?: string;
      configFile?: string;
      set?: string[];
      artifactsOut?: string;
      out?: string;
      dryRun?: boolean;
    }, cmd) => {
      const sessionCwd = executionCwd();
      if (!opts.seed && !opts.webgmex && !readSessionState(sessionCwd)) {
        console.error("plugin run requires --seed <name>, --webgmex <path>, or an open session");
        process.exit(2);
      }
      try {
        const result = await runPluginRunCommand({
          cwd: projectCwdFor(cmd, sessionCwd),
          sessionCwd,
          plugin: name,
          pluginDir: opts.pluginDir,
          seed: optionalArg(opts.seed),
          webgmex: opts.webgmex,
          at: opts.at,
          select: parseSelect(opts.select),
          configFile: opts.configFile,
          set: opts.set,
          artifactsOut: opts.artifactsOut,
          out: opts.out,
          dryRun: opts.dryRun,
        });
        for (const line of formatPluginMessages(JSON.parse(result.output).result)) {
          console.error(line);
        }
        for (const warning of result.warnings) {
          console.error("warning:", warning);
        }
        if (result.persisted && result.outFile) {
          console.error("wrote model:", result.outFile);
        }
        console.log(result.output);
        if (!result.success) process.exit(1);
      } catch (err) {
        if (err instanceof AmbiguousSeedError) {
          console.error(err.message);
          process.exit(2);
        }
        if (err instanceof SessionError) {
          console.error(err.message);
          process.exit(1);
        }
        console.error(err instanceof Error ? err.message : err);
        process.exit(1);
      }
    });

  const sessionCmd = program.command("session").description("Stateful project session (workspace file)");

  sessionCmd
    .command("open")
    .description("Open a session: copy model to .webdot/workspace for editing")
    .option("--seed <name>", "Seed from webgme-setup.json")
    .option("--webgmex <path>", "Direct .webgmex path")
    .option("--force", "Replace an existing session")
    .action((opts: { seed?: string; webgmex?: string; force?: boolean }, cmd) => {
      const sessionCwd = executionCwd();
      if (!opts.seed && !opts.webgmex) {
        console.error("session open requires --seed <name> or --webgmex <path>");
        process.exit(2);
      }
      void runCli(() =>
        Promise.resolve(
          runSessionOpenCommand({
            sessionCwd,
            projectCwd: explicitProjectCwd(cmd) ?? sessionCwd,
            seed: opts.seed,
            webgmex: opts.webgmex,
            force: opts.force,
          }),
        ),
      );
    });

  sessionCmd
    .command("status")
    .description("Show open session state (from the current directory)")
    .action(() => {
      void runCli(() => Promise.resolve(runSessionStatusCommand(executionCwd())));
    });

  sessionCmd
    .command("save")
    .description("Write working copy to save target (original source by default)")
    .option("--out <file>", "Save to this .webgmex instead of the session save target")
    .action((opts: { out?: string }) => {
      void runCli(() => Promise.resolve(runSessionSaveCommand({ cwd: executionCwd(), out: opts.out })));
    });

  sessionCmd
    .command("discard")
    .description("Reset working copy from the original source")
    .action(() => {
      void runCli(() => Promise.resolve(runSessionDiscardCommand(executionCwd())));
    });

  sessionCmd
    .command("close")
    .description("Close session and remove workspace")
    .option("--discard", "Close even when there are unsaved changes")
    .action((opts: { discard?: boolean }) => {
      void runCli(() => Promise.resolve(runSessionCloseCommand(executionCwd(), opts.discard)));
    });

  return program;
}
