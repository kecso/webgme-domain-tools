import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  getGithubCacheRoot,
  getInstalled,
  listInstalled,
  removeInstalled,
  upsertInstalled,
  type InstalledPluginEntry,
  type PluginInstallSource,
} from "./install-registry.js";

export interface ValidatedPluginDir {
  pluginId: string;
  absPath: string;
  metadataPath: string;
}

export interface InstallTargetLocal {
  kind: "local";
  path: string;
}

export interface InstallTargetGithub {
  kind: "github";
  repo: string;
  ref?: string;
  subdir?: string;
}

export type InstallTarget = InstallTargetLocal | InstallTargetGithub;

export interface InstallPluginOptions {
  /** Local path or `owner/repo[@ref]`. */
  target: string;
  /** Dictionary key (defaults to plugin folder basename). */
  as?: string;
  /** Path inside a GitHub clone that contains `{name}/{name}.js`. */
  subdir?: string;
  /** Replace an existing dictionary entry with the same name. */
  force?: boolean;
  /** Resolve relative local paths against this directory (shell cwd). */
  cwd?: string;
  /** Override `WEBDOT_HOME`. */
  home?: string;
}

export interface InstallPluginResult {
  entry: InstalledPluginEntry;
  replaced: boolean;
  warning?: string;
}

export interface UninstallPluginOptions {
  name: string;
  home?: string;
  /** Delete GitHub cache dir when no other install points at it. */
  purgeCache?: boolean;
}

/**
 * WebGME layout: `<dir>/<basename(dir)>.js` plus `metadata.json`.
 */
export function validatePluginDirectory(dir: string): ValidatedPluginDir {
  const absPath = path.resolve(dir);
  if (!fs.existsSync(absPath) || !fs.statSync(absPath).isDirectory()) {
    throw new Error("Plugin directory does not exist: " + absPath);
  }
  const pluginId = path.basename(absPath);
  const mainFile = path.join(absPath, pluginId + ".js");
  if (!fs.existsSync(mainFile)) {
    throw new Error(
      "Plugin directory must contain " +
        pluginId +
        ".js (webgme layout <dir>/" +
        pluginId +
        ".js): " +
        absPath,
    );
  }
  const metadataPath = path.join(absPath, "metadata.json");
  if (!fs.existsSync(metadataPath)) {
    throw new Error("Plugin metadata.json not found at: " + metadataPath);
  }
  return { pluginId, absPath, metadataPath };
}

/**
 * Parse `owner/repo`, `owner/repo@ref`, GitHub URLs, or a filesystem path.
 */
