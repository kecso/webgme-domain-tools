import fs from "node:fs";
import type { CatalogEntry } from "../catalog/types.js";
import type { PluginConfigEntry, PluginInfo, PluginMetadata } from "./types.js";

export function loadPluginMetadataFromPath(metadataPath: string): PluginMetadata {
  if (!fs.existsSync(metadataPath)) {
    throw new Error("Plugin metadata.json not found at: " + metadataPath);
  }
  return JSON.parse(fs.readFileSync(metadataPath, "utf8")) as PluginMetadata;
}

export function loadPluginMetadata(entry: CatalogEntry): PluginMetadata {
  if (!entry.metadataPath) {
    throw new Error(
      'Plugin "' + entry.name + '" has no metadata.json. Run: webdot tree repo --kind plugins',
    );
  }
  if (!entry.exists) {
    throw new Error('Plugin "' + entry.name + '" src path is missing: ' + entry.src);
  }
  return loadPluginMetadataFromPath(entry.metadataPath);
}

export function configDefaults(configStructure: PluginConfigEntry[] | undefined): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};
  for (const entry of configStructure ?? []) {
    defaults[entry.name] = entry.value;
  }
  return defaults;
}

export function buildPluginInfo(
  entry: CatalogEntry,
  extra?: { source?: string; installName?: string },
): PluginInfo {
  const metadata = loadPluginMetadata(entry);
  const configStructure = metadata.configStructure ?? [];
  return {
    id: metadata.id ?? entry.name,
    name: metadata.name ?? entry.name,
    version: metadata.version,
    description: metadata.description,
    metadataPath: entry.metadataPath,
    src: entry.src,
    source: extra?.source ?? "catalog",
    installName: extra?.installName,
    configStructure,
    defaults: configDefaults(configStructure),
  };
}

export function buildPluginInfoFromPath(
  metadataPath: string,
  opts: { id: string; src: string; source: string; installName?: string },
): PluginInfo {
  const metadata = loadPluginMetadataFromPath(metadataPath);
  const configStructure = metadata.configStructure ?? [];
  return {
    id: metadata.id ?? opts.id,
    name: metadata.name ?? opts.id,
    version: metadata.version,
    description: metadata.description,
    metadataPath,
    src: opts.src,
    source: opts.source,
    installName: opts.installName,
    configStructure,
    defaults: configDefaults(configStructure),
  };
}

export function renderPluginInfo(info: PluginInfo): string {
  return JSON.stringify(info, null, 2);
}
