import readline from "node:readline";
import path from "node:path";
import { runSessionCloseCommand, runSessionDiscardCommand, runSessionOpenCommand, runSessionSaveCommand, runSessionStatusCommand } from "../commands/session.js";
import { runTreeCommand } from "../commands/tree.js";
import { runPluginRunCommand } from "../commands/plugin.js";
import { parseSelect } from "../commands/seed-tree.js";
import type { SeedTreeFormat } from "../introspection/seed-tree.js";
import { readSessionState, SessionError } from "./workspace-state.js";

const REPL_HELP = `Commands:
  open --seed <name> | --webgmex <path>   Open a session workspace
  status                                  Show session state
  save [--out <file>]                     Write working copy to save target
  discard                                 Reset working copy from source
  close [--discard]                       Close session
  tree [--seed <name>]                    Seed model tree (uses session when omitted)
  plugin run <name> [options]             Run plugin (model from session when open)
  help                                    Show this help
  exit | quit                             Leave the REPL
`;

function tokenize(line: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let quote: "'" | '"' | null = null;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quote) {
      if (ch === quote) {
        quote = null;
      } else {
        current += ch;
      }
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      continue;
    }
    if (/\s/.test(ch)) {
      if (current) {
        tokens.push(current);
        current = "";
      }
      continue;
    }
    current += ch;
  }
  if (current) tokens.push(current);
  return tokens;
}

function takeFlag(tokens: string[], flag: string): string | undefined {
  const idx = tokens.indexOf(flag);
  if (idx === -1) return undefined;
  return tokens[idx + 1];
}

function takeBoolFlag(tokens: string[], flag: string): boolean {
  return tokens.includes(flag);
}

function takeRepeatedFlag(tokens: string[], flag: string): string[] {
  const values: string[] = [];
  for (let i = 0; i < tokens.length; i += 1) {
    if (tokens[i] === flag && tokens[i + 1]) {
      values.push(tokens[i + 1]);
    }
  }
  return values;
}

/** Explicit -C / --cwd typed in a REPL line, resolved against the session dir. */
function explicitProjectCwd(tokens: string[], sessionCwd: string): string | undefined {
  const raw = takeFlag(tokens, "-C") ?? takeFlag(tokens, "--cwd");
  return raw ? path.resolve(sessionCwd, raw) : undefined;
}

/** Project root for catalog/plugin resolution: explicit -C, else session's, else session dir. */
function projectCwdFor(tokens: string[], sessionCwd: string): string {
  return (
    explicitProjectCwd(tokens, sessionCwd) ??
    readSessionState(sessionCwd)?.projectCwd ??
    sessionCwd
  );
}

export async function runSessionRepl(sessionCwd: string): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: process.stdin.isTTY === true,
  });

  const prompt = () => rl.prompt();
  rl.setPrompt("webdot> ");

  console.error("webdot session shell (type help)");
  prompt();

  await new Promise<void>((resolve) => {
    rl.on("line", (line) => {
      void (async () => {
        const trimmed = line.trim();
        if (!trimmed) {
          prompt();
          return;
        }
        const tokens = tokenize(trimmed);
        const cmd = tokens[0];
        const rest = tokens.slice(1);

        try {
          if (cmd === "exit" || cmd === "quit") {
            rl.close();
            return;
          }
          if (cmd === "help") {
            console.log(REPL_HELP.trimEnd());
            prompt();
            return;
          }
          if (cmd === "status") {
            console.log(runSessionStatusCommand(sessionCwd));
            prompt();
            return;
          }
          if (cmd === "open") {
            console.log(
              runSessionOpenCommand({
                sessionCwd,
                projectCwd: explicitProjectCwd(rest, sessionCwd) ?? sessionCwd,
                seed: takeFlag(rest, "--seed"),
                webgmex: takeFlag(rest, "--webgmex"),
                force: takeBoolFlag(rest, "--force"),
              }),
            );
            prompt();
            return;
          }
          if (cmd === "save") {
            console.log(runSessionSaveCommand({ cwd: sessionCwd, out: takeFlag(rest, "--out") }));
            prompt();
            return;
          }
          if (cmd === "discard") {
            console.log(runSessionDiscardCommand(sessionCwd));
            prompt();
            return;
          }
          if (cmd === "close") {
            console.log(runSessionCloseCommand(sessionCwd, takeBoolFlag(rest, "--discard")));
            prompt();
            return;
          }
          if (cmd === "tree") {
            const seed = takeFlag(rest, "--seed");
            const out = await runTreeCommand({
              cwd: projectCwdFor(rest, sessionCwd),
              sessionCwd,
              seed,
              seedModel: true,
              format: (takeFlag(rest, "--format") ?? "tree") as SeedTreeFormat,
              at: takeFlag(rest, "--at"),
              select: parseSelect(takeFlag(rest, "--nodes")),
            });
            console.log(out);
            prompt();
            return;
          }
          if (cmd === "plugin" && rest[0] === "run") {
            const runTokens = rest.slice(1);
            const name = runTokens.find((t) => !t.startsWith("--"));
            const result = await runPluginRunCommand({
              cwd: projectCwdFor(runTokens, sessionCwd),
              sessionCwd,
              plugin: name,
              pluginDir: takeFlag(runTokens, "--plugin-dir"),
              seed: takeFlag(runTokens, "--seed"),
              webgmex: takeFlag(runTokens, "--webgmex"),
              at: takeFlag(runTokens, "--at"),
              select: parseSelect(takeFlag(runTokens, "--select")),
              configFile: takeFlag(runTokens, "--config-file"),
              set: takeRepeatedFlag(runTokens, "--set"),
              artifactsOut: takeFlag(runTokens, "--artifacts-out"),
              out: takeFlag(runTokens, "--out"),
              dryRun: takeBoolFlag(runTokens, "--dry-run"),
            });
            for (const warning of result.warnings) {
              console.error("warning:", warning);
            }
            if (result.persisted && result.outFile) {
              console.error("wrote model:", result.outFile);
            }
            console.log(result.output);
            prompt();
            return;
          }
          console.error("Unknown command:", cmd, "(type help)");
          prompt();
        } catch (err) {
          console.error(err instanceof Error ? err.message : err);
          prompt();
        }
      })();
    });

    rl.on("close", () => resolve());
  });
}

export { SessionError };
