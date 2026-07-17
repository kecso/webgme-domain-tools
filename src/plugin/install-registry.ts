import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const WEBDOT_HOME_ENV = "WEBDOT_HOME";
export const REGISTRY_VERSION = 1 as const;

export type PluginInstallSource =
  | { type: "local"; origin: string }
  | { type: "github"; repo: string; ref?: string; subdir?: string; cachePath: string };

/** One dictionary entry: lookup name → plugin directory on disk. */
export interface InstalledPluginEntry {
  /** Dictionary key used by `plugin run` / `info` / `list`. */
  name: string;
  /** RequireJS / folder id (basename of the plugin directory). */
  pluginId: string;
  /** Absolute path to the plugin directory (`{pluginId}/{pluginId}.js`). */
  path: string;
  source: PluginInstallSource;
  installedAt: string;
}

export interface PluginRegistryFile {
  version: typeof REGISTRY_VERSION;
  plugins: Record<string, InstalledPluginEntry>;
}

export function getWebdotHome(): string {
  const override = process.env[WEBDOT_HOME_ENV];
  if (override && override.trim()) return path.resolve(override.trim());
  return path.join(os.homedir(), ".webdot");
}

export function getPluginsRoot(home: string = getWebdotHome()): string {
  return path.join(home, "plugins");
}

export function getRegistryPath(home: string = getWebdotHome()): string {
  return path.join(getPluginsRoot(home), "registry.json");
}

export function getGithubCacheRoot(home: string = getWebdotHome()): string {
  return path.join(getPluginsRoot(home), "github");
}

export function emptyRegistry(): PluginRegistryFile {
  return { version: REGISTRY_VERSION, plugins: {} };
}

export function loadRegistry(home: string = getWebdotHome()): PluginRegistryFile {
  const file = getRegistryPath(home);
  if (!fs.existsSync(file)) return emptyRegistry();
  const raw = JSON.parse(fs.readFileSync(file, "utf8")) as PluginRegistryFile;
  if (raw.version !== REGISTRY_VERSION || !raw.plugins || typeof raw.plugins !== "object") {
    throw new Error("Invalid plugin registry at " + file);
  }
  return raw;
}

export function saveRegistry(registry: PluginRegistryFile, home: string = getWebdotHome()): void {
  const root = getPluginsRoot(home);
  fs.mkdirSync(root, { recursive: true });
  const file = getRegistryPath(home);
  fs.writeFileSync(file, JSON.stringify(registry, null, 2) + "\n", "utf8");
}

export function listInstalled(home: string = getWebdotHome()): InstalledPluginEntry[] {
  const registry = loadRegistry(home);
  return Object.values(registry.plugins).sort((a, b) => a.name.localeCompare(b.name));
}

export function getInstalled(
  name: string,
  home: string = getWebdotHome(),
): InstalledPluginEntry | undefined {
  const bare = name.startsWith("plugin:") ? name.slice("plugin:".length) : name;
  return loadRegistry(home).plugins[bare];
}

export function upsertInstalled(
  entry: InstalledPluginEntry,
  home: string = getWebdotHome(),
): void {
  const registry = loadRegistry(home);
  registry.plugins[entry.name] = entry;
  saveRegistry(registry, home);
}

export function removeInstalled(name: string, home: string = getWebdotHome()): InstalledPluginEntry {
  const registry = loadRegistry(home);
  const bare = name.startsWith("plugin:") ? name.slice("plugin:".length) : name;
  const entry = registry.plugins[bare];
  if (!entry) {
    throw new Error('Installed plugin "' + bare + '" not found. Run: webdot plugin list');
  }
  delete registry.plugins[bare];
  saveRegistry(registry, home);
  return entry;
}