export function parseInstallTarget(raw: string, cwd: string = process.cwd()): InstallTarget {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error("Install target is empty");

  const githubUrl = trimmed.match(
    /^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/]+)\/([^/@#]+?)(?:\.git)?(?:@([^/]+))?$/i,
  );
  if (githubUrl) {
    return {
      kind: "github",
      repo: githubUrl[1] + "/" + githubUrl[2],
      ref: githubUrl[3],
    };
  }

  const at = trimmed.match(/^([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)(?:@([^/]+))?$/);
  if (at && !trimmed.includes(path.sep) && !path.isAbsolute(trimmed) && !trimmed.startsWith(".")) {
    return { kind: "github", repo: at[1], ref: at[2] };
  }

  return { kind: "local", path: path.resolve(cwd, trimmed) };
}

function cacheDirName(repo: string, ref: string | undefined): string {
  const safe = (repo + "-" + (ref ?? "HEAD")).replace(/[^A-Za-z0-9._-]+/g, "-");
  return safe;
}

function githubCloneUrl(repo: string): string {
  const base = process.env.WEBDOT_GITHUB_CLONE_BASE?.trim();
  if (base) {
    return base.replace(/\/$/, "") + "/" + repo + ".git";
  }
  return "https://github.com/" + repo + ".git";
}

function cloneGithubRepo(
  repo: string,
  ref: string | undefined,
  dest: string,
): void {
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const url = githubCloneUrl(repo);
  const args = ["clone", "--depth", "1"];
  if (ref) {
    args.push("--branch", ref);
  }
  args.push(url, dest);
  try {
    execFileSync("git", args, { stdio: ["ignore", "pipe", "pipe"] });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error("Failed to clone " + url + (ref ? "@" + ref : "") + ": " + detail);
  }
}

function resolveGithubPluginDir(
  cachePath: string,
  subdir: string | undefined,
): ValidatedPluginDir {
  const candidate = subdir ? path.join(cachePath, subdir) : cachePath;
  try {
    return validatePluginDirectory(candidate);
  } catch (first) {
    if (subdir) throw first;
    // Single child directory that looks like a plugin.
    const kids = fs
      .readdirSync(cachePath, { withFileTypes: true })
      .filter((d) => d.isDirectory() && d.name !== ".git")
      .map((d) => path.join(cachePath, d.name));
    if (kids.length === 1) {
      return validatePluginDirectory(kids[0]);
    }
    throw first;
  }
}

export function installPlugin(options: InstallPluginOptions): InstallPluginResult {
  const cwd = options.cwd ?? process.cwd();
  const home = options.home;
  const parsed = parseInstallTarget(options.target, cwd);
  if (parsed.kind === "github" && options.subdir) {
    parsed.subdir = options.subdir;
  }

  let validated: ValidatedPluginDir;
  let source: PluginInstallSource;

  if (parsed.kind === "local") {
    validated = validatePluginDirectory(parsed.path);
    source = { type: "local", origin: validated.absPath };
  } else {
    const cacheRoot = getGithubCacheRoot(home);
    const dest = path.join(cacheRoot, cacheDirName(parsed.repo, parsed.ref));
    cloneGithubRepo(parsed.repo, parsed.ref, dest);
    validated = resolveGithubPluginDir(dest, parsed.subdir ?? options.subdir);
    source = {
      type: "github",
      repo: parsed.repo,
      ref: parsed.ref,
      subdir: parsed.subdir ?? options.subdir,
      cachePath: dest,
    };
  }

  const name = options.as?.trim() || validated.pluginId;
  if (!name) throw new Error("Install name is empty");

  const existing = getInstalled(name, home);
  if (existing && !options.force) {
    throw new Error(
      'Plugin name "' +
        name +
        '" is already installed (' +
        existing.pluginId +
        " @ " +
        existing.path +
        "). Use --as <alias> or --force to replace.",
    );
  }

  const entry: InstalledPluginEntry = {
    name,
    pluginId: validated.pluginId,
    path: validated.absPath,
    source,
    installedAt: new Date().toISOString(),
  };
  upsertInstalled(entry, home);

  let warning: string | undefined;
  if (name !== validated.pluginId) {
    warning =
      'Installed as "' +
      name +
      '" (plugin id "' +
      validated.pluginId +
      '"). Use the install name with plugin run / info.';
  }

  return { entry, replaced: Boolean(existing), warning };
}

export function uninstallPlugin(options: UninstallPluginOptions): InstalledPluginEntry {
  const entry = removeInstalled(options.name, options.home);
  if (options.purgeCache !== false && entry.source.type === "github") {
    const cachePath = entry.source.cachePath;
    const stillUsed = listInstalled(options.home).some(
      (e) => e.source.type === "github" && e.source.cachePath === cachePath,
    );
    if (!stillUsed) {
      fs.rmSync(cachePath, { recursive: true, force: true });
    }
  }
  return entry;
}

export function formatPluginList(options?: {
  home?: string;
  catalogNames?: string[];
}): string {
  const installed = listInstalled(options?.home);
  const lines: string[] = [];
  lines.push("installed:");
  if (installed.length === 0) {
    lines.push("  <none>");
  } else {
    for (const e of installed) {
      const src =
        e.source.type === "local"
          ? "local:" + e.source.origin
          : "github:" + e.source.repo + (e.source.ref ? "@" + e.source.ref : "");
      const alias = e.name !== e.pluginId ? " (id:" + e.pluginId + ")" : "";
      lines.push("  " + e.name + alias + "  [" + src + "]");
    }
  }
  if (options?.catalogNames) {
    lines.push("catalog:");
    if (options.catalogNames.length === 0) {
      lines.push("  <none>");
    } else {
      for (const name of options.catalogNames) {
        lines.push("  " + name + "  [catalog]");
      }
    }
  }
  return lines.join("\n");
}
